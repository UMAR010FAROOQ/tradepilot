# TradePilot

TradePilot is a dark-first React and Vite platform for simulated Crypto, Forex, and Gold trading. It combines Firebase Authentication and Firestore, Binance public Crypto data, and a Twelve Data-compatible Cloudflare Worker for Forex and XAU/USD.

> TradePilot is educational simulation software. It does not transmit orders to an exchange or broker and is not suitable for real-money execution.

## Architecture and features

- React 19, Vite, Tailwind CSS, and lightweight-charts.
- Firebase Authentication, Firestore security rules, Hosting, live profiles, wallets, notifications, and administration.
- Long-only market/limit simulation, reduce-only exits, risk controls, protective orders, analytics, journal, backtesting, replay, and screener.
- Binance public market data and a Cloudflare proxy that keeps the Twelve Data key outside the browser.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for security boundaries and subsystem details.

## Local setup

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Add the public Firebase web-app configuration and optional proxy/support values.
4. Run `npm run dev`.

Never place `TWELVE_DATA_API_KEY`, service-account JSON, passwords, PINs, or OTPs in a `VITE_` variable. Vite variables are embedded in browser assets.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm test` | Vitest watch mode |
| `npm run test:run` | Fast deterministic unit suite |
| `npm run test:rules` | Firestore emulator security suite |
| `npm run lint` | ESLint validation |
| `npm run build` | Production Vite build |
| `npm run validate` | Lint, unit tests, then production build |

The rules suite requires the Firebase CLI and Java. It starts the Firestore emulator through `firebase emulators:exec`; it never connects to production.

## CI/CD and deployment

Pull requests and pushes to `main` run lint, unit tests, and build on Node 24. A separate concurrency-controlled workflow repeats validation and deploys only Firebase Hosting after a successful `main` build. Hosting failures never use `continue-on-error`.

Firestore rules and indexes are deliberately manual:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

PR Hosting previews are intentionally omitted because no isolated Firebase preview backend exists; a preview frontend would otherwise connect to production data. See [GITHUB_DEPLOYMENT.md](./GITHUB_DEPLOYMENT.md).

## Market-data and CORS

Production uses `VITE_FOREX_API_BASE_URL=https://tradepilot-forex-proxy.umarffcallback02.workers.dev`. The Worker should allow `http://localhost:5173`, `https://tradepilot-3591a.web.app`, and optionally `https://tradepilot-3591a.firebaseapp.com`. The Twelve Data credential remains a Worker secret.

## Security and Spark limitations

Firebase web configuration is public by design; authorization depends on Authentication and Firestore Rules. This Spark-compatible client architecture has no trusted execution backend, server scheduler, or Firebase Admin SDK. Client-side simulated automation only runs while the application is open and must not be adapted to real-money trading without a trusted backend and a new security review.

