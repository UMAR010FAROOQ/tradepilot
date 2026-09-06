const toDate = (value) => value?.toDate?.() || (value instanceof Date ? value : null)
const utcKey = (date) => date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` : ''
const startOfUtcDay = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export function filterTrades(trades, filters, now = new Date()) {
  const cutoffDays = { today: 0, '7d': 6, '30d': 29, '90d': 89 }
  const cutoff = filters.range === 'all' ? null : new Date(startOfUtcDay(now).getTime() - cutoffDays[filters.range] * 86400000)
  return trades.filter((trade) => {
    const date = toDate(trade.createdAt)
    const assetClass = trade.symbol === 'XAUUSD' ? 'gold' : trade.marketType
    return (!cutoff || (date && date >= cutoff)) && (filters.market === 'all' || trade.symbol === filters.market) && (filters.assetClass === 'all' || assetClass === filters.assetClass)
  })
}

export function aggregatePerformance(trades) {
  const sells = [...trades].filter((trade) => trade.side === 'SELL' && trade.status === 'filled' && Number.isFinite(trade.realizedPnl)).sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
  const wins = sells.filter((trade) => trade.realizedPnl > 0), losses = sells.filter((trade) => trade.realizedPnl < 0)
  const grossProfit = wins.reduce((sum, trade) => sum + trade.realizedPnl, 0), grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPnl, 0))
  let cumulative = 0, peak = 0, maximumDrawdown = 0, currentWinStreak = 0, currentLossStreak = 0, longestWinStreak = 0, longestLossStreak = 0
  const daily = new Map()
  sells.forEach((trade) => {
    cumulative += trade.realizedPnl; peak = Math.max(peak, cumulative); maximumDrawdown = Math.max(maximumDrawdown, peak - cumulative)
    const key = utcKey(toDate(trade.createdAt)), result = daily.get(key) || { pnl: 0, closes: 0 }; daily.set(key, { pnl: result.pnl + trade.realizedPnl, closes: result.closes + 1 })
    // Break-even closes end both streaks and cannot inflate a winning or losing run.
    if (trade.realizedPnl > 0) { currentWinStreak += 1; currentLossStreak = 0; longestWinStreak = Math.max(longestWinStreak, currentWinStreak) }
    else if (trade.realizedPnl < 0) { currentLossStreak += 1; currentWinStreak = 0; longestLossStreak = Math.max(longestLossStreak, currentLossStreak) }
    else { currentWinStreak = 0; currentLossStreak = 0 }
  })
  const days = [...daily.entries()].map(([date, result]) => ({ date, ...result })).sort((a, b) => a.date.localeCompare(b.date))
  return { sells, days, realizedPnl: cumulative, realizedPeak: peak, currentDrawdown: peak - cumulative, fees: trades.reduce((sum, trade) => sum + (Number(trade.fee) || 0), 0), volume: trades.reduce((sum, trade) => sum + (Number(trade.grossAmount) || 0), 0), wins: wins.length, losses: losses.length, winRate: sells.length ? wins.length / sells.length * 100 : 0, averageWin: wins.length ? grossProfit / wins.length : 0, averageLoss: losses.length ? -grossLoss / losses.length : 0, largestWin: wins.length ? Math.max(...wins.map((trade) => trade.realizedPnl)) : null, largestLoss: losses.length ? Math.min(...losses.map((trade) => trade.realizedPnl)) : null, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, maximumDrawdown, currentWinStreak, currentLossStreak, longestWinStreak, longestLossStreak, bestDay: days.length ? days.reduce((best, day) => day.pnl > best.pnl ? day : best) : null, worstDay: days.length ? days.reduce((worst, day) => day.pnl < worst.pnl ? day : worst) : null }
}

export function currentUtcPeriods(trades, now = new Date()) {
  const dayStart = startOfUtcDay(now), weekStart = new Date(dayStart), monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  weekStart.setUTCDate(dayStart.getUTCDate() - ((dayStart.getUTCDay() + 6) % 7))
  const summarizeSince = (start) => {
    const selected = trades.filter((trade) => toDate(trade.createdAt) >= start), closes = selected.filter((trade) => trade.side === 'SELL' && trade.status === 'filled' && Number.isFinite(trade.realizedPnl))
    return { realizedPnl: closes.reduce((sum, trade) => sum + trade.realizedPnl, 0), fees: selected.reduce((sum, trade) => sum + (Number(trade.fee) || 0), 0), tradeCount: selected.length, wins: closes.filter((trade) => trade.realizedPnl > 0).length, losses: closes.filter((trade) => trade.realizedPnl < 0).length }
  }
  return { today: summarizeSince(dayStart), week: summarizeSince(weekStart), month: summarizeSince(monthStart) }
}

export function utcDateKey(date) { return utcKey(date) }
