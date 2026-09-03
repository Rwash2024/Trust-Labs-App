import logoEqas from '../assets/accreditations/eqas.png'
import logoRiqas from '../assets/accreditations/riqas.png'
import logoEqaDarts from '../assets/accreditations/eqadarts.png'
import logoSgsUkas from '../assets/accreditations/sgs-ukas.png'
import logoIso from '../assets/accreditations/iso.png'
import logoGahar from '../assets/accreditations/gahar.png'
import photoSanaa from '../assets/team-sanaa.png'
import photoOmar from '../assets/team-omar.png'
import photoNada from '../assets/team-nada.png'

// Fallback content shown when Supabase isn't connected or no row was saved yet.
// Pillar icons are fixed in code (About.jsx) and matched to this array by index.
export const defaultAboutContent = {
  tagline: 'من أفضل 10 معامل تحاليل طبية في مصر، بخبرة أكثر من 30 عامًا',
  founded_year: '1989',
  branches_count: '19',
  cases_count: '+500K',
  story_p1:
    'Trust Labs أسستها الأستاذة الدكتورة سناء عبد الشافي أول فرع عام 1989 تحت اسم "Dr. Sana\' Lab" كشركة مساهمة. توسّع الفرع الأساسي في الجيزة ليصبح نواة التوسع الوطني، ليصل عدد الفروع إلى 19 فرعًا يخدمون آلاف المرضى بأعلى المعايير الطبية.',
  story_p2:
    'Trust Labs من أفضل 10 معامل تحاليل طبية مصنّفة في مصر، بخبرة تتجاوز 30 عامًا في مجال التحاليل الطبية، باستخدام أحدث التقنيات والأجهزة.',
  pillars: [
    {
      title: 'تقنيات ومعايير متطورة',
      desc: 'نتبع أحدث الإرشادات المعملية المحلية والدولية، ونستخدم أحدث التقنيات للحفاظ على أعلى مستويات الجودة والأداء.',
    },
    {
      title: 'خدمات رعاية صحية استثنائية',
      desc: 'نقدم أعلى معايير الرعاية المعملية، بما يضمن الدقة والموثوقية والثقة في كل تحليل نجريه.',
    },
    {
      title: 'تشخيص دقيق وفي الوقت المناسب',
      desc: 'عملياتنا مصممة لتقديم نتائج سريعة ودقيقة تدعم القرارات الطبية الفعالة وتعزز رضا المرضى.',
    },
    {
      title: 'فريق متخصص ومؤهل',
      desc: 'فريق متفانٍ من المتخصصين المدربين بأعلى كفاءة يضمن التميز في كل مرحلة من مراحل التحليل والتقارير.',
    },
  ],
  team: [
    { name: 'أ.د. سناء عبد الشافي', title: 'رئيس القسم الطبي', photo_url: photoSanaa },
    { name: 'عمر ناجي بكير', title: 'نائب الرئيس والمدير التنفيذي', photo_url: photoOmar },
    { name: 'د. ندى وحيد', title: 'أخصائية معمل', photo_url: photoNada },
  ],
  accreditations: [
    { name: 'EQAS', logo_url: logoEqas },
    { name: 'RIQAS', logo_url: logoRiqas },
    { name: 'EQA Darts', logo_url: logoEqaDarts },
    { name: 'SGS / UKAS', logo_url: logoSgsUkas },
    { name: 'ISO', logo_url: logoIso },
    { name: 'GAHAR', logo_url: logoGahar },
  ],
}
