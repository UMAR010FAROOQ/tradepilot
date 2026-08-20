export const markets = [
  { symbol: 'BTCUSDT', displaySymbol: 'BTC/USDT', name: 'Bitcoin', type: 'crypto', baseAsset: 'BTC', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'ETHUSDT', displaySymbol: 'ETH/USDT', name: 'Ethereum', type: 'crypto', baseAsset: 'ETH', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'BNBUSDT', displaySymbol: 'BNB/USDT', name: 'BNB', type: 'crypto', baseAsset: 'BNB', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'SOLUSDT', displaySymbol: 'SOL/USDT', name: 'Solana', type: 'crypto', baseAsset: 'SOL', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'XRPUSDT', displaySymbol: 'XRP/USDT', name: 'XRP', type: 'crypto', baseAsset: 'XRP', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'ADAUSDT', displaySymbol: 'ADA/USDT', name: 'Cardano', type: 'crypto', baseAsset: 'ADA', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'DOGEUSDT', displaySymbol: 'DOGE/USDT', name: 'Dogecoin', type: 'crypto', baseAsset: 'DOGE', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'AVAXUSDT', displaySymbol: 'AVAX/USDT', name: 'Avalanche', type: 'crypto', baseAsset: 'AVAX', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'LINKUSDT', displaySymbol: 'LINK/USDT', name: 'Chainlink', type: 'crypto', baseAsset: 'LINK', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'LTCUSDT', displaySymbol: 'LTC/USDT', name: 'Litecoin', type: 'crypto', baseAsset: 'LTC', quoteAsset: 'USDT', category: 'Crypto' },
  { symbol: 'EURUSD', displaySymbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', baseAsset: 'EUR', quoteAsset: 'USD', category: 'Forex' },
  { symbol: 'GBPUSD', displaySymbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex', baseAsset: 'GBP', quoteAsset: 'USD', category: 'Forex' },
  { symbol: 'USDJPY', displaySymbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex', baseAsset: 'USD', quoteAsset: 'JPY', category: 'Forex' },
  { symbol: 'USDCHF', displaySymbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex', baseAsset: 'USD', quoteAsset: 'CHF', category: 'Forex' },
  { symbol: 'AUDUSD', displaySymbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'forex', baseAsset: 'AUD', quoteAsset: 'USD', category: 'Forex' },
  { symbol: 'USDCAD', displaySymbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex', baseAsset: 'USD', quoteAsset: 'CAD', category: 'Forex' },
  { symbol: 'NZDUSD', displaySymbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'forex', baseAsset: 'NZD', quoteAsset: 'USD', category: 'Forex' },
  { symbol: 'EURJPY', displaySymbol: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'forex', baseAsset: 'EUR', quoteAsset: 'JPY', category: 'Forex' },
  { symbol: 'GBPJPY', displaySymbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'forex', baseAsset: 'GBP', quoteAsset: 'JPY', category: 'Forex' },
  { symbol: 'EURGBP', displaySymbol: 'EUR/GBP', name: 'Euro / British Pound', type: 'forex', baseAsset: 'EUR', quoteAsset: 'GBP', category: 'Forex' },
]

export const marketBySymbol = new Map(markets.map((market) => [market.symbol, market]))
