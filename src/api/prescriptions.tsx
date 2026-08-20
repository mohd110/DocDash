import { PRESCRIPTION_BUCKET, supabase } from '@/lib/supabase'
import { buildTextSummary, type PrescriptionData } from '@/lib/prescription-data'

/**
 * The PDF renderer is ~1.3 MB, and most sessions never open it. Loading it on
 * first use keeps the initial dashboard bundle small.
 */
export async function renderPrescriptionBlob(data: PrescriptionData): Promise<Blob> {
  const [{ pdf }, { PrescriptionDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/lib/prescription'),
  ])
  return pdf(<PrescriptionDocument {...data} />).toBlob()
}

/**
 * Uploads the rendered PDF to Supabase Storage and returns its public URL.
 * Objects live under `<doctor_id>/<appointment_id>/` — the storage policy only
 * allows a doctor to write inside their own folder.
 */
export async function uploadPrescriptionPdf(
  blob: Blob,
  appointmentId: string,
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser()
  const doctorId = auth.user?.id
  if (!doctorId) throw new Error('You are signed out. Sign in again to save the prescription.')

  const path = `${doctorId}/${appointmentId}/prescription-${Date.now()}.pdf`

  const { error } = await supabase.storage
    .from(PRESCRIPTION_BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from(PRESCRIPTION_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Generate + store in one step; returns everything n8n needs for WhatsApp. */
export async function generatePrescription(data: PrescriptionData) {
  const blob = await renderPrescriptionBlob(data)
  const pdfUrl = await uploadPrescriptionPdf(blob, data.appointment.id)
  return { pdfUrl, textSummary: buildTextSummary(data), blob }
}

/** Opens the PDF in a new tab without uploading — used for previews/re-downloads. */
export async function openPrescriptionPreview(data: PrescriptionData) {
  // Claim the tab synchronously. Opening it after the await would sit outside
  // the click's user-gesture window and get swallowed by the popup blocker.
  // (No 'noopener' here — that makes window.open return null, and we need the handle.)
  const tab = window.open('', '_blank')

  try {
    const blob = await renderPrescriptionBlob(data)
    const url = URL.createObjectURL(blob)

    if (tab) {
      tab.location.href = url
    } else {
      // Popup blocked anyway — fall back to a download, which never is.
      const link = document.createElement('a')
      link.href = url
      link.download = `prescription-${data.patient.full_name.replace(/\s+/g, '-')}.pdf`
      link.click()
    }

    // Give the tab time to claim the blob before revoking it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
