import hashtagBank from '../data/hashtags.json'

// Free, rule-based first drafts. Never overwrites what Mohamed already wrote.
// Tone rule: "اطمّن / افحص بدري" wording only, no promises of results.

const CATEGORIES = {
  heart: {
    keywords: ['ضغط', 'قلب', 'كوليسترول', 'دهون', 'شرايين', 'القلب'],
    service: 'أسأل عن باقة تحاليل القلب والضغط',
    bullets: ['صورة دم كاملة', 'باقة الكوليسترول', 'وظائف الكلى', 'الدهون الثلاثية'],
    headlines: ['أنقذ قلبك', 'قلبك مش لعبة', 'الضغط ساكت', 'اطمّن على قلبك', 'نبضك يهمنا', 'قلبك يستاهل', 'افحص بدري'],
    concepts: [
      ['a realistic human heart floating on an orange-white lifebuoy in a calm sea at sunset, water splashes', 'the heart on the lifebuoy', 'warm golden sunset glow', 'warm orange'],
      ['an elderly Egyptian man thoughtfully moving a small anatomical heart like a chess piece on a chessboard', 'the elderly man and the heart chess piece', 'moody dark teal cinematic light', 'deep blue'],
      ['a calm Egyptian man in his 50s measuring blood pressure at home with a digital cuff, soft morning light', 'man with the cuff', 'soft warm natural light', 'warm teal'],
      ['a glowing anatomical heart held gently in two hands against a soft sky-blue background', 'the hands and the heart', 'soft pastel dreamy light', 'sky blue'],
      ['an anatomical heart resting safely inside a glass dome like a precious artifact in a museum', 'the heart under the glass dome', 'clean bright museum light', 'mint green'],
      ['an Egyptian family laughing at a sunny dinner table, a soft glowing heart outline above them', 'the family at the table', 'warm golden afternoon light', 'warm orange'],
      ['a heart-shaped compass needle pointing north on a wooden desk with a stethoscope', 'the heart compass', 'cinematic warm side light', 'amber'],
    ],
  },
  thyroid: {
    keywords: ['غدة', 'درقي', 'TSH', 'الغدة'],
    service: 'اسألي عن باقة تحاليل الغدة الدرقية',
    bullets: ['TSH', 'T3 و T4', 'صورة دم كاملة', 'فيتامين د'],
    headlines: ['طاقتك على 5٪؟', 'تعبانة من غير سبب؟', 'اسمعي جسمك', 'الغدة بتتكلم', 'اطمّني النهارده', 'وزنك بيتغير؟', 'افحصي بدري'],
    concepts: [
      ['a tired Egyptian woman holding a phone showing a nearly empty battery at 5 percent, warm dim evening light', 'the woman and the low-battery phone', 'warm dim evening light', 'warm coral'],
      ['an Egyptian woman in her 30s touching her neck with a thoughtful look, soft glowing thyroid illustration', 'woman and thyroid glow', 'soft natural window light', 'warm orange'],
      ['a butterfly-shaped glowing thyroid gland floating above a calm woman silhouette', 'butterfly thyroid', 'dreamy soft pastel light', 'lavender'],
      ['a bathroom scale and a tape measure on a pastel floor with soft morning light', 'scale and tape measure', 'clean bright morning light', 'mint green'],
      ['a battery icon made of soft light charging in the palm of a hand', 'glowing battery in hand', 'cinematic soft blue light', 'sky blue'],
      ['an Egyptian woman stretching happily by a sunny window, rested and calm', 'rested woman at the window', 'bright golden morning light', 'warm orange'],
      ['a tuning fork vibrating with soft golden rings on a clean surface', 'tuning fork with rings', 'clean studio light', 'amber'],
    ],
  },
  diabetes: {
    keywords: ['سكر', 'سكري', 'HbA1c', 'السكر'],
    service: 'أسأل عن باقة تحاليل السكر',
    bullets: ['سكر صائم', 'سكر تراكمي HbA1c', 'وظائف الكلى', 'الدهون'],
    headlines: ['السكر بيتسلل', 'اطمّن على سكرك', 'يوم السكر', 'قيس بدري', 'حلاوة بحساب', 'سكرك فين؟', 'افحص دوريًا'],
    concepts: [
      ['a sugar cube melting slowly beside a small glucose meter on a bright table, close-up', 'sugar cube and glucose meter', 'bright clean morning light', 'blue'],
      ['a blue circle ribbon wrapped around a coffee cup with sugar on a sunny Egyptian cafe table', 'blue ribbon and coffee cup', 'warm cafe light', 'world diabetes day blue'],
      ['an Egyptian man in his 50s checking a glucose meter with a calm smile at home', 'man with the glucose meter', 'soft warm natural light', 'warm teal'],
      ['a balanced plate of fruit and vegetables with a small measuring tape around it', 'healthy plate with tape', 'bright airy light', 'mint green'],
      ['a tiny glowing drop of blood symbol above a clean lab tube on a white background', 'drop and lab tube', 'clean studio light', 'sky blue'],
      ['a dessert plate with a small caution tag in soft pastel style on a cafe table', 'dessert with tag', 'soft pastel light', 'warm coral'],
      ['a family walking together in a park at golden hour', 'walking family', 'golden hour light', 'warm orange'],
    ],
  },
  pregnancy: {
    keywords: ['حمل', 'جنين', 'NIPT', 'ولادة', 'أم', 'الأمومة', 'طفل'],
    service: 'اسألي عن باقة تحاليل الحمل',
    bullets: ['الكشف الجيني المبكر NIPT', 'صورة دم كاملة', 'فيتامين د', 'الحديد'],
    headlines: ['راحة بالك', 'بداية مطمئنة', 'اطمّني على طفلك', 'رحلة الأمومة', 'من أول أسبوع', 'قلبك مطمّن', 'ابدئي بدري'],
    concepts: [
      ['a smiling Egyptian mother cradling a newborn baby in soft beige tones at home', 'mother and newborn', 'soft warm natural light', 'warm green'],
      ['a soft glowing DNA helix wrapping gently around a tiny baby silhouette on a dark blue background', 'DNA helix and baby silhouette', 'cinematic deep blue light', 'teal'],
      ['an expecting Egyptian mother resting a hand on her belly at a sunny window, calm and happy', 'expecting mother', 'bright golden morning light', 'warm orange'],
      ['tiny baby shoes and a stethoscope heart shape on a soft cream blanket', 'baby shoes and stethoscope', 'soft pastel light', 'pastel pink'],
      ['a happy Egyptian couple looking at a calendar with a small circled date, warm home light', 'couple with the calendar', 'warm cozy home light', 'warm coral'],
      ['a pair of hands holding a small glowing seed that grows into a heart shape', 'seed growing into heart', 'dreamy soft light', 'mint green'],
      ['a mother and her toddler laughing in a sunny field of flowers', 'mother and toddler', 'golden hour light', 'warm orange'],
    ],
  },
  general: {
    keywords: [],
    service: 'اسأل عن باقة الاطمئنان الشاملة',
    bullets: ['صورة دم كاملة', 'وظائف الكبد والكلى', 'فحص السكر والدهون', 'تحاليل الغدة الدرقية'],
    headlines: ['اطمّن على صحتك', 'افحص بدري', 'صحتك أولًا', 'اطمّن النهارده', 'خطوة بسيطة', 'وقت الاطمئنان', 'معمل تثق به'],
    concepts: [
      ['a friendly Egyptian phlebotomist in a green uniform and blue gloves greeting a smiling family at their home door', 'phlebotomist and the family', 'warm natural home light', 'warm orange'],
      ['a clean modern lab with soft morning light, glass tubes glowing softly on a rack', 'tubes on a rack', 'clean bright morning light', 'mint green'],
      ['an Egyptian man and woman in their 40s smiling confidently, relaxed, in a bright living room', 'smiling couple', 'soft warm natural light', 'warm teal'],
      ['a calendar with one circled date and a stethoscope on a pastel desk, flat lay', 'calendar and stethoscope', 'bright airy light', 'sky blue'],
      ['an elderly Egyptian woman laughing with her granddaughter on a balcony at sunset', 'grandmother and granddaughter', 'golden sunset light', 'warm orange'],
      ['a hand holding a smartphone showing a calm checkmark in a clean modern style', 'phone with checkmark', 'clean studio light', 'violet'],
      ['a green plant growing out of a test tube on a sunny windowsill', 'plant in a test tube', 'bright morning light', 'fresh green'],
    ],
  },
}

const CAPTIONS = [
  (h, s) => `${h} 💚 خطوة بسيطة النهارده تطمّنك بكرة. ${s}.`,
  (h, s) => `صحتك أمانة، والفحص بدري بيفرق. ${s}.`,
  (h, s) => `ابدأ بخطوة صغيرة: افحص واطمّن. ${s}.`,
  (h, s) => `${h}، ومعمل تثق به جنبك في كل خطوة. ${s}.`,
]

export function detectCategory(idea) {
  const text = String(idea || '')
  for (const [name, c] of Object.entries(CATEGORIES)) {
    if (c.keywords.some((k) => text.includes(k))) return name
  }
  return 'general'
}

const empty = (s) => !String(s || '').trim()

export function fillPost(post, idea, index) {
  const cat = CATEGORIES[detectCategory(idea)]
  const pick = (arr) => arr[((index % arr.length) + arr.length) % arr.length]
  const headline = empty(post.headline) ? pick(cat.headlines) : post.headline
  const service = empty(post.panelService) ? cat.service : post.panelService
  const [concept, subject, mood, accent] = pick(cat.concepts)
  const tags = [...(hashtagBank[detectCategory(idea)] || []).slice(0, 3), ...hashtagBank.general.slice(0, 3)]
  return {
    ...post,
    headline,
    caption: empty(post.caption) ? pick(CAPTIONS)(headline, service) : post.caption,
    panelService: service,
    panelBullets: post.panelBullets.map((b, i) => (empty(b) ? cat.bullets[i] : b)),
    hashtags: post.hashtags.length ? post.hashtags : tags,
    image: {
      concept: empty(post.image.concept) ? concept : post.image.concept,
      subject: empty(post.image.subject) ? subject : post.image.subject,
      mood: empty(post.image.mood) ? mood : post.image.mood,
      accent: empty(post.image.accent) ? accent : post.image.accent,
    },
  }
}

export function fillPosts(posts, idea) {
  return posts.map((p, i) => fillPost(p, idea, i))
}
