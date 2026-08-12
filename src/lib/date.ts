import { addDays, differenceInMinutes, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Every timestamp in this app is displayed in IST, 12-hour format (§7.6 of the PRD),
 * regardless of the browser's own timezone. All helpers funnel through here.
 */
export const IST = 'Asia/Kolkata'

export function formatTime(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, 'h:mm a')
}

export function formatDate(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, 'd MMM yyyy')
}

export function formatDateShort(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, 'EEE, d MMM')
}

export function formatDateTime(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, 'd MMM yyyy, h:mm a')
}

/** For <input type="date"> / <input type="datetime-local"> values, in IST. */
export function toDateInputValue(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, 'yyyy-MM-dd')
}

export function toDateTimeInputValue(iso: string) {
  return formatInTimeZone(parseISO(iso), IST, "yyyy-MM-dd'T'HH:mm")
}

/** Reads a datetime-local value the doctor typed (which they mean as IST) back to UTC. */
export function fromDateTimeInputValue(local: string) {
  return fromZonedTime(local, IST).toISOString()
}

/** Today's date in IST as `yyyy-MM-dd` — not the browser's today. */
export function todayInIST() {
  return formatInTimeZone(new Date(), IST, 'yyyy-MM-dd')
}

/**
 * Half-open UTC range [start, end) covering one IST calendar day.
 * Used for every "today" / date-picker query so day boundaries land at IST midnight.
 */
export function istDayRange(day: string) {
  const start = fromZonedTime(`${day}T00:00:00`, IST)
  return { start: start.toISOString(), end: addDays(start, 1).toISOString() }
}

/** Start of today in IST, as UTC ISO — the cut point between "past" and "upcoming". */
export function startOfTodayIST() {
  return istDayRange(todayInIST()).start
}

export function endOfTodayIST() {
  return istDayRange(todayInIST()).end
}

/** "in 25 min" / "now" / "20 min ago" — used on the Next Appointment hero card. */
export function relativeToNow(iso: string) {
  const mins = differenceInMinutes(parseISO(iso), new Date())
  if (Math.abs(mins) < 2) return 'now'
  if (mins > 0) {
    if (mins < 60) return `in ${mins} min`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `in ${hrs} hr${hrs > 1 ? 's' : ''}`
    return `in ${Math.round(hrs / 24)} day(s)`
  }
  const past = Math.abs(mins)
  if (past < 60) return `${past} min ago`
  const hrs = Math.round(past / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  return `${Math.round(hrs / 24)} day(s) ago`
}

export function isTodayIST(iso: string) {
  return toDateInputValue(iso) === todayInIST()
}

/** Current wall-clock time in IST — handy for greetings. */
export function istNow() {
  return toZonedTime(new Date(), IST)
}

export interface CalendarCell {
  /** `yyyy-MM-dd` */
  iso: string
  dayOfMonth: number
  inMonth: boolean
}

function isoDate(year: number, monthIndex: number, day: number) {
  const d = new Date(Date.UTC(year, monthIndex, day))
  return d.toISOString().slice(0, 10)
}

/**
 * Six weeks of calendar cells (Mon-first) covering the given month, padded with
 * the neighbouring months' days. Built with UTC arithmetic on purpose: these are
 * calendar dates, not instants, so timezone offsets must not shift them.
 */
export function monthMatrix(year: number, monthIndex: number): CalendarCell[] {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() // 0 = Sunday
  const leading = (firstWeekday + 6) % 7 // shift so Monday = 0
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

  const cells: CalendarCell[] = []

  for (let i = leading; i > 0; i--) {
    const d = new Date(Date.UTC(year, monthIndex, 1 - i))
    cells.push({
      iso: d.toISOString().slice(0, 10),
      dayOfMonth: d.getUTCDate(),
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: isoDate(year, monthIndex, day), dayOfMonth: day, inMonth: true })
  }

  // Always 6 rows, so the grid does not jump height between months.
  let next = 1
  while (cells.length < 42) {
    const d = new Date(Date.UTC(year, monthIndex + 1, next++))
    cells.push({
      iso: d.toISOString().slice(0, 10),
      dayOfMonth: d.getUTCDate(),
      inMonth: false,
    })
  }

  return cells
}

/** Month label like "August 2026". */
export function monthLabel(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
