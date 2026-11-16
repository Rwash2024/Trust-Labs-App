import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { copyText } from '../lib/clipboard.js'
import PostCard from './PostCard.jsx'
import IdeaForm from './IdeaForm.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import PlanSettings from './PlanSettings.jsx'
import CompetitorsPanel from './CompetitorsPanel.jsx'
import IdeaBank from './IdeaBank.jsx'
import DataMenu from './DataMenu.jsx'
import ChatPromptButton from './ChatPromptButton.jsx'
import competitorsData from '../data/competitors.json'
import { emptyDb } from '../lib/storage.js'

vi.mock('../lib/clipboard.js', async (orig) => {
  const real = await orig()
  return { ...real, copyText: vi.fn(real.copyText) }
})

const post = {
  id: 'p1', ideaId: 'i1', type: 'post', platform: 'instagram', date: '2027-02-28', time: '20:00',
  headline: 'أنقذ قلبك', caption: 'كابشن', hashtags: ['#a'], panelService: 'خدمة',
  panelBullets: ['1', '2', '3', '4'], image: { concept: 'c', subject: 's', mood: 'm', accent: 'a' }, status: 'idea',
}

describe('copyText', () => {
  const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  afterEach(() => {
    if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard)
    else delete navigator.clipboard
  })

  test('falls back to execCommand when navigator.clipboard is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    document.execCommand = vi.fn(() => true)
    const { copyText: real } = await vi.importActual('../lib/clipboard.js')
    expect(await real('hello')).toEqual({ ok: true, fallback: true })
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })
})

describe('PostCard', () => {
  test('warns when bullets are not 4 and still shows copy buttons', () => {
    render(<PostCard post={{ ...post, panelBullets: ['1', '2', '3'] }} onChange={() => {}} />)
    expect(screen.getByText(/لازم 4 نقاط/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /نسخ/ }).length).toBeGreaterThan(3)
  })

  test('warns when headline is longer than 3 words', () => {
    render(<PostCard post={{ ...post, headline: 'واحد اتنين تلاتة اربعة' }} onChange={() => {}} />)
    expect(screen.getByText(/العنوان أطول من 3 كلمات/)).toBeTruthy()
  })

  test('reel cards show the timed script with a copy button; plain posts do not', () => {
    const { rerender } = render(<PostCard post={{ ...post, type: 'reel' }} onChange={() => {}} />)
    expect(screen.getByText(/سيناريو الريل/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'نسخ السيناريو' })).toBeTruthy()
    rerender(<PostCard post={{ ...post, type: 'post' }} onChange={() => {}} />)
    expect(screen.queryByText(/سيناريو الريل/)).toBeNull()
  })

  test('shows the strength score with tips for what to fix', () => {
    render(<PostCard post={{ ...post, caption: '' }} onChange={() => {}} />)
    expect(screen.getByText(/قوة المنشور/)).toBeTruthy()
    expect(screen.getByText(/الكابشن يبقى من 30/)).toBeTruthy()
  })

  test('shows the generated image prompt', () => {
    render(<PostCard post={post} onChange={() => {}} />)
    expect(screen.getByText(/aspect ratio exactly 4:5/)).toBeTruthy()
  })
})

describe('IdeaForm', () => {
  test('warns about a similar existing idea (diacritic/hamza variant)', () => {
    render(<IdeaForm existingIdeas={['أنقذ قلبك']} onSubmit={() => {}} />)
    fireEvent.change(screen.getByLabelText('فكرة الحملة'), { target: { value: 'انقِذ قلبك' } })
    expect(screen.getByText(/شبه فكرة سابقة/)).toBeTruthy()
  })

  test('submits idea, month and mix', () => {
    const onSubmit = vi.fn()
    render(<IdeaForm existingIdeas={[]} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('فكرة الحملة'), { target: { value: 'حملة جديدة' } })
    fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ idea: 'حملة جديدة', mix: expect.any(Object) }))
  })
})

describe('MonthCalendar', () => {
  test('renders 28 day cells for February 2027', () => {
    const { container } = render(<MonthCalendar year={2027} month={2} posts={[]} onMove={() => {}} onSelect={() => {}} />)
    expect(container.querySelectorAll('[data-day]')).toHaveLength(28)
  })

  test('dropping a post on another day calls onMove with that date', () => {
    const onMove = vi.fn()
    const { container } = render(<MonthCalendar year={2027} month={2} posts={[post]} onMove={onMove} onSelect={() => {}} />)
    const cell = container.querySelector('[data-day="2027-02-10"]')
    fireEvent.drop(cell, { dataTransfer: { getData: () => 'p1' } })
    expect(onMove).toHaveBeenCalledWith('p1', '2027-02-10')
  })

  test('"next day" on the last day of the month does not call onMove', () => {
    const onMove = vi.fn()
    render(<MonthCalendar year={2027} month={2} posts={[post]} onMove={onMove} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'لليوم التالي' }))
    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('PlanSettings', () => {
  test('enabling tiktok reports the new platform list', () => {
    const onChange = vi.fn()
    render(<PlanSettings settings={emptyDb().settings} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('تيك توك'))
    expect(onChange.mock.calls[0][0].platforms).toContain('tiktok')
  })
})

describe('CompetitorsPanel', () => {
  test('shows missing, partial and old data badges and the insights box', () => {
    render(<CompetitorsPanel competitors={competitorsData.competitors} insights={competitorsData.insights} />)
    expect(screen.queryAllByText('ناقصة').length).toBe(0)
    expect(screen.getAllByText('جزئية').length).toBe(2)
    expect(screen.queryAllByText('قديمة').length).toBe(0)
    expect(screen.getByText(competitorsData.insights[0])).toBeTruthy()
  })
})

describe('CompetitorsPanel Facebook stats', () => {
  test('shows each competitor Facebook average and a ranking', () => {
    render(<CompetitorsPanel competitors={competitorsData.competitors} insights={competitorsData.insights} />)
    expect(screen.getByText(/ترتيب تفاعل فيسبوك/)).toBeTruthy()
    expect(screen.getAllByText(/فيسبوك: \d+ بوست/).length).toBe(9)
  })
})

describe('CompetitorsPanel old data', () => {
  test('still shows the old badge when a competitor has stale data', () => {
    const stale = [{ name: 'قديم', sample: { posts: 1, avgLikes: null, dataQuality: 'old', notes: 'ن' } }]
    render(<CompetitorsPanel competitors={stale} insights={['i']} />)
    expect(screen.getByText('قديمة')).toBeTruthy()
  })
})

describe('CompetitorsPanel posting patterns', () => {
  test('shows when competitors post and the evening share', () => {
    render(<CompetitorsPanel competitors={competitorsData.competitors} insights={competitorsData.insights} />)
    expect(screen.getByText(/ساعات نشر المنافسين/)).toBeTruthy()
    expect(screen.getByText(/بعد الساعة 7 مساءً/)).toBeTruthy()
  })
})

describe('IdeaBank', () => {
  test('lists ideas and reuses one', () => {
    const onReuse = vi.fn()
    render(<IdeaBank ideas={[{ id: 'i1', text: 'أنقذ قلبك', createdAt: '2026-11-16' }]} posts={[post]} onReuse={onReuse} />)
    fireEvent.click(screen.getByRole('button', { name: /استخدمها/ }))
    expect(onReuse).toHaveBeenCalledWith('أنقذ قلبك')
  })
})

describe('DataMenu', () => {
  test('a corrupt import file shows an Arabic error and does not import', async () => {
    const onImport = vi.fn()
    render(<DataMenu db={emptyDb()} onImport={onImport} />)
    const file = new File(['{bad'], 'x.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('استيراد ملف'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/[؀-ۿ]/))
    expect(onImport).not.toHaveBeenCalled()
  })

  test('a valid import file calls onImport', async () => {
    const onImport = vi.fn()
    render(<DataMenu db={emptyDb()} onImport={onImport} />)
    const file = new File([JSON.stringify(emptyDb())], 'x.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('استيراد ملف'), { target: { files: [file] } })
    await waitFor(() => expect(onImport).toHaveBeenCalled())
  })
})

describe('DataMenu CSV export', () => {
  test('downloads the plan as a CSV blob', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<DataMenu db={{ ...emptyDb(), posts: [post] }} onImport={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /تصدير الخطة/ }))
    expect(URL.createObjectURL).toHaveBeenCalled()
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob.type).toContain('text/csv')
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})

describe('ChatPromptButton', () => {
  test('copies a command containing the idea', async () => {
    render(<ChatPromptButton idea="حملة ضغط الدم" month="2026-12" mix={{ post: 4 }} competitors={competitorsData.competitors} insights={competitorsData.insights} />)
    fireEvent.click(screen.getByRole('button', { name: /انسخ الأمر/ }))
    await waitFor(() => expect(copyText).toHaveBeenCalled())
    expect(copyText.mock.calls.at(-1)[0]).toContain('حملة ضغط الدم')
  })
})
