import { createContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import type { Patient, PatientRole } from '@smriti/shared'

export type PatientContextValue = {
  /** Always the value from the URL. Never a copy that could drift from it. */
  patientId: string
  patient: Patient | null
  role: PatientRole
  /** `caregiver` can write content; `family_viewer` and `health_worker` cannot. */
  canEdit: boolean
}

export const PatientContext = createContext<PatientContextValue | null>(null)

export function PatientProvider({
  patientId,
  patient,
  role,
  children,
}: {
  patientId: string
  patient: Patient | null
  role: PatientRole
  children: ReactNode
}) {
  const value = useMemo<PatientContextValue>(
    () => ({ patientId, patient, role, canEdit: role === 'caregiver' }),
    [patientId, patient, role],
  )
  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
}
