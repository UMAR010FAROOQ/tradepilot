import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AdminRoute from './components/auth/AdminRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { WalletProvider } from './context/WalletContext.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import NetworkStatus from './components/common/NetworkStatus.jsx'
import RouteLoadingFallback from './components/common/RouteLoadingFallback.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Markets from './pages/Markets.jsx'
import Wallet from './pages/Wallet.jsx'
import Deposit from './pages/Deposit.jsx'
import Withdraw from './pages/Withdraw.jsx'
import NotFound from './pages/NotFound.jsx'

const Trade = lazy(() => import('./pages/Trade.jsx'))
const Portfolio = lazy(() => import('./pages/Portfolio.jsx'))
const ActiveTrades = lazy(() => import('./pages/ActiveTrades.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Transactions = lazy(() => import('./pages/Transactions.jsx'))
const Watchlist = lazy(() => import('./pages/Watchlist.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Security = lazy(() => import('./pages/Security.jsx'))
const Support = lazy(() => import('./pages/Support.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'))
const AdminDeposits = lazy(() => import('./pages/admin/Deposits.jsx'))
const AdminWithdrawals = lazy(() => import('./pages/admin/Withdrawals.jsx'))
const AdminTransactions = lazy(() => import('./pages/admin/Transactions.jsx'))
const AdminTrades = lazy(() => import('./pages/admin/Trades.jsx'))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <NetworkStatus />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="markets" element={<Markets />} />
              <Route path="trade" element={<Trade />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="active-trades" element={<ActiveTrades />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="deposit" element={<Deposit />} />
              <Route path="withdraw" element={<Withdraw />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="profile" element={<Profile />} />
              <Route path="security" element={<Security />} />
              <Route path="support" element={<Support />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/deposits" element={<AdminDeposits />} />
              <Route path="admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="admin/transactions" element={<AdminTransactions />} />
              <Route path="admin/trades" element={<AdminTrades />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
