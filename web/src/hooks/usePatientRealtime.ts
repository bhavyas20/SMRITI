import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'

/**
 * One realtime channel per patient, mounted once by the patient layout
 * (frontend.md §7). Not one per widget — six widgets each opening their own
 * subscription is six websocket channels for one screen, and they accumulate
 * every time the caregiver navigates.
 *
 * The channel does not carry data into the cache; it invalidates. A payload
 * that arrives out of order, or a row the caregiver's RLS policy would filter
 * differently from the realtime broadcast, cannot then be written into the
 * cache as truth — the refetch that follows is the source of truth, and it goes
 * through the same policies as every other read.
 *
 * The cleanup is mandatory (§15 rule 9): the effect's teardown removes the
 * channel, so switching patients or signing out does not leave a subscription
 * for a patient no longer on screen.
 */
export function usePatientRealtime(patientId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const invalidate = (key: readonly unknown[]) => () => {
      void queryClient.invalidateQueries({ queryKey: key })
    }

    const unsubscribe = db.subscribeToPatient(patientId, {
      onPatient: () => {
        void queryClient.invalidateQueries({ queryKey: qk.patient(patientId) })
        void queryClient.invalidateQueries({ queryKey: qk.deviceStatus(patientId) })
      },
      onFlag: invalidate(qk.flags(patientId)),
      onMemo: invalidate(qk.memos(patientId)),
      onContent: () => {
        void queryClient.invalidateQueries({ queryKey: qk.people(patientId) })
        void queryClient.invalidateQueries({ queryKey: qk.medications(patientId) })
        void queryClient.invalidateQueries({ queryKey: qk.routineItems(patientId) })
      },
    })

    return unsubscribe
  }, [patientId, queryClient])
}

/**
 * The lighter subscription behind the multi-patient overview. One channel for
 * every patient the caller can see; RLS does the filtering server-side.
 */
export function useCaregiverFeedRealtime() {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      db.subscribeToCaregiverFeed(() => {
        void queryClient.invalidateQueries({ queryKey: qk.overview() })
      }),
    [queryClient],
  )
}
