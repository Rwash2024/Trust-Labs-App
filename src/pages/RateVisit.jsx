import { useEffect, useState } from 'react'
import { submitVisitRating, submitComplaint, fetchBranchGroups } from '../lib/data'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../lib/phone'
import { lowestScore, ratingLevel } from '../lib/ratings'
import { HeartIcon } from '../components/icons'
import './RateVisit.css'

// "قيّم زيارتك" — matches the real Trust Lab Ops tablet survey on purpose:
// fast, emoji-only questions with no gate in front of them. Saved to our own
// `visit_ratings` table; forwarding it on to Trust Lab Ops happens server-side
// once they expose a submit-survey webhook (see supabase/visit_ratings_migration.sql).
//
// One deliberate exception to "everything optional": a 😡/😞 on ANY of the
// three questions requires a phone number and files a complaint in the
// existing شكاوى tab — otherwise a dissatisfied patient's rating arrives with
// no way for staff to follow up. A 😐 keeps the phone optional but asks what
// would have made the visit better (see src/lib/ratings.js).

const QUESTIONS = {
  branch: [
    'إيه تقييمك لتجربتك معانا النهارده بشكل عام؟',
    'سرعة الخدمة كانت مناسبة؟',
    'إيه رأيك في تعامل الموظفين معاك؟',
  ],
  home: [
    'إيه تقييمك لتجربة الزيارة المنزلية النهارده بشكل عام؟',
    'الكيميائي التزم بالميعاد؟',
    'إيه رأيك في تعامل الكيميائي معاك؟',
  ],
}

const FACES = [
  { v: 1, e: '😡', l: 'سيء جداً' },
  { v: 2, e: '😞', l: 'سيء' },
  { v: 3, e: '😐', l: 'مقبول' },
  { v: 4, e: '😊', l: 'كويس' },
  { v: 5, e: '🤩', l: 'ممتاز' },
]

function Dots({ step }) {
  return (
    <div className="ratevisit__dots">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i === step ? 'on' : ''} />
      ))}
    </div>
  )
}

export default function RateVisit() {
  const [screen, setScreen] = useState('choose') // choose | branch-pick | question | final | thanks
  const [visitType, setVisitType] = useState(null) // 'branch' | 'home'
  const [branches, setBranches] = useState([])
  const [branchName, setBranchName] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [chemistName, setChemistName] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | error
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBranchGroups().then((groups) => setBranches(groups.flatMap((g) => g.list.map((b) => ({ ...b, governorate: g.governorate })))))
  }, [])

  function pickType(type) {
    setVisitType(type)
    setAnswers({})
    setQIndex(0)
    if (type === 'branch') {
      setScreen('branch-pick')
      return
    }
    trackEvent(AnalyticsEvents.RATE_VISIT_STARTED, { visit_type: type })
    setScreen('question')
  }

  function confirmBranch() {
    trackEvent(AnalyticsEvents.RATE_VISIT_STARTED, { visit_type: 'branch' })
    setScreen('question')
  }

  function answer(value) {
    const keys = ['overall', visitType === 'home' ? 'punctuality' : 'speed', 'staff']
    const next = { ...answers, [keys[qIndex]]: value }
    setAnswers(next)
    if (qIndex + 1 < 3) setQIndex(qIndex + 1)
    else setScreen('final')
  }

  const level = ratingLevel(Object.values(answers))
  const isLowRating = level === 'low'
  const isMediumRating = level === 'medium'
  // Optional for a good rating, but if typed it must be a real number — a fake
  // one is worse than none, since staff would chase it.
  const phoneError = phone ? egyptPhoneError(phone) : ''

  function lowAnswersSummary() {
    const questions = QUESTIONS[visitType]
    const keys = ['overall', visitType === 'home' ? 'punctuality' : 'speed', 'staff']
    return keys
      .map((k, i) => (answers[k] <= 2 ? `${questions[i]} ${FACES.find((f) => f.v === answers[k]).e}` : null))
      .filter(Boolean)
      .join(' / ')
  }

  async function submit() {
    if (isLowRating && !phone.trim()) {
      setError('اكتب رقم موبايلك عشان فريق خدمة العملاء يقدر يتواصل معاك.')
      setStatus('error')
      return
    }
    if (phoneError) {
      // At 11 digits the message is already shown under the field — don't repeat it by the button.
      setError(phone.length === 11 ? '' : phoneError)
      setStatus('error')
      return
    }
    setStatus('sending')
    setError('')
    try {
      await submitVisitRating({ visitType, answers, name, phone, branchName, chemistName, comment })
      trackEvent(AnalyticsEvents.RATE_VISIT_COMPLETED, { visit_type: visitType, overall: answers.overall })

      if (isLowRating) {
        // Best-effort: the rating above already succeeded and is the source of truth.
        // A failure here just means staff won't see this one in شكاوى — not fatal.
        submitComplaint({
          name: name.trim() || 'بدون اسم (من قيّم زيارتك)',
          phone: phone.trim(),
          type: 'شكوى',
          branchName: visitType === 'branch' ? branchName : 'زيارة منزلية',
          rating: lowestScore(Object.values(answers)),
          message: [
            `تقييم منخفض من استبيان "قيّم زيارتك" (${visitType === 'branch' ? 'زيارة فرع' : 'زيارة منزلية'})${
              chemistName ? ` — الكيميائي: ${chemistName}` : ''
            }`,
            `الأسئلة اللي اتقيّمت سيء: ${lowAnswersSummary()}`,
            comment.trim() ? `تعليق المريض: ${comment.trim()}` : 'من غير تفاصيل إضافية من المريض.',
          ].join('\n'),
        }).catch((err) => console.error('auto-filing complaint failed (non-blocking)', err))
      }

      setScreen('thanks')
    } catch (err) {
      console.error('submitVisitRating failed', err)
      setError('حصل خطأ وإحنا بنبعت تقييمك، جرب تاني كمان شوية.')
      setStatus('error')
    }
  }

  const dotsStep = { choose: 0, 'branch-pick': 0, question: 1 + qIndex, final: 4, thanks: undefined }[screen]

  return (
    <div className="ratevisit">
      <section className="ratevisit__hero">
        <span className="ratevisit__blob" />
        <h1 className="ratevisit__title">قيّم زيارتك</h1>
        <p className="ratevisit__subtitle">رأيك بيوصل مباشرة لإدارة الجودة</p>
        {dotsStep !== undefined && <Dots step={dotsStep} />}
      </section>

      <div className="ratevisit__body">
        {screen === 'choose' && (
          <>
            <p className="ratevisit__q">زيارتك كانت في الفرع، ولا زيارة منزلية؟</p>
            <div className="ratevisit__choice" onClick={() => pickType('branch')}>
              <span className="e">🏥</span>
              زيارة فرع
            </div>
            <div className="ratevisit__choice" onClick={() => pickType('home')}>
              <span className="e">🏠</span>
              زيارة منزلية
            </div>
          </>
        )}

        {screen === 'branch-pick' && (
          <>
            <p className="ratevisit__q">زيارتك كانت في أنهي فرع؟</p>
            <label className="ratevisit__field">
              <select value={branchName} onChange={(e) => setBranchName(e.target.value)}>
                <option value="" disabled>
                  اختار الفرع
                </option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.governorate} — {b.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="ratevisit__btn ratevisit__btn--primary" onClick={confirmBranch} disabled={!branchName}>
              التالي
            </button>
          </>
        )}

        {screen === 'question' && (
          <>
            <p className="ratevisit__q">{QUESTIONS[visitType][qIndex]}</p>
            <div className="ratevisit__faces">
              {FACES.map((f) => (
                <div key={f.v} className="ratevisit__face" onClick={() => answer(f.v)}>
                  <span className="em">{f.e}</span>
                  <span className="lb">{f.l}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === 'final' && (
          <>
            <p className="ratevisit__q" style={{ fontSize: 18 }}>
              تحب نتواصل معاك؟
            </p>
            {isLowRating ? (
              <p className="ratevisit__q-sub" style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
                معلش على التجربة 🙏 سيب رقمك عشان فريقنا يتواصل معاك ويحل المشكلة
              </p>
            ) : isMediumRating ? (
              <p className="ratevisit__q-sub" style={{ color: 'var(--color-primary-dark)', fontWeight: 'bold' }}>
                إيه اللي كان ممكن يخلي زيارتك أحسن؟ ولو سبت رقمك فريقنا هيتابع معاك
              </p>
            ) : (
              <p className="ratevisit__q-sub">البيانات دي كلها اختيارية</p>
            )}
            <label className="ratevisit__field">
              <span>الاسم</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" />
            </label>
            <label className="ratevisit__field">
              <span>رقم الموبايل{isLowRating ? ' *' : ''}</span>
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(cleanEgyptPhoneInput(e.target.value))}
                placeholder="01xxxxxxxxx"
                aria-invalid={phone.length === 11 && !!phoneError}
              />
              {phone.length === 11 && phoneError && <span className="ratevisit__error">{phoneError}</span>}
            </label>
            {visitType === 'home' && (
              <label className="ratevisit__field">
                <span>مين كان الكيميائي اللي زارك؟</span>
                <input value={chemistName} onChange={(e) => setChemistName(e.target.value)} placeholder="اسم الكيميائي" />
              </label>
            )}
            <label className="ratevisit__field">
              <span>{isMediumRating ? 'إيه اللي كان ممكن نعمله أحسن؟' : 'حابب تقول لنا حاجة؟'}</span>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isMediumRating ? 'مثلاً: الانتظار، التعامل، النظافة...' : 'اكتب تعليقك هنا...'}
              />
            </label>
            {status === 'error' && error && <p className="ratevisit__error">{error}</p>}
            <button className="ratevisit__btn ratevisit__btn--primary" onClick={submit} disabled={status === 'sending'}>
              {status === 'sending' ? 'جاري الإرسال...' : 'إرسال'}
            </button>
            {!isLowRating && (
              <button className="ratevisit__btn ratevisit__btn--ghost" onClick={submit} disabled={status === 'sending'}>
                تخطّي
              </button>
            )}
          </>
        )}

        {screen === 'thanks' && (
          <div className="ratevisit__thanks">
            <HeartIcon className="heart" width={56} height={56} aria-hidden="true" />
            <h2>شكراً ليك!</h2>
            <p>
              {isLowRating
                ? 'فريق خدمة العملاء هيتواصل معاك قريب'
                : isMediumRating && phone
                  ? 'شكراً على صراحتك، فريقنا هيتابع معاك'
                  : 'رأيك بيساعدنا نتحسن كل يوم'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
