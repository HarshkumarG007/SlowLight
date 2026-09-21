# 21 — JSON SCHEMAS

Schemas (JSON Schema 2020-12) describe the **author-facing/API shapes**. In code they are authored once as zod in `packages/shared` and exported to JSON Schema in CI; this file is the contract those exports must match. The schemas were checked with a validator: valid examples pass; a milestone with significance < 4, a timed letter without `unlockAt`, a scheduled memory without `publishAt`, and unknown properties are all rejected.

<!-- extract: packages/shared/schemas/content.schemas.json -->
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://slowlight.local/schemas/content.schemas.json",
  "title": "Slow Light content schemas (author-facing, API shapes)",
  "$defs": {
    "uuid": { "type": "string", "format": "uuid" },
    "date": { "type": "string", "pattern": "^\\d{4}(-\\d{2}(-\\d{2})?)?$", "description": "YYYY, YYYY-MM or YYYY-MM-DD" },
    "slText": { "type": "string", "maxLength": 100000, "description": "SL-text: paragraphs, line breaks, *italic*, and --- scene breaks. No HTML, no links." },
    "datePrecision": { "enum": ["day", "month", "year", "approx"] },
    "status": { "enum": ["draft", "scheduled", "published", "archived"] },
    "assetRef": {
      "type": "object", "additionalProperties": false, "required": ["assetId", "position"],
      "properties": {
        "assetId": { "$ref": "#/$defs/uuid" },
        "position": { "type": "integer", "minimum": 1 },
        "isCover": { "type": "boolean", "default": false },
        "caption": { "type": ["string", "null"], "maxLength": 500 }
      }
    },
    "memory": {
      "type": "object", "additionalProperties": false,
      "required": ["title", "occurredOn", "datePrecision", "kind", "significance", "status"],
      "properties": {
        "id": { "$ref": "#/$defs/uuid" },
        "chapterId": { "oneOf": [{ "$ref": "#/$defs/uuid" }, { "type": "null" }] },
        "title": { "type": "string", "minLength": 1, "maxLength": 160 },
        "subtitle": { "type": ["string", "null"], "maxLength": 240 },
        "story": { "$ref": "#/$defs/slText" },
        "kind": { "enum": ["moment", "milestone", "trip", "conversation", "ritual", "gift"] },
        "significance": { "type": "integer", "minimum": 1, "maximum": 5 },
        "emotion": { "enum": ["tender", "joyful", "quiet", "bittersweet", "awe", "playful", null] },
        "occurredOn": { "type": "string", "format": "date" },
        "datePrecision": { "$ref": "#/$defs/datePrecision" },
        "recurrence": { "enum": ["none", "yearly"], "default": "none" },
        "location": { "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/location" }] },
        "tags": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9-]{1,40}$" }, "maxItems": 20, "uniqueItems": true },
        "assets": { "type": "array", "items": { "$ref": "#/$defs/assetRef" }, "maxItems": 60 },
        "status": { "$ref": "#/$defs/status" },
        "publishAt": { "type": ["string", "null"], "format": "date-time" },
        "layoutHint": { "oneOf": [{ "type": "null" }, { "type": "object", "additionalProperties": false, "properties": { "dx": { "type": "number", "minimum": -3, "maximum": 3 }, "dy": { "type": "number", "minimum": -3, "maximum": 3 } } }] },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
      },
      "if": { "properties": { "status": { "const": "scheduled" } } },
      "then": { "required": ["publishAt"], "properties": { "publishAt": { "type": "string" } } }
    },
    "milestone": {
      "description": "A memory with kind = milestone and significance >= 4; may recur yearly.",
      "allOf": [{ "$ref": "#/$defs/memory" }, { "properties": { "kind": { "const": "milestone" }, "significance": { "minimum": 4 } } }]
    },
    "location": {
      "type": "object", "additionalProperties": false, "required": ["label", "precision"],
      "properties": {
        "label": { "type": "string", "maxLength": 120 },
        "precision": { "enum": ["exact", "area", "city", "country", "hidden"], "default": "city" },
        "lat": { "type": "number", "minimum": -90, "maximum": 90 },
        "lng": { "type": "number", "minimum": -180, "maximum": 180 }
      }
    },
    "chapter": {
      "type": "object", "additionalProperties": false, "required": ["slug", "title", "status"],
      "properties": {
        "id": { "$ref": "#/$defs/uuid" },
        "slug": { "type": "string", "pattern": "^[a-z0-9-]{1,60}$" },
        "title": { "type": "string", "minLength": 1, "maxLength": 120 },
        "subtitle": { "type": ["string", "null"], "maxLength": 200 },
        "intro": { "$ref": "#/$defs/slText" },
        "ambienceKey": { "type": ["string", "null"] },
        "order": { "type": "integer" },
        "status": { "enum": ["draft", "published", "archived"] }
      }
    },
    "letter": {
      "type": "object", "additionalProperties": false, "required": ["title", "body", "unlockMode", "status"],
      "properties": {
        "id": { "$ref": "#/$defs/uuid" },
        "chapterId": { "oneOf": [{ "$ref": "#/$defs/uuid" }, { "type": "null" }] },
        "title": { "type": "string", "minLength": 1, "maxLength": 160 },
        "body": { "$ref": "#/$defs/slText" },
        "unlockMode": { "enum": ["open", "timed", "held"] },
        "unlockAt": { "type": ["string", "null"], "format": "date-time" },
        "releasedAt": { "type": ["string", "null"], "format": "date-time" },
        "sealCeremony": { "type": "boolean", "default": false },
        "assets": { "type": "array", "items": { "$ref": "#/$defs/assetRef" }, "maxItems": 10 },
        "status": { "enum": ["draft", "published", "archived"] }
      },
      "if": { "properties": { "unlockMode": { "const": "timed" } } },
      "then": { "required": ["unlockAt"], "properties": { "unlockAt": { "type": "string" } } }
    },
    "mediaAsset": {
      "type": "object", "additionalProperties": false, "required": ["id", "kind", "status"],
      "properties": {
        "id": { "$ref": "#/$defs/uuid" },
        "kind": { "enum": ["image", "video", "audio"] },
        "status": { "enum": ["uploading", "processing", "ready", "failed", "quarantined"] },
        "mime": { "type": "string" },
        "bytes": { "type": "integer", "minimum": 0 },
        "width": { "type": "integer" }, "height": { "type": "integer" }, "durationMs": { "type": "integer" },
        "alt": { "type": "string", "maxLength": 500, "description": "Required to publish images and video" },
        "lqip": { "type": "string", "maxLength": 2048 },
        "variants": { "type": "array", "items": { "type": "object", "required": ["label", "mime"], "properties": { "label": { "type": "string" }, "mime": { "type": "string" }, "bytes": { "type": "integer" }, "width": { "type": "integer" }, "height": { "type": "integer" } }, "additionalProperties": false } }
      }
    },
    "futureEntry": {
      "type": "object", "additionalProperties": false, "required": ["kind", "title", "status"],
      "properties": {
        "id": { "$ref": "#/$defs/uuid" },
        "kind": { "enum": ["promise", "place", "plan", "dream", "blank"] },
        "title": { "type": "string", "minLength": 1, "maxLength": 160 },
        "note": { "$ref": "#/$defs/slText" },
        "targetDate": { "oneOf": [{ "$ref": "#/$defs/date" }, { "type": "null" }] },
        "targetPrecision": { "$ref": "#/$defs/datePrecision" },
        "status": { "enum": ["draft", "unlit", "arrived", "archived"] },
        "arrivedMemoryId": { "oneOf": [{ "$ref": "#/$defs/uuid" }, { "type": "null" }] }
      }
    }
  }
}
```

## 21.1 Schema-valid fixtures (used by tests; obviously fake)
<!-- extract: packages/shared/fixtures/examples.valid.json -->
```json
{
 "memory": {"title":"Placeholder memory","occurredOn":"2000-01-01","datePrecision":"day","kind":"moment","significance":2,"status":"draft","tags":["placeholder"],"assets":[{"assetId":"11111111-1111-4111-8111-111111111111","position":1,"isCover":true,"caption":"Placeholder caption"}]},
 "milestone": {"title":"Placeholder milestone","occurredOn":"2000-02-14","datePrecision":"day","kind":"milestone","significance":5,"recurrence":"yearly","status":"published"},
 "chapter": {"slug":"placeholder-chapter","title":"Placeholder chapter","status":"draft"},
 "letter": {"title":"Placeholder letter","body":"Placeholder body.\n\n---\n\nSecond part.","unlockMode":"timed","unlockAt":"2030-01-01T00:00:00Z","sealCeremony":true,"status":"draft"},
 "mediaAsset": {"id":"11111111-1111-4111-8111-111111111111","kind":"image","status":"ready","mime":"image/avif","width":1440,"height":960,"alt":"Placeholder alt text","variants":[{"label":"display","mime":"image/avif"}]},
 "futureEntry": {"kind":"place","title":"Placeholder place","targetDate":"2030","targetPrecision":"year","status":"unlit"}
}
```

## 21.2 Authoring templates (placeholders — not schema-valid by design)
Replace with real content later through the admin console, never in code (RULE-010).
```text
Memory:  [DATE]  [MEMORY TITLE]  [SUBTITLE]  [PERSONAL MESSAGE]  [PHOTO ASSET]  [PLACE]  [TAG]
Letter:  [LETTER TITLE]  [PERSONAL MESSAGE]  [UNLOCK DATE or "held"]
Chapter: [CHAPTER TITLE]  [CHAPTER INTRO]
Future:  [PROMISE / PLACE / PLAN]  [TARGET YEAR]  [NOTE]
Site texts: [GREETING]  [CLOSING LINE]
```
Rules: publishing an image/video requires `alt`; a `milestone` needs significance ≥ 4; dates are `YYYY-MM-DD` with `datePrecision` describing how sure the Author is; timezones are never applied to calendar dates.
