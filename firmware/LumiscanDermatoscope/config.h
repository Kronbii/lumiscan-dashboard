/*
 * =============================================================================
 *  config.h  --  ALL user configuration for the Lumiscan ESP32-CAM firmware
 * =============================================================================
 *  Edit everything here. Do not hard-code secrets in the .ino.
 *
 *  SECRETS: this file holds your real WiFi password and device API key. Do NOT
 *  commit a filled-in copy. Ship a redacted config.h.example instead and add
 *  config.h to .gitignore (see README).
 * =============================================================================
 */
#ifndef LUMISCAN_CONFIG_H
#define LUMISCAN_CONFIG_H

// ---------------------------------------------------------------------------
//  WiFi
// ---------------------------------------------------------------------------
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// ---------------------------------------------------------------------------
//  Lumiscan API
// ---------------------------------------------------------------------------
// No trailing slash. The same host serves the web app and the device paths.
// MUST be https:// -- the firmware halts at boot otherwise (the bearer key is
// never sent over plaintext).
#define APP_URL         "https://lumiscan-dashboard.vercel.app"

// Device key issued in the dashboard (Devices > Create). Format:
//   lsk_<8 hex chars>_<secret>
// This is a SECRET. It is never fully printed to Serial by this firmware.
#define DEVICE_API_KEY  "lsk_0011a2b3_REPLACE_WITH_FULL_SECRET_base64url_32chars_min"

// ---------------------------------------------------------------------------
//  Target selection  --  identify what this scan is of
// ---------------------------------------------------------------------------
//   1 = lesion mode: presign with lesionId, scan uses subject.lesionId
//   0 = MRN mode:    presign with mrn,      scan uses patientRef.mrn
#define TARGET_USE_LESION   1

// Used when TARGET_USE_LESION == 1
#define LESION_ID       "00000000-0000-0000-0000-000000000000"  // UUID

// Used when TARGET_USE_LESION == 0
#define PATIENT_MRN         "MRN-12345"     // 1..80 chars
// Optional hints (empty string "" = omit). See enums in the contract.
//   BodyRegion: HEAD NECK CHEST ABDOMEN UPPER_BACK LOWER_BACK LEFT_ARM RIGHT_ARM
//               LEFT_LEG RIGHT_LEG LEFT_HAND RIGHT_HAND LEFT_FOOT RIGHT_FOOT ...
//   BodySide:   LEFT RIGHT MIDLINE UNSPECIFIED
#define BODY_REGION_HINT    "UPPER_BACK"
#define BODY_SIDE           "LEFT"

// ---------------------------------------------------------------------------
//  Image / upload
// ---------------------------------------------------------------------------
// Camera output is JPEG; contentType MUST be image/jpeg to match the PUT.
#define PRESIGN_CONTENT_TYPE  "image/jpeg"
#define FILE_NAME             "scan.jpg"      // 1..255 chars
#define IMAGE_TYPE            "DERMOSCOPIC"   // DERMOSCOPIC | CLINICAL | OTHER
#define IMAGE_IS_PRIMARY      true

// ---------------------------------------------------------------------------
//  Classification defaults (device-side ML result)
//  These feed runInference() in the .ino. Replace that hook with real
//  inference; these values are the fallback/placeholder.
// ---------------------------------------------------------------------------
#define CLS_LABEL             "BENIGN"      // BENIGN|SUSPICIOUS|MALIGNANT|INCONCLUSIVE
#define CLS_CONFIDENCE        0.87f         // 0..1
#define CLS_CONFIDENCE_LABEL  "BENIGN"      // same 4-value enum as label
#define CLS_METRICS_SCALE     "DERMOSCOPE"  // DERMOSCOPE|RULER_REF|CLINICIAN_MEASURED|UNCALIBRATED

// Metrics: set any to METRIC_UNSET (-1) to omit it (metrics is a STRICT object;
// unknown keys are rejected with 400 -- only these documented keys are allowed).
#define METRIC_UNSET          (-1.0f)
#define M_DIAMETER_MM         4.2f      // >= 0
#define M_ASYMMETRY_SCORE     1.5f      // 0..10
#define M_BORDER_SCORE        2.0f      // 0..10
#define M_COLOR_SCORE         1.0f      // 0..10
#define M_AREA_MM2            13.8f     // >= 0

// ---------------------------------------------------------------------------
//  TLS
// ---------------------------------------------------------------------------
// Bench fallback: set to 1 to DISABLE certificate verification (setInsecure()).
// Leave 0 for production and provide correct root CAs below.
#define USE_INSECURE_TLS      0

// Root CA for APP_URL. Default below is ISRG Root X1, which Vercel / Let's
// Encrypt chains to (valid until 2035-06-04). If you host elsewhere, replace
// it with your host's root:  openssl s_client -connect host:443 -showcerts
static const char APP_ROOT_CA[] =
"-----BEGIN CERTIFICATE-----\n"
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n"
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n"
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n"
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n"
"A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n"
"T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n"
"B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n"
"B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n"
"KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n"
"OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n"
"jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n"
"qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n"
"rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"
"HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\n"
"hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\n"
"ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n"
"3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\n"
"NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\n"
"ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\n"
"TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\n"
"jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\n"
"oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n"
"4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\n"
"mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\n"
"emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n"
"-----END CERTIFICATE-----\n";

// Root CA for the pre-signed upload URL host. This is your object storage
// (S3/R2/MinIO), which is usually a DIFFERENT host from APP_URL and may use a
// different root -- or plain http on a LAN (then this is unused). Replace as
// needed; default reuses ISRG Root X1 for AWS/R2-style hosts that chain to it.
#define STORAGE_ROOT_CA   APP_ROOT_CA

// ---------------------------------------------------------------------------
//  NTP (UTC)
// ---------------------------------------------------------------------------
#define NTP_SERVER1     "pool.ntp.org"
#define NTP_SERVER2     "time.nist.gov"
#define NTP_TIMEOUT_MS  15000
// Periodic re-sync to bound RC-oscillator drift on long uptimes.
#define NTP_RESYNC_INTERVAL_MS  86400000UL   // 24 h

// ---------------------------------------------------------------------------
//  Timeouts & retry policy
// ---------------------------------------------------------------------------
#define WIFI_CONNECT_TIMEOUT_MS    20000
#define WIFI_RETRY_INTERVAL_MS     5000     // min gap between reconnect attempts

#define HTTP_CONNECT_TIMEOUT_MS    10000
#define HTTP_RESPONSE_TIMEOUT_MS   15000
#define HTTP_UPLOAD_TIMEOUT_MS     30000    // PUT of the JPEG can be larger

#define MAX_RETRIES    4          // total attempts = MAX_RETRIES + 1
#define RETRY_BASE_MS  1000UL     // exponential backoff base
#define RETRY_MAX_MS   30000UL    // backoff cap
#define RETRY_JITTER_MS 500UL     // random 0..this added to each backoff

// A successful presign+upload is cached and reused for scan-only retries so we
// don't re-upload the JPEG (which would orphan a storage object and burn the
// rate budget). Presigned URLs expire ~300 s server-side; keep this safely
// under that so a stale cached URL is refreshed before it can expire.
#define PRESIGN_REUSE_MAX_MS  240000UL      // 4 min

// ---------------------------------------------------------------------------
//  Capture trigger button
// ---------------------------------------------------------------------------
// AI-Thinker ESP32-CAM: GPIO13 is free when no SD card is used. Wire a
// momentary button between the pin and GND (uses the internal pull-up).
// Avoid strapping pins (0, 2, 12, 15) and camera/flash pins.
#define BUTTON_PIN            13
#define BUTTON_DEBOUNCE_MS    50

// ---------------------------------------------------------------------------
//  Camera capture quality
// ---------------------------------------------------------------------------
// Frame sizes: FRAMESIZE_VGA(640x480) SVGA(800x600) XGA(1024x768)
//              SXGA(1280x1024) UXGA(1600x1200). Larger needs PSRAM.
#define CAMERA_FRAME_SIZE     FRAMESIZE_UXGA
#define CAMERA_JPEG_QUALITY   10      // 0..63, lower = better quality/larger file
#define CAMERA_INIT_MAX_TRIES 3       // reinit attempts before esp_restart()
#define CAMERA_WARMUP_FRAMES  2       // frames discarded before the real capture (auto-exposure warm-up)

// ===========================================================================
//  Camera pin map  --  select ONE board
// ===========================================================================
#define CAMERA_MODEL_AI_THINKER   // <-- default; comment out to use S3 block

#if defined(CAMERA_MODEL_AI_THINKER)
// AI-Thinker ESP32-CAM (OV2640)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#else
// ---------------------------------------------------------------------------
// ESP32-S3-CAM variant (Freenove ESP32-S3-WROOM CAM board, OV2640).
// To use: comment out CAMERA_MODEL_AI_THINKER above, uncomment this block,
// select an ESP32-S3 board in the IDE, and pick a free S3 GPIO for BUTTON_PIN
// (many more are available on the S3; e.g. GPIO0 is the onboard BOOT button).
// XIAO ESP32S3 Sense uses a different map again -- check your board's docs.
// ---------------------------------------------------------------------------
// #define PWDN_GPIO_NUM   -1
// #define RESET_GPIO_NUM  -1
// #define XCLK_GPIO_NUM   15
// #define SIOD_GPIO_NUM    4
// #define SIOC_GPIO_NUM    5
// #define Y9_GPIO_NUM     16
// #define Y8_GPIO_NUM     17
// #define Y7_GPIO_NUM     18
// #define Y6_GPIO_NUM     12
// #define Y5_GPIO_NUM     10
// #define Y4_GPIO_NUM      8
// #define Y3_GPIO_NUM      9
// #define Y2_GPIO_NUM     11
// #define VSYNC_GPIO_NUM   6
// #define HREF_GPIO_NUM    7
// #define PCLK_GPIO_NUM   13
#endif

#endif  // LUMISCAN_CONFIG_H