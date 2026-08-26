import logoWhiteFull from '../assets/logo-white-full.png'
import { TechIcon, ShieldIcon, ResultsIcon, TeamIcon } from '../components/icons'
import logoEqas from '../assets/accreditations/eqas.png'
import logoRiqas from '../assets/accreditations/riqas.png'
import logoEqaDarts from '../assets/accreditations/eqadarts.png'
import logoSgsUkas from '../assets/accreditations/sgs-ukas.png'
import logoIso from '../assets/accreditations/iso.png'
import logoGahar from '../assets/accreditations/gahar.png'
import photoSanaa from '../assets/team-sanaa.png'
import photoOmar from '../assets/team-omar.png'
import photoNada from '../assets/team-nada.png'
import './About.css'

const accreditations = [
  { name: 'EQAS', logo: logoEqas },
  { name: 'RIQAS', logo: logoRiqas },
  { name: 'EQA Darts', logo: logoEqaDarts },
  { name: 'SGS / UKAS', logo: logoSgsUkas },
  { name: 'ISO', logo: logoIso },
  { name: 'GAHAR', logo: logoGahar },
]

const pillars = [
  {
    Icon: TechIcon,
    title: 'تقنيات ومعايير متطورة',
    desc: 'نتبع أحدث الإرشادات المعملية المحلية والدولية، ونستخدم أحدث التقنيات للحفاظ على أعلى مستويات الجودة والأداء.',
  },
  {
    Icon: ShieldIcon,
    title: 'خدمات رعاية صحية استثنائية',
    desc: 'نقدم أعلى معايير الرعاية المعملية، بما يضمن الدقة والموثوقية والثقة في كل تحليل نجريه.',
  },
  {
    Icon: ResultsIcon,
    title: 'تشخيص دقيق وفي الوقت المناسب',
    desc: 'عملياتنا مصممة لتقديم نتائج سريعة ودقيقة تدعم القرارات الطبية الفعالة وتعزز رضا المرضى.',
  },
  {
    Icon: TeamIcon,
    title: 'فريق متخصص ومؤهل',
    desc: 'فريق متفانٍ من المتخصصين المدربين بأعلى كفاءة يضمن التميز في كل مرحلة من مراحل التحليل والتقارير.',
  },
]

const team = [
  { name: 'أ.د. سناء عبد الشافي', title: 'رئيس القسم الطبي', photo: photoSanaa },
  { name: 'عمر ناجي بكير', title: 'نائب الرئيس والمدير التنفيذي', photo: photoOmar },
  { name: 'د. ندى وحيد', title: 'أخصائية معمل', photo: photoNada },
]

export default function About() {
  return (
    <div>
      <section className="about__hero">
        <span className="about__blob about__blob--1" />
        <span className="about__blob about__blob--2" />
        <img className="about__logo" src={logoWhiteFull} alt="Trust Labs" />
        <h1 className="about__title">من نحن</h1>
        <p className="about__tagline">من أفضل 10 معامل تحاليل طبية في مصر، بخبرة أكثر من 30 عامًا</p>
      </section>

      <div className="about__stats">
        <div className="about__stat">
          <strong>1989</strong>
          <span>سنة التأسيس</span>
        </div>
        <div className="about__stat">
          <strong>19</strong>
          <span>فرع</span>
        </div>
        <div className="about__stat">
          <strong>+500K</strong>
          <span>حالة مكتملة</span>
        </div>
      </div>

      <section className="about__section">
        <h2 className="about__section-title">قصتنا</h2>
        <p className="about__story">
          <strong>Trust Labs</strong> أسستها الأستاذة الدكتورة سناء عبد الشافي أول فرع عام 1989 تحت اسم
          "Dr. Sana' Lab" كشركة مساهمة. توسّع الفرع الأساسي في الجيزة ليصبح نواة التوسع الوطني، ليصل عدد
          الفروع إلى 19 فرعًا يخدمون آلاف المرضى بأعلى المعايير الطبية.
        </p>
        <p className="about__story">
          Trust Labs من أفضل 10 معامل تحاليل طبية مصنّفة في مصر، بخبرة تتجاوز 30 عامًا في مجال التحاليل
          الطبية، باستخدام أحدث التقنيات والأجهزة.
        </p>
      </section>

      <section className="about__section about__section--pillars">
        <div className="about__pillars">
          {pillars.map(({ Icon, title, desc }) => (
            <div className="about__pillar" key={title}>
              <span className="about__pillar-icon">
                <Icon color="#fff" />
              </span>
              <h3 className="about__pillar-title">{title}</h3>
              <p className="about__pillar-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about__section">
        <h2 className="about__section-title">فريق Trust Labs المتخصص</h2>
        <p className="about__story">
          فريقنا من الاستشاريين والمتخصصين المهرة من كلية الطب يضمن إجراء كل تحليل بدقة وعناية وتميز علمي.
        </p>
        <div className="about__team">
          {team.map((member) => (
            <div className="about__team-card" key={member.name}>
              <div className="about__team-photo-wrap">
                <img className="about__team-photo" src={member.photo} alt={member.name} />
              </div>
              <span className="about__team-name">{member.name}</span>
              <span className="about__team-title">{member.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about__section">
        <h2 className="about__section-title">الاعتمادات والشهادات</h2>
        <p className="about__story about__story--tight">
          سعيًا للتميز وتقديم أفضل نتائج للمرضى، حصلت Trust Labs على شهادات جودة معتمدة من الهيئات الدولية التالية
        </p>
        <div className="about__accreditations">
          {accreditations.map((item, i) => (
            <div
              className="about__accreditation"
              key={item.name}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="about__accreditation-glow" />
              <img src={item.logo} alt={item.name} />
              <span className="about__accreditation-name">{item.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
