import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden"><Sidebar /></div>
      <div className="print:hidden"><Header /></div>
      <main className="pl-64 pt-14 min-h-screen print:pl-0 print:pt-0">
        <div className="p-6 print:p-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
