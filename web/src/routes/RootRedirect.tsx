import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'

import { LogoReveal } from '@/components/brand/LogoReveal.tsx'
import { ErrorState } from '@/components/ui/feedback.tsx'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { FullPageLoading } from './FullPageLoading.tsx'

/**
 * A one-shot flag set by the sign-in screen. The splash plays after a fresh
 * sign-in and not on every page load, so it stays a welcome rather than a toll.
 */
export const FRESH_SIGNIN_KEY = 'smriti:fresh-signin'

/**
 * The adaptive landing (frontend.md §4).
 *
 *   0 patients   → /patients/new
 *   1 patient    → /p/{id}/dashboard, skipping the overview entirely
 *   2+ patients  → /patients
 *
 * This is real logic, not a design preference: most caregivers look after one
 * parent, and this is why they never encounter multi-patient UI at all. It
 * exists **once**, here, at the root route. Any second copy of this decision
 * elsewhere in the app is a bug waiting to disagree with this one.
 */
export function RootRedirect() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem(FRESH_SIGNIN_KEY) !== '1',
  )

  useEffect(() => {
    if (splashDone) sessionStorage.removeItem(FRESH_SIGNIN_KEY)
  }, [splashDone])

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  // The splash covers the overview round-trip rather than adding to it, so the
  // welcome costs nothing on a fast connection.
  if (!splashDone) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-terracotta">
        <LogoReveal size={104} speed={3.4} onComplete={() => setSplashDone(true)} />
      </div>
    )
  }

  if (isPending) return <FullPageLoading label="Finding your family" />

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6">
        <ErrorState error={error} onRetry={() => void refetch()} className="w-full" />
      </div>
    )
  }

  const patients = data ?? []
  if (patients.length === 0) return <Navigate to="/patients/new" replace />
  if (patients.length === 1) {
    return <Navigate to={`/p/${patients[0].patient_id}/dashboard`} replace />
  }
  return <Navigate to="/patients" replace />
}
