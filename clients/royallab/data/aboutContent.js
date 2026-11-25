import iso9001 from '../assets/accreditations/iso-9001.png'
import iso15189 from '../assets/accreditations/iso-15189.png'

// Source: the lab's public website (About page), collected 2026-10-29.
// Pillar icons are fixed in code (About.jsx) and matched to this array by index.
export const defaultAboutContent = {
  tagline: 'نقدم لك كافة خدمات التحاليل الطبية — نتائج يعتمد عليها',
  founded_year: '',
  branches_count: '76',
  cases_count: '',
  story_p1: 'في رويال لاب نسعى بشغف للابتكار والتزام بالتميز في مجال التحاليل الطبية. كمعمل رائد في هذا المجال، نسابق الزمن لإجراء تحاليل تساعد في الحفاظ على صحتك، وتكتشف معنا حلولًا سريعة ودقيقة واقتصادية.',
  story_p2: 'مهمتنا تقديم فحوصات طبية تركز على الجودة العالية وراحة العملاء، بتدريب وتحفيز فريقنا لتقديم أفضل خدمة لمرضانا. ورؤيتنا قيادة سوق الفحوصات الطبية في مصر في سرعة الخدمة والتسعير وجودة النتائج.',
  pillars: [
    { title: 'أكثر من 70 فرعًا', desc: 'شبكة فروع منتشرة في جميع أنحاء الجمهورية يسهل الوصول إليها.' },
    { title: 'نتائج يعتمد عليها', desc: 'أفضل المتخصصين ونتائج دقيقة لتشخيص سليم.' },
    { title: 'زيارة منزلية', desc: 'مندوبنا يصلك لسحب العينات مع توصيل النتائج.' },
    { title: 'نتائج أونلاين', desc: 'استلام النتائج عبر الموقع أو الرسائل أو من الفرع أو بالتوصيل.' },
  ],
  team: [],
  accreditations: [
    { name: 'ISO 9001:2015', logo_url: iso9001 },
    { name: 'ISO 15189', logo_url: iso15189 },
  ],
}
