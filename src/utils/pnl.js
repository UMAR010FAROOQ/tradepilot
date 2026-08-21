export function calculatePositionPnl(position, currentPrice) {
  if (!position || !Number.isFinite(currentPrice)) {
    return { marketValue: null, unrealizedPnl: null, unrealizedPnlPercent: null }
  }
  const marketValue = position.quantity * currentPrice
  const unrealizedPnl = (currentPrice - position.averageEntryPrice) * position.quantity
  const unrealizedPnlPercent = position.investedAmount > 0
    ? (unrealizedPnl / position.investedAmount) * 100
    : 0
  return { marketValue, unrealizedPnl, unrealizedPnlPercent }
}
