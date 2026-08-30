export function calculateTradeAnalytics(trades, positions, unrealizedPnl = 0) {
  const buys = trades.filter((trade) => trade.side === 'BUY')
  const sells = trades.filter((trade) => trade.side === 'SELL' && Number.isFinite(trade.realizedPnl))
  const wins = sells.filter((trade) => trade.realizedPnl > 0)
  const losses = sells.filter((trade) => trade.realizedPnl < 0)
  const sum = (items, field) => items.reduce((total, item) => total + (Number(item[field]) || 0), 0)
  const average = (items) => items.length ? sum(items, 'realizedPnl') / items.length : 0

  return {
    totalTrades: trades.length,
    buyTrades: buys.length,
    sellTrades: trades.filter((trade) => trade.side === 'SELL').length,
    openPositions: positions.filter((position) => position.status === 'open' && position.quantity > 0).length,
    closedPositions: positions.filter((position) => position.status === 'closed').length,
    realizedPnl: sum(sells, 'realizedPnl'),
    unrealizedPnl,
    fees: sum(trades, 'fee'),
    profitableTrades: wins.length,
    losingTrades: losses.length,
    winRate: sells.length ? (wins.length / sells.length) * 100 : 0,
    averageWin: average(wins),
    averageLoss: average(losses),
    largestWin: wins.length ? Math.max(...wins.map((trade) => trade.realizedPnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((trade) => trade.realizedPnl)) : 0,
    tradingVolume: sum(trades, 'grossAmount'),
  }
}

export function buildRealizedPnlSeries(trades) {
  let cumulative = 0
  return [...trades]
    .filter((trade) => trade.side === 'SELL' && Number.isFinite(trade.realizedPnl) && trade.createdAt?.toMillis?.())
    .sort((first, second) => first.createdAt.toMillis() - second.createdAt.toMillis())
    .map((trade) => {
      cumulative += trade.realizedPnl
      return { id: trade.id, time: trade.createdAt.toDate(), value: cumulative }
    })
}

export function buildMarketBreakdown(trades) {
  const rows = new Map()
  trades.forEach((trade) => {
    const current = rows.get(trade.symbol) || { symbol: marketBySymbol.get(trade.symbol)?.displaySymbol || trade.symbol, trades: 0, volume: 0, realizedPnl: 0 }
    current.trades += 1
    current.volume += Number(trade.grossAmount) || 0
    current.realizedPnl += Number(trade.realizedPnl) || 0
    rows.set(trade.symbol, current)
  })
  return [...rows.values()].sort((first, second) => second.volume - first.volume)
}
import { marketBySymbol } from '../data/markets.js'
