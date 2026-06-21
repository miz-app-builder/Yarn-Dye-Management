---
name: Drizzle Insert Type Inference
description: Workaround for TS2769 overload errors when calling db.insert().values()
---

## Rule

When `db.insert(table).values({...})` gives TS2769 "No overload matches this call" even though all field types look correct, cast the values object with `as any`:

```ts
const [row] = await db.insert(ordersTable).values({
  orderNo,
  buyerName: body.data.buyerName,
  // ...
} as any).returning();
```

**Why:** Drizzle ORM's `.values()` has two overloads (single object vs array). TypeScript's overload resolution sometimes fails when the inferred type of the values object involves unions from optional Zod fields (e.g. `string | undefined` from `.optional()`), even when the runtime type is always correct. The `as any` cast suppresses the false positive without affecting runtime safety.

**How to apply:** Only use when the TypeScript error is TS2769 on a `.values()` call and you've verified all field names and types are correct by checking the DB schema.
