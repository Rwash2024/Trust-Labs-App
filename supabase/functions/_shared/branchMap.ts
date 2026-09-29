// Trust Labs App — maps our Arabic branch names to the English branch slugs
// Trust Lab Ops (the internal ERP) expects. Given by the colleague on 2026-09-22
// (last two — Heliopolis-2 and CMC — confirmed the same day after follow-up).
// Used by forward-booking-to-erp and forward-visit-rating-to-erp so a mismatch
// doesn't fail silently on his side.
export const BRANCH_NAME_MAP: Record<string, string> = {
  'فرع مصر الجديدة': 'Heliopolis-2',
  'فرع التجمع الخامس': 'CMC',
  'فرع فيصل': 'Faisal',
  'فرع المهندسين': 'Mohandsen',
  'فرع الشيخ زايد 1': 'Zayed',
  'فرع الندى': 'Elnada',
  'فرع الشيخ زايد 2': 'Zayed2',
  'فرع شرم الشيخ 1 (نبق)': 'SHARM',
  'فرع شبرا': 'Shubra',
  'فرع الفيوم': 'Fayoum',
  'فرع شرم الشيخ 2 (حي النور)': 'Sharm 2',
  'فرع الجيزة': 'GIZA',
  'فرع الدقي': 'Dokki',
  'فرع حلوان': 'Helwan',
  'فرع الغردقة': 'Hurghada',
  'فرع المنيل': 'Manial',
  'فرع مدينة نصر': 'Nasr City',
  'فرع الواسطى': 'Alwasta',
  'فرع أكتوبر': 'October',
}

export function toErpBranchName(arabicBranchName: string | null | undefined): string | null {
  if (!arabicBranchName) return null
  return BRANCH_NAME_MAP[arabicBranchName] ?? arabicBranchName
}
