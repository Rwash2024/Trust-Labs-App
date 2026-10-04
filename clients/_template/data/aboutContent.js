// Fallback content shown when Supabase isn't connected or no row was saved yet.
// Pillar icons are fixed in code (About.jsx) and matched to this array by index.
export const defaultAboutContent = {
  tagline: '__TAGLINE__',
  founded_year: '__YEAR__',
  branches_count: '__BRANCHES__',
  cases_count: '+',
  story_p1: '__NAME__ معمل تحاليل طبية يقدم خدمات سحب العينات وتحليلها في الفروع أو من خلال زيارة منزلية.',
  story_p2: 'نعمل بأحدث التقنيات والأجهزة لتقديم نتائج دقيقة وسريعة.',
  pillars: [
    { title: 'تقنيات ومعايير متطورة', desc: 'نتبع أحدث الإرشادات المعملية المحلية والدولية للحفاظ على أعلى مستويات الجودة والأداء.' },
    { title: 'خدمات رعاية صحية استثنائية', desc: 'نقدم أعلى معايير الرعاية المعملية بما يضمن الدقة والموثوقية في كل تحليل.' },
    { title: 'تشخيص دقيق وفي الوقت المناسب', desc: 'عملياتنا مصممة لتقديم نتائج سريعة ودقيقة تدعم القرارات الطبية.' },
    { title: 'فريق متخصص ومؤهل', desc: 'فريق من المتخصصين المدربين بأعلى كفاءة يضمن التميز في كل مرحلة.' },
  ],
  team: [],
  accreditations: [],
}
