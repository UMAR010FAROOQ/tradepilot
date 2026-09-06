# TradePilot Architecture

## Frontend

React and Vite provide a route-based SPA. Tailwind design tokens and reusable components form the UI system. Build metadata is injected at compile time and never stored in Firestore.

## Authentication

Firebase Authentication handles email/password identity and email verification. A live `users/{uid}` subscription supplies role and account status. Route guards react immediately to demotion, suspension, and maintenance mode.

## Firestore

Firestore stores profiles, simulated wallets, positions, immutable trades, pending orders, funding requests, alerts, journals, risk settings, platform controls, and admin audit records. Security Rules—not the public Firebase web API key—are the authorization boundary.

## Trading architecture

Trading is long-only and simulated. Client transactions validate wallet/position invariants, fees, ownership, and atomic state transitions. SELL and protective actions reduce existing exposure. There is no broker or exchange execution.

## Market data

Crypto uses Binance public HTTP/WebSocket data. Forex and XAU/USD use a Cloudflare Worker proxy. The Twelve Data key exists only as a Worker secret.

## Risk engine

Pure calculations evaluate trade risk, position concentration, daily loss, and open-position limits. Pending BUY fills are revalidated against current state.

## Backtesting

The deterministic engine uses completed-candle signals and executes at the next candle open. It includes fees, slippage, conservative same-candle stop handling, equity, and drawdown.

## Admin

The admin workspace manages roles, account status, manual funding, platform flags, and append-only audit visibility. It does not edit balances, trades, or P/L directly.

## Security

Firestore Rules prevent normal-user administrative access and validate sensitive transitions. Secrets are excluded from browser configuration, CSV exports, logs, and build metadata. Firestore rule deployment remains a deliberate manual action.

## CI/CD

GitHub Actions uses Node 24, `npm ci`, lint, Vitest, and production builds. Validated `main` commits deploy only Hosting. Rules tests use the local Firestore emulator. PR previews are omitted until an isolated Firebase environment exists.

## Trust boundary

TradePilot is a client-only simulated platform. A browser cannot provide the trusted custody, execution, audit completeness, background processing, or regulatory controls required for real-money financial systems.

