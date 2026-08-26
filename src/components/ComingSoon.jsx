export default function ComingSoon({ title }) {
  return (
    <div style={{ padding: 'var(--space-8) var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
      <h2 style={{ marginBottom: 'var(--space-3)' }}>{title}</h2>
      <p>هذه الشاشة قيد الإنشاء وهتتفعل قريبًا.</p>
    </div>
  )
}
