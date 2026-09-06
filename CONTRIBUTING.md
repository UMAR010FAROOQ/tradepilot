# Development Safety

Use a short-lived branch, keep changes scoped, and run `npm run validate` before pushing. Never commit `.env.local`, service-account JSON, provider keys, passwords, PINs, or OTPs.

Pull requests run CI. Merges to `main` automatically deploy Firebase Hosting after validation. Firestore rules and indexes remain manual and require explicit review:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Do not add live provider calls to unit tests. Use deterministic fixtures and the Firestore emulator for rules tests.

