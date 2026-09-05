# TradePilot production checklist

TradePilot is a simulated trading application. Completing this checklist does
not enable real-money trade execution or automatic funding.

## Release sequence

1. Run `npm install`.
2. Configure browser-safe environment values from `.env.example`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Authenticate the Firebase CLI with `firebase login`.
6. Select and verify the Firebase project with `firebase use --add`.
7. Deploy Firestore rules and indexes.
8. Deploy Firebase Hosting.
9. Copy the production Hosting URL from the CLI output.
10. Add the Hosting domain to Firebase Authentication authorized domains if required.
11. Add the exact Hosting origin to the Cloudflare Worker CORS allowlist.
12. Test production signup, login, reset, status protection, and logout.
13. Test Binance Crypto quotes and reconnect states.
14. Test Twelve Data Forex quotes, session, stale, and unavailable states.
15. Test XAU/USD quote, chart, and simulated-order safeguards.
16. Test every manual deposit and withdrawal flow without real payment credentials.
17. Test simulated buy, sell, partial close, full close, portfolio, and analytics.
18. Test administrator permissions, funding decisions, notifications, and reporting.
19. Test keyboard use and layouts at approximately 375, 768, 1024, and desktop widths.
20. Scan the repository and production assets again and verify no private API secrets are exposed.

## 1. Prepare the local release

- [ ] Use a supported Node.js version and run `npm install` from the repository root.
- [ ] Copy `.env.example` to `.env.local`; do not commit `.env` or `.env.local`.
- [ ] Fill every required `VITE_FIREBASE_*` variable with the Firebase Web App's public configuration.
- [ ] Set `VITE_FOREX_API_BASE_URL` only to the public Cloudflare Worker URL. Never place `TWELVE_DATA_API_KEY` or another private key in a `VITE_` variable.
- [ ] Review the optional public payment instructions and support address. Treat every `VITE_` value as visible to visitors and generated JavaScript.
- [ ] Run `npm run lint` and `npm run build` successfully.

## 2. Firebase project setup

- [ ] Install the Firebase CLI if needed, then authenticate with `firebase login`.
- [ ] Select the intended Firebase project with `firebase use --add`. The checked-in default alias currently points to `tradepilot-3591a`; confirm it before every deployment.
- [ ] In Firebase Authentication, enable the intended sign-in providers and confirm Email/Password is enabled.
- [ ] In Authentication **Settings > Authorized domains**, add the final Firebase Hosting domain and any approved custom domain. Keep localhost only when local development is required.
- [ ] Confirm Firestore is in the intended region and that production data is backed up according to the project's operational needs.
- [ ] Deploy and verify security configuration first:

```sh
firebase deploy --only firestore:rules,firestore:indexes
```

- [ ] Test as an active user, inactive/suspended user, and administrator. Verify users cannot read other users' profiles, wallets, positions, trades, transactions, notifications, deposits, withdrawals, or watchlists.
- [ ] Verify funding approvals remain atomic and normal users cannot directly change balances, approve requests, create completed funding transactions, or create administrative notifications.

## 3. Forex proxy and CORS

- [ ] Keep `TWELVE_DATA_API_KEY` stored only as an encrypted Cloudflare Worker secret.
- [ ] Configure an exact CORS allowlist containing the local Vite origin (normally `http://localhost:5173`) and, after the first Hosting deployment, the exact production Hosting/custom-domain origin.
- [ ] For permitted origins, echo the request origin in `Access-Control-Allow-Origin`, return `Vary: Origin`, handle `OPTIONS`, and allow only required read-only methods and headers. Reject unknown origins; do not use a wildcard in production.
- [ ] Confirm Crypto still loads if the Worker is unavailable and that Forex/Gold show an unavailable or stale state without fabricated prices.

## 4. Hosting release

- [ ] Build again immediately before release with `npm run build`.
- [ ] Inspect `dist` and confirm no `.env`, credentials, private keys, provider secrets, source maps, or unrelated large assets are present.
- [ ] Deploy Hosting without modifying Firestore data:

```sh
firebase deploy --only hosting
```

- [ ] Open the deployed URL directly at `/`, `/login`, `/dashboard`, `/markets`, `/trade`, `/analytics`, `/profile`, and `/admin`. Confirm the SPA rewrite returns the application and protected routes redirect correctly.
- [ ] Verify mobile and desktop layouts, keyboard focus, form labels, dialogs, tables, notification controls, offline status, loading states, and empty/error states.
- [ ] Confirm the page title, description, Open Graph metadata, favicon, and simulated-trading disclosure are accurate.
- [ ] Confirm response headers include `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, immutable caching for hashed assets, and no-cache for `index.html`.

## Content Security Policy follow-up

A strict Content Security Policy is intentionally not enabled in
`firebase.json` yet. Add one only after observing the production application's
actual requests. It must account for Firebase Authentication/Firestore,
Binance HTTPS and WebSocket endpoints, the exact Forex Worker origin, and the
application's required image/font/style/script sources. Roll it out with
`Content-Security-Policy-Report-Only` first; investigate violations before
enforcing it so authentication and market data are not accidentally broken.

## Post-release regression

- [ ] Create and sign in to a test account, then sign out and reset its password.
- [ ] Confirm live profile role/status updates take effect without a new login.
- [ ] Exercise simulated buy, sell, and close flows; verify balances, positions, history, and analytics agree.
- [ ] Submit test deposit and withdrawal requests and verify administrator approval/rejection and user notification flows.
- [ ] Test disconnected mode and provider failure recovery without increasing polling frequency.
- [ ] Review Firebase and Cloudflare logs for authorization failures, unexpected provider traffic, and client errors. Do not log payment details or credentials.
