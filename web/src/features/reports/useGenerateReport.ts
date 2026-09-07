import { useMutation } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { isMockMode } from '@/lib/supabase.ts'

/**
 * Report generation (frontend.md §10).
 *
 * `generate-report` **is not built yet**. The trigger, the generating state and
 * the "here is your PDF" result are all built now; only the call is stubbed.
 *
 * The error thrown is deliberately identifiable — the Report page tests for
 * `NotImplementedError` and shows a clear "coming soon" panel. Showing a
 * caregiver a raw `FunctionsFetchError` for a feature that was never shipped
 * would read as "Smriti is broken", which is a different and much worse
 * message than "this part is not ready yet".
 */
export class NotImplementedError extends Error {
  constructor(message = 'Report generation is not available yet') {
    super(message)
    this.name = 'NotImplementedError'
  }
}

export type GeneratedReport = { signed_url: string; report_id: string }

export function useGenerateReport(patientId: string) {
  return useMutation<GeneratedReport, Error, number>({
    mutationFn: async (months: number) => {
      if (isMockMode) {
        await new Promise((resolve) => setTimeout(resolve, 900))
        throw new NotImplementedError()
      }

      const { data, error } = await db.invokeGenerateReport(patientId, months)

      // A function that has never been deployed answers 404 rather than
      // failing in any way the client can distinguish from a network problem,
      // so it is normalised here into the one error the UI knows how to explain.
      if (error) {
        const message = error.message ?? ''
        if (/404|not found|failed to send|function/i.test(message)) {
          throw new NotImplementedError()
        }
        throw error
      }
      if (!data) throw new NotImplementedError()
      return data
    },
  })
}

export const REPORT_RANGES = [
  { months: 1, label: 'Last month' },
  { months: 3, label: 'Last 3 months' },
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last year' },
] as const
