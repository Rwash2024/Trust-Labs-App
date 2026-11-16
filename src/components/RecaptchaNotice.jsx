import { recaptcha } from '../lib/recaptcha'

// Google requires this notice when the reCAPTCHA badge is hidden. Renders nothing when reCAPTCHA is off.
export default function RecaptchaNotice() {
  if (!recaptcha.enabled) return null
  return (
    <p style={{ fontSize: '12px', color: '#6B7280', margin: '8px 0 0', textAlign: 'center' }}>
      هذا الموقع محمي بواسطة reCAPTCHA وتنطبق عليه{' '}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">سياسة الخصوصية</a>{' '}
      و<a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">شروط الخدمة</a> من Google.
    </p>
  )
}
