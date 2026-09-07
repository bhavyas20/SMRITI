import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** The shadcn/ui class merge helper: conditional classes, last-wins on conflict. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ────────────────────────────────────────────────────────────────────────
   Time-of-day.

   Every time-of-day value in this system is an integer number of minutes
   past local midnight, 0–1439, with modulo-1440 arithmetic — never a `time`
   column, never a `Date` (AGENTS.md non-negotiable 3). A tablet in a village
   with a drifting clock and a caregiver in another timezone have to agree on
   what "9 in the morning" means, and only a plain integer survives that.
   ──────────────────────────────────────────────────────────────────────── */

export const MINUTES_IN_DAY = 1440

/** Normalises any integer into 0–1439. */
export const wrapMinutes = (min: number) =>
  ((Math.round(min) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY

/** `540` → `"9:00 am"`. */
export function formatMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—'
  const m = wrapMinutes(min)
  const hour24 = Math.floor(m / 60)
  const minute = m % 60
  const suffix = hour24 < 12 ? 'am' : 'pm'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

/** `540` → `"09:00"`, for `<input type="time">`. */
export const minutesToTimeInput = (min: number) =>
  `${String(Math.floor(wrapMinutes(min) / 60)).padStart(2, '0')}:${String(
    wrapMinutes(min) % 60,
  ).padStart(2, '0')}`

/** `"09:00"` → `540`. */
export function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return wrapMinutes((h || 0) * 60 + (m || 0))
}

/** A rough "part of the day" label, for grouping a routine or a medicine list. */
export function partOfDay(min: number): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const m = wrapMinutes(min)
  if (m < 720) return 'Morning'
  if (m < 1020) return 'Afternoon'
  if (m < 1260) return 'Evening'
  return 'Night'
}

/* ────────────────────────────────────────────────────────────────────────
   days_of_week — a seven-character string of '0'/'1', Monday first.
   ──────────────────────────────────────────────────────────────────────── */

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const EVERY_DAY = '1111111'

export const isDayOn = (mask: string, index: number) => mask[index] === '1'

export function toggleDay(mask: string, index: number): string {
  const chars = mask.padEnd(7, '0').slice(0, 7).split('')
  chars[index] = chars[index] === '1' ? '0' : '1'
  return chars.join('')
}

export function describeDays(mask: string): string {
  if (mask === EVERY_DAY) return 'Every day'
  const on = DAY_LABELS.filter((_, i) => isDayOn(mask, i))
  if (on.length === 0) return 'No days selected'
  if (on.length === 5 && !isDayOn(mask, 5) && !isDayOn(mask, 6)) return 'Weekdays'
  if (on.length === 2 && isDayOn(mask, 5) && isDayOn(mask, 6)) return 'Weekends'
  return on.join(', ')
}

/* ────────────────────────────────────────────────────────────────────────
   Dates and elapsed time.
   ──────────────────────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000

/** `YYYY-MM-DD` for a day `n` days before today, in the viewer's own timezone. */
export function isoDateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * DAY_MS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/**
 * `YYYY-MM-DD` for a day `n` days ago **in the patient's timezone**.
 *
 * This distinction is the whole point of the function. The `day` column on
 * `daily_report` and every other view is computed server-side as
 * `(to_timestamp(ts) at time zone p.timezone)::date` — her local date, not the
 * viewer's. The viewer is very often somewhere else entirely; that is the
 * product. A daughter in Seattle opening this at 4pm is looking at a woman in
 * Pune for whom it is already tomorrow morning, and comparing against the
 * browser's own date makes today's row simply fail to match — the dashboard
 * then reports "no session today" on a day she has already played.
 *
 * Falls back to the viewer's timezone only when the patient row has not loaded
 * yet or names a zone this browser does not know.
 */
export function isoDateDaysAgoInZone(timezone: string | null | undefined, days = 0): string {
  if (!timezone) return isoDateDaysAgo(days)
  try {
    // `en-CA` formats as YYYY-MM-DD, which is exactly the shape Postgres returns.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() - days * DAY_MS))
  } catch {
    return isoDateDaysAgo(days)
  }
}

export const todayIso = () => isoDateDaysAgo(0)

/** Today, where she is. */
export const todayInZone = (timezone: string | null | undefined) =>
  isoDateDaysAgoInZone(timezone, 0)

/**
 * "4 minutes ago", "2 days ago". Used for `device_last_seen_at`, where being
 * honest about staleness matters more than being pretty — a caregiver must
 * never read a screen as live when the tablet last synced on Tuesday.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

/** `"2026-09-07"` → `"Mon 7 Sep"`. */
export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** `"2026-09-07"` → `"Monday, 7 September"`. */
export function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/* ────────────────────────────────────────────────────────────────────────
   Misc.
   ──────────────────────────────────────────────────────────────────────── */

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export function extensionOf(file: File): string {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return file.type.split('/').pop() ?? 'bin'
}

/** Formats a pairing token the way the phone-readout path reads it: `SMRT-K4PQ`. */
export function formatPairingToken(token: string): string {
  const clean = token.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

/** Device health thresholds, matched to the watchdog's own (frontend.md §8). */
export type DeviceHealth = 'ok' | 'stale' | 'offline' | 'never'

export function deviceHealth(lastSeenAt: string | null | undefined): DeviceHealth {
  if (!lastSeenAt) return 'never'
  const hours = (Date.now() - new Date(lastSeenAt).getTime()) / 3_600_000
  if (hours > 72) return 'offline'
  if (hours > 24) return 'stale'
  return 'ok'
}

export const DEVICE_HEALTH_COPY: Record<DeviceHealth, { label: string; detail: string }> = {
  ok: { label: 'Connected', detail: 'The tablet is syncing normally.' },
  stale: {
    label: 'Not synced today',
    detail: "Nothing has come through for over a day. What you're seeing may be out of date.",
  },
  offline: {
    label: 'Offline',
    detail: 'Nothing has come through for more than three days. Someone should check the tablet.',
  },
  never: {
    label: 'Not paired yet',
    detail: 'No tablet has connected to this profile.',
  },
}
