import { useState } from 'react'
import TrustCardRequests from './TrustCardRequests'
import PatientFilesPanel, {
  DistributionPanel,
  BranchReportPanel,
  ActivatedCardsPanel,
  PricingPanel,
} from './MedicalFilesTab'

// كل ما يخص كارت الثقة في مكان واحد: الطلبات، التوزيع على الفروع، الكروت
// المفعّلة، ملفات المرضى، والأسعار.
const SECTIONS = [
  { key: 'requests', label: 'الطلبات' },
  { key: 'distribution', label: 'التوزيع على الفروع' },
  { key: 'activated', label: 'الكروت المفعّلة' },
  { key: 'patients', label: 'ملفات المرضى' },
  { key: 'pricing', label: 'الأسعار' },
]

export default function TrustCardTab() {
  const [section, setSection] = useState('requests')
  const [refreshKey, setRefreshKey] = useState(0)
  const [openCode, setOpenCode] = useState('')

  const openPatient = (code) => {
    setOpenCode(code)
    setSection('patients')
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>كارت الثقة</h2>
      </div>

      <div className="admin-tabs" style={{ padding: '0 0 var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`admin-tabs__btn${section === s.key ? ' active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'requests' && <TrustCardRequests />}
      {section === 'distribution' && (
        <>
          <DistributionPanel onChanged={() => setRefreshKey((k) => k + 1)} />
          <BranchReportPanel refreshKey={refreshKey} />
        </>
      )}
      {section === 'activated' && <ActivatedCardsPanel onOpen={openPatient} refreshKey={refreshKey} />}
      {section === 'patients' && <PatientFilesPanel key={openCode} initialCode={openCode} />}
      {section === 'pricing' && <PricingPanel />}
    </div>
  )
}
