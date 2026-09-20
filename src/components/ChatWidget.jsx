import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import './ChatWidget.css'

const QUICK_ACTIONS = [
  { q: 'عايز أعرف حالة عينتي', label: '📦 تتبع عينتي' },
  { q: 'نتيجة تحليلي جاهزة ولا لسه؟', label: '🧪 نتيجة تحليلي' },
  { q: 'عايز أحجز معاد لسحب عينة', label: '📅 حجز موعد' },
  { q: 'فيه ايه من باقات وعروض دلوقتي؟', label: '💳 الأسعار والباقات' },
  { q: 'عايزني أعرفك على التحاليل المميزة', label: '⭐ التحاليل المميزة' },
  { q: 'عايز أقدم شكوى', label: '📝 تقديم شكوى' },
]

const WELCOME = 'أهلاً بيك 👋\nأنا المساعد الذكي لـ Trust Labs، تقدر تسألني أي سؤال هنا، أو تختار من الاختيارات دي:'
const FALLBACK_ERROR = 'معلش، فيه مشكلة في الاتصال بالمساعد دلوقتي 🙏 جرب تاني كمان شوية، أو كلّم الخط الساخن 16183.'

function timeNow() {
  const d = new Date()
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'م' : 'ص'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

let nextId = 1

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: nextId++, role: 'bot', type: 'text', text: WELCOME, time: timeNow() },
    { id: nextId++, role: 'bot', type: 'menu' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [privacyNoteShown, setPrivacyNoteShown] = useState(false)
  const [hasChatted, setHasChatted] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rated, setRated] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, sending])

  function openChat() {
    setOpen(true)
    trackEvent(AnalyticsEvents.CHAT_OPENED)
  }

  function addMessage(role, text) {
    setMessages((prev) => [...prev, { id: nextId++, role, type: 'text', text, time: timeNow() }])
  }

  function openMenu() {
    addMessage('bot', 'تحت أمرك 🙌 اختار من الاختيارات دي:')
    setMessages((prev) => [...prev, { id: nextId++, role: 'bot', type: 'menu' }])
  }

  function pickQuickAction(menuId, q) {
    setMessages((prev) => prev.filter((m) => m.id !== menuId))
    sendMessage(q)
  }

  async function sendMessage(text) {
    if (!text.trim() || sending) return
    setHasChatted(true)
    addMessage('user', text)
    setInput('')
    setSending(true)
    trackEvent(AnalyticsEvents.CHAT_MESSAGE_SENT)

    if (!privacyNoteShown) setPrivacyNoteShown(true)

    if (!supabase) {
      setTimeout(() => {
        addMessage('bot', FALLBACK_ERROR)
        setSending(false)
      }, 500)
      return
    }

    try {
      const history = messages
        .filter((m) => m.type === 'text' && m.text)
        .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
      // The API expects the conversation to start with a user turn, so drop the welcome message
      while (history.length && history[0].role !== 'user') history.shift()

      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message: text, history },
      })
      if (error) throw error
      addMessage('bot', data?.reply || FALLBACK_ERROR)
    } catch {
      addMessage('bot', FALLBACK_ERROR)
    } finally {
      setSending(false)
    }
  }

  function handleClose() {
    if (hasChatted && rated === null) {
      setShowRating(true)
      return
    }
    setOpen(false)
  }

  function rate(value) {
    setRated(value)
    trackEvent(AnalyticsEvents.CHAT_RATED, { rating: value })
    setTimeout(() => {
      setShowRating(false)
      setOpen(false)
    }, 900)
  }

  function skipRating() {
    setShowRating(false)
    setOpen(false)
  }

  return (
    <>
      <button className="chatw-fab" onClick={openChat} aria-label="افتح المساعد الذكي">
        <span className="chatw-fab__badge" />
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5v3.75A1.75 1.75 0 0 0 6.25 15h.75a1.75 1.75 0 0 0 1.75-1.75v-2.5A1.75 1.75 0 0 0 7 9h-.94a5.94 5.94 0 0 1 11.88 0H17a1.75 1.75 0 0 0-1.75 1.75v2.5c0 .3.07.58.2.83a4.4 4.4 0 0 1-4.2 3.17h-.5a1.25 1.25 0 1 0 0 2.5h.5a6.9 6.9 0 0 0 6.62-4.9A1.75 1.75 0 0 0 19.5 13.5V9.5A7.5 7.5 0 0 0 12 2Z" />
        </svg>
      </button>

      <div className={`chatw-panel${open ? ' chatw-panel--open' : ''}`}>
        <div className="chatw-header">
          <div className="chatw-avatar">
            <svg viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5v3.75A1.75 1.75 0 0 0 6.25 15h.75a1.75 1.75 0 0 0 1.75-1.75v-2.5A1.75 1.75 0 0 0 7 9h-.94a5.94 5.94 0 0 1 11.88 0H17a1.75 1.75 0 0 0-1.75 1.75v2.5c0 .3.07.58.2.83a4.4 4.4 0 0 1-4.2 3.17h-.5a1.25 1.25 0 1 0 0 2.5h.5a6.9 6.9 0 0 0 6.62-4.9A1.75 1.75 0 0 0 19.5 13.5V9.5A7.5 7.5 0 0 0 12 2Z" />
            </svg>
          </div>
          <div>
            <div className="chatw-title">مساعدك الذكي لـ Trust Labs</div>
            <div className="chatw-status"><i /> متصل الآن</div>
          </div>
          <button className="chatw-menu-btn" onClick={openMenu} aria-label="القائمة الرئيسية">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          </button>
          <button className="chatw-close" onClick={handleClose} aria-label="إغلاق">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="chatw-body" ref={bodyRef}>
          {messages.map((m) =>
            m.type === 'menu' ? (
              <div key={m.id} className="chatw-menu-msg">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.q} className="chatw-chip" onClick={() => pickQuickAction(m.id, a.q)}>{a.label}</button>
                ))}
              </div>
            ) : (
              <div key={m.id} className={`chatw-msg-wrap chatw-msg-wrap--${m.role}`}>
                <div className={`chatw-msg chatw-msg--${m.role}`} style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                <div className="chatw-msg-time">{m.time}</div>
              </div>
            )
          )}
          {privacyNoteShown && (
            <div className="chatw-sys-note">🔒 بياناتك هتُستخدم للتواصل معاك بخصوص طلبك بس</div>
          )}
          {sending && (
            <div className="chatw-typing"><span /><span /><span /></div>
          )}
        </div>

        <div className="chatw-escalate">
          <span className="chatw-escalate__text">🎧 <span>للتواصل مع موظف من قسم خدمة العملاء أضغط هنا ...</span></span>
          <a
            className="chatw-escalate__link"
            href="tel:16183"
            onClick={() => trackEvent(AnalyticsEvents.CHAT_ESCALATED)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 3a2 2 0 0 1-.5 2L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.5c1 .3 2 .5 3 .6a2 2 0 0 1 1.7 2z" /></svg>
            16183
          </a>
        </div>

        <form
          className="chatw-inputbar"
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
        >
          <input
            className="chatw-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك هنا..."
          />
          <button className="chatw-send" type="submit" aria-label="إرسال" disabled={sending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </form>
        <div className="chatw-ai-tag">مدعوم بالذكاء الاصطناعي</div>

        {showRating && (
          <div className="chatw-rate-overlay chatw-rate-overlay--show">
            <div className="chatw-rate-card">
              {rated === null ? (
                <>
                  <div className="chatw-rate-card__icon">💬</div>
                  <div className="chatw-rate-card__title">قبل ما تسيبنا...</div>
                  <div className="chatw-rate-card__sub">المحادثة دي ساعدتك؟</div>
                  <div className="chatw-rate-card__row">
                    <button className="chatw-rate-btn chatw-rate-btn--up" onClick={() => rate('up')} aria-label="مفيدة">👍</button>
                    <button className="chatw-rate-btn chatw-rate-btn--down" onClick={() => rate('down')} aria-label="مش مفيدة">👎</button>
                  </div>
                  <button className="chatw-rate-card__skip" onClick={skipRating}>تخطي</button>
                </>
              ) : (
                <>
                  <div className="chatw-rate-card__icon">✅</div>
                  <div className="chatw-rate-card__thanks">{rated === 'up' ? 'شكرًا لتقييمك! 🙌' : 'شكرًا، هنشتغل على تحسين المساعد 🙏'}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
