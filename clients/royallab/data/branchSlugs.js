// Short Latin slugs per branch for in-branch QR codes (?b=<slug>&p=<placement>). Fill per client.
export const BRANCH_SLUGS = {}

// Where in the branch the code is printed, and which page it opens.
export const QR_PLACEMENTS = {
  counter: { label: 'ستاند الاستقبال', path: '/' },
  poster: { label: 'بوستر الانتظار', path: '/' },
  table: { label: 'كارت الترابيزة (عرض الإطلاق)', path: '/booking' },
  receipt: { label: 'استيكر الإيصال', path: '/track-sample' },
  exit: { label: 'كارت الخروج (قيّم زيارتك)', path: '/rate-visit' },
}
