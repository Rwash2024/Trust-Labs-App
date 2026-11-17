import { useEffect, useMemo, useState } from 'react'
import { loadDb, saveDb } from './lib/storage.js'
import { bankEngine } from './lib/engine.js'
import { buildMonthPlan, movePost } from './lib/planner.js'
import seedMonth from './data/seedMonth.json'
import competitorsData from './data/competitors.json'
import IdeaForm from './components/IdeaForm.jsx'
import MonthCalendar from './components/MonthCalendar.jsx'
import PlanSettings from './components/PlanSettings.jsx'
import PostCard from './components/PostCard.jsx'
import CompetitorsPanel from './components/CompetitorsPanel.jsx'
import IdeaBank from './components/IdeaBank.jsx'
import DataMenu from './components/DataMenu.jsx'
import ChatPromptButton from './components/ChatPromptButton.jsx'
import Sidebar from './components/Sidebar.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { fillPost, fillPosts, detectCategory } from './lib/templates.js'
import { computeBenchmarks, recommendAd } from './lib/ads.js'
import { toggleCheck } from './lib/checklist.js'

const BENCH = computeBenchmarks(competitorsData.competitors)
const withAd = (p, ideaText) => (p.ad ? p : { ...p, ad: recommendAd(p, { category: detectCategory(`${ideaText} ${p.headline} ${p.panelService}`), benchmarks: BENCH }).ad })

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

const newId = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

function initialDb() {
  const db = loadDb()
  return db.posts.length || db.ideas.length ? db : seedMonth
}

function initialView(db) {
  const first = db.posts[0]?.date
  const d = first ? new Date(`${first}T00:00:00`) : new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function App() {
  const [db, setDb] = useState(initialDb)
  const [view, setView] = useState(() => initialView(db))
  const [tab, setTab] = useState('calendar')
  const [focusId, setFocusId] = useState(null)
  const [request, setRequest] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [reuseIdea, setReuseIdea] = useState('')

  useEffect(() => { setSaveFailed(!saveDb(db)) }, [db])
  useEffect(() => {
    if (tab === 'cards' && focusId) document.getElementById(`post-${focusId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [tab, focusId])

  const prefix = `${view.year}-${String(view.month).padStart(2, '0')}`
  const monthPosts = useMemo(
    () => db.posts.filter((p) => p.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date)),
    [db.posts, prefix],
  )

  const patchPost = (id, patch) => setDb((d) => ({ ...d, posts: d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  async function onIdea({ idea, month, mix, pkg = null }) {
    const [year, m] = month.split('-').map(Number)
    setView({ year, month: m })
    setRequest({ idea, month, mix, pkg })
    const found = await bankEngine(db).generate({ idea })
    if (found.length) {
      setTab('calendar')
      return
    }
    const ideaId = newId()
    const skeleton = buildMonthPlan({ year, month: m, mix, platforms: db.settings.platforms, timesByPlatform: db.settings.timesByPlatform })
      .map((s) => ({
        id: newId(), ideaId, ...s, headline: '', caption: '', hashtags: [],
        panelService: '', panelBullets: ['', '', '', ''], image: { concept: '', subject: '', mood: '', accent: '' }, status: 'idea',
      }))
    const filled = fillPosts(skeleton, idea, pkg).map((p) => withAd(p, idea))
    setDb((d) => ({
      ...d,
      ideas: [...d.ideas, { id: ideaId, text: idea, createdAt: new Date().toISOString().slice(0, 10), ...(pkg ? { package: pkg } : {}) }],
      posts: [...d.posts, ...filled],
    }))
    setTab('calendar')
  }

  function fillEmpty() {
    setDb((d) => {
      const ideaOf = (id) => d.ideas.find((i) => i.id === id)
      const ideaText = (id) => ideaOf(id)?.text ?? ''
      return {
        ...d,
        posts: d.posts.map((p, i) => (p.date.startsWith(prefix) ? withAd(fillPost(p, ideaText(p.ideaId), i, ideaOf(p.ideaId)?.package ?? null), ideaText(p.ideaId)) : p)),
      }
    })
  }

  function onImport(next) {
    setDb(next)
    setView(initialView(next))
  }

  const shiftMonth = (delta) => {
    const d = new Date(view.year, view.month - 1 + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const counts = {
    cards: monthPosts.length,
    ready: monthPosts.filter((p) => p.status !== 'idea').length,
    total: monthPosts.length,
    competitorsMissing: competitorsData.competitors.filter((c) => c.sample.dataQuality !== 'ok').length,
    ideas: db.ideas.length,
  }

  return (
    <div className="app">
      <Sidebar tab={tab} onTab={setTab} counts={counts} />
      <main className="main">
      <header className="app-header">
        <div>
          <h1>مركز الحملات</h1>
          <p className="muted">اكتب فكرة، وخد خطة الشهر والمحتوى جاهزين للنسخ 🚀</p>
        </div>
        <div className="head-actions">
          <ThemeToggle />
          <DataMenu db={db} onImport={onImport} />
        </div>
      </header>

      {saveFailed && <p className="warn banner">المتصفح مش سامح بالحفظ. صدّر الملف علشان متضيعش شغلك.</p>}

      <IdeaForm key={reuseIdea} initialIdea={reuseIdea} existingIdeas={db.ideas.map((i) => i.text)} onSubmit={onIdea} />
      {request && (
        <p className="request-bar">
          آخر طلب: <strong>{request.idea}</strong> ·{' '}
          <ChatPromptButton {...request} competitors={competitorsData.competitors} insights={competitorsData.insights} />
        </p>
      )}

      {(tab === 'calendar' || tab === 'cards') && (
        <div className="month-bar">
          <button type="button" className="btn" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق">›</button>
          <strong>{MONTH_NAMES[view.month - 1]} {view.year}</strong>
          <button type="button" className="btn" onClick={() => shiftMonth(1)} aria-label="الشهر التالي">‹</button>
          <span className="muted">{monthPosts.length} منشور</span>
          <button type="button" className="btn" onClick={fillEmpty}>املأ الفاضي ✨</button>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="fade-up">
          <PlanSettings settings={db.settings} onChange={(settings) => setDb((d) => ({ ...d, settings }))} />
          <MonthCalendar
            year={view.year}
            month={view.month}
            posts={monthPosts}
            onMove={(id, date) => setDb((d) => ({ ...d, posts: movePost(d.posts, id, date) }))}
            onSelect={(id) => { setFocusId(id); setTab('cards') }}
          />
        </div>
      )}

      {tab === 'cards' && (
        <div className="cards fade-up">
          {monthPosts.length === 0 && <p className="muted">مفيش منشورات في الشهر ده.</p>}
          {monthPosts.map((p) => (
            <div key={p.id} id={`post-${p.id}`} className={focusId === p.id ? 'focus' : ''}>
              <PostCard post={p} onChange={(patch) => patchPost(p.id, patch)} />
            </div>
          ))}
        </div>
      )}

      {tab === 'competitors' && (
        <div className="fade-up">
          <CompetitorsPanel competitors={competitorsData.competitors} insights={competitorsData.insights} note={competitorsData.note} pulledAt={competitorsData.pulledAt} />
        </div>
      )}

      {tab === 'ideas' && (
        <div className="fade-up">
          <IdeaBank
            ideas={db.ideas}
            posts={db.posts}
            onReuse={(text) => { setReuseIdea(text); window.scrollTo?.({ top: 0, behavior: 'smooth' }) }}
            onToggleCheck={(ideaId, itemId) => setDb((d) => ({ ...d, ideas: d.ideas.map((i) => (i.id === ideaId ? toggleCheck(i, itemId) : i)) }))}
          />
        </div>
      )}
      </main>
    </div>
  )
}
