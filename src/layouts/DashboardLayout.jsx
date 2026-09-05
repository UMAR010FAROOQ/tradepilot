import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
import TradingAutomationMonitor from '../components/trading/TradingAutomationMonitor.jsx'

function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <TradingAutomationMonitor />
      <Sidebar className="fixed inset-y-0 left-0 z-40 hidden md:flex" />
      <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <Sidebar
            className="relative z-10 shadow-panel"
            mobile
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      <main className="min-w-0 pt-18 md:pl-18 xl:pl-60">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
