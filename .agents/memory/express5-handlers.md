---
name: Express 5 Async Handler Pattern
description: The correct TypeScript pattern for async Express 5 route handlers to avoid TS7030
---

## Rule

All async route handlers must:
1. Declare explicit return type `: Promise<void>`
2. Use `res.xxx(); return;` for early exits (NOT `return res.xxx()`)

```ts
router.get("/path", async (req, res): Promise<void> => {
  try {
    if (!valid) {
      res.status(400).json({ error: "bad" });
      return; // ← explicit return after response
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed");
    res.status(500).json({ error: "Failed" });
  }
});
```

**Why:** In Express 5, `res.json()` returns `void`. Mixing `return res.json()` (explicit void return) with paths that fall through causes TS7030 "Not all code paths return a value" because TypeScript sees inconsistent return behavior.

**How to apply:** Any time you add or edit Express 5 async route handlers in `artifacts/api-server/src/routes/`. The `: Promise<void>` annotation is required on every async handler.
