import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CheckCircle2,
  CloudUpload,
  FileText,
  History,
  Loader2,
  Pill,
  Printer,
  Send,
  Stethoscope,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PrescriptionList } from '@/components/prescription/prescription-list'
import { VisitCard } from '@/components/prescription/visit-card'
import { StatusBadge } from '@/components/appointments/status-badge'
import { PatientSummary } from '@/components/consult/patient-summary'
import { MedicineRows, emptyMedicine } from '@/components/consult/medicine-rows'
import {
  getOrCreateConsultation,
  markConsultationCompleted,
  saveConsultationDraft,
  type ConsultDraft,
} from '@/api/consultations'
import { useAppointment, useAppointmentActions, notifyFollowUp } from '@/hooks/useAppointments'
import { useKnownMedicines, usePatientHistory } from '@/hooks/usePatients'
import { useDoctorProfile } from '@/hooks/useDoctor'
import {
  deliverPrescription,
  useOpenPrescription,
  useResendPrescription,
} from '@/hooks/usePrescriptionDelivery'
import { APPOINTMENT_SCOPED_KEYS, qk } from '@/hooks/queryKeys'
import { formatDateTime, todayInIST } from '@/lib/date'
import { isBlank } from '@/lib/utils'
import type { ConsultationWithItems, MedicineDraft } from '@/lib/types'

const AUTOSAVE_DELAY_MS = 1800

function toDraft(consultation: ConsultationWithItems): ConsultDraft {
  const medicines: MedicineDraft[] = consultation.prescription_items.map((item) => ({
    key: item.id,
    medicine_name: item.medicine_name ?? '',
    dosage: item.dosage ?? '',
    frequency: item.frequency ?? '',
    duration: item.duration ?? '',
    instructions: item.instructions ?? '',
  }))

  return {
    diagnosis: consultation.diagnosis ?? '',
    advice: consultation.advice ?? '',
    follow_up_date: consultation.follow_up_date ?? null,
    medicines: medicines.length > 0 ? medicines : [emptyMedicine()],
  }
}

/** Ignores the client-only row keys so re-keying never looks like an edit. */
function fingerprint(draft: ConsultDraft) {
  return JSON.stringify({
    d: draft.diagnosis.trim(),
    a: draft.advice.trim(),
    f: draft.follow_up_date,
    m: draft.medicines.map(({ key: _key, ...rest }) => rest),
  })
}

function hasContent(draft: ConsultDraft) {
  return (
    !isBlank(draft.diagnosis) ||
    !isBlank(draft.advice) ||
    draft.medicines.some((m) => !isBlank(m.medicine_name))
  )
}

export function ConsultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const client = useQueryClient()

  const { data: appointment, isLoading: loadingAppointment } = useAppointment(id)
  const { data: doctor } = useDoctorProfile()
  const { data: medicines = [] } = useKnownMedicines()
  const { setStatus } = useAppointmentActions()
  const resend = useResendPrescription()
  const preview = useOpenPrescription()

  const patient = appointment?.patient
  const { data: history = [], isLoading: loadingHistory } = usePatientHistory(patient?.id, id)

  // The draft row is created the moment the screen opens, so autosave has a home.
  const { data: consultation, isLoading: loadingConsultation } = useQuery({
    queryKey: qk.consultation(id ?? ''),
    queryFn: () => getOrCreateConsultation(id!, patient!.id),
    enabled: Boolean(id && patient?.id),
  })

  const [draft, setDraft] = React.useState<ConsultDraft | null>(null)
  const [savedAt, setSavedAt] = React.useState<Date | null>(null)
  const savedFingerprint = React.useRef('')

  React.useEffect(() => {
    if (!consultation || draft) return
    const initial = toDraft(consultation)
    setDraft(initial)
    savedFingerprint.current = fingerprint(initial)
  }, [consultation, draft])

  const completed = consultation?.status === 'completed'
  const dirty = draft ? fingerprint(draft) !== savedFingerprint.current : false

  const save = useMutation({
    mutationFn: async (next: ConsultDraft) => {
      if (!consultation) throw new Error('Consultation not ready yet')
      return saveConsultationDraft(consultation.id, next)
    },
    onSuccess: (saved, variables) => {
      savedFingerprint.current = fingerprint(variables)
      setSavedAt(new Date())
      client.setQueryData(qk.consultation(id ?? ''), saved)
    },
    // Autosave must never fail quietly — the doctor has to know the notes are
    // still only in the browser (§7.8).
    onError: (error: Error) =>
      toast.error('Draft not saved', {
        description: `${error.message} — your notes are still on screen. Try Save Draft again.`,
      }),
  })

  /* ---------------------------------------------- autosave every few seconds */
  // Depend on `mutate` (stable) rather than the whole mutation object, so an
  // unrelated re-render cannot keep restarting the debounce timer.
  const saveMutate = save.mutate
  const saving = save.isPending

  React.useEffect(() => {
    if (!draft || completed || !consultation) return
    if (!dirty || saving) return

    const timer = window.setTimeout(() => saveMutate(draft), AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [draft, dirty, completed, consultation, saving, saveMutate])

  /* ------------------------------------------------------------- warn on exit */
  React.useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const meetingLink = appointment?.meeting_link || doctor?.default_meeting_link || ''

  function startMeeting() {
    if (!appointment) return
    if (!meetingLink) {
      toast.error('No meeting link set', {
        description: 'Add your Zoom or Google Meet link in Settings.',
      })
      return
    }
    window.open(meetingLink, '_blank', 'noopener')
    if (appointment.status === 'booked') {
      setStatus.mutate({ appointment, status: 'in_progress' })
    }
  }

  /* ------------------------------------------------- complete & send (§2.7) */
  const complete = useMutation({
    mutationFn: async () => {
      if (!appointment || !patient || !consultation || !draft) {
        throw new Error('Still loading — try again in a moment')
      }
      if (!hasContent(draft)) {
        throw new Error('Add a diagnosis or at least one medicine before sending')
      }

      // 1. Persist whatever is on screen, 2. close the consultation record.
      const saved = await saveConsultationDraft(consultation.id, draft)
      savedFingerprint.current = fingerprint(draft)
      const finished = await markConsultationCompleted(saved.id, {
        whatsapp_delivery_status: 'pending',
      })

      // 3. PDF + WhatsApp handoff. A delivery failure must not block closing.
      let delivered = true
      try {
        await deliverPrescription({
          patient,
          appointment,
          consultation: finished,
          regenerate: true,
        })
      } catch (error) {
        delivered = false
        toast.error('WhatsApp delivery failed', {
          description: `${(error as Error).message} — use Retry on the appointment card.`,
          duration: 10_000,
        })
      }

      // 4. Close the appointment, 5. let the agent set a follow-up reminder.
      await setStatus.mutateAsync({ appointment, status: 'completed' })
      if (draft.follow_up_date) await notifyFollowUp(appointment, draft.follow_up_date)

      return { delivered }
    },
    onSuccess: ({ delivered }) => {
      for (const key of APPOINTMENT_SCOPED_KEYS) client.invalidateQueries({ queryKey: [key] })
      client.invalidateQueries({ queryKey: ['patient-history'] })
      client.invalidateQueries({ queryKey: ['known-medicines'] })
      if (delivered) {
        toast.success('Prescription sent on WhatsApp', {
          description: `${patient?.full_name} has the prescription. Next patient is ready.`,
        })
      }
      navigate('/')
    },
    onError: (error: Error) =>
      toast.error('Could not complete the consultation', { description: error.message }),
  })

  /* ------------------------------------------------------------------ render */
  if (loadingAppointment || loadingConsultation || !draft) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-14 w-64" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-[32rem] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!appointment || !patient) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-brand-800">
          Appointment not found
        </h1>
        <Button className="mt-6" onClick={() => navigate('/appointments')}>
          Back to appointments
        </Button>
      </div>
    )
  }

  const update = (patch: Partial<ConsultDraft>) => setDraft((prev) => ({ ...prev!, ...patch }))

  /* Opening /consult/:id directly (e.g. from a bookmark) leaves no history to
     go back to, which would make the arrow do nothing. Fall back to the list. */
  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/appointments')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* ------------------------------------------------------------ top bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-surface-500/40 bg-card p-4 shadow-card sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Go back">
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-display text-2xl font-semibold text-brand-800">
                {patient.full_name}
              </h1>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDateTime(appointment.scheduled_at)} IST
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="lg" onClick={startMeeting}>
            <Video />
            Start Meeting
          </Button>

          {completed ? (
            <>
              <Button variant="outline" size="lg" asChild>
                <Link to={`/prescription/${appointment.id}`} target="_blank">
                  <Printer />
                  Print
                </Link>
              </Button>
              {consultation?.prescription_pdf_url ? (
                <Button variant="outline" size="lg" asChild>
                  <a href={consultation.prescription_pdf_url} target="_blank" rel="noreferrer">
                    <FileText />
                    View prescription
                  </a>
                </Button>
              ) : (
                doctor && (
                  <Button
                    variant="outline"
                    size="lg"
                    loading={preview.isPending}
                    onClick={() =>
                      preview.mutate({
                        patient,
                        appointment,
                        consultation: consultation!,
                        doctor,
                      })
                    }
                  >
                    <FileText />
                    View prescription
                  </Button>
                )
              )}
              <Button
                size="lg"
                loading={resend.isPending}
                onClick={() =>
                  resend.mutate({ patient, appointment, consultationId: consultation!.id })
                }
              >
                <Send />
                Re-send on WhatsApp
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                loading={save.isPending}
                disabled={!dirty}
                onClick={() => save.mutate(draft)}
              >
                <CloudUpload />
                Save Draft
              </Button>
              <Button size="lg" loading={complete.isPending} onClick={() => complete.mutate()}>
                <Send />
                Complete &amp; Send to Patient
              </Button>
            </>
          )}
        </div>
      </div>

      {completed && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-brand-600" />
          <p className="text-sm font-semibold text-brand-800">
            This consultation is complete
            {consultation?.completed_at ? ` — closed ${formatDateTime(consultation.completed_at)}` : ''}
            . The record below is read-only.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        {/* ------------------------------------------------------ left panel */}
        {/* Patient facts stay pinned here while the doctor moves between tabs —
            allergies in particular must never be a click away. */}
        <div className="space-y-4">
          <PatientSummary patient={patient} reason={appointment.reason} />
        </div>

        {/* ----------------------------------------------------- right panel */}
        <div className="rounded-2xl border border-surface-500/40 bg-card p-5 shadow-card sm:p-6">
          <Tabs defaultValue="prescription">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="prescription" className="px-4">
                  <Stethoscope className="size-4" />
                  Prescription
                </TabsTrigger>
                <TabsTrigger value="history" className="px-4">
                  <History className="size-4" />
                  History
                  {history.length > 0 && (
                    <span className="rounded-full bg-surface-200 px-1.5 text-xs font-bold text-brand-700">
                      {history.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past-prescriptions" className="px-4">
                  <Pill className="size-4" />
                  Past Rx
                </TabsTrigger>
              </TabsList>

              {!completed && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                {save.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : dirty ? (
                  <>
                    <span className="size-2 rounded-full bg-amber-400" />
                    Unsaved changes
                  </>
                ) : savedAt ? (
                  <>
                    <Check className="size-3.5 text-brand-500" />
                    Draft saved
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-brand-300" />
                    Autosave on
                  </>
                )}
                </span>
              )}
            </div>

            {/* --------------------------------------------- write prescription */}
            <TabsContent value="prescription" className="space-y-5">
              <fieldset disabled={completed} className="space-y-5">
            <Field label="Findings / Diagnosis" htmlFor="diagnosis">
              <Textarea
                id="diagnosis"
                value={draft.diagnosis}
                onChange={(e) => update({ diagnosis: e.target.value })}
                placeholder="What did you find? e.g. Acute viral fever, throat congestion…"
                className="min-h-[140px]"
              />
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700/80">
                Medicines
              </p>
              <MedicineRows
                value={draft.medicines}
                onChange={(next) => update({ medicines: next })}
                suggestions={medicines}
              />
            </div>

            <Field label="Advice / Notes" htmlFor="advice">
              <Textarea
                id="advice"
                value={draft.advice}
                onChange={(e) => update({ advice: e.target.value })}
                placeholder="Rest, fluids, when to come back…"
              />
            </Field>

            <Field
              label="Follow-up date (optional)"
              htmlFor="follow-up"
              hint="If set, the WhatsApp agent will remind the patient."
            >
              <div className="flex items-center gap-2">
                <CalendarPlus className="size-5 shrink-0 text-brand-500" />
                <Input
                  id="follow-up"
                  type="date"
                  min={todayInIST()}
                  value={draft.follow_up_date ?? ''}
                  onChange={(e) => update({ follow_up_date: e.target.value || null })}
                  className="max-w-xs"
                />
                {draft.follow_up_date && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update({ follow_up_date: null })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Field>
              </fieldset>

              {completed ? (
                <div className="border-t border-surface-500/50 pt-5">
                  <Button variant="outline" size="lg" className="w-full" asChild>
                    <Link to={`/prescription/${appointment.id}`} target="_blank">
                      <Printer />
                      Print this prescription
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="border-t border-surface-500/50 pt-5">
                  <Button
                    size="xl"
                    className="w-full"
                    loading={complete.isPending}
                    onClick={() => complete.mutate()}
                  >
                    <Send />
                    Complete &amp; Send to Patient
                  </Button>
                  <p className="mt-2.5 text-center text-xs text-muted-foreground">
                    Saves the consultation, creates the prescription PDF and sends it on WhatsApp.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ------------------------------------------------ clinical history */}
            <TabsContent value="history" className="space-y-4">
              {loadingHistory ? (
                <ListSkeleton rows={2} />
              ) : history.length === 0 ? (
                <EmptyState
                  emoji="🌱"
                  title="First visit"
                  description={`This is the first recorded consultation for ${patient.full_name}. Everything you write today will show up here next time.`}
                />
              ) : (
                history.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} patient={patient} compact />
                ))
              )}
            </TabsContent>

            {/* --------------------------------------------- previous prescriptions */}
            <TabsContent value="past-prescriptions">
              {loadingHistory ? (
                <ListSkeleton rows={2} />
              ) : (
                <PrescriptionList visits={history} patient={patient} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
