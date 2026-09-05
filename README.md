# TradePilot

TradePilot is a dark-first React and Vite workspace for simulated Crypto,
Forex, and Gold trading. It uses Firebase Authentication and Firestore for
account data, Binance public endpoints for Crypto market data, and a
Twelve Data-compatible Cloudflare Worker for Forex and Gold.

TradePilot does not execute real-money trades. Orders, balances, positions,
profit/loss, deposits, and withdrawals in the application are simulated or
manually reviewed records.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the browser-safe Firebase web
   app configuration. Add the Forex proxy URL if Forex and Gold data are needed.
3. Run `npm run dev`.

Use `npm run lint` and `npm run build` before release. See
`PRODUCTION_CHECKLIST.md` for the complete Firebase deployment process.
