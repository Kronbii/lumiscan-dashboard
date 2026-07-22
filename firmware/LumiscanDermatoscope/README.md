# Lumiscan WiFi Dermatoscope — ESP32-CAM Firmware

Arduino-framework firmware that captures a JPEG, uploads it to the Lumiscan
device-ingest API, and posts a scan record with an on-device classification.
Implements the ingest contract exactly: `presign → PUT bytes → post scan`, with
a reused `Idempotency-Key`, exponential backoff, and strict metrics.

## Files

- `lumiscan_dermatoscope.ino` — the sketch (the enclosing folder must have the
  **same base name** as the `.ino`, an Arduino IDE requirement).
- `config.h` — **all** user configuration and secrets. Edit this only.

## Secrets & version control

`config.h` is meant to hold your real `WIFI_PASSWORD` and `DEVICE_API_KEY`, so
it must not be committed with those filled in. Recommended one-time setup:

```
cp config.h config.h.example     # then blank the secrets in the .example copy
echo "config.h" >> .gitignore    # keep the real file out of git
```

Commit `config.h.example` (placeholders only); each builder copies it to
`config.h` and fills in their own values.

## Hardware

- **Default board:** AI-Thinker ESP32-CAM (OV2640, 4 MB PSRAM).
- **ESP32-S3-CAM:** supported via the commented pin block in `config.h`
  (comment out `CAMERA_MODEL_AI_THINKER`, uncomment the S3 block, select the S3
  board in the IDE). No `.ino` changes needed. Pick a free S3 GPIO for
  `BUTTON_PIN` (e.g. GPIO0 / onboard BOOT button); the AI-Thinker default of
  GPIO13 does not apply to the S3.
- **Capture button:** momentary switch between `BUTTON_PIN` (default GPIO13) and
  `GND`. Uses the internal pull-up (active-LOW). GPIO13 is free on the
  AI-Thinker board only if you are not using the SD card. Avoid strapping pins
  (0, 2, 12, 15) and the camera/flash pins.
- **Programming:** a USB-to-serial (FTDI) adapter, since the ESP32-CAM has no
  USB. Use 5 V→5 V (board has a regulator) and common GND, TX→U0R, RX→U0T.

## Libraries / toolchain

Install in the Arduino IDE (Boards Manager + Library Manager):

- **esp32 by Espressif Systems** — core 2.0.x or 3.x. Bundles `esp_camera`,
  `WiFiClientSecure`, `HTTPClient`, and `mbedtls`.
- **ArduinoJson** by Benoit Blanchon — **v7.0 or newer** (the sketch uses the
  v7 `JsonDocument` API).

The SHA-256 call uses the one-shot `mbedtls_sha256()`, which compiles on both
mbedtls 2.x (core 2.x) and 3.x (core 3.x). The `contentHash` it produces is a
fixed 64-char lowercase hex string, valid under the contract's 16..128 bound.

## Arduino IDE board settings

- **Board:** "AI Thinker ESP32-CAM" (or your ESP32-S3 board).
- **PSRAM:** Enabled.
- **Partition Scheme:** "Huge APP (3MB No OTA/1MB SPIFFS)" — TLS + camera need
  the room.
- **CPU Frequency:** 240 MHz. **Flash:** 4 MB (QIO).

## Configure (`config.h`)

1. `WIFI_SSID` / `WIFI_PASSWORD`.
2. `APP_URL` — e.g. `https://lumiscan-dashboard.vercel.app` (no trailing slash).
   **Must be `https://`** — the firmware halts at boot if it is not, so the
   bearer key is never sent over plaintext.
3. `DEVICE_API_KEY` — the full `lsk_<prefix>_<secret>` key from the dashboard
   (Devices → Create). Kept secret; the firmware only ever logs the public
   `lsk_<prefix>_` portion.
4. Target mode — the two modes differ in **how the scan target is identified**;
   both use the identical `presign → PUT → scan` flow:
   - `TARGET_USE_LESION 1` (**lesion mode**) → set `LESION_ID` (a UUID). The
     presign body sends `lesionId`; the scan sends `subject.lesionId`. Use this
     when the device already knows the exact lesion record to attach to.
   - `TARGET_USE_LESION 0` (**MRN mode**) → set `PATIENT_MRN` (and optional
     `BODY_REGION_HINT` / `BODY_SIDE`, `""` to omit). The presign body sends
     `mrn`; the scan sends `patientRef` with the MRN plus optional body hints.
     The server tries to match a lesion for that patient: a match returns
     `AUTO_MATCHED`; no match returns `NEEDS_RECONCILIATION` (parked for a
     human). An **unknown MRN** returns **404** (fatal, no retry).
5. Classification defaults (`CLS_*`, `M_*`) — placeholders feeding the
   `runInference()` hook in the `.ino`. **Replace that hook with real on-device
   inference** (the server does not run ML). Set any metric to `METRIC_UNSET`
   (-1) to omit it — the metrics object is strict, so only the documented keys
   are allowed; put vendor fields under `metrics.raw`.
6. TLS (see below).

## TLS / certificate setup

- **Production (default `USE_INSECURE_TLS 0`):** `APP_ROOT_CA` ships with **ISRG
  Root X1** (Let's Encrypt / Vercel, valid to 2035). If you host `APP_URL`
  elsewhere, replace it with your host's root CA (PEM):
  `openssl s_client -connect your.host:443 -showcerts` and paste the root cert.
- The pre-signed upload PUT usually hits a **different** host (your S3/R2/MinIO
  object storage). Set `STORAGE_ROOT_CA` to that host's root CA. It defaults to
  reusing `APP_ROOT_CA` (fine for AWS/R2-style hosts that chain to ISRG Root X1).
  Plain-`http` upload URLs (e.g. LAN MinIO) skip TLS automatically.
- Hostname verification is active in both TLS paths (mbedtls checks the SAN
  against the SNI host). The device bearer key therefore only ever crosses a
  verified channel; only the pre-signed (no-auth) PUT may use plain http.
- **Bench testing:** set `USE_INSECURE_TLS 1` to call `setInsecure()` and skip
  certificate verification. The firmware prints a warning at boot. Never ship
  with this enabled.

## Behavior

- Connects to WiFi with auto-reconnect; syncs the clock over NTP (UTC) and
  re-syncs periodically (`NTP_RESYNC_INTERVAL_MS`, default 24 h) to bound drift.
- The main `loop()` keep-alive is non-blocking: a downed link only kicks an
  async reconnect, so button presses are never stalled. Blocking connects are
  reserved for boot and the pre-scan/mid-retry paths.
- On boot, retries camera init up to `CAMERA_INIT_MAX_TRIES` times, then
  `esp_restart()`s rather than bricking on a transient glitch.
- Captures a JPEG on **boot** and on each debounced **button press**; discards a
  couple of warm-up frames first so the image is properly exposed; idle
  otherwise.
- Per capture: computes SHA-256 → lowercase hex (`contentHash`), formats
  `capturedAt` as ISO-8601 UTC with a trailing `Z`, and generates one
  `Idempotency-Key`. These three values are frozen for the whole scan.
- Runs `presign → PUT (Content-Type: image/jpeg) → POST scan`. A successful
  presign+upload is **cached**: if only the scan POST needs retrying, the
  firmware re-posts with the same `objectKey`/`Idempotency-Key` instead of
  re-uploading the image (avoids orphaned storage objects and wasted rate
  budget). It re-presigns + re-uploads only when the upload leg itself failed or
  the cached presigned URL is near expiry (`PRESIGN_REUSE_MAX_MS`, < the ~300 s
  server TTL).
- On timeout / 5xx / 429 it backs off exponentially (bounded, jittered) and
  retries **with the same Idempotency-Key**, so the server never creates
  duplicates. A server `Retry-After` header on a 429 is honored for the next
  wait. Object-storage PUT errors that indicate an expired/transient condition
  (403/408/409/429/5xx) trigger a fresh presign on the next attempt. 400 / 401 /
  404 are fatal (no retry) with distinct serial messages and, where present, the
  server's error `type`/`message`/`issues`.
- On success prints `AUTO_MATCHED` (with `scanId`) or `NEEDS_RECONCILIATION`.

## Flashing (AI-Thinker ESP32-CAM)

1. Wire the FTDI adapter; jumper **GPIO0 → GND** to enter bootloader.
2. Press the RESET button.
3. Upload from the IDE at 115200 baud.
4. Remove the GPIO0→GND jumper and press RESET to run.
5. Open Serial Monitor at **115200** to watch the scan flow.