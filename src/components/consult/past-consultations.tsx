import * as React from 'react'
import { ChevronDown, FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useOpenPrescription } from '@/hooks/usePrescriptionDelivery'
import { useClinicSettings } from '@/hooks/useSettings'
import type { Patient, VisitHistoryEntry } from '@/lib/types'

function VisitRow({ visit, patient }: { visit: VisitHistoryEntry; patient: Patient }) {
  const [open, setOpen] = React.useState(false)
  const { data: settings } = useClinicSettings()
  const preview = useOpenPrescription()
  const when = visit.completed_at ?? visit.appointment?.scheduled_at ?? visit.created_at

  return (
    <div className="rounded-xl border border-cream-500/50 bg-cream-100/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-3.5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-bottle-700">{formatDate(when)}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {visit.diagnosis || visit.appointment?.reason || 'No diagnosis recorded'}
          </p>
        </div>
        <ChevronDown
          className={cn('mt-0.5 size-5 shrink-0 text-bottle-600 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-cream-500/40 px-3.5 pb-3.5 pt-3">
          {visit.diagnosis && (
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-bottle-600">
                Diagnosis
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{visit.diagnosis}</p>
            </div>
          )}

          {visit.prescription_items.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-bottle-600">
                Medicines
              </p>
              <ul className="mt-1 space-y-1">
                {visit.prescription_items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className="font-semibold">{item.medicine_name}</span>
                    {[item.dosage, item.frequency, item.duration, item.instructions]
                      .filter(Boolean)
                      .join(' · ') && (
                      <span className="text-muted-foreground">
                        {' — '}
                        {[item.dosage, item.frequency, item.duration, item.instructions]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visit.advice && (
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-bottle-600">
                Advice
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{visit.advice}</p>
            </div>
          )}

          {visit.follow_up_date && (
            <p className="text-sm">
              <span className="font-semibold">Follow-up: </span>
              {formatDate(`${visit.follow_up_date}T00:00:00+05:30`)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {visit.prescription_pdf_url ? (
              <Button variant="outline" size="sm" asChild>
                <a href={visit.prescription_pdf_url} target="_blank" rel="noreferrer">
                  <FileText />
                  View prescription
                </a>
              </Button>
            ) : (
              settings &&
              visit.appointment && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={preview.isPending}
                  onClick={() =>
                    preview.mutate({
                      patient,
                      appointment: visit.appointment!,
                      consultation: visit,
                      settings,
                    })
                  }
                >
                  <FileText />
                  View prescription
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Collapsible read-only visit history shown in the consult left panel (§3.3). */
export function PastConsultations({
  patient,
  visits,
  isLoading,
}: {
  patient: Patient
  visits: VisitHistoryEntry[]
  isLoading: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="rounded-2xl border border-cream-500/40 bg-card shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-3 font-display text-lg font-semibold text-bottle-800">
          <History className="size-5 text-bottle-500" />
          Past consultations
          {!isLoading && (
            <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-sm font-bold text-bottle-700">
              {visits.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-bottle-600 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="space-y-2.5 px-5 pb-5">
          {isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : visits.length === 0 ? (
            <p className="rounded-xl bg-cream-100 px-4 py-5 text-center text-sm text-muted-foreground">
              This is {patient.full_name}’s first recorded visit.
            </p>
          ) : (
            visits.map((visit) => <VisitRow key={visit.id} visit={visit} patient={patient} />)
          )}
        </div>
      )}
    </div>
  )
}
