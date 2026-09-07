import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import type { InviteMemberArgs, PatientRole } from '@smriti/shared'

export function useMembers(patientId: string) {
  return useQuery({
    queryKey: qk.members(patientId),
    queryFn: () => db.unwrap(db.membersFor(patientId)),
  })
}

export type InviteResult = { status: 'added' } | { status: 'pending'; message: string }

/**
 * `invite_member` matches on `auth.users.phone`. If nobody has signed up with
 * that number yet the RPC returns `pending` rather than failing — the row is
 * not created, and the person has to sign in once before they appear. The UI
 * has to say that plainly, because otherwise a caregiver invites their brother,
 * sees no error, and assumes he has access when he does not.
 */
export function useInviteMember(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<InviteResult, Error, { phone: string; role: InviteMemberArgs['p_role'] }>({
    mutationFn: async ({ phone, role }) => {
      const result = await db.unwrap(db.inviteMember(patientId, phone, role))
      return result as InviteResult
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.members(patientId) })
    },
  })
}

export const ROLE_COPY: Record<PatientRole, { label: string; body: string }> = {
  caregiver: {
    label: 'Caregiver',
    body: 'Can change medicines, people, routine and alerts, and can invite others.',
  },
  family_viewer: {
    label: 'Family',
    body: 'Can see everything — today, trends, reports, messages — and change nothing.',
  },
  health_worker: {
    label: 'Health worker',
    body: 'Can see the reports and trends shared with them for clinical review.',
  },
}
