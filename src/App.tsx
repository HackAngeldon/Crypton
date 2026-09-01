import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from '@/store/app'
import { primePrices, usePriceFeed } from '@/lib/priceFeed'
import { usePriceAlerts } from '@/lib/alerts'
import { Toasts } from '@/components/ui/Toast'
import { Splash } from '@/components/Splash'
import { AppShell } from '@/components/layout/AppShell'

import { Onboarding } from '@/features/auth/Onboarding'
import { Landing } from '@/features/landing/Landing'
import { PinLock } from '@/features/auth/PinLock'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { Markets } from '@/features/markets/Markets'
import { Swap } from '@/features/swap/Swap'
import { Activity } from '@/features/activity/Activity'
import { Settings } from '@/features/settings/Settings'
import { AssetDetail } from '@/features/asset/AssetDetail'
import { Send } from '@/features/send/Send'
import { Receive } from '@/features/receive/Receive'
import { Buy } from '@/features/buy/Buy'
import { Portfolio } from '@/features/portfolio/Portfolio'
import { Profile } from '@/features/profile/Profile'
import { Admin } from '@/features/admin/Admin'

function Gate() {
  const ready = useApp((s) => s.ready)
  const session = useApp((s) => s.session)
  const dbInit = useApp((s) => s.dbInit)
  const location = useLocation()

  useEffect(() => {
    primePrices()
    void dbInit()
  }, [dbInit])

  useEffect(() => {
    if (!ready) return
    usePriceFeed.getState().start()
    return () => usePriceFeed.getState().stop()
  }, [ready])

  if (!ready) return <Splash />

  if (!session) {
    return location.pathname === '/onboarding' ? <Onboarding /> : <Landing />
  }
  if (session.locked) {
    return <PinLock />
  }
  if (location.pathname === '/') return <Navigate to="/dashboard" replace />
  return <OutletInner />
}

function OutletInner() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/asset/:id" element={<AssetDetail />} />
        <Route path="/send" element={<Send />} />
        <Route path="/receive/:asset?" element={<Receive />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  usePriceAlerts()
  return (
    <>
      <Gate />
      <Toasts />
    </>
  )
}
