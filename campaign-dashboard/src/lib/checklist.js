// Campaign readiness: manual go/no-go items stored on the idea (idea.checklist),
// plus two items worked out from the posts themselves.

export const MANUAL_ITEMS = [
  { id: 'approval', label: 'موافقة الإدارة مكتوبة' },
  { id: 'offer', label: 'الخصم داخل النطاق المتفق عليه (10–15%) أو معتمد' },
  { id: 'tracking', label: 'تتبع الحجوزات جاهز قبل أول بوست ممول' },
  { id: 'visuals', label: 'كل الصور اتصممت واتراجعت' },
  { id: 'branches', label: 'الفروع والزيارات المنزلية متأكدة في أيام العرض' },
  { id: 'support', label: 'خدمة العملاء (16183) عارفة العرض' },
]

export function toggleCheck(idea, id) {
  const checklist = { ...(idea.checklist ?? {}) }
  checklist[id] = !checklist[id]
  return { ...idea, checklist }
}

export function readiness(idea, posts) {
  const mine = posts.filter((p) => p.ideaId === idea.id)
  const content = mine.length > 0 && mine.every((p) => p.status !== 'idea')
  const budgets = mine.every((p) => !p.ad?.enabled || (typeof p.ad.budget === 'number' && p.ad.budget > 0))

  const items = [
    { id: 'content', label: 'كل المنشورات مكتوبة وجاهزة', done: content, auto: true },
    { id: 'budgets', label: 'كل إعلان ممول له ميزانية', done: budgets, auto: true },
    ...MANUAL_ITEMS.map((m) => ({ ...m, done: Boolean(idea.checklist?.[m.id]), auto: false })),
  ]
  const done = items.filter((i) => i.done).length
  return { items, done, total: items.length, ready: done === items.length }
}
