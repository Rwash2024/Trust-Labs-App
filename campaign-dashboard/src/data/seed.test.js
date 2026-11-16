import seedMonth from './seedMonth.json'
import competitorsData from './competitors.json'
import hashtags from './hashtags.json'
import { importDb } from '../lib/storage.js'

test('seed month is a valid db', () => {
  const r = importDb(JSON.stringify(seedMonth))
  expect(r.error).toBeUndefined()
  expect(r.ok).toBe(true)
})

test('every seed post has exactly 4 bullets, headline of at most 3 words, and no phone number inside the image text', () => {
  expect(seedMonth.posts.length).toBeGreaterThanOrEqual(8)
  for (const p of seedMonth.posts) {
    expect(p.panelBullets).toHaveLength(4)
    expect(p.headline.trim().split(/\s+/).length).toBeLessThanOrEqual(3)
    // the hotline belongs in captions and the Illustrator pill, never in what the image model draws
    expect(JSON.stringify([p.panelService, p.panelBullets, p.image])).not.toContain('16183')
  }
})

test('competitors: the 9 names, data quality as in spec', () => {
  const names = competitorsData.competitors.map((c) => c.name)
  for (const n of ['البرج', 'المختبر', 'ألفا', 'رويال لاب', 'NSA', 'الأنصاري', 'ميد لاب إيجيبت', 'عز لاب', 'الشمس']) {
    expect(names).toContain(n)
  }
  const q = Object.fromEntries(competitorsData.competitors.map((c) => [c.name, c.sample.dataQuality]))
  for (const n of ['المختبر', 'رويال لاب', 'NSA', 'الأنصاري', 'البرج', 'ميد لاب إيجيبت', 'عز لاب']) expect(q[n]).toBe('ok')
  for (const n of ['ألفا', 'الشمس']) expect(q[n]).toBe('partial')
  expect(competitorsData.insights.length).toBeGreaterThan(0)
})

test('hashtag groups exist and every tag starts with #', () => {
  for (const k of ['heart', 'thyroid', 'pregnancy', 'general']) expect(hashtags[k].length).toBeGreaterThan(2)
  for (const tags of Object.values(hashtags)) for (const t of tags) expect(t.startsWith('#')).toBe(true)
})

test('seven competitors carry real posting-time samples (Cairo time)', () => {
  const withPosting = competitorsData.competitors.filter((c) => c.posting)
  expect(withPosting.map((c) => c.name).sort()).toEqual(['NSA', 'البرج', 'الأنصاري', 'المختبر', 'رويال لاب', 'ميد لاب إيجيبت', 'عز لاب'].sort())
  for (const c of withPosting) {
    expect(c.posting.n).toBeGreaterThanOrEqual(40)
    for (const h of c.posting.topHours) expect(h.hour >= 0 && h.hour <= 23).toBe(true)
    expect(c.posting.topDays.length).toBeGreaterThan(0)
  }
})

test('all nine competitors carry Facebook stats with sensible numbers', () => {
  const withFb = competitorsData.competitors.filter((c) => c.fb)
  expect(withFb.map((c) => c.name).sort()).toEqual(['NSA', 'البرج', 'الشمس', 'ألفا', 'عز لاب', 'ميد لاب إيجيبت', 'المختبر', 'رويال لاب', 'الأنصاري'].sort())
  for (const c of withFb) {
    expect(c.fb.posts).toBeGreaterThanOrEqual(3)
    expect(c.fb.avgReactions).toBeGreaterThanOrEqual(0)
    expect(c.fb.avgComments).toBeGreaterThanOrEqual(0)
  }
  const alfa = competitorsData.competitors.find((c) => c.name === 'ألفا')
  expect(alfa.fb.avgReactions).toBe(169)
  const mokhtabar = competitorsData.competitors.find((c) => c.name === 'المختبر')
  expect(mokhtabar.fb.avgReactions).toBeGreaterThan(1000)
})

describe('Green Friday campaign', () => {
  const gf = seedMonth.posts.filter((p) => p.ideaId === 'idea-gf')
  const idea = seedMonth.ideas.find((i) => i.id === 'idea-gf')

  test('is a real idea with 5 posts spread from the teaser to the last call', () => {
    expect(idea.text).toBe('Green Friday')
    expect(gf).toHaveLength(5)
    const dates = gf.map((p) => p.date).sort()
    expect(dates[0]).toBe('2026-11-22')
    expect(dates.at(-1)).toBe('2026-11-29')
    expect(new Set(gf.map((p) => p.type)).size).toBeGreaterThanOrEqual(3)
  })

  test('the hero post is a funded Facebook post with both priority branches and an audience', () => {
    const hero = gf.find((p) => p.platform === 'facebook' && p.type === 'post')
    expect(hero.date).toBe('2026-11-26')
    expect(hero.ad.enabled).toBe(true)
    expect(hero.ad.budget).toBeGreaterThan(0)
    expect(hero.ad.regions).toEqual(expect.arrayContaining(['المهندسين', 'التجمع الخامس']))
    expect(hero.ad.gender).toBe('female')
    expect(hero.ad.ageFrom).toBeGreaterThanOrEqual(18)
  })

  test('two different audiences are tested (A/B): a women ad and a men ad', () => {
    const genders = new Set(gf.filter((p) => p.ad?.enabled).map((p) => p.ad.gender))
    expect(genders.has('female')).toBe(true)
    expect(genders.has('male')).toBe(true)
  })

  test('budgets match the suggestion formula for each funded post', async () => {
    const { suggestBudget, seasonFor } = await import('../lib/ads.js')
    for (const p of gf.filter((x) => x.ad?.enabled)) {
      const s = suggestBudget({ postType: p.type, goal: 'sales', days: p.ad.days, regions: p.ad.regions, season: seasonFor(p.date) })
      expect(p.ad.budget).toBe(s.total)
    }
  })

  test('offer copy stays inside the pre-approved 10-15% range and never promises results', () => {
    const text = gf.map((p) => `${p.caption} ${p.panelService} ${p.panelBullets.join(' ')}`).join(' ')
    expect(text).toContain('15%')
    expect(text).not.toMatch(/(?:[2-9]\d|1[6-9])\s*%/)
    for (const w of ['نضمن', 'مضمون', 'هيشفيك']) expect(text).not.toContain(w)
  })

  test('the hotline appears in the call to action of the funded post copy', () => {
    const hero = gf.find((p) => p.platform === 'facebook' && p.type === 'post')
    expect(hero.caption).toContain('16183')
  })
})
