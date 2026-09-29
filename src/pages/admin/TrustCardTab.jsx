import TrustCardRequests from './TrustCardRequests'

// Pricing for both card types moved to the "الملفات الطبية" tab
// (PricingPanel, trust_card_pricing table) — one place to edit either price
// instead of two tabs that could drift out of sync with each other.
export default function TrustCardTab() {
  return (
    <div>
      <div className="admin-toolbar">
        <h2>كارت الثقة — الطلبات</h2>
      </div>
      <p className="admin-form__hint">لتعديل أسعار الكارت الشخصي والعائلي، روح تاب "الملفات الطبية".</p>

      <TrustCardRequests />
    </div>
  )
}
