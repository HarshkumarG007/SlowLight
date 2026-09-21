# 20 — CONFIGURATION

## 20.1 Layers
1. **`packages/config/site.config.json`** — non-secret, build-time product configuration (below).
2. **Server runtime config** — validated by zod at boot from environment variables; missing/invalid = refuse to start.
3. **Secrets** — Secrets Manager only (few; Doc 10 §10.7). **Personal strings** — database `site_texts` (sealed), never config or code.

## 20.2 `site.config.json` (§37, §50)
<!-- extract: packages/config/site.config.json -->
```json
{
  "site": { "name": "Slow Light", "description": "A private place.", "timezone": "[IANA_TIMEZONE]", "defaultLocale": "en", "themeColor": "#050814" },
  "experience": {
    "defaultChapter": null,
    "audioEnabledByDefault": false,
    "reducedMotionSupport": true,
    "thresholdMaxSeconds": 8,
    "darkAdaptation": { "enabled": true, "idleSeconds": 6, "rampSeconds": 8 },
    "hudFadeAfterSeconds": 4,
    "restFadeMs": 2000
  },
  "theme": { "default": "night", "roomThemes": { "letters": "lamp" }, "tokensPath": "packages/tokens/tokens.json" },
  "security": {
    "session": {
      "recipient": { "idle": "72h", "absolute": "30d", "rotateEvery": "24h" },
      "ephemeral": { "idle": "30m", "absolute": "2h" },
      "author": { "idle": "30m", "absolute": "8h", "elevatedFor": "15m" }
    },
    "mediaUrlLifetimeSeconds": { "image": 90, "audio": 600, "video": 900 },
    "maxLoginAttempts": 5,
    "loginCooldownMinutes": 15,
    "challengeTtlSeconds": 120,
    "invite": { "ttlHours": 24, "maxAttempts": 5, "phraseWords": 5 },
    "knock": { "enabled": true, "codeDigits": 6, "ttlMinutes": 10, "maxAttempts": 5 },
    "geoAllow": ["[COUNTRY_CODE]"],
    "adminDoorDefaultHours": 4,
    "requireSecondAdminCredential": true
  },
  "media": {
    "image": { "widths": [320, 960, 1440, 2560], "avifQuality": 55, "jpegQuality": 82, "maxPixels": 100000000, "maxBytes": 52428800 },
    "video": { "maxBytes": 2147483648, "maxMinutes": 60, "renditions": ["720p", "1080p"], "crf": 22 },
    "audio": { "maxBytes": 209715200, "maxMinutes": 120, "bitrateKbps": 128 },
    "trashDays": 30
  },
  "performance": {
    "budgets": { "veilJsGzipKB": 120, "worldChunkGzipKB": 350, "lcpMs": 1800, "inpMs": 200, "cls": 0.05, "mobileMemoryMB": 250 },
    "tierGovernor": { "windowSeconds": 2, "stepDownAt": 1.25, "stepUpAfterStableSeconds": 20 }
  },
  "privacy": { "analytics": false, "clientErrorReporting": true, "recipientActivityVisibleToAuthor": false, "auditContentAccess": false, "ipStorage": "prefix" },
  "features": { "timeline": true, "letters": true, "archive": true, "future": true, "map": false, "replies": false, "gyroParallax": false, "e2ee": false }
}
```
The web build reads only the `site`, `experience`, `theme`, `features` and `performance.budgets` keys; security values are enforced server-side and are not shipped to the browser.

## 20.3 Environment variables (`.env.example`)
Labels: **PUBLIC** = may be embedded in the browser build (must start with `VITE_`); **SERVER** = non-secret server config; **SECRET-REF** = names a secret, never the value; anything not PUBLIC **MUST NEVER reach the browser**. Placeholders only.
<!-- extract: .env.example -->
```bash
# ---------- PUBLIC (browser-safe) ----------
VITE_SITE_ORIGIN=https://app.example.com
VITE_ADMIN_ORIGIN=https://door-x7k2.example.com
VITE_BUILD_ID=dev

# ---------- SERVER (never to the browser) ----------
NODE_ENV=development
PORT=8080
SITE_ORIGIN=https://app.example.com
WEBAUTHN_RP_ID=example.com
WEBAUTHN_RP_NAME=Slow Light
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slowlight
DB_USER=sl_api
DB_AUTH_MODE=password            # 'iam' in production; 'password' only for local Docker
DB_PASSWORD=change-me-local-only # local only; production uses IAM auth (no password)
DB_SSL=true
AWS_REGION=[REGION]
S3_QUARANTINE_BUCKET=sl-quarantine
S3_MEDIA_BUCKET=sl-media
S3_VAULT_BUCKET=sl-vault
KMS_SEALED_KEY_ID=alias/sl-sealed  # local dev may set KEY_SERVICE=local
KEY_SERVICE=kms                  # 'local' is refused when NODE_ENV=production
LOCAL_DEV_MASTER_KEY=            # dev only; refused in production
CLOUDFRONT_KEY_PAIR_ID=[KEY_PAIR_ID]
CLOUDFRONT_PRIVATE_KEY_SECRET_ID=sl/cloudfront-signing-key   # SECRET-REF: name of the secret, not the key
ECS_WORKER_TASK_DEFINITION=sl-media-worker
ECS_CLUSTER=sl
ALERT_EMAIL_FROM=alerts@alerts.example.com
ALERT_EMAIL_TO_SECRET_ID=sl/author-alert-address              # SECRET-REF
LOG_LEVEL=info
```
Boot check: the API validates the environment with zod and **refuses to start** if `NODE_ENV=production` and `KEY_SERVICE=local` or `DB_AUTH_MODE=password`. CI test: the built `dist/` must not contain any SERVER/SECRET variable name or value.
