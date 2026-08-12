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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: BOTTLE,
    paddingBottom: 12,
  },
  logo: { width: 54, height: 54, marginRight: 14, objectFit: 'contain' },
  clinicName: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: BOTTLE },
  doctorName: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', marginTop: 4, color: INK },
  clinicMeta: { fontSize: 9, color: MUTED, marginTop: 2, maxWidth: 220 },
  rxMark: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: BOTTLE_LIGHT },

  patientBar: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4D3A6',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: { width: '33.33%', marginBottom: 6, paddingRight: 8 },
  cellWide: { width: '66.66%', marginBottom: 6, paddingRight: 8 },
  cellLabel: {
    fontSize: 7.5,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cellValue: { fontSize: 10.5 },

  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BOTTLE,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
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

function Cell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={wide ? styles.cellWide : styles.cell}>
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.cellValue}>{value}</Text>
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
  const doctorName = settings.doctor_name?.trim() || 'Consulting Physician'

  return (
    <Document
      title={`Prescription — ${patient.full_name}`}
      author={doctorName}
      subject="Medical prescription"
    >
      <Page size="A4" style={styles.page}>
        {/* ---------------------------------------------------- clinic header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {settings.logo_url ? <Image src={settings.logo_url} style={styles.logo} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{clinicName}</Text>
              <Text style={styles.doctorName}>{doctorName}</Text>
              {settings.qualifications ? (
                <Text style={styles.clinicMeta}>{settings.qualifications}</Text>
              ) : null}
              {settings.registration_no ? (
                <Text style={styles.clinicMeta}>Reg. No. {settings.registration_no}</Text>
              ) : null}
              {settings.address ? <Text style={styles.clinicMeta}>{settings.address}</Text> : null}
            </View>
          </View>
          <Text style={styles.rxMark}>℞</Text>
        </View>

        {/* --------------------------------------------------- patient details */}
        <View style={styles.patientBar}>
          <Cell label="Patient" value={patient.full_name} wide />
          <Cell label="Date" value={formatDate(appointment.scheduled_at)} />
          <Cell label="Age" value={patient.age != null ? `${patient.age} yrs` : '—'} />
          <Cell label="Gender" value={patient.gender || '—'} />
          <Cell label="Phone" value={patient.phone} />
          {appointment.reason ? <Cell label="Reason for visit" value={appointment.reason} wide /> : null}
          {patient.allergies ? <Cell label="Allergies" value={patient.allergies} /> : null}
          {patient.chronic_conditions ? (
            <Cell label="Chronic conditions" value={patient.chronic_conditions} wide />
          ) : null}
        </View>

        {/* ------------------------------------------------------- diagnosis */}
        {consultation.diagnosis ? (
          <View>
            <Text style={styles.sectionTitle}>FINDINGS / DIAGNOSIS</Text>
            <Text style={styles.paragraph}>{consultation.diagnosis}</Text>
          </View>
        ) : null}

        {/* ------------------------------------------------------- medicines */}
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

        {/* ---------------------------------------------------------- advice */}
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

        {/* ------------------------------------------------------- signature */}
        <View style={styles.signBlock}>
          {settings.signature_url ? (
            <Image src={settings.signature_url} style={styles.signature} />
          ) : null}
          <Text style={[styles.signLine, { fontFamily: 'Helvetica-Bold' }]}>{doctorName}</Text>
          {settings.registration_no ? (
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
              Reg. No. {settings.registration_no}
            </Text>
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
