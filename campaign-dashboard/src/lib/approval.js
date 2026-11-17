// Management approval for a whole campaign: draft -> with management -> approved / rejected.
// Approving also ticks the "written approval" item of the readiness checklist.

export const APPROVAL_STATUSES = [
  { id: 'draft', label: 'مسودة' },
  { id: 'review', label: 'عند الإدارة' },
  { id: 'approved', label: 'معتمد' },
  { id: 'rejected', label: 'مرفوض' },
]

export function approvalOf(idea) {
  if (idea.approval && APPROVAL_STATUSES.some((s) => s.id === idea.approval.status)) {
    return { status: idea.approval.status, note: idea.approval.note ?? '', at: idea.approval.at ?? null }
  }
  if (idea.checklist?.approval) return { status: 'approved', note: '', at: null }
  return { status: 'draft', note: '', at: null }
}

export function setApproval(idea, status, note = '', now = Date.now()) {
  if (!APPROVAL_STATUSES.some((s) => s.id === status)) return idea
  const checklist = { ...(idea.checklist ?? {}), approval: status === 'approved' }
  const { approval, ...rest } = idea
  if (status === 'draft') return { ...rest, checklist }
  return {
    ...rest,
    checklist,
    approval: { status, note: String(note ?? '').trim(), at: new Date(now).toISOString().slice(0, 10) },
  }
}
