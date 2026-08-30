# Forex market-data configuration

TradePilot uses the Twelve Data response format through a trusted proxy. The
proxy owns the Twelve Data API key; the React application receives only its
public base URL.

Set this browser-safe value in `.env.local`:

```env
VITE_FOREX_API_BASE_URL=https://your-trusted-proxy.example.com
```

The proxy must forward these read-only endpoints to Twelve Data and attach the
provider credential server-side:

- `GET /quote?symbol=EUR%2FUSD,GBP%2FUSD`
- `GET /time_series?symbol=EUR%2FUSD&interval=1h&outputsize=500&order=ASC&timezone=UTC`

Do not add a Twelve Data API key to a `VITE_` environment variable. Vite embeds
those values in browser assets.

Without the proxy URL, TradePilot intentionally uses the existing Forex demo
feed for display and labels it `Forex Demo`. Simulated Forex orders remain
disabled unless a fresh live quote is available and the New York Forex session
is open.
