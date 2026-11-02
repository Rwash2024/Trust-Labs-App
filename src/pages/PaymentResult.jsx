import { Link, useSearchParams } from 'react-router-dom'
import brand from '../brand'
import { CheckIcon } from '../components/icons'
import './Booking.css'

// Where Paymob sends the patient back after the checkout page. The query
// parameters here are only for wording — anyone can type them into the URL.
// What actually marks a booking as paid is the signed server-to-server callback
// handled by the paymob-webhook Edge Function, and staff see that in the admin
// bookings tab.
export default function PaymentResult() {
  const [params] = useSearchParams()
  const pending = params.get('pending') === 'true'
  const success = params.get('success') === 'true' && !pending

  if (success || pending) {
    return (
      <div className="booking booking--done">
        <span className="booking__done-icon">
          <CheckIcon />
        </span>
        <h1>{success ? 'تم استلام دفعتك' : 'جاري تأكيد الدفع'}</h1>
        <p>
          {success
            ? 'شكرًا ليك — هيتواصل معاك فريق خدمة العملاء لتأكيد الموعد في أقرب وقت.'
            : 'عملية الدفع لسه بتتأكد من البنك. هيتواصل معاك فريق خدمة العملاء لتأكيد الحجز.'}
        </p>
        <Link className="booking__submit" to="/">
          الرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="booking booking--done">
      <h1>الدفع لم يكتمل</h1>
      <p>
        مفيش مبلغ اتسحب من كارتك. حجزك اتسجّل، وفريق خدمة العملاء هيتواصل معاك لإتمام الدفع، أو كلّمنا على
        الخط الساخن {brand.hotline}.
      </p>
      <Link className="booking__submit" to="/booking">
        رجوع لصفحة الحجز
      </Link>
    </div>
  )
}
