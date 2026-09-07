import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Plus,
  ShieldCheck,
  Users,
  WifiOff,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Avatar, AvatarFallback } from '@/components/ui/controls.tsx'
import { ErrorState } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import { useCaregiverFeedRealtime } from '@/hooks/usePatientRealtime.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { DEVICE_HEALTH_COPY, initialsOf, timeAgo } from '@/lib/utils.ts'
import type { PatientOverview } from '@smriti/shared'

/**
 * The multi-patient landing (frontend.md §8).
 *
 * Only reachable with more than one patient — with exactly one, §4 sends the
 * caregiver straight past this screen to that patient's dashboard, and this
 * page redirects rather than showing a list of one.
 *
 * The ordering is the point of the page: **anything needing attention first**,
 * never alphabetical. Someone opening this screen is asking "does anyone need
 * me right now", and a list sorted by name makes them answer that themselves,
 * row by row, every time.
 */

/** Higher scores first. Mirrors what a caregiver would triage by hand. */
function urgency(row: PatientOverview): number {
  let score = 0
  if (row.active_flags > 0) score += 100 + row.active_flags * 10
  if (row.device_status === 'offline') score += 80
  if (row.device_status === 'stale') score += 40
  if (row.device_status === 'never') score += 30
  if (row.meds_scheduled > 0 && row.meds_confirmed < row.meds_scheduled) {
    score += 20 + (row.meds_scheduled - row.meds_confirmed) * 5
  }
  if (!row.played_today) score += 5
  score += row.unread_memos
  return score
}

function PatientRow({ row, index }: { row: PatientOverview; index: number }) {
  const missed = Math.max(0, row.meds_scheduled - row.meds_confirmed)
  const attention = urgency(row) >= 20

  return (
    <Link
      to={`/p/${row.patient_id}/dashboard`}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-[22px] border p-4 shadow-[0_8px_30px_rgba(50,35,20,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(50,35,20,0.09)] sm:p-5 ${
        attention
          ? 'border-terracotta/25 bg-[#fff9f2]'
          : 'border-ink/[0.07] bg-white/65 hover:border-sage/40'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${attention ? 'bg-terracotta' : 'bg-sage'}`}
      />
      <Avatar className="size-14 shrink-0 ring-4 ring-white/70 sm:size-16">
        <AvatarFallback className="text-lg">{initialsOf(row.display_name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-[18px] font-bold">{row.display_name}</p>
          {row.active_flags > 0 && (
            <Badge tone="alert" size="sm">
              {row.active_flags} to look at
            </Badge>
          )}
          {row.unread_memos > 0 && (
            <Badge tone="gold" size="sm">
              {row.unread_memos} new message{row.unread_memos === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        <p className="mt-1 text-[14px] leading-snug text-body sm:text-[15px]">
          {row.played_today
            ? `Played today · ${Math.round(row.session_minutes)} min`
            : 'No session today'}
          {row.meds_scheduled > 0 && (
            <>
              {' · '}
              {missed === 0
                ? 'All medicines confirmed'
                : `${missed} of ${row.meds_scheduled} medicines not confirmed`}
            </>
          )}
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.045] px-2.5 py-1 text-muted">
            <CalendarDays className="size-3.5" />
            {row.played_today ? 'Today’s check-in' : 'Waiting for today'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
              row.device_status === 'ok'
                ? 'bg-sage/10 text-sage-foreground'
                : 'bg-terracotta/10 text-alert'
            }`}
          >
            {row.device_status === 'ok' ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {row.device_status === 'never'
              ? DEVICE_HEALTH_COPY.never.label
              : `Synced ${timeAgo(row.device_last_seen_at)}`}
          </span>
        </div>
        {/* Keep a quiet stagger without adding another animation dependency. */}
        <span className="sr-only">Family member {index + 1}</span>
        <p
          className={`mt-2 hidden items-center gap-1.5 text-[12.5px] ${
            row.device_status === 'ok' ? 'text-muted' : 'text-alert'
          }`}
        >
          {row.device_status !== 'ok' && <WifiOff className="size-3.5" />}
          {row.device_status === 'never'
            ? DEVICE_HEALTH_COPY.never.label
            : `Tablet synced ${timeAgo(row.device_last_seen_at)}`}
        </p>
      </div>

      <div className="flex size-10 flex-none items-center justify-center rounded-full bg-ink/[0.04] text-muted transition-all group-hover:bg-terracotta group-hover:text-white">
        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default function Overview() {
  const { signOut } = useAuth()
  useCaregiverFeedRealtime()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  // With one patient this page is not the right screen — §4 decides, once.
  if (!isPending && !error && (data?.length ?? 0) < 2) {
    return <Navigate to="/" replace />
  }

  const rows = [...(data ?? [])].sort((a, b) => urgency(b) - urgency(a))
  const needAttention = rows.filter((row) => urgency(row) >= 20)
  const playedToday = rows.filter((row) => row.played_today).length
  const connected = rows.filter((row) => row.device_status === 'ok').length
  const onTrack = Math.max(0, rows.length - needAttention.length)

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-ivory">
      <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] blur-[7px]" aria-hidden="true">
        <Logomark
          size={900}
          className="size-[min(82vw,900px)]"
          color="var(--color-terracotta)"
          strokeWidth={6}
          decorative
        />
      </div>
      <header className="relative z-10 border-b border-ink/[0.07] bg-ivory/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          <Logomark size={24} color="var(--color-terracotta)" decorative />
          <Wordmark size={18} />
          <span className="ml-2 hidden items-center gap-1.5 rounded-full bg-sage/10 px-3 py-1.5 text-[12px] font-medium text-sage-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-sage" /> Care circle
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative isolate overflow-hidden rounded-[30px] bg-terracotta px-6 py-7 text-ivory shadow-[0_18px_50px_rgba(174,83,48,0.18)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -bottom-36 right-24 size-80 rounded-full bg-gold/20 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Your care circle</p>
              <h1 className="mt-2 max-w-[600px] text-[clamp(30px,4vw,48px)] leading-[1.02] text-white">
                Stay close to their day.
              </h1>
              <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-white/80">
                A calm view of the people who matter, with the things needing you gently brought forward.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
              <Users className="size-5 text-gold" />
              <div>
                <p className="font-heading text-lg font-bold text-white">{rows.length || '—'} people</p>
                <p className="text-xs text-white/65">in your circle</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Need attention', value: needAttention.length, icon: Activity, tone: 'text-terracotta' },
            { label: 'On track today', value: onTrack, icon: CheckCircle2, tone: 'text-sage-foreground' },
            { label: 'Played today', value: playedToday, icon: CalendarDays, tone: 'text-gold-foreground' },
            { label: 'Connected tablets', value: connected, icon: ShieldCheck, tone: 'text-sage-foreground' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-ink/[0.06] bg-white/55 p-4 shadow-[0_6px_22px_rgba(50,35,20,0.025)]">
              <stat.icon className={`size-5 ${stat.tone}`} />
              <p className="mt-3 font-heading text-2xl font-bold">{isPending ? '—' : stat.value}</p>
              <p className="mt-0.5 text-[12px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">Family overview</p>
            <p className="mt-1 text-[15px] text-body">
              {isPending
                ? 'Loading your circle…'
                : needAttention.length > 0
                  ? `${needAttention.length} of ${rows.length} could use a look. They are at the top.`
                  : 'Everyone is on track today. Nothing needs you right now.'}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex"><Activity className="size-3.5" /> Live overview</span>
        </div>

        <div className="mt-4 space-y-3">
          {isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}
          {error && <ErrorState error={error} onRetry={() => void refetch()} />}
          {rows.map((row, index) => (
            <PatientRow key={row.patient_id} row={row} index={index} />
          ))}
        </div>

        <Button asChild variant="outline" className="mt-5 h-auto w-full justify-between rounded-[22px] border-dashed bg-transparent px-5 py-4 text-left sm:w-full">
          <Link to="/patients/new">
            <span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-terracotta/10 text-terracotta"><Plus className="size-4" /></span><span><span className="block font-heading font-bold">Add another person</span><span className="block text-xs font-normal text-muted">Grow your care circle when you’re ready</span></span></span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </Button>
      </main>
    </div>
  )
}
