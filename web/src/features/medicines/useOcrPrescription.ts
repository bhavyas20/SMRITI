import { useMutation } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { isMockMode } from '@/lib/supabase.ts'

/**
 * Prescription OCR (frontend.md §9).
 *
 * The `ocr-prescription` Edge Function **is not built yet**. What is fixed is
 * its contract, so the whole client flow — capture, extract, per-row review,
 * save — is built and usable against a stub. When the function ships, the only
 * change is deleting the mock branch in `mutationFn`.
 *
 * ── A note on the confidence type ─────────────────────────────────────────
 * frontend.md §9 types `confidence` as `'high' | 'low' | 'unrecognized'`;
 * `packages/shared`'s `ocrMedicationCandidateSchema` — which the backend team
 * owns and the real function will be validated against — types it as a
 * `number`. The number is the one that will actually arrive, so that is what
 * `OcrCandidate` uses, and `confidenceBand()` below derives the three-way band
 * the review UI needs. If the function ends up returning the string form
 * instead, `confidenceBand` is the single place that changes.
 */

export type OcrConfidenceBand = 'high' | 'low' | 'unrecognized'

export type OcrCandidate = {
  name: string
  dose: string
  frequency: string
  /** 0–1, as `packages/shared` defines it. */
  confidence: number
  raw_text: string
}

/** Thresholds are a product call, not a spec one — stated here rather than buried. */
export function confidenceBand(confidence: number): OcrConfidenceBand {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.5) return 'low'
  return 'unrecognized'
}

export const CONFIDENCE_COPY: Record<
  OcrConfidenceBand,
  { label: string; help: string; tone: 'sage' | 'gold' | 'alert' }
> = {
  high: {
    label: 'Clear',
    help: 'Read cleanly. Check it against the printed line anyway.',
    tone: 'sage',
  },
  low: {
    label: 'Unclear',
    help: 'Some of this was hard to read. Compare every word with the prescription.',
    tone: 'gold',
  },
  unrecognized: {
    label: 'Could not read',
    help: 'Almost none of this line was legible. Type it in yourself.',
    tone: 'alert',
  },
}

/** A fixed stub, deliberately including one bad row so the review UI is exercised. */
function mockOcrResponse(): { medications: OcrCandidate[] } {
  return {
    medications: [
      {
        name: 'Amlodipine',
        dose: '5 mg',
        frequency: 'Once daily, morning',
        confidence: 0.94,
        raw_text: 'TAB. AMLODIPINE 5MG  1-0-0',
      },
      {
        name: 'Metformin',
        dose: '500 mg',
        frequency: 'Twice daily, after food',
        confidence: 0.88,
        raw_text: 'TAB. METFORMIN 500MG  1-0-1 A/F',
      },
      {
        name: 'Atorvastatin',
        dose: '10 mg',
        frequency: 'Once daily, night',
        confidence: 0.61,
        raw_text: 'TAB ATORVA 1O MG  O-O-1',
      },
      {
        name: '',
        dose: '',
        frequency: '',
        confidence: 0.18,
        raw_text: 'T. C_lc__m + D3   1-0-0  x15d',
      },
    ],
  }
}

export function useOcrPrescription(patientId: string) {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<{ medications: OcrCandidate[] }> => {
      if (isMockMode) {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        return mockOcrResponse()
      }

      const { data, error } = await db.invokeOcrPrescription(patientId, imageBase64)
      // Until the function is deployed this is what comes back, and it is the
      // path the "not available yet" state in the UI is built around.
      if (error) throw error
      if (!data) throw new Error('ocr-prescription returned nothing')
      return data as { medications: OcrCandidate[] }
    },
  })
}
