import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { formatDate, formatDateTime } from './date'
import type { PrescriptionData } from './prescription-data'

const BOTTLE = '#0B5540'
const BOTTLE_LIGHT = '#4A9377'
const CREAM = '#FDF8EC'
const INK = '#132A22'
const MUTED = '#5B6F66'

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    paddingTop: 34,
    paddingBottom: 56,
    paddingHorizontal: 38,
    fontSize: 10.5,
    color: INK,
    fontFamily: 'Helvetica',
  },
  /* 1. clinic letterhead */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: BOTTLE,
    paddingBottom: 12,
  },
  logo: { width: 54, height: 54, marginRight: 14, objectFit: 'contain' },
  clinicName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: BOTTLE, letterSpacing: 0.5 },
  clinicMeta: { fontSize: 8.5, color: MUTED, marginTop: 3 },

  /* 2. patient (left) · prescribing doctor (right) */
  partiesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E4D3A6',
    paddingVertical: 14,
  },
  partyLeft: { width: '57%', paddingRight: 16 },
  partyRight: {
    width: '43%',
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#E4D3A6',
  },
  partyLabel: {
    fontSize: 7,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  partyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  line: { flexDirection: 'row', marginBottom: 2.5 },
  lineLabel: { width: 62, fontSize: 9, color: MUTED, fontFamily: 'Helvetica-Bold' },
  lineValue: { flex: 1, fontSize: 9.5 },
  doctorQual: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 2 },
  doctorMeta: { fontSize: 8.5, color: MUTED, marginBottom: 2 },

  /* 3. the prescription */
  bodyRow: { flexDirection: 'row', paddingTop: 14 },
  rxMark: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: BOTTLE_LIGHT, marginRight: 12 },
  bodyCol: { flex: 1 },

  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BOTTLE,
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 5,
  },
  paragraph: { fontSize: 10.5, lineHeight: 1.5 },

  table: { borderWidth: 1, borderColor: '#E4D3A6', borderRadius: 6, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: BOTTLE },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: CREAM,
    padding: 7,
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EFE3C2',
    backgroundColor: '#FFFFFF',
  },
  td: { fontSize: 9.5, padding: 7 },
  colNo: { width: '7%' },
  colMed: { width: '29%' },
  colDose: { width: '15%' },
  colFreq: { width: '16%' },
  colDur: { width: '15%' },
  colInstr: { width: '18%' },

  followUp: {
    marginTop: 14,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#D8E9E0',
    borderLeftWidth: 3,
    borderLeftColor: BOTTLE,
  },

  signBlock: { marginTop: 30, alignItems: 'flex-end' },
  signature: { width: 130, height: 46, objectFit: 'contain' },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: MUTED,
    width: 150,
    marginTop: 4,
    paddingTop: 4,
    textAlign: 'right',
  },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 38,
    right: 38,
    borderTopWidth: 1,
    borderTopColor: '#E4D3A6',
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: MUTED },
})

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  )
}

export function PrescriptionDocument({
  patient,
  appointment,
  consultation,
  settings,
}: PrescriptionData) {
  const meds = consultation.prescription_items
  const clinicName = settings.clinic_name?.trim() || 'Hakiman Clinic'
  const doctorName = settings.doctor_name?.trim() || 'Dr. Salim'

  return (
    <Document
      title={`Prescription — ${patient.full_name}`}
      author={doctorName}
      subject="Medical prescription"
    >
      <Page size="A4" style={styles.page}>
        {/* ------------------------------------------- 1. clinic letterhead */}
        <View style={styles.header}>
          {settings.logo_url ? <Image src={settings.logo_url} style={styles.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.clinicName}>{clinicName.toUpperCase()}</Text>
            {settings.address ? <Text style={styles.clinicMeta}>{settings.address}</Text> : null}
          </View>
        </View>

        {/* ------------------------------ 2. patient (left) · doctor (right) */}
        <View style={styles.partiesRow}>
          <View style={styles.partyLeft}>
            <Text style={styles.partyLabel}>PATIENT</Text>
            <Text style={styles.partyName}>{patient.full_name}</Text>
            <Line
              label="Age / Sex"
              value={
                [
                  patient.age != null ? `${patient.age} yrs` : null,
                  patient.gender
                    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
            />
            <Line label="Phone" value={patient.phone} />
            <Line label="Date" value={formatDate(appointment.scheduled_at)} />
            {appointment.reason ? <Line label="Complaint" value={appointment.reason} /> : null}
            {patient.allergies ? <Line label="Allergies" value={patient.allergies} /> : null}
            {patient.chronic_conditions ? (
              <Line label="Conditions" value={patient.chronic_conditions} />
            ) : null}
          </View>

          <View style={styles.partyRight}>
            <Text style={styles.partyLabel}>PRESCRIBED BY</Text>
            <Text style={styles.partyName}>{doctorName}</Text>
            {settings.qualifications ? (
              <Text style={styles.doctorQual}>{settings.qualifications}</Text>
            ) : null}
            {settings.registration_no ? (
              <Text style={styles.doctorMeta}>Reg. No. {settings.registration_no}</Text>
            ) : null}
            {settings.working_hours ? (
              <Text style={styles.doctorMeta}>{settings.working_hours}</Text>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------- 3. the prescription */}
        <View style={styles.bodyRow}>
          <Text style={styles.rxMark}>℞</Text>

          <View style={styles.bodyCol}>
            {consultation.diagnosis ? (
              <View>
                <Text style={styles.sectionTitle}>FINDINGS / DIAGNOSIS</Text>
                <Text style={styles.paragraph}>{consultation.diagnosis}</Text>
              </View>
            ) : null}

            {meds.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>MEDICINES</Text>
                <View style={styles.table}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.th, styles.colNo]}>#</Text>
                    <Text style={[styles.th, styles.colMed]}>MEDICINE</Text>
                    <Text style={[styles.th, styles.colDose]}>DOSAGE</Text>
                    <Text style={[styles.th, styles.colFreq]}>FREQUENCY</Text>
                    <Text style={[styles.th, styles.colDur]}>DURATION</Text>
                    <Text style={[styles.th, styles.colInstr]}>INSTRUCTIONS</Text>
                  </View>
                  {meds.map((m, i) => (
                    <View key={m.id || i} style={styles.tr} wrap={false}>
                      <Text style={[styles.td, styles.colNo]}>{i + 1}</Text>
                      <Text style={[styles.td, styles.colMed]}>{m.medicine_name}</Text>
                      <Text style={[styles.td, styles.colDose]}>{m.dosage || '—'}</Text>
                      <Text style={[styles.td, styles.colFreq]}>{m.frequency || '—'}</Text>
                      <Text style={[styles.td, styles.colDur]}>{m.duration || '—'}</Text>
                      <Text style={[styles.td, styles.colInstr]}>{m.instructions || '—'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {consultation.advice ? (
              <View>
                <Text style={styles.sectionTitle}>ADVICE / NOTES</Text>
                <Text style={styles.paragraph}>{consultation.advice}</Text>
              </View>
            ) : null}

            {consultation.follow_up_date ? (
              <View style={styles.followUp}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: BOTTLE }}>
                  Follow-up on {formatDate(`${consultation.follow_up_date}T00:00:00+05:30`)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------------------- signature */}
        <View style={styles.signBlock}>
          {settings.signature_url ? (
            <Image src={settings.signature_url} style={styles.signature} />
          ) : null}
          <Text style={[styles.signLine, { fontFamily: 'Helvetica-Bold' }]}>{doctorName}</Text>
          {settings.qualifications ? (
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{settings.qualifications}</Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {clinicName} · Generated {formatDateTime(new Date().toISOString())} IST
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
