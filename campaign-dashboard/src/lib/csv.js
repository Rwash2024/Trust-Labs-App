const TYPE = { post: 'بوست', reel: 'ريلز', carousel: 'كاروسيل', story: 'استوري' }
const PLATFORM = { facebook: 'فيسبوك', instagram: 'انستجرام', tiktok: 'تيك توك' }
const STATUS = { idea: 'فكرة', ready: 'جاهز', published: 'اتنشر' }
const GENDER = { all: 'الكل', male: 'رجال', female: 'ستات' }
const WEEKDAY = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const HEADER = ['التاريخ', 'اليوم', 'الوقت', 'المنصة', 'النوع', 'الفكرة', 'العنوان', 'الكابشن', 'الهاشتاجات', 'نص اللوح', 'الحالة', 'ممول', 'الميزانية', 'المناطق', 'السن', 'الجنس']

function cell(value) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stop spreadsheet formulas from running
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Excel-friendly CSV of the whole plan (UTF-8 with BOM so Arabic displays correctly).
export function buildPlanCsv(posts, ideas) {
  const ideaText = (id) => ideas.find((i) => i.id === id)?.text ?? ''
  const rows = [...posts]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((p) => [
      p.date,
      WEEKDAY[new Date(`${p.date}T00:00:00`).getDay()],
      p.time,
      PLATFORM[p.platform] ?? p.platform,
      TYPE[p.type] ?? p.type,
      ideaText(p.ideaId),
      p.headline,
      p.caption,
      p.hashtags.join(' '),
      [p.panelService, ...p.panelBullets].filter(Boolean).join(' | '),
      STATUS[p.status] ?? p.status,
      p.ad?.enabled ? 'نعم' : 'لا',
      p.ad?.enabled ? (p.ad.budget ?? '') : '',
      p.ad?.enabled ? p.ad.regions.join(' | ') : '',
      p.ad?.enabled ? `${p.ad.ageFrom}-${p.ad.ageTo}` : '',
      p.ad?.enabled ? GENDER[p.ad.gender] ?? p.ad.gender : '',
    ])
  return '﻿' + [HEADER, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n'
}
