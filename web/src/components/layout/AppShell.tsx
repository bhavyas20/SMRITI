import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Activity,
  BookHeart,
  CalendarHeart,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Pill,
  Settings2,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { cn } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import { PatientIdentity } from './PatientIdentity.tsx'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Key of a live count to render as a badge, if any. */
  count?: 'flags' | 'memos'
}

const MAIN_NAV: NavItem[] = [
  { to: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { to: 'trends', label: 'Trends', icon: TrendingUp, count: 'flags' },
  { to: 'engagement', label: 'Engagement', icon: Activity },
  { to: 'messages', label: 'Messages', icon: MessageSquareHeart, count: 'memos' },
  { to: 'report', label: 'Report', icon: FileText },
  { to: 'care-guide', label: 'Care guide', icon: BookHeart },
]

const MANAGE_NAV: NavItem[] = [
  { to: 'manage/people', label: 'People', icon: Users },
  { to: 'manage/medicines', label: 'Medicines', icon: Pill },
  { to: 'manage/routine', label: 'Routine', icon: CalendarHeart },
  { to: 'manage/alerts', label: 'Alerts', icon: ShieldAlert },
  { to: 'manage/access', label: 'Access', icon: UserRound },
  { to: 'manage/device', label: 'Tablet', icon: Smartphone },
]

/**
 * The frame every patient-scoped screen renders inside.
 *
 * Two things it guarantees, both from frontend.md §12: the patient identity
 * block is present on every screen without exception, and the patient id in
 * every link is taken from the URL rather than from anything held in memory —
 * so the back button, a refresh and a bookmarked link all behave.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { patientId } = usePatientAccess()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const flags = useQuery({
    queryKey: qk.flags(patientId),
    queryFn: () => db.unwrap(db.activeFlags(patientId)),
  })
  const memos = useQuery({
    queryKey: qk.memos(patientId),
    queryFn: () => db.unwrap(db.memosFor(patientId)),
  })

  const counts = {
    flags: flags.data?.length ?? 0,
    memos: (memos.data ?? []).filter((m) => !m.read_at).length,
  }

  const renderNav = (items: NavItem[], variant: 'sidebar' | 'strip') =>
    items.map(({ to, label, icon: Icon, count }) => {
      const badge = count ? counts[count] : 0
      return (
        <NavLink
          key={to}
          to={`/p/${patientId}/${to}`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-pill font-body text-[14.5px] font-medium transition-colors',
              variant === 'sidebar' ? 'px-4 py-2.5' : 'flex-none px-4 py-2 whitespace-nowrap',
              isActive
                ? 'bg-terracotta text-ivory'
                : 'text-body hover:bg-ink/[0.05] hover:text-ink',
            )
          }
        >
          <Icon className="size-[18px] flex-none" />
          <span>{label}</span>
          {badge > 0 && (
            <Badge tone="gold" size="sm" className="ml-auto">
              {badge}
            </Badge>
          )}
        </NavLink>
      )
    })

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-40 border-b border-ink/[0.07] bg-ivory/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex flex-none items-center gap-2 text-terracotta">
            <Logomark size={24} decorative />
            <Wordmark size={17} color="var(--color-ink)" className="hidden sm:inline-flex" />
          </NavLink>

          <div className="mx-auto flex min-w-0 flex-1 justify-center sm:justify-start sm:pl-4">
            <PatientIdentity />
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="grid size-10 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Account"
            >
              <Settings2 className="size-[18px]" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-52 rounded-card border border-ink/[0.08] bg-ivory p-1.5 shadow-panel"
              >
                <DropdownMenu.Item
                  onSelect={() => navigate('/patients')}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-sand/70"
                >
                  All patients
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => navigate('/patients/new')}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-sand/70"
                >
                  Add another patient
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-ink/[0.08]" />
                <DropdownMenu.Item
                  onSelect={() => void signOut()}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-alert outline-none data-[highlighted]:bg-alert/[0.08]"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Mobile: the nav becomes a scrolling strip under the header. */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5 lg:hidden">
          {renderNav([...MAIN_NAV, ...MANAGE_NAV], 'strip')}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-4 sm:px-6">
        <aside className="hidden w-60 flex-none py-8 lg:block">
          <nav className="sticky top-28 space-y-1">
            {renderNav(MAIN_NAV, 'sidebar')}
            <p className="px-4 pb-1 pt-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              Manage
            </p>
            {renderNav(MANAGE_NAV, 'sidebar')}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 py-6 pb-24 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
