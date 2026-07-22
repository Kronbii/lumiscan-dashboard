/*
 * =============================================================================
 *  Lumiscan WiFi Dermatoscope  --  ESP32-CAM firmware
 * =============================================================================
 *  Captures a JPEG, uploads it to the Lumiscan device-ingest API, and posts a
 *  scan record with an on-device classification.
 *
 *  Flow (see the API contract):
 *    1) POST /api/v1/ingest/images/presign   -> { objectKey, uploadUrl }
 *    2) PUT  <uploadUrl>  (raw JPEG, matching Content-Type)   -> expect 200
 *    3) POST /api/v1/ingest/scans  (Idempotency-Key reused across retries)
 *
 *  Target board (default): AI-Thinker ESP32-CAM (OV2640, 4 MB PSRAM).
 *  ESP32-S3-CAM users: see the commented pin block in config.h and set the
 *  right board in the Arduino IDE.  No code changes are needed here.
 *
 *  Libraries: ESP32 Arduino core (2.0.x or 3.x), ArduinoJson >= 7.0.
 *  esp_camera + mbedtls ship with the core. See README.md.
 * =============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <esp_camera.h>
#include <esp_system.h>
#include <esp_random.h>
#include <mbedtls/sha256.h>
#include <ArduinoJson.h>
#include <time.h>
#include <string.h>

#include "config.h"

// ---- classification the device reports (server does NOT run ML) ------------
// Use METRIC_UNSET (-1) for any metric you do not want to send. The metrics
// object is STRICT server-side: unknown keys are rejected (400), so only the
// documented keys below may be populated. Put vendor-specific numbers under a
// "raw" object if you need them (see buildScanBody).
struct Classification {
  const char *label;            // BENIGN | SUSPICIOUS | MALIGNANT | INCONCLUSIVE
  float       confidence;       // 0..1
  const char *confidenceLabel;  // same 4-value enum as label
  const char *metricsScale;     // DERMOSCOPE | RULER_REF | CLINICIAN_MEASURED | UNCALIBRATED
  float       diameter_mm;      // >= 0     (or METRIC_UNSET to omit)
  float       asymmetry;        // 0..10
  float       border;           // 0..10
  float       color;            // 0..10
  float       area_mm2;         // >= 0
};

enum StepResult { STEP_OK, STEP_RETRY, STEP_FATAL };

// ---- module state ----------------------------------------------------------
static bool     g_timeSynced       = false;
static int      g_lastButtonRead   = HIGH;
static int      g_buttonState      = HIGH;
static uint32_t g_lastDebounceMs   = 0;
static uint32_t g_lastWifiCheckMs  = 0;
static uint32_t g_lastNtpSyncMs    = 0;   // for periodic drift resync
static uint32_t g_retryAfterMs     = 0;   // honored on the next retry when the server sends Retry-After
static bool     g_busy             = false;

// =============================================================================
//  Small helpers
// =============================================================================

// Full API key is NEVER printed. We show only the public "lsk_<prefix>_" part.
static void logKeyMasked() {
  String k = String(DEVICE_API_KEY);
  int sep = k.indexOf('_', 4);  // second underscore: end of the public prefix
  String shown = (sep > 0) ? (k.substring(0, sep + 1) + "<redacted>")
                           : String("<redacted>");
  Serial.printf("[cfg] device key: %s\n", shown.c_str());
}

static String authHeader() {
  return String("Bearer ") + DEVICE_API_KEY;
}

// SHA-256 of the JPEG bytes -> 64-char lowercase hex (contentHash).
// mbedtls_sha256() one-shot exists on both mbedtls 2.x (Arduino core 2.x) and
// 3.x (core 3.x). The (void) cast ignores the int return present on 3.x.
static void sha256Hex(const uint8_t *data, size_t len, char out[65]) {
  uint8_t digest[32];
  (void)mbedtls_sha256(data, len, digest, 0 /* 0 = SHA-256, not SHA-224 */);
  static const char *hx = "0123456789abcdef";
  for (int i = 0; i < 32; i++) {
    out[i * 2]     = hx[digest[i] >> 4];
    out[i * 2 + 1] = hx[digest[i] & 0x0F];
  }
  out[64] = '\0';
}

// Unique-per-scan idempotency key (16 random bytes -> 32 hex chars).
// Generated ONCE per capture and REUSED across retries so the server dedupes.
static void genIdempotencyKey(char out[33]) {
  static const char *hx = "0123456789abcdef";
  for (int w = 0; w < 4; w++) {
    uint32_t r = esp_random();
    for (int b = 0; b < 4; b++) {
      uint8_t byte = (r >> (b * 8)) & 0xFF;
      out[(w * 4 + b) * 2]     = hx[byte >> 4];
      out[(w * 4 + b) * 2 + 1] = hx[byte & 0x0F];
    }
  }
  out[32] = '\0';
}

// ISO-8601 UTC with a trailing Z, e.g. "2026-07-22T09:00:00Z".
static bool isoTimestampUTC(char *buf, size_t n) {
  time_t now = time(nullptr);
  if (now < 1700000000) return false;  // clock not yet NTP-synced
  struct tm tmv;
  gmtime_r(&now, &tmv);
  return strftime(buf, n, "%Y-%m-%dT%H:%M:%SZ", &tmv) > 0;
}

// =============================================================================
//  TLS
// =============================================================================
// USE_INSECURE_TLS (config.h) toggles certificate verification off for bench
// testing. Leave it OFF (0) for production and supply the correct root CAs.
static void applyAppTls(WiFiClientSecure &c) {
#if USE_INSECURE_TLS
  c.setInsecure();  // <-- BENCH ONLY. No cert validation. Do NOT ship like this.
#else
  c.setCACert(APP_ROOT_CA);
#endif
}

static void applyStorageTls(WiFiClientSecure &c) {
#if USE_INSECURE_TLS
  c.setInsecure();  // <-- BENCH ONLY.
#else
  c.setCACert(STORAGE_ROOT_CA);
#endif
}

// =============================================================================
//  WiFi + time
// =============================================================================
// Blocking connect: returns immediately if already up, otherwise (re)starts the
// STA connection and waits up to timeoutMs. Use this on paths where we truly
// need a link before proceeding (setup, pre-scan, mid-retry).
static bool connectWiFi(uint32_t timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.printf("[wifi] connecting to \"%s\" ...\n", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected, ip=%s rssi=%d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }
  Serial.println("[wifi] connect FAILED");
  return false;
}

// Truly non-blocking WiFi keep-alive for loop(): if the link is down and the
// throttle window has elapsed, kick a reconnect and return immediately. The
// actual (re)connection completes asynchronously; WiFi.status() is re-checked
// on later loop iterations. Never blocks the loop (and thus button handling).
static void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - g_lastWifiCheckMs < WIFI_RETRY_INTERVAL_MS) return;
  g_lastWifiCheckMs = millis();
  Serial.println("[wifi] link down -> kicking async reconnect");
  WiFi.disconnect();
  WiFi.reconnect();
}

static bool syncTime() {
  Serial.println("[ntp] syncing clock (UTC) ...");
  configTime(0, 0, NTP_SERVER1, NTP_SERVER2);  // 0,0 => UTC, no DST offset
  uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < NTP_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  g_timeSynced = time(nullptr) >= 1700000000;
  if (g_timeSynced) {
    g_lastNtpSyncMs = millis();
    char ts[40];
    isoTimestampUTC(ts, sizeof(ts));
    Serial.printf("[ntp] synced: %s\n", ts);
  } else {
    Serial.println("[ntp] sync FAILED (will retry before a scan)");
  }
  return g_timeSynced;
}

// =============================================================================
//  Camera
// =============================================================================
static bool initCamera() {
  camera_config_t config = {};   // zero-init so unset fields (e.g. sccb_i2c_port) are 0, not stack garbage
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size   = CAMERA_FRAME_SIZE;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_LATEST;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = CAMERA_JPEG_QUALITY;  // 0..63, lower = better quality
  config.fb_count     = 2;

  // Fall back gracefully if no PSRAM is present: smaller frame, single buffer.
  if (!psramFound()) {
    Serial.println("[cam] no PSRAM: using SVGA/DRAM single buffer");
    config.frame_size   = FRAMESIZE_SVGA;
    config.fb_location  = CAMERA_FB_IN_DRAM;
    config.jpeg_quality = 12;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[cam] init failed: 0x%x\n", err);
    return false;
  }
  Serial.println("[cam] initialized");
  return true;
}

// Returns a frame buffer (JPEG) that the CALLER must esp_camera_fb_return().
static camera_fb_t *captureFrame() {
  // With GRAB_LATEST + fb_count 2 this returns a fresh frame. Note the very
  // first frame after init is pre-auto-exposure; discard a couple of warm-up
  // frames so the captured image is properly exposed.
  for (int i = 0; i < CAMERA_WARMUP_FRAMES; i++) {
    camera_fb_t *warm = esp_camera_fb_get();
    if (warm) esp_camera_fb_return(warm);
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[cam] capture failed");
    return nullptr;
  }
  Serial.printf("[cam] captured %ux%u, %u bytes, heap free=%u\n",
                fb->width, fb->height, (unsigned)fb->len,
                (unsigned)ESP.getFreeHeap());
  if (fb->len == 0 || fb->len > 15728640UL) {  // 15 MB API limit
    Serial.println("[cam] frame size out of range (0 or > 15MB)");
    esp_camera_fb_return(fb);
    return nullptr;
  }
  return fb;
}

// =============================================================================
//  Inference hook  --  REPLACE with real on-device classification
// =============================================================================
static void runInference(camera_fb_t *fb, Classification &c) {
  // ======================= START: replace me =============================
  // The device performs the ML/classification itself and reports it.
  // Defaults come from config.h so you can wire up transport before ML.
  c.label           = CLS_LABEL;
  c.confidence      = CLS_CONFIDENCE;
  c.confidenceLabel = CLS_CONFIDENCE_LABEL;
  c.metricsScale    = CLS_METRICS_SCALE;
  c.diameter_mm     = M_DIAMETER_MM;
  c.asymmetry       = M_ASYMMETRY_SCORE;
  c.border          = M_BORDER_SCORE;
  c.color           = M_COLOR_SCORE;
  c.area_mm2        = M_AREA_MM2;
  (void)fb;  // e.g. feed fb->buf/fb->len into a TFLite-Micro model here.
  // ======================== END: replace me ==============================
}

// =============================================================================
//  JSON builders
// =============================================================================
static String buildPresignBody(const char *fileName, size_t contentLength) {
  JsonDocument doc;
#if TARGET_USE_LESION
  doc["lesionId"] = LESION_ID;
#else
  doc["mrn"] = PATIENT_MRN;
#endif
  doc["contentType"]   = PRESIGN_CONTENT_TYPE;  // "image/jpeg"
  doc["fileName"]      = fileName;
  doc["contentLength"] = (uint32_t)contentLength;
  String out;
  serializeJson(doc, out);
  return out;
}

static void addMetric(JsonObject &m, const char *key, float v) {
  if (v >= 0.0f) m[key] = v;  // METRIC_UNSET (-1) => omit (strict object)
}

static String buildScanBody(const char *capturedAt, const String &objectKey,
                            const char *contentHash, int width, int height,
                            const Classification &c) {
  JsonDocument doc;
  doc["capturedAt"] = capturedAt;

  // EXACTLY ONE of subject / patientRef.
#if TARGET_USE_LESION
  doc["subject"]["lesionId"] = LESION_ID;
#else
  JsonObject pr = doc["patientRef"].to<JsonObject>();
  pr["mrn"] = PATIENT_MRN;
  if (strlen(BODY_REGION_HINT) > 0) pr["bodyRegionHint"] = BODY_REGION_HINT;
  if (strlen(BODY_SIDE) > 0)        pr["bodySide"]       = BODY_SIDE;
#endif

  JsonObject cls     = doc["classification"].to<JsonObject>();
  cls["label"]           = c.label;
  cls["confidence"]      = c.confidence;
  cls["confidenceLabel"] = c.confidenceLabel;
  JsonObject metrics = cls["metrics"].to<JsonObject>();
  addMetric(metrics, "diameter_mm",               c.diameter_mm);
  addMetric(metrics, "asymmetry_score",           c.asymmetry);
  addMetric(metrics, "border_irregularity_score", c.border);
  addMetric(metrics, "color_variation_score",     c.color);
  addMetric(metrics, "area_mm2",                   c.area_mm2);
  // Non-standard/vendor fields go ONLY under metrics.raw, e.g.:
  //   metrics["raw"]["model_version"] = "derm-v3";
  cls["metricsScale"] = c.metricsScale;

  JsonObject img = doc["images"].add<JsonObject>();
  img["objectKey"]   = objectKey;            // MUST be the presigned objectKey
  img["imageType"]   = IMAGE_TYPE;           // DERMOSCOPIC by default
  img["isPrimary"]   = IMAGE_IS_PRIMARY;
  img["contentHash"] = contentHash;          // sha256 hex (len 64)
  if (width  > 0) img["width"]  = width;
  if (height > 0) img["height"] = height;

  String out;
  serializeJson(doc, out);
  return out;
}

// =============================================================================
//  HTTP response classification + error reporting
// =============================================================================
static void printErrorEnvelope(const String &body) {
  JsonDocument doc;
  if (deserializeJson(doc, body) == DeserializationError::Ok &&
      doc["error"].is<JsonObject>()) {
    Serial.printf("    type=%s message=%s\n",
                  doc["error"]["type"].as<const char *>()    ? doc["error"]["type"].as<const char *>()    : "?",
                  doc["error"]["message"].as<const char *>() ? doc["error"]["message"].as<const char *>() : "?");
    for (JsonObject is : doc["error"]["issues"].as<JsonArray>()) {
      Serial.printf("    issue: %s -> %s\n",
                    is["path"].as<const char *>()    ? is["path"].as<const char *>()    : "?",
                    is["message"].as<const char *>() ? is["message"].as<const char *>() : "?");
    }
  } else if (body.length()) {
    Serial.print("    ");
    Serial.println(body.substring(0, 300));
  }
}

// Record a server-provided Retry-After (seconds) so the next backoff honors it.
// MUST be called before http.end(). Requires collectHeaders("Retry-After").
static void captureRetryAfter(HTTPClient &http, int code) {
  if (code != 429) return;
  String ra = http.header("Retry-After");
  if (!ra.length()) return;
  long secs = ra.toInt();               // numeric form only; HTTP-date form is ignored
  if (secs > 0 && secs < 600) {
    g_retryAfterMs = (uint32_t)secs * 1000UL;
    Serial.printf("    Retry-After: %ld s\n", secs);
  }
}

// putLeg=true => object-storage PUT: transient/expired-URL style failures
// should re-presign + retry rather than abort (each retry gets a fresh URL).
static StepResult classifyHttp(const char *tag, int code, const String &body,
                               bool putLeg = false) {
  if (code < 0) {  // transport-layer failure / timeout
    Serial.printf("[%s] transport error %d (%s) -> retry\n",
                  tag, code, HTTPClient::errorToString(code).c_str());
    return STEP_RETRY;
  }
  if (code == 200) return STEP_OK;

  if (putLeg) {
    // Object storage may return 403 (expired/mismatched presign), 408, 409,
    // 429, or 5xx transiently. Re-presign on the next attempt.
    if (code == 403 || code == 408 || code == 409 || code == 429 ||
        (code >= 500 && code <= 599)) {
      Serial.printf("[%s] storage HTTP %d -> re-presign + retry\n", tag, code);
      return STEP_RETRY;
    }
    Serial.printf("[%s] storage HTTP %d -> ABORT\n", tag, code);
    printErrorEnvelope(body);
    return STEP_FATAL;
  }

  switch (code) {
    case 400:
      Serial.printf("[%s] 400 validation / malformed body / missing Idempotency-Key -> ABORT\n", tag);
      printErrorEnvelope(body);
      return STEP_FATAL;
    case 401:
      Serial.printf("[%s] 401 auth: device key bad or revoked -> ABORT\n", tag);
      return STEP_FATAL;
    case 404:
      Serial.printf("[%s] 404 not found: unknown MRN / lesion -> ABORT\n", tag);
      printErrorEnvelope(body);
      return STEP_FATAL;
    case 429:
      Serial.printf("[%s] 429 rate limited (60 req / 60s) -> backoff + retry\n", tag);
      return STEP_RETRY;
    default:
      if (code >= 500 && code <= 599) {
        Serial.printf("[%s] %d server error -> backoff + retry\n", tag, code);
        return STEP_RETRY;
      }
      Serial.printf("[%s] unexpected HTTP %d -> ABORT\n", tag, code);
      printErrorEnvelope(body);
      return STEP_FATAL;
  }
}

// =============================================================================
//  Step 1: presign
// =============================================================================
static StepResult presign(const char *fileName, size_t contentLength,
                          String &objectKeyOut, String &uploadUrlOut) {
  WiFiClientSecure client;
  applyAppTls(client);
  HTTPClient http;
  http.setReuse(false);
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_RESPONSE_TIMEOUT_MS);

  String url = String(APP_URL) + "/api/v1/ingest/images/presign";
  if (!http.begin(client, url)) {
    Serial.println("[presign] begin() failed -> retry");
    return STEP_RETRY;
  }
  http.addHeader("Authorization", authHeader());
  http.addHeader("Content-Type", "application/json");
  static const char *kCollect[] = {"Retry-After"};
  http.collectHeaders(kCollect, 1);

  String body = buildPresignBody(fileName, contentLength);
  int code = http.POST(body);
  String resp = http.getString();
  captureRetryAfter(http, code);
  StepResult r = classifyHttp("presign", code, resp);
  http.end();
  if (r != STEP_OK) return r;

  JsonDocument doc;
  if (deserializeJson(doc, resp) != DeserializationError::Ok) {
    Serial.println("[presign] 200 but unparseable JSON -> retry");
    return STEP_RETRY;
  }
  objectKeyOut = doc["objectKey"].as<String>();
  uploadUrlOut = doc["uploadUrl"].as<String>();
  if (!objectKeyOut.length() || !uploadUrlOut.length()) {
    Serial.println("[presign] 200 missing objectKey/uploadUrl -> retry");
    return STEP_RETRY;
  }
  Serial.printf("[presign] ok (expiresIn=%d s) objectKey=%s\n",
                doc["expiresInSeconds"].as<int>(), objectKeyOut.c_str());
  return STEP_OK;
}

// =============================================================================
//  Step 2: PUT raw bytes to the pre-signed URL (NO auth header on this PUT)
// =============================================================================
static StepResult putBytes(const String &uploadUrl, const uint8_t *buf, size_t len) {
  bool isHttps = uploadUrl.startsWith("https://");
  WiFiClientSecure sclient;   // for https object storage
  WiFiClient       pclient;   // for http object storage (e.g. LAN MinIO)
  if (isHttps) applyStorageTls(sclient);

  HTTPClient http;
  http.setReuse(false);
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_UPLOAD_TIMEOUT_MS);

  bool began = isHttps ? http.begin(sclient, uploadUrl)
                       : http.begin(pclient, uploadUrl);
  if (!began) {
    Serial.println("[put] begin() failed -> retry");
    return STEP_RETRY;
  }
  // Content-Type MUST equal the contentType we presigned with.
  http.addHeader("Content-Type", PRESIGN_CONTENT_TYPE);

  int code = http.PUT((uint8_t *)buf, len);
  String resp = (code == 200) ? String("") : http.getString();
  StepResult r = classifyHttp("put", code, resp, /*putLeg=*/true);
  http.end();
  if (r == STEP_OK) Serial.printf("[put] 200 uploaded %u bytes\n", (unsigned)len);
  return r;
}

// =============================================================================
//  Step 3: post the scan (Idempotency-Key REUSED across retries)
// =============================================================================
static StepResult postScan(const char *capturedAt, const String &objectKey,
                           const char *contentHash, int width, int height,
                           const char *idemKey, const Classification &c) {
  WiFiClientSecure client;
  applyAppTls(client);
  HTTPClient http;
  http.setReuse(false);
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_RESPONSE_TIMEOUT_MS);

  String url = String(APP_URL) + "/api/v1/ingest/scans";
  if (!http.begin(client, url)) {
    Serial.println("[scan] begin() failed -> retry");
    return STEP_RETRY;
  }
  http.addHeader("Authorization", authHeader());
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Idempotency-Key", idemKey);  // same value on every retry
  static const char *kCollect[] = {"Retry-After"};
  http.collectHeaders(kCollect, 1);

  String body = buildScanBody(capturedAt, objectKey, contentHash, width, height, c);
  int code = http.POST(body);
  String resp = http.getString();
  captureRetryAfter(http, code);
  StepResult r = classifyHttp("scan", code, resp);
  http.end();
  if (r != STEP_OK) return r;

  JsonDocument doc;
  if (deserializeJson(doc, resp) == DeserializationError::Ok) {
    const char *status = doc["status"].as<const char *>();
    if (status && strcmp(status, "AUTO_MATCHED") == 0) {
      Serial.printf("[scan] AUTO_MATCHED scanId=%s ingestionEventId=%s\n",
                    doc["scanId"].as<const char *>() ? doc["scanId"].as<const char *>() : "?",
                    doc["ingestionEventId"].as<const char *>() ? doc["ingestionEventId"].as<const char *>() : "?");
    } else {
      Serial.printf("[scan] %s ingestionEventId=%s (parked for human reconciliation)\n",
                    status ? status : "?",
                    doc["ingestionEventId"].as<const char *>() ? doc["ingestionEventId"].as<const char *>() : "?");
    }
  }
  return STEP_OK;
}

// =============================================================================
//  Orchestration: capture -> hash -> (presign -> put -> scan) with backoff
// =============================================================================
static bool doScanWithRetries() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[scan] no WiFi -> aborting capture");
    return false;
  }
  if (!g_timeSynced && !syncTime()) {
    Serial.println("[scan] clock not synced -> cannot set capturedAt, abort");
    return false;
  }
  // Periodic drift guard: refresh the clock on long uptimes. Non-fatal: if the
  // refresh fails we keep the previously synced (still-valid) clock.
  if (g_timeSynced && (millis() - g_lastNtpSyncMs) > NTP_RESYNC_INTERVAL_MS) {
    Serial.println("[ntp] periodic resync (drift guard)");
    syncTime();
  }

  camera_fb_t *fb = captureFrame();
  if (!fb) return false;

  // Values fixed once per capture and reused across all retries.
  char contentHash[65];
  sha256Hex(fb->buf, fb->len, contentHash);
  Serial.printf("[hash] sha256=%s\n", contentHash);

  char capturedAt[40];
  if (!isoTimestampUTC(capturedAt, sizeof(capturedAt))) {
    Serial.println("[scan] failed to format capturedAt -> abort");
    esp_camera_fb_return(fb);
    return false;
  }

  char idemKey[33];
  genIdempotencyKey(idemKey);  // ONCE per scan; reused on every retry
  Serial.printf("[scan] capturedAt=%s Idempotency-Key=%s\n", capturedAt, idemKey);

  Classification cls;
  runInference(fb, cls);

  bool     ok      = false;
  uint32_t backoff = RETRY_BASE_MS;

  // Cache a successful upload so a scan-only failure does NOT re-upload the
  // JPEG (which would burn the rate budget and orphan a storage object). We
  // only re-presign + re-PUT when we have not uploaded yet, when the upload
  // step itself failed, or when the cached presigned URL is likely expired.
  String   objectKey, uploadUrl;
  bool     uploaded     = false;
  uint32_t uploadedAtMs = 0;

  for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      uint32_t waitMs;
      if (g_retryAfterMs) {
        waitMs = g_retryAfterMs;
        g_retryAfterMs = 0;
        Serial.printf("[retry] attempt %d/%d honoring Retry-After: %lu ms (SAME Idempotency-Key)\n",
                      attempt, MAX_RETRIES, (unsigned long)waitMs);
      } else {
        uint32_t jitter = esp_random() % RETRY_JITTER_MS;
        waitMs = backoff + jitter;
        Serial.printf("[retry] attempt %d/%d in %lu ms (SAME Idempotency-Key)\n",
                      attempt, MAX_RETRIES, (unsigned long)waitMs);
        backoff = min<uint32_t>(backoff * 2, RETRY_MAX_MS);
      }
      delay(waitMs);
      connectWiFi(WIFI_CONNECT_TIMEOUT_MS);   // blocking (re)connect is fine mid-retry
      if (WiFi.status() != WL_CONNECTED) continue;
    }

    // Drop a cached upload whose presigned URL may have expired (URLs live
    // ~300s; PRESIGN_REUSE_MAX_MS is set safely below that).
    if (uploaded && (millis() - uploadedAtMs) > PRESIGN_REUSE_MAX_MS) {
      Serial.println("[retry] cached presigned URL likely expired -> re-presign + re-upload");
      uploaded = false;
    }

    if (!uploaded) {
      StepResult r = presign(FILE_NAME, fb->len, objectKey, uploadUrl);
      if (r == STEP_FATAL) break;
      if (r == STEP_RETRY) continue;

      r = putBytes(uploadUrl, fb->buf, fb->len);
      if (r == STEP_FATAL) break;
      if (r == STEP_RETRY) continue;

      uploaded     = true;
      uploadedAtMs = millis();
    }

    StepResult r = postScan(capturedAt, objectKey, contentHash,
                            (int)fb->width, (int)fb->height, idemKey, cls);
    if (r == STEP_FATAL) break;
    if (r == STEP_RETRY) continue;  // keep the cached upload; only re-post next time

    ok = true;
    break;
  }

  esp_camera_fb_return(fb);  // release PSRAM frame buffer

  if (ok) Serial.println("[scan] DONE");
  else    Serial.println("[scan] FAILED (retries exhausted or fatal error)");
  return ok;
}

static void triggerScan() {
  if (g_busy) {
    Serial.println("[trigger] busy, ignoring");
    return;
  }
  g_busy = true;
  connectWiFi(WIFI_CONNECT_TIMEOUT_MS);  // ensure a link before we capture/upload
  doScanWithRetries();
  g_busy = false;
}

// =============================================================================
//  Arduino entry points
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[boot] Lumiscan ESP32-CAM dermatoscope");
  logKeyMasked();
  Serial.printf("[cfg] APP_URL=%s target=%s\n", APP_URL,
                TARGET_USE_LESION ? "lesionId" : "mrn");

  // Defense-in-depth: never point the bearer key at a plaintext endpoint.
  if (strncmp(APP_URL, "https://", 8) != 0) {
    Serial.println("[cfg] FATAL: APP_URL must start with https:// -- refusing to send the device key over plaintext. Halting.");
    while (true) delay(1000);
  }
#if USE_INSECURE_TLS
  Serial.println("[cfg] WARNING: USE_INSECURE_TLS=1 (TLS certs NOT verified) -- bench only");
#endif

  pinMode(BUTTON_PIN, INPUT_PULLUP);  // button wired to GND, active LOW

  // Retry camera init a few times, then reboot rather than bricking a field
  // device on a transient sensor/power glitch.
  int camTries = 0;
  while (!initCamera()) {
    if (++camTries >= CAMERA_INIT_MAX_TRIES) {
      Serial.printf("[boot] camera init failed %d times -> restarting in 5 s\n", camTries);
      delay(5000);
      esp_restart();
    }
    Serial.printf("[boot] camera init failed (try %d/%d) -> retrying\n",
                  camTries, CAMERA_INIT_MAX_TRIES);
    delay(1000);
  }

  connectWiFi(WIFI_CONNECT_TIMEOUT_MS);
  syncTime();

  // Capture once on boot.
  Serial.println("[boot] capture-on-boot");
  triggerScan();

  Serial.println("[boot] idle; press the button (GPIO to GND) to capture");
}

void loop() {
  ensureWiFi();  // non-blocking keep-alive; never stalls button handling

  // Debounced, edge-triggered button (active LOW).
  int reading = digitalRead(BUTTON_PIN);
  if (reading != g_lastButtonRead) {
    g_lastDebounceMs = millis();
    g_lastButtonRead = reading;
  }
  if (millis() - g_lastDebounceMs > BUTTON_DEBOUNCE_MS) {
    if (reading != g_buttonState) {
      g_buttonState = reading;
      if (g_buttonState == LOW) {  // falling edge = press
        Serial.println("[btn] pressed -> capture");
        triggerScan();
      }
    }
  }

  delay(10);  // idle
}