import { useContext } from 'react'
import { RiskContext } from '../context/riskContextValue.js'
export default function useRisk() { const value = useContext(RiskContext); if (!value) throw new Error('useRisk must be used within RiskProvider.'); return value }
