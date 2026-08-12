import { CalendarDays, LayoutDashboard, Settings, Users } from 'lucide-react'

/** Exactly four destinations, no nesting (§7.3). */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, end: false },
  { to: '/patients', label: 'Patients', icon: Users, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const
