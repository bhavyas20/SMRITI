import { useQuery } from '@tanstack/react-query'

import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'
import type { RoutineItem } from '@smriti/shared'

export function useRoutine(patientId: string) {
  return useQuery({
    queryKey: qk.routineItems(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.routineFor(patientId))
      assertPatientMatchAll(patientId, rows, 'useRoutine')
      return rows
    },
  })
}

/** Parameterised for the same reason as `usePeopleMutation` — forms submit drafts. */
export function useRoutineMutation<T extends object = RoutineItem>(patientId: string) {
  return useContentMutation<T>('routine_items', patientId)
}

/**
 * The icons the tablet knows how to draw.
 *
 * `icon_asset` is a free-text column server-side, but the tablet only ships a
 * fixed set of illustrations — anything else renders as a blank card in the
 * patient's home. So the caregiver picks from a list rather than typing, and
 * this is that list. It has to stay in step with the Flutter app's asset
 * bundle; `app-spec.md` is its owner, and this array is the web-side mirror.
 */
export const ROUTINE_ICONS = [
  { value: 'tea', label: 'Tea or coffee' },
  { value: 'meal', label: 'A meal' },
  { value: 'walk', label: 'A walk' },
  { value: 'phone', label: 'A phone call' },
  { value: 'bath', label: 'Bath' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'rest', label: 'Rest' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'visitor', label: 'A visitor' },
  { value: 'sleep', label: 'Bedtime' },
] as const

export const ROUTINE_ICON_LABEL: Record<string, string> = Object.fromEntries(
  ROUTINE_ICONS.map((icon) => [icon.value, icon.label]),
)
