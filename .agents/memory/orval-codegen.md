---
name: Orval Codegen Compatibility
description: Known issues that break orval 8.9.1 codegen in this project and how to fix them
---

## Rule
Before running `pnpm --filter @workspace/api-spec run codegen`, ensure the `openapi.yaml` is free of:
1. OpenAPI 3.1 nullable array type syntax
2. Non-ASCII characters in any position
3. Duplicate property keys in the same schema object

## Known Issues & Fixes

### 1. OpenAPI 3.1 nullable array types
Orval 8.9.1 does NOT support `type: [string, 'null']` (OpenAPI 3.1 style).
It throws: `Failed to resolve input: Please provide a valid string value or pass a loader to process the input`

**Fix:** Replace with OpenAPI 3.0 style:
```yaml
# BROKEN (3.1)
type: [string, 'null']

# FIXED (3.0 compatible)
type: string
nullable: true
```

Use this Python one-liner to bulk-fix:
```python
for typ in ['string', 'integer', 'number', 'boolean']:
    old = f"type: [{typ}, 'null']"
    # replace line-by-line preserving indentation
```

### 2. Non-ASCII characters
Characters like `─` (U+2500) in YAML comments break orval's parser.
Strip with: `re.sub(r'[^\x00-\x7F]+', '-', content)`

### 3. Duplicate keys in same schema object
YAML allows duplicate keys (last wins) but orval fails silently or crashes.
Scan with: `grep -n 'propertyName:' openapi.yaml` and remove duplicates.

## Why
Orval 8.9.1 uses an older OpenAPI parser that expects 3.0-style schemas.
The project spec declares `openapi: 3.1.0` but must use 3.0-compatible features for orval.

## How to Apply
After any edit to `lib/api-spec/openapi.yaml`, test with:
```bash
node_modules/.bin/orval --input ./openapi.yaml --output /tmp/test.ts --client react-query
```
before running full codegen.
