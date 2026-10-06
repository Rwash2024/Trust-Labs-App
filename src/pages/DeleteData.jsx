import { Link } from 'react-router-dom'
import { ShieldIcon } from '../components/icons'
import './Terms.css'

const EMAIL = 'info@trustlabseg.com'
const HOTLINE = '16183'

const subject = 'طلب حذف بيانات - Trust Labs'
const body = [
  'السلام عليكم،',
  'أرغب في حذف بياناتي من أنظمة Trust Labs.',
  '',
  'الاسم بالكامل:',
  'رقم الموبايل المسجّل:',
  'كود كارت الثقة (لو عندي):',
].join('\n')
const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

const sections = [
  {
    title: 'إزاي تطلب حذف بياناتك',
    body: `تقدر تطلب حذف بياناتك أو ملفك الطبي بالكامل بأي طريقة من دول:\n• اتصل بالخط الساخن ${HOTLINE}.\n• ابعت إيميل على ${EMAIL} (الزرار تحت بيجهّز لك الرسالة).\nاذكر اسمك ورقم الموبايل المسجّل، وكود كارت الثقة لو عندك.`,
  },
  {
    title: 'التحقق من هويتك',
    body: 'عشان نحمي بياناتك من أي حد يطلب حذفها بدالك، هنتواصل معاك على رقم الموبايل المسجّل عندنا ونتأكد إن الطلب منك قبل التنفيذ.',
  },
  {
    title: 'إيه اللي بيتحذف',
    body: 'بنحذف من أنظمة المعمل: بيانات الحجوزات، الملف الطبي في كارت الثقة وبيانات أفراد العائلة المضافين عليه، الصورة الشخصية والتقارير المرفوعة، وبيانات الشكاوى وتقييمات الزيارات المرتبطة برقمك.',
  },
  {
    title: 'إيه اللي ممكن يفضل',
    body: 'أي بيانات القانون أو الأنظمة الطبية بتلزمنا نحتفظ بيها (زي بعض سجلات التحاليل) ممكن تفضل في أضيق حدود، وهنقولك بوضوح إيه اللي اتحذف وإيه اللي لا.',
  },
  {
    title: 'بعد التنفيذ',
    body: 'هنأكد عليك لما الحذف يخلص. بعدها كارت الثقة المرتبط بالبيانات دي مبيبقاش قابل للفتح، ولو حبيت تستخدم الخدمة تاني هتسجّل من الأول.',
  },
]

export default function DeleteData() {
  return (
    <div className="terms">
      <section className="terms__hero">
        <span className="terms__blob terms__blob--1" />
        <span className="terms__icon">
          <ShieldIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="terms__title">طلب حذف البيانات</h1>
        <p className="terms__subtitle">بياناتك ملكك، وتقدر تطلب حذفها في أي وقت</p>
      </section>

      <div className="terms__body">
        {sections.map((section) => (
          <section className="terms__section" key={section.title}>
            <h2 className="terms__section-title">{section.title}</h2>
            <p className="terms__section-text" style={{ whiteSpace: 'pre-line' }}>{section.body}</p>
          </section>
        ))}

        <section className="terms__section">
          <p className="terms__section-text">
            <a href={mailto}>ابعت طلب الحذف بالإيميل</a>
            {' · '}
            <a href={`tel:${HOTLINE}`}>اتصل بالخط الساخن {HOTLINE}</a>
          </p>
          <p className="terms__section-text">
            للتفاصيل عن البيانات اللي بنجمعها، شوف <Link to="/privacy">سياسة الخصوصية</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
