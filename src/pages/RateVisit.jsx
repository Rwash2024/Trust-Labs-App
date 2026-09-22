import { useState } from 'react'
import { submitVisitRating } from '../lib/data'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import './RateVisit.css'

// "قيّم زيارتك" — matches the real Trust Lab Ops tablet survey on purpose:
// fast, emoji-only questions with no gate in front of them; name/phone/comment
// collected once at the very end, all optional. Saved to our own `visit_ratings`
// table; forwarding it on to Trust Lab Ops happens server-side once they expose
// a submit-survey webhook (see supabase/visit_ratings_migration.sql).

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
  const [screen, setScreen] = useState('choose') // choose | question | final | thanks
  const [visitType, setVisitType] = useState(null) // 'branch' | 'home'
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [chemistName, setChemistName] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | error
  const [error, setError] = useState('')

  function pickType(type) {
    setVisitType(type)
    setAnswers({})
    setQIndex(0)
    trackEvent(AnalyticsEvents.RATE_VISIT_STARTED, { visit_type: type })
    setScreen('question')
  }

  function answer(value) {
    const keys = ['overall', visitType === 'home' ? 'punctuality' : 'speed', 'staff']
    const next = { ...answers, [keys[qIndex]]: value }
    setAnswers(next)
    if (qIndex + 1 < 3) setQIndex(qIndex + 1)
    else setScreen('final')
  }

  async function submit() {
    setStatus('sending')
    setError('')
    try {
      await submitVisitRating({ visitType, answers, name, phone, chemistName, comment })
      trackEvent(AnalyticsEvents.RATE_VISIT_COMPLETED, { visit_type: visitType, overall: answers.overall })
      setScreen('thanks')
    } catch (err) {
      console.error('submitVisitRating failed', err)
      setError('حصل خطأ وإحنا بنبعت تقييمك، جرب تاني كمان شوية.')
      setStatus('error')
    }
  }

  const dotsStep = { choose: 0, question: 1 + qIndex, final: 4, thanks: undefined }[screen]

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
            <p className="ratevisit__q-sub">البيانات دي كلها اختيارية</p>
            <label className="ratevisit__field">
              <span>الاسم</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" />
            </label>
            <label className="ratevisit__field">
              <span>رقم الموبايل</span>
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="01xxxxxxxxx"
              />
            </label>
            {visitType === 'home' && (
              <label className="ratevisit__field">
                <span>مين كان الكيميائي اللي زارك؟</span>
                <input value={chemistName} onChange={(e) => setChemistName(e.target.value)} placeholder="اسم الكيميائي" />
              </label>
            )}
            <label className="ratevisit__field">
              <span>حابب تقول لنا حاجة؟</span>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تعليقك هنا..." />
            </label>
            {status === 'error' && <p className="ratevisit__error">{error}</p>}
            <button className="ratevisit__btn ratevisit__btn--primary" onClick={submit} disabled={status === 'sending'}>
              {status === 'sending' ? 'جاري الإرسال...' : 'إرسال'}
            </button>
            <button className="ratevisit__btn ratevisit__btn--ghost" onClick={submit} disabled={status === 'sending'}>
              تخطّي
            </button>
          </>
        )}

        {screen === 'thanks' && (
          <div className="ratevisit__thanks">
            <div className="heart">💙</div>
            <h2>شكراً ليك!</h2>
            <p>رأيك بيساعدنا نتحسن كل يوم</p>
          </div>
        )}
      </div>
    </div>
  )
}
