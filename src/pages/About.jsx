import { useEffect, useState } from 'react'
import logoWhiteFull from '../assets/logo-white-full.png'
import { TechIcon, ShieldIcon, ResultsIcon, TeamIcon } from '../components/icons'
import { fetchAboutContent } from '../lib/data'
import { defaultAboutContent } from '../data/aboutContent'
import './About.css'

// Pillar icons are fixed in code and matched to the content's pillars array by index.
const pillarIcons = [TechIcon, ShieldIcon, ResultsIcon, TeamIcon]

export default function About() {
  const [content, setContent] = useState(defaultAboutContent)

  useEffect(() => {
    fetchAboutContent().then(setContent)
  }, [])

  const { tagline, founded_year, branches_count, cases_count, story_p1, story_p2, pillars, team, accreditations } =
    content

  return (
    <div>
      <section className="about__hero">
        <span className="about__blob about__blob--1" />
        <span className="about__blob about__blob--2" />
        <img className="about__logo" src={logoWhiteFull} alt="Trust Labs" />
        <h1 className="about__title">من نحن</h1>
        <p className="about__tagline">{tagline}</p>
      </section>

      <div className="about__stats">
        <div className="about__stat">
          <strong>{founded_year}</strong>
          <span>سنة التأسيس</span>
        </div>
        <div className="about__stat">
          <strong>{branches_count}</strong>
          <span>فرع</span>
        </div>
        <div className="about__stat">
          <strong>{cases_count}</strong>
          <span>حالة مكتملة</span>
        </div>
      </div>

      <section className="about__section">
        <h2 className="about__section-title">قصتنا</h2>
        <p className="about__story">{story_p1}</p>
        <p className="about__story">{story_p2}</p>
      </section>

      <section className="about__section about__section--pillars">
        <div className="about__pillars">
          {pillars.map(({ title, desc }, i) => {
            const Icon = pillarIcons[i % pillarIcons.length]
            return (
              <div className="about__pillar" key={title}>
                <span className="about__pillar-icon">
                  <Icon color="#fff" />
                </span>
                <h3 className="about__pillar-title">{title}</h3>
                <p className="about__pillar-desc">{desc}</p>
              </div>
            )
          })}
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
                <img className="about__team-photo" src={member.photo_url} alt={member.name} />
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
              <img src={item.logo_url} alt={item.name} />
              <span className="about__accreditation-name">{item.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
