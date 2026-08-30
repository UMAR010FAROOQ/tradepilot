import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AdminRoute from './components/auth/AdminRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { WalletProvider } from './context/WalletContext.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Markets from './pages/Markets.jsx'
import Trade from './pages/Trade.jsx'
import Portfolio from './pages/Portfolio.jsx'
import ActiveTrades from './pages/ActiveTrades.jsx'
import Wallet from './pages/Wallet.jsx'
import Deposit from './pages/Deposit.jsx'
import Withdraw from './pages/Withdraw.jsx'
import Transactions from './pages/Transactions.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Profile from './pages/Profile.jsx'
import Security from './pages/Security.jsx'
import Support from './pages/Support.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminDeposits from './pages/admin/Deposits.jsx'
import AdminWithdrawals from './pages/admin/Withdrawals.jsx'
import AdminTransactions from './pages/admin/Transactions.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="markets" element={<Markets />} />
              <Route path="trade" element={<Trade />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="active-trades" element={<ActiveTrades />} />
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
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
          </Routes>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
