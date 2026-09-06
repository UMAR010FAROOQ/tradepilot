import { useEffect, useMemo, useState } from 'react'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { subscribeToTicker } from '../services/marketService.js'
import { subscribeToOpenPositions } from '../services/positionService.js'
import { subscribeToRiskSettings } from '../services/riskService.js'
import { subscribeToTrades } from '../services/tradeService.js'
import { RiskContext } from './riskContextValue.js'

export function RiskProvider({ children }) {
  const { currentUser } = useAuth()
  const { wallet } = useWallet()
  const [settings, setSettings] = useState(null)
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])
  const [tickers, setTickers] = useState(new Map())

  useEffect(
    () => subscribeToRiskSettings(currentUser.uid, setSettings, () => {}),
    [currentUser.uid],
  )
  useEffect(
    () => subscribeToOpenPositions(currentUser.uid, setPositions, () => {}),
    [currentUser.uid],
  )
  useEffect(
    () => subscribeToTrades(currentUser.uid, setTrades, () => {}),
    [currentUser.uid],
  )
  useEffect(() => {
    const stops = positions.map((position) => subscribeToTicker(
      position.symbol,
      (ticker) => setTickers((current) => new Map(current).set(position.symbol, ticker)),
      () => {},
    ))
    return () => stops.forEach((stop) => stop())
  }, [positions])

  const value = useMemo(() => ({
    settings,
    positions,
    trades,
    wallet,
    prices: new Map(positions.map((position) => [
      position.symbol,
      tickers.get(position.symbol)?.price || position.averageEntryPrice,
    ])),
  }), [positions, settings, tickers, trades, wallet])

  return <RiskContext.Provider value={value}>{children}</RiskContext.Provider>
}
