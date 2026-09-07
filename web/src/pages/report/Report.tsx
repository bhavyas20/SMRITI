import { useState } from 'react'
import { Download, FileText, Share2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardTitle } from '@/components/ui/card.tsx'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/controls.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  NotImplementedError,
  REPORT_RANGES,
  useGenerateReport,
} from '@/features/reports/useGenerateReport.ts'
import { summariseAdherence, summarisePlay, useDailyReport } from '@/features/reports/useDailyReport.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Report (frontend.md §8, §10).
 *
 * `generate-report` is not built yet. The trigger, the generating state and the
 * result panel are all real; only the call is stubbed, and a
 * `NotImplementedError` is rendered as a plain "not ready yet" panel rather
 * than a raw function error. Showing a caregiver a fetch failure for something
 * that was never deployed tells them Smriti is broken, which is both untrue and
 * exactly the wrong thing to make someone worry about.
 *
 * In the meantime the page is not empty: the figures underneath come from
 * `daily_report`, which is live, so there is something to read to a doctor
 * today even without the PDF.
 */
export default function Report() {
  const { patientId, patient } = usePatientAccess()
  const [months, setMonths] = useState<number>(3)

  const generate = useGenerateReport(patientId)
  const report = useDailyReport(patientId, months * 30, patient?.timezone)

  const rows = report.data ?? []
  const play = summarisePlay(rows)
  const adherence = summariseAdherence(rows)

  const notReady = generate.error instanceof NotImplementedError

  return (
    <>
      <PageHeader
        eyebrow="Report"
        title="Something to take to the doctor"
        description="A single page covering the period you choose — routines kept, medicines confirmed, what has changed, and the questions worth asking at the next appointment."
      />

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4.5 text-terracotta" />
              Generate a report
            </CardTitle>
            <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-body">
              Covering {patient?.display_name ?? 'her'}. Shareable with siblings and with her
              doctor — it contains no game scores out of context, only patterns and dates.
            </p>
          </div>

          <Tabs value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <TabsList>
              {REPORT_RANGES.map((range) => (
                <TabsTrigger key={range.months} value={String(range.months)}>
                  {range.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          {generate.isPending ? (
            <div className="rounded-card bg-sand/50 p-5">
              <p className="font-semibold">Putting the report together…</p>
              <p className="mt-1 text-[13.5px] text-body">
                This usually takes under a minute.
              </p>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ) : generate.data ? (
            <div className="rounded-card bg-sage-soft p-5">
              <p className="font-heading text-lg font-bold">Your report is ready</p>
              <p className="mt-1 text-[14px] text-body">
                The link works for a short while, so download it now rather than bookmarking
                it.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="solid">
                  <a href={generate.data.signed_url} target="_blank" rel="noreferrer">
                    <Download className="size-4" />
                    Download the PDF
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(generate.data.signed_url)}
                >
                  <Share2 className="size-4" />
                  Copy the link
                </Button>
              </div>
            </div>
          ) : notReady ? (
            <Notice tone="warn">
              <strong>Report generation is not switched on yet.</strong> The figures below are
              live and correct — the one-page PDF that wraps them is still being built. When
              it ships, this button will start working; nothing about your setup needs to
              change.
            </Notice>
          ) : generate.error ? (
            <ErrorState error={generate.error} onRetry={() => generate.mutate(months)} />
          ) : (
            <Button variant="accent" size="lg" onClick={() => generate.mutate(months)}>
              <FileText className="size-4" />
              Generate the report
            </Button>
          )}
        </div>
      </Card>

      {/* Live figures, so the page is useful before the PDF exists. */}
      <section className="mt-8">
        <h2 className="text-[19px]">What the report will say</h2>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-body">
          These come straight from the tablet, for the period selected above. You can read
          them out at an appointment today.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              Medicines
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {adherence.rate === null ? '—' : `${Math.round(adherence.rate * 100)}%`}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {adherence.rate === null
                ? 'Nothing scheduled in this period.'
                : `${adherence.confirmed} of ${adherence.scheduled} doses confirmed. ${adherence.viaCall} needed a phone call.`}
            </p>
          </Card>

          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              Sessions
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {play.daysPlayed}
              <span className="text-[18px] text-muted">/{play.daysTotal} days</span>
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {play.minutes} minutes in total.
              {play.accuracy !== null &&
                ` Answers correct ${Math.round(play.accuracy * 100)}% of the time on average.`}
            </p>
          </Card>
        </div>
      </section>
    </>
  )
}
