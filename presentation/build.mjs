// Generates one self-contained slide deck per prospect: node presentation/build.mjs
// Output: presentation/<slug>.html (open in a browser; arrows / swipe / click to navigate, "P" to print).
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// The deck is a single self-contained file (images + fonts inlined) so it also renders from a data: URL
// and can be emailed as-is.
const here = (p) => new URL(p, import.meta.url)
const imgCache = new Map()
async function img(name) {
  if (!imgCache.has(name)) {
    const file = fileURLToPath(here('./img/' + name + '.png'))
    const isLogo = name.includes('logo')
    const buf = isLogo
      ? await sharp(file).resize({ height: 200, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
      : await sharp(file).resize({ width: 560 }).jpeg({ quality: 82 }).toBuffer()
    imgCache.set(name, 'data:image/' + (isLogo ? 'png' : 'jpeg') + ';base64,' + buf.toString('base64'))
  }
  return imgCache.get(name)
}
const font = (n) => 'data:font/ttf;base64,' + fs.readFileSync(here('./fonts/Tajawal-' + n + '.ttf')).toString('base64')

const labs = {
  almaamal: {
    name: 'معامل المعمل',
    primary: '#295B34',
    dark: '#1E4527',
    light: '#E8F1EA',
    branches: '19',
    since: 'منذ 1971',
    hotline: '15810',
    // What the public web presence shows today (from the lab's own site, 2026-10-03).
    today: [
      ['موقع ويب جيد', 'نبذة وفروع وقائمة تحاليل، وطلب زيارة منزلية عبر نموذج تواصل.'],
      ['لا تطبيق على المتاجر', 'لم نجد تطبيقًا للمرضى على Google Play أو App Store.'],
      ['قائمة تحاليل بدون أسعار', 'الموقع يعرض اسم التحليل ونوع العينة ووقت التسليم فقط.'],
      ['19 فرعًا موزعة على 6 محافظات', 'القاهرة والجيزة والمنصورة وبني سويف والفيوم والسويس.'],
    ],
    shots: [
      ['almaamal-home', 'الرئيسية'],
      ['almaamal-packages', 'الباقات والتحاليل'],
      ['almaamal-branches', 'الفروع (19 فرعًا)'],
      ['almaamal-about', 'من نحن'],
    ],
    rec: 'professional',
    recWhy: 'لديكم 19 فرعًا، وهذا يقع ضمن باقة Professional (11–25 فرعًا).',
  },
  labmed: {
    name: 'لاب ميد إيجيبت',
    primary: '#143B65',
    dark: '#0F2B4A',
    light: '#E6EDF5',
    branches: '12',
    since: 'أول معمل مصري ألماني',
    hotline: '19314',
    today: [
      ['حجز عبر واتساب والمنصات', 'الزيارة المنزلية وحجز الباقات يتم بالاتصال أو واتساب، وهناك حضور على فيزيتا وcliniDo واكشف.'],
      ['لا تطبيق على المتاجر', 'لم نجد تطبيقًا للمرضى على Google Play أو App Store.'],
      ['باقات بدون أسعار منشورة', '20 باقة بأسماء ووصف، والسعر يُعرف بالاتصال بخدمة العملاء.'],
      ['12 فرعًا في القاهرة والجيزة', 'بعضها يضم عيادات وبعضها معامل فقط.'],
    ],
    shots: [
      ['labmed-home', 'الرئيسية'],
      ['labmed-packages', 'الباقات والتحاليل'],
      ['labmed-branches', 'الفروع (12 فرعًا)'],
      ['labmed-contact', 'التواصل'],
    ],
    rec: 'professional',
    recWhy: 'لديكم 12 فرعًا، وهذا يقع ضمن باقة Professional (11–25 فرعًا).',
  },
}

const plans = [
  {
    id: 'starter',
    title: 'Starter',
    sub: 'حتى 10 فروع',
    setup: '75,000',
    monthly: '6,000',
    items: ['التطبيق بهوية المعمل (لوجو، ألوان، اسم)', 'حجز زيارة منزلية أو موعد فرع', 'كتالوج الباقات والتحاليل مع البحث وشروط التحضير', 'الفروع مع الخريطة والاتصال', 'لوحة تحكم لتعديل الأسعار والمحتوى', 'استضافة وصيانة ودعم'],
  },
  {
    id: 'professional',
    title: 'Professional',
    sub: '11 – 25 فرعًا',
    setup: '120,000',
    monthly: '10,000',
    items: ['كل ما في Starter', 'تتبع حالة العينة للمريض برقم موبايله (يحدّثها فريقكم من لوحة التحكم)',
      'قسم الأخبار والعروض وشركاء المعمل', 'ربط Google Analytics وتقارير الاستخدام', 'تدريب فريقكم على لوحة التحكم', 'دعم بأولوية وتحديثات دورية'],
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    sub: 'تكامل وتخصيص',
    setup: '180,000+',
    monthly: '15,000+',
    items: ['كل ما في Professional', 'ربط بنظام النتائج لديكم لتحديث حالة العينة تلقائيًا (يُسعَّر حسب النظام)', 'دفع إلكتروني (Paymob أو غيره)', 'تخصيص الشاشات والمزايا حسب احتياجكم'],
  },
]

const features = [
  ['📅', 'حجز زيارة منزلية أو موعد فرع', 'العميل يختار التحاليل والباقات ويرسل الطلب من الموبايل، والطلب يصل لفريق خدمة العملاء.'],
  ['🔬', 'كتالوج الباقات والتحاليل', 'بحث فوري بالاسم، وأسعار وشروط تحضير لكل تحليل، وإضافة للحجز بضغطة.'],
  ['📍', 'الفروع والخريطة', 'قائمة بالفروع حسب المحافظة مع العنوان والمواعيد والاتصال والاتجاهات.'],
  ['💬', 'واتساب مباشر', 'زر لموافقات التأمين والاستفسارات برسالة جاهزة.'],
  ['📄', 'النتائج وتتبع العينة', 'ربط العميل ببوابة نتائجكم، ويتابع حالة عينته (تم السحب، جاري التحليل، جاهزة) برقم موبايله.'],
  ['⚙️', 'لوحة تحكم', 'تعديل الباقات والتحاليل والأسعار والفروع والأخبار بدون مبرمج.'],
  ['📲', 'يثبَّت على الموبايل', 'تطبيق ويب (PWA) يُضاف للشاشة الرئيسية ويعمل كتطبيق، بدون الحاجة لنشره على المتاجر.'],
  ['📈', 'قياس الأداء', 'تتبع زيارات التطبيق والباقات الأكثر طلبًا.'],
]

const phone = (src, label) => `
  <figure class="phone">
    <div class="phone__frame"><img src="@@${src}@@" alt="${label}" /></div>
    <figcaption>${label}</figcaption>
  </figure>`

const slides = (L) => {
  const rec = plans.find((p) => p.id === L.rec)
  return [
    // 1 cover
    `<section class="slide slide--cover">
      <div class="cover__text">
        <img class="cover__logo" src="@@${L.slug}-logo-white@@" alt="${L.name}" />
        <h1>تطبيق ${L.name}<br />للمرضى</h1>
        <p class="lead">حجز التحاليل والزيارات المنزلية والباقات والفروع، في تطبيق واحد بهوية معملكم.</p>
        <p class="tag">عرض تقديمي · ${L.name}</p>
      </div>
      <div class="cover__phones">${phone(L.shots[0][0], L.shots[0][1])}</div>
    </section>`,
    // 2 today
    `<section class="slide">
      <h2>ما لاحظناه على حضوركم الرقمي اليوم</h2>
      <p class="sub">من مصادركم العامة (موقعكم وصفحاتكم)، ونرحب بأي تصحيح.</p>
      <div class="grid grid--2">
        ${L.today.map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
      <p class="foot">الفرصة: تجربة مريض حديثة على الموبايل تعمل 24 ساعة، وتقلل الاعتماد على المكالمات والمنصات الخارجية.</p>
    </section>`,
    // 3 solution
    `<section class="slide">
      <h2>الحل: تطبيق ${L.name} على موبايل كل مريض</h2>
      <p class="sub">تطبيق ويب متقدم (PWA): يُفتح من رابط ويُثبَّت على الشاشة الرئيسية ويعمل كأي تطبيق.</p>
      <div class="grid grid--4">
        ${features.map(([i, t, d]) => `<div class="card card--feat"><span class="ico">${i}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
    </section>`,
    // 4 screens
    `<section class="slide slide--screens">
      <h2>نسخة ${L.name} الحقيقية</h2>
      <p class="sub">مبنية على بيانات موقعكم العام: الفروع والمحتوى والهوية. الأسعار تظهر «السعر عند الحجز» إلى حين استلام قائمتكم.</p>
      <div class="phones">${L.shots.map(([s, l]) => phone(s, l)).join('')}</div>
    </section>`,
    // 5 admin
    `<section class="slide">
      <h2>أنتم تتحكمون في كل شيء</h2>
      <p class="sub">لوحة تحكم بسيطة بالعربية، بدون الحاجة لمبرمج.</p>
      <div class="grid grid--3">
        ${[
          ['الباقات والتحاليل', 'إضافة وتعديل وحذف الباقات والتحاليل والأسعار وشروط التحضير.'],
          ['الفروع', 'تعديل العناوين والمواعيد وأرقام التواصل.'],
          ['الأخبار والعروض', 'نشر عروض وإعلانات تظهر مباشرة في التطبيق.'],
          ['شركاء المعمل', 'عرض الجهات والشركات المتعاقدة معكم.'],
          ['من نحن', 'تعديل النبذة والفريق والاعتمادات.'],
          ['الصور', 'رفع صور الباقات والعروض من اللوحة.'],
        ].map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
    </section>`,
    // 6 how we work
    `<section class="slide">
      <h2>كيف نبدأ؟</h2>
      <p class="sub">مدد تقديرية، تتأكد بعد استلام بياناتكم.</p>
      <ol class="steps">
        <li><b>الأسبوع الأول</b><span>استلام قائمة الأسعار والباقات والعناوين، وضبط الهوية (لوجو وألوان).</span></li>
        <li><b>الأسبوع الثاني</b><span>إعداد قاعدة البيانات ولوحة التحكم، وتجربة الحجز مع فريق خدمة العملاء لديكم.</span></li>
        <li><b>الإطلاق</b><span>تدريب الفريق، ثم إطلاق الرابط على دومين المعمل ورمز QR للفروع.</span></li>
        <li><b>بعد الإطلاق</b><span>دعم وتحديثات شهرية وقياس أداء الحجوزات.</span></li>
      </ol>
    </section>`,
    // 7 pricing
    `<section class="slide slide--pricing">
      <h2>الباقات والأسعار</h2>
      <p class="sub">الأسعار بالجنيه المصري، ومقترحة وقابلة للنقاش. ${L.recWhy}</p>
      <div class="plans">
        ${plans.map((p) => `
        <div class="plan${p.id === L.rec ? ' plan--rec' : ''}">
          ${p.id === L.rec ? '<span class="badge">المقترحة لكم</span>' : ''}
          <h3>${p.title}</h3>
          <span class="plan__sub">${p.sub}</span>
          <div class="plan__price"><strong>${p.setup}</strong><span>رسوم إعداد لمرة واحدة</span></div>
          <div class="plan__price plan__price--m"><strong>${p.monthly}</strong><span>اشتراك شهري</span></div>
          <ul>${p.items.map((i) => `<li>${i}</li>`).join('')}</ul>
        </div>`).join('')}
      </div>
      <p class="foot">الاشتراك الشهري يشمل الاستضافة والصيانة والتحديثات والدعم. التعاقد السنوي على الاشتراك.</p>
    </section>`,
    // 8 next
    `<section class="slide slide--cover slide--end">
      <div class="cover__text">
        <img class="cover__logo" src="@@${L.slug}-logo-white@@" alt="${L.name}" />
        <h1>الخطوة التالية</h1>
        <p class="lead">جلسة تجربة مباشرة على نسخة ${L.name}، ثم نحدد الباقة المناسبة وموعد البدء.</p>
        <p class="tag">للتواصل: [الاسم] · [رقم الموبايل / واتساب] · [البريد الإلكتروني]</p>
      </div>
    </section>`,
  ]
}

const css = (L) => `
@font-face{font-family:Tajawal;font-weight:400;src:url(@@F-Regular@@)}
@font-face{font-family:Tajawal;font-weight:700;src:url(@@F-Bold@@)}
@font-face{font-family:Tajawal;font-weight:800;src:url(@@F-ExtraBold@@)}
@font-face{font-family:Tajawal;font-weight:900;src:url(@@F-Black@@)}
:root{--p:${L.primary};--pd:${L.dark};--pl:${L.light};--ink:#16202a;--mut:#5b6672;--bg:#f4f6f8}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0c1116;font-family:Tajawal,system-ui,sans-serif;color:var(--ink);overflow:hidden}
#stage{position:absolute;top:50%;left:50%;width:1280px;height:720px;transform-origin:center;direction:rtl}
.slide{position:absolute;inset:0;background:var(--bg);padding:56px 72px;display:none;flex-direction:column;overflow:hidden}
.slide.on{display:flex;animation:in .35s ease}
@keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
h1{font-size:58px;line-height:1.2;font-weight:900}
h2{font-size:42px;font-weight:900;color:var(--p);margin-bottom:6px}
h3{font-size:22px;font-weight:800;margin-bottom:6px}
.sub{font-size:19px;color:var(--mut);margin-bottom:26px;max-width:1000px}
.lead{font-size:27px;line-height:1.6;margin-top:22px;opacity:.95}
.foot{margin-top:auto;font-size:18px;color:var(--p);font-weight:700;background:var(--pl);padding:14px 20px;border-radius:14px}
.grid{display:grid;gap:18px}.grid--2{grid-template-columns:1fr 1fr}.grid--3{grid-template-columns:repeat(3,1fr)}.grid--4{grid-template-columns:repeat(4,1fr)}
.card{background:#fff;border-radius:18px;padding:22px 24px;box-shadow:0 2px 14px rgba(20,30,40,.07);border-top:5px solid var(--p)}
.card p{font-size:16.5px;line-height:1.65;color:var(--mut)}
.card--feat{padding:18px 20px}.card--feat p{font-size:15px}.ico{font-size:30px;display:block;margin-bottom:8px}
.slide--cover{background:linear-gradient(135deg,var(--p),var(--pd));color:#fff;flex-direction:row;align-items:center;justify-content:space-between;padding:60px 90px}
.cover__logo{height:84px;max-width:420px;object-fit:contain;object-position:right;margin-bottom:34px;display:block}
.cover__text{max-width:640px}.tag{margin-top:34px;font-size:18px;opacity:.8}
.slide--end{justify-content:flex-start}
.phone{display:flex;flex-direction:column;align-items:center;gap:10px}
.phone__frame{width:230px;height:497px;border-radius:34px;border:7px solid #0e1319;background:#fff;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.28)}
.phone__frame img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
figcaption{font-size:15px;font-weight:700;color:var(--mut)}
.slide--cover figcaption{color:#fff}
.cover__phones .phone__frame{width:270px;height:585px}
.phones{display:flex;gap:30px;justify-content:center;margin-top:6px}
.slide--screens .phone__frame{width:222px;height:480px}
.steps{list-style:none;display:grid;gap:14px;counter-reset:s}
.steps li{display:flex;gap:24px;align-items:baseline;background:#fff;border-radius:16px;padding:20px 26px;box-shadow:0 2px 14px rgba(20,30,40,.07);counter-increment:s}
.steps li::before{content:counter(s);flex:none;width:44px;height:44px;border-radius:50%;background:var(--p);color:#fff;font-weight:900;font-size:22px;display:grid;place-items:center}
.steps b{flex:none;width:150px;font-size:22px;color:var(--p)}.steps span{font-size:19px;color:var(--mut);line-height:1.6}
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
.plan{position:relative;background:#fff;border-radius:20px;padding:20px 22px 16px;box-shadow:0 2px 14px rgba(20,30,40,.08);border:2px solid transparent}
.plan--rec{border-color:var(--p);box-shadow:0 14px 36px rgba(0,0,0,.18);transform:translateY(-8px)}
.badge{position:absolute;top:-14px;right:22px;background:var(--p);color:#fff;font-weight:800;font-size:15px;padding:5px 14px;border-radius:99px}
.plan__sub{color:var(--mut);font-size:16px}
.plan__price{margin-top:14px;display:flex;flex-direction:column}.plan__price strong{font-size:36px;font-weight:900;color:var(--p);line-height:1}
.plan__price--m strong{font-size:30px}.plan__price span{font-size:14px;color:var(--mut);margin-top:4px}
.plan ul{margin-top:12px;padding-right:20px;font-size:14px;line-height:1.55;color:var(--ink)}
.slide--pricing .sub{margin-bottom:26px}.slide--pricing .foot{margin-top:18px}
#hud{position:fixed;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:8px;z-index:9}
#hud i{width:9px;height:9px;border-radius:50%;background:#ffffff40;cursor:pointer}#hud i.on{background:#fff}
@media print{html,body{overflow:visible;background:#fff}#hud{display:none}#stage{position:static;transform:none!important;width:auto;height:auto}
.slide{position:relative;display:flex!important;width:1280px;height:720px;page-break-after:always;animation:none}@page{size:1280px 720px;margin:0}}
`

const js = `
const slides=[...document.querySelectorAll('.slide')],stage=document.getElementById('stage'),hud=document.getElementById('hud');
let i=Math.max(0,Math.min(slides.length-1,(+location.hash.slice(1)||1)-1));
slides.forEach((_,k)=>{const d=document.createElement('i');d.onclick=()=>go(k);hud.appendChild(d)});
function go(n){i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('on',k===i));[...hud.children].forEach((d,k)=>d.classList.toggle('on',k===i));history.replaceState(null,'','#'+(i+1))}
function fit(){const s=Math.min(innerWidth/1280,innerHeight/720);stage.style.transform='translate(-50%,-50%) scale('+s+')'}
addEventListener('resize',fit);fit();go(i);addEventListener('hashchange',()=>go((+location.hash.slice(1)||1)-1));
addEventListener('keydown',e=>{if(['ArrowLeft','PageDown',' '].includes(e.key))go(i+1);if(['ArrowRight','PageUp'].includes(e.key))go(i-1);if(e.key==='Home')go(0);if(e.key==='End')go(slides.length-1);if(e.key==='p')print()});
let x0=null;addEventListener('touchstart',e=>x0=e.touches[0].clientX);addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));x0=null});
stage.addEventListener('click',e=>{const r=stage.getBoundingClientRect();go(i+((e.clientX-r.left)<r.width/2?1:-1))});
`

for (const [slug, L] of Object.entries(labs)) {
  L.slug = slug
  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>عرض تطبيق ${L.name}</title><style>${css(L)}</style></head>
<body><div id="stage">${slides(L).join('\n')}</div><div id="hud"></div><script>${js}</script></body></html>`
  let out = html
  for (const m of new Set(html.match(/@@[^@]+@@/g) || [])) {
    const key = m.slice(2, -2)
    out = out.split(m).join(key.startsWith('F-') ? font(key.slice(2)) : await img(key))
  }
  fs.writeFileSync(new URL(`./${slug}.html`, import.meta.url), out)
  console.log('wrote presentation/' + slug + '.html')
}
