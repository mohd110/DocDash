import { Badge } from '@/components/ui/badge'
import { STATUS_META } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/lib/types'

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <Badge tone={meta.tone} className={className}>
      <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  )
}
