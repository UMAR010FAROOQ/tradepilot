# Forex market-data configuration

TradePilot uses the Twelve Data response format through a trusted proxy. The
proxy owns the Twelve Data API key; the React application receives only its
public base URL.

Set this browser-safe value in `.env.local`:

```env
VITE_FOREX_API_BASE_URL=https://tradepilot-forex-proxy.umarffcallback02.workers.dev
```

The proxy must forward these read-only endpoints to Twelve Data and attach the
provider credential server-side:

- `GET /quote?symbol=EUR%2FUSD,GBP%2FUSD`
- `GET /time_series?symbol=EUR%2FUSD&interval=1h&outputsize=500&order=ASC&timezone=UTC`

Do not add a Twelve Data API key to a `VITE_` environment variable. Vite embeds
those values in browser assets.

Without the proxy URL, TradePilot does not invent or fall back to demo prices.
Forex and Gold render a clear unavailable state while Crypto data remains
independent and usable. Simulated Forex orders remain disabled unless a fresh
live quote is available and the New York Forex session is open.

The application uses one shared, quota-aware poller for subscribed Forex and
Gold symbols. Keep that central scheduler intact: do not add per-component
polling. Its rotation and freshness threshold are computed from the active
symbol count and provider budget.

## Cloudflare Worker CORS

The Worker must use an explicit origin allowlist. During development allow the
exact Vite origin (normally `http://localhost:5173`). After the first Hosting
deployment, add the exact Firebase Hosting origin shown by the Firebase CLI.
Do not use `*` in production.

For allowed origins, return the incoming `Origin` value in
`Access-Control-Allow-Origin`, add `Vary: Origin`, support `OPTIONS`, allow only
the read-only methods and headers the client needs, and reject unrecognized
origins. Keep `TWELVE_DATA_API_KEY` only as a Cloudflare Worker secret.
