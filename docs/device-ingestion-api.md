# Lumiscan Device Ingestion API

Base URL: `APP_URL`

Authentication: devices send `Authorization: Bearer lsk_<prefix8>_<secret>`.
The server looks up the prefix, verifies the stored hash, and derives `org_id`
from the device row. Devices never send organization identifiers.

## POST `/api/v1/ingest/scans`

Required header: `Idempotency-Key`

```json
{
  "capturedAt": "2026-07-03T12:00:00.000Z",
  "subject": { "lesionId": "00000000-0000-0000-0000-000000000000" },
  "classification": {
    "label": "SUSPICIOUS",
    "confidence": 0.82,
    "confidenceLabel": "SUSPICIOUS",
    "metrics": { "diameter_mm": 6.8, "asymmetry_score": 6.1 },
    "metricsScale": "DERMOSCOPE"
  },
  "images": [
    {
      "imageType": "DERMOSCOPIC",
      "isPrimary": true,
      "objectKey": "org_<orgId>/patient_<id>/lesion_<id>/scan_<id>/image.webp",
      "contentHash": "sha256hex"
    }
  ]
}
```

Alternative matching payload:

```json
{
  "capturedAt": "2026-07-03T12:00:00.000Z",
  "patientRef": {
    "mrn": "DEMO-001",
    "bodyRegionHint": "UPPER_BACK",
    "bodySide": "LEFT"
  },
  "classification": { "...": "..." },
  "images": []
}
```

Responses:

- `200 { "status": "AUTO_MATCHED", "ingestionEventId": "...", "scanId": "..." }`
- `200 { "status": "NEEDS_RECONCILIATION", "ingestionEventId": "..." }`
- Idempotent replays return the original response without creating a duplicate scan.
- Errors use `{ "error": { "type": "...", "message": "..." } }`.

## POST `/api/v1/ingest/images/presign`

```json
{
  "lesionId": "00000000-0000-0000-0000-000000000000",
  "fileName": "scan.webp",
  "contentType": "image/webp",
  "contentLength": 123456
}
```

Returns `{ "objectKey", "uploadUrl", "expiresInSeconds": 300 }`.
