import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminNavbar from '../components/admin/AdminNavbar.jsx'
import AdminSidebar from '../components/admin/AdminSidebar.jsx'

function AdminLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <AdminSidebar className="fixed inset-y-0 left-0 z-40 hidden md:flex" />
      <AdminNavbar onMenuClick={() => setOpen(true)} />
      {open && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setOpen(false)} type="button" /><AdminSidebar className="relative z-10 shadow-panel" mobile onClose={() => setOpen(false)} /></div>}
      <main className="min-w-0 pt-18 md:pl-64"><div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></div></main>
    </div>
  )
}

export default AdminLayout
