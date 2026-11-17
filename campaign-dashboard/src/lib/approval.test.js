import { APPROVAL_STATUSES, setApproval, approvalOf } from './approval.js'
import { readiness } from './checklist.js'

const idea = { id: 'i1', text: 'Green Friday', createdAt: '2026-11-16' }
const NOW = Date.parse('2026-11-20T10:00:00Z')

test('there are four statuses, each with an Arabic label', () => {
  expect(APPROVAL_STATUSES.map((s) => s.id)).toEqual(['draft', 'review', 'approved', 'rejected'])
  for (const s of APPROVAL_STATUSES) expect(s.label).toMatch(/[؀-ۿ]/)
})

test('a campaign with no approval record reads as draft', () => {
  expect(approvalOf(idea)).toEqual({ status: 'draft', note: '', at: null })
})

test('sending to management stores status, trimmed note and the date', () => {
  const r = setApproval(idea, 'review', '  مبعوت لأستاذ عمر  ', NOW)
  expect(r.approval).toEqual({ status: 'review', note: 'مبعوت لأستاذ عمر', at: '2026-11-20' })
  expect(r.text).toBe('Green Friday')
})

test('approving also ticks the written-approval item of the readiness checklist', () => {
  const r = setApproval(idea, 'approved', 'موافقة كتابية على الواتساب', NOW)
  expect(r.checklist.approval).toBe(true)
  expect(readiness(r, []).items.find((i) => i.id === 'approval').done).toBe(true)
})

test('moving away from approved unticks it again; rejecting never counts as approved', () => {
  const approved = setApproval(idea, 'approved', '', NOW)
  expect(setApproval(approved, 'review', '', NOW).checklist.approval).toBe(false)
  const rejected = setApproval(idea, 'rejected', 'الخصم عالي', NOW)
  expect(rejected.checklist?.approval ?? false).toBe(false)
  expect(rejected.approval.note).toBe('الخصم عالي')
})

test('other checklist items survive a status change', () => {
  const withOther = { ...idea, checklist: { tracking: true } }
  const r = setApproval(withOther, 'approved', '', NOW)
  expect(r.checklist).toEqual({ tracking: true, approval: true })
})

test('an unknown status leaves the idea untouched', () => {
  expect(setApproval(idea, 'banana', 'x', NOW)).toBe(idea)
})

test('going back to draft clears the record and the tick', () => {
  const approved = setApproval(idea, 'approved', 'ok', NOW)
  const back = setApproval(approved, 'draft', '', NOW)
  expect(approvalOf(back)).toEqual({ status: 'draft', note: '', at: null })
  expect(back.checklist.approval).toBe(false)
})

test('an old idea whose approval was only ticked by hand shows as approved', () => {
  expect(approvalOf({ ...idea, checklist: { approval: true } }).status).toBe('approved')
})
