// In-branch campaign: the A2 waiting-area poster "أعرف عينتك فين من موبايلك",
// one print-ready PDF (+ a PNG preview of the first) per branch, each with that
// branch's own QR code (p=poster). Uses the app's own font (Tajawal) and logo.
//
// Usage: node scripts/campaign/poster-a2.mjs [slug ...]   (no slugs = all 19)
//        → scripts/campaign/out/posters/
// Needs Playwright's Chromium (preinstalled on Claude Code on the web; locally:
// npx playwright install chromium).
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'
import { BRANCH_SLUGS } from '../../src/data/branchSlugs.js'
import { qrUrl, QR_OPTIONS } from './qr-codes.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ASSETS = path.join(HERE, '..', '..', 'src', 'assets')
const OUT = path.join(HERE, 'out', 'posters')
const FONT = (f) => 'file://' + path.join(ASSETS, 'fonts', f)
const LOGO = 'file://' + path.join(ASSETS, 'logo-ar.png')

function loadChromium() {
  const require = createRequire(import.meta.url)
  try {
    return require('playwright').chromium
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')).chromium
  }
}

// The six statuses a sample moves through in the app (SampleTrackingTab STATUSES), short forms.
const STATIONS = ['تم تسجيل الطلب', 'جاري السحب', 'تم سحب العينة', 'في المعمل', 'جاهزة النتيجة', 'تم التسليم']
const CURRENT = 3 // "في المعمل" — the moment the patient in the waiting room is actually in
const TIMES = ['٩:٠٢ ص', '٩:١٤ ص', '٩:٢١ ص', '١٠:٠٥ ص']

function html({ branchName, slug, qrSvg }) {
  const stations = STATIONS.map((label, i) => {
    const state = i < CURRENT ? 'done' : i === CURRENT ? 'now' : 'todo'
    return `<li class="st ${state}">
      <span class="dot"></span>
      <span class="lbl">${label}</span>
      <span class="time">${TIMES[i] || '—'}</span>
    </li>`
  }).join('')

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
@font-face{font-family:T;src:url('${FONT('Tajawal-Regular.ttf')}');font-weight:400}
@font-face{font-family:T;src:url('${FONT('Tajawal-Bold.ttf')}');font-weight:700}
@font-face{font-family:T;src:url('${FONT('Tajawal-ExtraBold.ttf')}');font-weight:800}
@font-face{font-family:T;src:url('${FONT('Tajawal-Black.ttf')}');font-weight:900}
@page{size:420mm 594mm;margin:0}
:root{
  --paper:#F6F9F7; --ink:#2B2523; --soft:#6E7A73; --hair:#D5DED9;
  --green:#39B76E; --deep:#1E6B40; --deeper:#175533; --mint:#E6F5EC;
  --m:30mm;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:420mm;height:594mm;background:var(--paper);color:var(--ink);font-family:T,sans-serif;-webkit-font-smoothing:antialiased}
.page{position:relative;width:420mm;height:594mm;overflow:hidden;display:grid;grid-template-rows:auto auto auto 1fr;}

/* top */
.top{padding:var(--m) var(--m) 0;display:flex;justify-content:space-between;align-items:flex-start}
.logo{height:50mm}
.pill{font-weight:700;font-size:8.2mm;color:var(--deep);border:0.7mm solid var(--green);border-radius:99mm;padding:2.6mm 7mm 3.4mm;margin-top:6mm;letter-spacing:.2mm}

/* headline */
.head{padding:12mm var(--m) 0}
.q{font-weight:900;font-size:47mm;white-space:nowrap;line-height:1.02;letter-spacing:-.6mm;color:var(--ink)}
.q .mark{color:var(--green)}
.a{font-weight:800;font-size:34mm;line-height:1.15;color:var(--green);margin-top:4mm}
.sub{font-weight:400;font-size:8.6mm;line-height:1.55;color:var(--soft);margin-top:7mm;max-width:300mm}

/* the path */
.path{position:relative;margin:16mm var(--m) 0;padding-top:28mm}
.path ol{list-style:none;display:grid;grid-template-columns:repeat(6,1fr);position:relative}
.path ol::before,.path ol::after{content:'';position:absolute;top:3.4mm;height:0}
/* solid for what has happened, dotted for what hasn't (RTL: starts on the right) */
.path ol::before{right:calc(100%/12);width:calc(100%/6*${CURRENT});border-top:1.2mm solid var(--green)}
.path ol::after{left:calc(100%/12);width:calc(100%/6*${5 - CURRENT});border-top:1.2mm dotted var(--hair)}
.st{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;z-index:1}
.dot{width:8mm;height:8mm;border-radius:50%;background:var(--paper);border:1.2mm solid var(--hair)}
.st.done .dot{background:var(--green);border-color:var(--green)}
.st.now .dot{width:13mm;height:13mm;margin-top:-2.5mm;background:var(--paper);border:3mm solid var(--green);box-shadow:0 0 0 3.5mm var(--mint)}
.lbl{font-weight:700;font-size:6.2mm;margin-top:6mm;line-height:1.3;color:var(--ink)}
.st.todo .lbl{color:var(--soft);font-weight:400}
.st.now .lbl{color:var(--deep);font-weight:800}
.time{font-weight:400;font-size:4.6mm;color:var(--soft);margin-top:1.5mm}
.st.todo .time{opacity:.55}
.here{position:absolute;top:0;right:calc(100%/12 + 100%/6*${CURRENT});transform:translateX(50%);display:flex;flex-direction:column;align-items:center;gap:1.5mm}
.here b{font-weight:800;font-size:6.4mm;color:#fff;background:var(--deep);border-radius:2.5mm;padding:1.6mm 4.5mm 2.4mm;white-space:nowrap}
.here i{width:0;height:0;border-left:2.4mm solid transparent;border-right:2.4mm solid transparent;border-top:2.6mm solid var(--deep)}

/* answer */
.answer{margin-top:20mm;background:var(--deep);color:#fff;padding:18mm var(--m) 0;display:grid;grid-template-rows:1fr auto;min-height:0}
.body{display:flex;flex-direction:column;justify-content:center}
.grid{display:grid;grid-template-columns:1fr 150mm;gap:20mm;align-items:center}
.steps h2{font-weight:800;font-size:12mm;line-height:1.2;margin-bottom:10mm}
.steps ol{list-style:none;display:grid;gap:8.5mm}
.steps li{display:grid;grid-template-columns:14mm 1fr;gap:5mm;align-items:center;font-weight:700;font-size:9mm;line-height:1.3}
.steps li span{width:14mm;height:14mm;border-radius:50%;background:var(--green);display:grid;place-items:center;font-weight:800;font-size:8mm;line-height:1;padding-bottom:1mm}
.steps .no{margin-top:11mm;font-size:6.6mm;font-weight:400;color:#CFE9DA;line-height:1.5}
.qr{background:#fff;border-radius:7mm;padding:9mm;display:grid;gap:5mm;justify-items:center}
.qr .code{width:132mm;height:132mm}
.qr .code svg{width:100%;height:100%;display:block}
.qr .cap{font-weight:800;font-size:8.4mm;color:var(--deep);line-height:1}
.also{margin-top:16mm;border-top:0.35mm solid rgba(255,255,255,.22);padding-top:9mm;display:flex;gap:6mm 14mm;flex-wrap:wrap;font-size:6.6mm;font-weight:700;line-height:1.35}
.also .k{color:#9FDDB9;font-weight:400}
.foot{display:flex;justify-content:space-between;align-items:center;padding:7mm 0 22mm;margin-top:9mm;border-top:0.35mm solid rgba(255,255,255,.22);font-size:5.2mm;color:#CFE9DA}
.foot .mono{direction:ltr;font-size:4.6mm;letter-spacing:.2mm}
.foot b{color:#fff;font-weight:700}
</style></head><body><div class="page">

  <div class="top">
    <img class="logo" src="${LOGO}" alt="معامل ترست">
    <div class="pill">من غير تحميل</div>
  </div>

  <div class="head">
    <div class="q">أعرف عينتك فين</div>
    <div class="a">من موبايلك.</div>
    <p class="sub">من لحظة ما عينتك تتسحب لحد ما النتيجة تبقى جاهزة، هتعرف هي فين بالظبط.</p>
  </div>

  <div class="path">
    <div class="here"><b>عينتك هنا</b><i></i></div>
    <ol>${stations}</ol>
  </div>

  <div class="answer">
    <div class="body">
      <div class="grid">
        <div class="steps">
          <h2>في أقل من دقيقة</h2>
          <ol>
            <li><span>١</span>امسح الكود بكاميرا موبايلك</li>
            <li><span>٢</span>اكتب رقم موبايلك</li>
            <li><span>٣</span>تابع عينتك لحد النتيجة</li>
          </ol>
          <p class="no">مش محتاج تحمّل حاجة من الستور.<br>ولو عايزه على الشاشة الرئيسية: «إضافة إلى الشاشة الرئيسية».</p>
        </div>
        <div class="qr">
          <div class="code">${qrSvg}</div>
          <div class="cap">امسح هنا</div>
        </div>
      </div>
      <div class="also">
        <span><span class="k">ومن نفس التطبيق ·</span> احجز زيارة منزلية</span>
        <span>اطلب كارت الثقة <span class="k">— خصم ٢٥٪ على كل التحاليل سنة كاملة</span></span>
      </div>
    </div>
    <div class="foot">
      <span><b>${branchName}</b> · الخط الساخن <b>16183</b></span>
      <span class="mono">app.trustlabseg.com · ${slug}/poster</span>
    </div>
  </div>

</div></body></html>`
}

;(async () => {
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(BRANCH_SLUGS)
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await loadChromium().launch()
  const page = await browser.newPage({ viewport: { width: 1587, height: 2245 }, deviceScaleFactor: 1 })
  for (const slug of wanted) {
    if (!BRANCH_SLUGS[slug]) throw new Error(`unknown branch slug: ${slug}`)
    const qrSvg = (await QRCode.toString(qrUrl(slug, 'poster'), { ...QR_OPTIONS, type: 'svg' })).replace(/width="\d+"|height="\d+"/g, '')
    const file = path.join(OUT, `poster_${slug}.html`)
    fs.writeFileSync(file, html({ branchName: BRANCH_SLUGS[slug], slug, qrSvg }))
    await page.goto('file://' + file)
    await page.evaluate(() => document.fonts.ready)
    await page.pdf({ path: path.join(OUT, `Trust-Labs-Poster-A2_${slug}.pdf`), width: '420mm', height: '594mm', printBackground: true, pageRanges: '1' })
    // Nothing may run past the page edge — a clipped headline or QR is a reprint.
    const overflow = await page.evaluate(() => {
      const p = document.querySelector('.page').getBoundingClientRect()
      return [...document.querySelectorAll('.page *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width && (r.right > p.right + 0.5 || r.left < p.left - 0.5 || r.bottom > p.bottom + 0.5)
        })
        .map((el) => el.className || el.tagName)
    })
    if (overflow.length) console.warn('OVERFLOW', slug, overflow)
    if (slug === wanted[0]) await page.screenshot({ path: path.join(OUT, `preview_${slug}.png`) })
    console.log('built', slug)
  }
  await browser.close()
})()
