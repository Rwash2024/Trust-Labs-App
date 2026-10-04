// Short Latin slugs for each branch, used in the in-branch QR codes
// (app.trustlabseg.com/?b=<slug>&p=<placement>). Latin so the printed URL and
// QR stay short; they follow the ERP names in supabase/functions/_shared/branchMap.ts.
// Printed codes depend on these — never rename a slug once it's on a poster.
export const BRANCH_SLUGS = {
  'heliopolis': 'فرع مصر الجديدة',
  'cmc': 'فرع التجمع الخامس',
  'nasr-city': 'فرع مدينة نصر',
  'helwan': 'فرع حلوان',
  'shubra': 'فرع شبرا',
  'mohandseen': 'فرع المهندسين',
  'dokki': 'فرع الدقي',
  'giza': 'فرع الجيزة',
  'manial': 'فرع المنيل',
  'faisal': 'فرع فيصل',
  'october': 'فرع أكتوبر',
  'zayed': 'فرع الشيخ زايد 1',
  'zayed-2': 'فرع الشيخ زايد 2',
  'fayoum': 'فرع الفيوم',
  'elnada': 'فرع الندى',
  'alwasta': 'فرع الواسطى',
  'hurghada': 'فرع الغردقة',
  'sharm': 'فرع شرم الشيخ 1 (نبق)',
  'sharm-2': 'فرع شرم الشيخ 2 (حي النور)',
}

// Where in the branch the code is printed, and which page it opens.
export const QR_PLACEMENTS = {
  counter: { label: 'ستاند الاستقبال', path: '/' },
  poster: { label: 'بوستر الانتظار', path: '/' },
  table: { label: 'كارت الترابيزة (عرض الإطلاق)', path: '/booking' },
  receipt: { label: 'استيكر الإيصال', path: '/track-sample' },
  exit: { label: 'كارت الخروج (قيّم زيارتك)', path: '/rate-visit' },
}
