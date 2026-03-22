import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RequireAuth from './auth/RequireAuth'
import AppShell from './shell/AppShell'

// Pages
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Billing from './pages/Billing'
import PricingWorkspace from './pages/PricingWorkspace'
import ExceptionCenter from './pages/ExceptionCenter'
import POSView from './pages/POSView'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/amuse">
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="billing" element={<Billing />} />
              <Route path="pricing" element={<PricingWorkspace />} />
              <Route path="exceptions" element={<ExceptionCenter />} />
              <Route path="pos" element={<POSView />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
