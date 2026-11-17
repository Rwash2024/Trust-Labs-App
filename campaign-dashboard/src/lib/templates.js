import hashtagBank from '../data/hashtags.json'

// Free, rule-based first drafts. Never overwrites what Mohamed already wrote.
// Tone rule: "اطمّن / افحص بدري" wording only, no promises of results.

const CATEGORIES = {
  heart: {
    keywords: ['ضغط', 'قلب', 'كوليسترول', 'دهون', 'شرايين', 'القلب'],
    service: 'أسأل عن باقة تحاليل القلب والضغط',
    bullets: ['صورة دم كاملة', 'باقة الكوليسترول', 'وظائف الكلى', 'الدهون الثلاثية'],
    captions: [
      (h, s) => `${h} ❤️ قياس الضغط والكوليسترول بيطمّنك على أهم عضو في جسمك، اسأل واحجز. ${s}.`,
      (h, s) => `القلب بيشتغل من غير إجازة، افحصه بدري. ${s}.`,
      (h, s) => `${h}. حدد معادك واطمّن على قلبك. ${s}.`,
      (h, s) => `خطوة بسيطة النهارده بتفرق بكرة، افحص واطمّن. ${s}.`,
    ],
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
    captions: [
      (h, s) => `${h} 🦋 تحليل الغدة بيدّيكي صورة واضحة عن طاقتك، اطمّني واحجزي. ${s}.`,
      (h, s) => `التعب والتغيّر في الوزن ليهم أسباب كتير، افحصي واعرفي. ${s}.`,
      (h, s) => `${h}. احجزي تحليلك النهارده وابدئي بمعلومة. ${s}.`,
      (h, s) => `اسمعي جسمك قبل ما يعلّي صوته، افحصي بدري. ${s}.`,
    ],
    headlines: ['طاقتك على 5٪؟', 'تعبانة بلا سبب؟', 'اسمعي جسمك', 'الغدة بتتكلم', 'اطمّني النهارده', 'وزنك بيتغير؟', 'افحصي بدري'],
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
    captions: [
      (h, s) => `${h} 🩸 قياس السكر الدوري بيطمّنك قبل ما تحس بأي حاجة، اسأل واحجز. ${s}.`,
      (h, s) => `قيس سكرك بدري واطمّن، فحص بسيط وراحة بال أكبر. ${s}.`,
      (h, s) => `${h}. اسأل واحجز تحليل السكر التراكمي HbA1c. ${s}.`,
      (h, s) => `افحص دوريًا، أسهل طريقة تطمّن بيها على نفسك وعيلتك. ${s}.`,
    ],
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
    keywords: ['حمل', 'جنين', 'NIPT', 'ولادة', 'الأمومة', 'أمهات', 'حوامل', 'الحوامل', 'طفل', 'أطفال'],
    service: 'اسألي عن باقة تحاليل الحمل',
    bullets: ['الكشف الجيني المبكر NIPT', 'صورة دم كاملة', 'فيتامين د', 'الحديد'],
    captions: [
      (h, s) => `${h} 🤍 اطمّني على رحلتك خطوة بخطوة مع كل أسبوع. ${s}.`,
      (h, s) => `الكشف المبكر بيدّيكي راحة بال من البداية. احجزي موعدك. ${s}.`,
      (h, s) => `${h}. اسألي عن فحوصاتك واحجزي من بيتك. ${s}.`,
      (h, s) => `أحلى حاجة في الرحلة إنك تكوني مطمّنة، افحصي بدري. ${s}.`,
    ],
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
  liver: {
    keywords: ['كبد', 'كلى', 'الكلية', 'كرياتينين', 'يوريا'],
    service: 'اسأل عن باقة وظائف الكبد والكلى',
    bullets: ['وظائف الكبد', 'وظائف الكلى', 'صورة دم كاملة', 'الدهون الثلاثية'],
    captions: [
      (h, s) => `${h} 💚 وظائف الكبد والكلى بتتابع في تحليل بسيط. ${s}.`,
      (h, s) => `الفحص الدوري بيطمّنك على أهم أعضاء جسمك. ${s}.`,
      (h, s) => `${h}. خد خطوة النهارده واحجز فحصك بسهولة. ${s}.`,
      (h, s) => `جسمك بيشتغل لحد الليل من غير ما تحس، ريّحه وافحص بدري. ${s}.`,
    ],
    headlines: ['كبدك أمانة', 'كليتك أمانة', 'اطمّن على كبدك', 'فلتر الجسم', 'جسمك بيشكرك', 'افحص بدري', 'خطوة هادية'],
    concepts: [
      ['a soft glowing anatomical liver and kidneys floating above a clean white lab desk, gentle sparkles', 'liver and kidneys glow', 'clean bright studio light', 'mint green'],
      ['an Egyptian man in his 40s smiling while holding a glass of water in a sunny kitchen', 'man with water glass', 'soft warm natural light', 'warm teal'],
      ['two glowing kidney-shaped leaves on a fresh green branch against a soft blue background', 'kidney-shaped leaves', 'dreamy soft pastel light', 'fresh green'],
      ['a clean filter symbol made of light turning cloudy water into clear water in a glass beaker', 'light filter and clear water', 'cinematic clean light', 'sky blue'],
      ['a friendly Egyptian phlebotomist taking a quick calm blood sample from a relaxed man at a bright lab', 'quick calm blood draw', 'clean bright morning light', 'warm orange'],
      ['a calendar with a circled date next to a glass of water and a small plant on a pastel desk', 'calendar water and plant', 'bright airy light', 'mint green'],
    ],
  },
  allergy: {
    keywords: ['حساسية', 'حساسيه', 'Food Print', 'فود برينت', 'تحمل الأكل', 'تحمل الطعام'],
    service: 'اسأل عن تحليل حساسية الأكل Food Print',
    bullets: ['60 نوع أكل مختلف', 'عينة دم بسيطة', 'نتيجة مفصلة', 'بتفهم أكلك أكتر'],
    captions: [
      (h, s) => `${h} 🍽️ تحليل واحد يكشف تفاعل جسمك مع 60 نوع أكل، اسأل واحجز. ${s}.`,
      (h, s) => `قبل ما تغيّر نظامك، افهم جسمك الأول وافحص. ${s}.`,
      (h, s) => `${h}. ابدأ بمعلومة مش بتخمين، واحجز تحليلك. ${s}.`,
      (h, s) => `الأكل الصح بيبدأ من معرفة جسمك، اطمّن وابدأ. ${s}.`,
    ],
    headlines: ['أكلك بيناسبك؟', 'اعرف أكلك', '60 نوع أكل', 'جسمك بيقول إيه؟', 'افحص وافهم', 'طبقك مفاجأة؟', 'أكل بحساب'],
    concepts: [
      ['a colorful table of many small bowls of different foods seen from above, with one glowing lab tube in the center', 'food bowls and a lab tube', 'bright airy light', 'fresh green'],
      ['an Egyptian family cooking together in a sunny kitchen, fresh vegetables on the counter', 'family cooking', 'warm golden afternoon light', 'warm orange'],
      ['a magnifying glass over a fresh salad bowl on a wooden table, soft natural light', 'magnifier over salad', 'soft warm natural light', 'mint green'],
      ['a fork and a small glowing checkmark above a healthy plate on a pastel background', 'fork and checkmark', 'clean studio light', 'sky blue'],
      ['a drop of blood symbol in soft light next to colorful fruits on a clean white surface', 'drop and fruits', 'clean bright light', 'warm coral'],
      ['an Egyptian woman smiling at a farmers market holding a basket of vegetables', 'woman at the market', 'golden hour light', 'warm orange'],
    ],
  },
  vitamins: {
    keywords: ['فيتامين', 'B12', 'حديد', 'انيميا', 'أنيميا', 'فقر الدم', 'كالسيوم'],
    service: 'اسأل عن باقة الفيتامينات والمعادن',
    bullets: ['فيتامين د', 'فيتامين B12', 'الحديد', 'صورة دم كاملة'],
    captions: [
      (h, s) => `${h} ☀️ تحليل بسيط يطمّنك على مستوى فيتامين د والحديد، اسأل واحجز. ${s}.`,
      (h, s) => `مش كل تعب لازم يتسكت عليه، افحص واطمّن بتحليل سريع. ${s}.`,
      (h, s) => `${h}. اعرف مستوياتك الأول وبعدين اسأل دكتورك، واحجز. ${s}.`,
      (h, s) => `الشمس مش دايمًا كفاية، افحص واطمّن. ${s}.`,
    ],
    headlines: ['طاقتك محتاجة فحص', 'فيتامينك كام؟', 'شمس وفيتامين', 'اطمّن على طاقتك', 'قيس بدري', 'جسمك محتاج إيه؟', 'فحص الفيتامينات'],
    concepts: [
      ['a glowing golden sun and a small bottle of vitamin capsules on a sunny windowsill, warm morning light', 'sun and vitamin capsules', 'bright golden morning light', 'warm orange'],
      ['an Egyptian woman in her 30s stretching energetically on a sunny balcony with a cup of tea', 'energetic woman on balcony', 'bright golden morning light', 'warm orange'],
      ['colorful fresh fruits and leafy greens arranged around a clean lab tube on a pastel table, flat lay', 'fruits greens and lab tube', 'bright airy light', 'fresh green'],
      ['a battery icon made of soft sunlight charging in the palm of a hand', 'sunlight battery', 'cinematic soft warm light', 'amber'],
      ['a vitamin D sun symbol drawn in soft light above an Egyptian family walking on the beach at sunset', 'family at the beach', 'golden sunset light', 'warm orange'],
      ['a small test tube with golden liquid glowing softly on a white surface next to a sprig of orange blossom', 'golden test tube', 'clean studio light', 'amber'],
    ],
  },
  hormones: {
    keywords: ['هرمون', 'تكيس', 'المبايض', 'خصوبة', 'إنجاب', 'انجاب', 'AMH'],
    service: 'اسألي عن باقة تحاليل الهرمونات',
    bullets: ['AMH', 'هرمون الحليب', 'FSH و LH', 'هرمونات الغدة'],
    captions: [
      (h, s) => `${h} 🌸 تحاليل الهرمونات بتدّيكي صورة واضحة قبل أي قرار، اسألي واحجزي. ${s}.`,
      (h, s) => `بدل التخمين، ابدئي بمعلومة. اسألي واحجزي تحليلك. ${s}.`,
      (h, s) => `${h}. افحصي بخصوصية وراحة، وفريقنا معاكي. ${s}.`,
      (h, s) => `معرفة جسمك أول خطوة، اطمّني بتحليل بسيط. ${s}.`,
    ],
    headlines: ['هرموناتك بتتكلم', 'اسمعي جسمك', 'اطمّني بالفحص', 'ابدئي بمعلومة', 'خطوة هادية', 'توازن جسمك', 'افحصي بدري'],
    concepts: [
      ['a calm Egyptian woman in her 30s writing in a notebook at a sunny desk with a cup of tea, soft pink flowers', 'woman with notebook', 'soft warm natural light', 'pastel pink'],
      ['soft glowing abstract molecule shapes floating gently over a calm pastel background', 'glowing molecules', 'dreamy soft pastel light', 'lavender'],
      ['a pair of hands holding a small glowing flower bud that opens slowly', 'hands and flower bud', 'soft pastel dreamy light', 'pastel pink'],
      ['an Egyptian couple holding hands on a sunny park bench, relaxed and hopeful', 'couple on a bench', 'golden hour light', 'warm coral'],
      ['a calendar with a circled date and a small potted plant on a pastel desk, flat lay', 'calendar and plant', 'bright airy light', 'mint green'],
      ['a balanced stack of smooth stones on a soft beach at sunrise, calm sea behind', 'balanced stones', 'cinematic sunrise light', 'warm orange'],
    ],
  },
  sports: {
    keywords: ['رياضة', 'رياضي', 'رياضية', 'جيم', 'لياقة', 'عضلات', 'تمرين'],
    service: 'اسأل عن باقة تحاليل الرياضيين',
    bullets: ['صورة دم كاملة', 'فيتامين د', 'الحديد', 'وظائف الكبد والكلى'],
    captions: [
      (h, s) => `${h} 💪 قبل ما تزوّد الأوزان، اطمّن على جسمك بتحليل متكامل. ${s}.`,
      (h, s) => `التمرين الصح يبدأ بمعلومة عن جسمك. اسأل واحجز باقتك. ${s}.`,
      (h, s) => `${h}. افحص وابدأ خطتك على أساس واضح. ${s}.`,
      (h, s) => `الرياضة عادة حلوة، واطمّن عليها بفحص دوري. ${s}.`,
    ],
    headlines: ['جسمك رياضي؟', 'لياقتك تبدأ هنا', 'جيم وفحص', 'ابدأ صح', 'اعرف جسمك', 'قيس وطوّر', 'افحص بدري'],
    concepts: [
      ['an Egyptian man in his 30s in a modern gym holding a water bottle, confident and relaxed, soft morning light', 'man at the gym', 'clean bright morning light', 'warm teal'],
      ['running shoes next to a clean lab test tube on a wooden floor, flat lay', 'running shoes and tube', 'bright airy light', 'amber'],
      ['an Egyptian woman stretching on a yoga mat in a sunny living room', 'woman stretching', 'soft warm natural light', 'mint green'],
      ['a glowing heartbeat line wrapping around a dumbbell on a dark moody background', 'heartbeat and dumbbell', 'cinematic dark teal light', 'deep blue'],
      ['a group of Egyptian friends jogging along the Nile corniche at sunrise', 'friends jogging', 'golden sunrise light', 'warm orange'],
      ['a stopwatch and a small test tube on a clean white surface, minimal studio style', 'stopwatch and tube', 'clean studio light', 'sky blue'],
    ],
  },
  premarital: {
    keywords: ['زواج', 'خطوبة', 'المقبلين', 'المقبلات'],
    service: 'اسأل عن باقة تحاليل ما قبل الزواج',
    bullets: ['فصيلة الدم و Rh', 'الأمراض المعدية', 'الثلاسيميا والأنيميا', 'صورة دم كاملة'],
    captions: [
      (h, s) => `${h} 💍 فحص ما قبل الزواج خطوة بسيطة تطمّن الاتنين، اسألوا واحجزوا. ${s}.`,
      (h, s) => `قبل الفرح، اطمّنوا سوا بتحليل واحد وخصوصية كاملة. ${s}.`,
      (h, s) => `${h}. احجزوا فحصكم النهارده وابدأوا مطمّنين. ${s}.`,
      (h, s) => `أحلى بداية تبدأ بمعلومة، افحصوا واسألوا. ${s}.`,
    ],
    headlines: ['بداية مطمئنة', 'قبل الزفاف', 'خطوة للاتنين', 'بيتكم يبدأ صح', 'اطمّنوا سوا', 'فحص الخطوبة', 'ابدأوا بدري'],
    concepts: [
      ['an Egyptian couple holding hands in front of a soft flower arch, warm romantic natural light', 'couple and flower arch', 'warm golden afternoon light', 'warm coral'],
      ['two wedding rings and a small stethoscope heart shape on a soft cream silk fabric', 'rings and stethoscope', 'soft pastel light', 'pastel pink'],
      ['an Egyptian bride and groom smiling at a sunny cafe table with a small calendar', 'couple at the cafe', 'warm golden light', 'warm orange'],
      ['a pair of hands holding a glowing heart-shaped lantern at dusk', 'hands and heart lantern', 'cinematic dusk light', 'amber'],
      ['a bouquet of white flowers next to a clean lab tube on a pastel table, flat lay', 'bouquet and lab tube', 'bright airy light', 'mint green'],
      ['an Egyptian family blessing a young couple at a bright living room doorway', 'family blessing the couple', 'warm cozy home light', 'warm orange'],
    ],
  },
  general: {
    keywords: [],
    service: 'اسأل عن باقة الاطمئنان الشاملة',
    bullets: ['صورة دم كاملة', 'وظائف الكبد والكلى', 'فحص السكر والدهون', 'تحاليل الغدة الدرقية'],
    captions: [
      (h, s) => `${h} 💚 خطوة بسيطة النهارده تطمّنك بكرة، اسأل واحجز. ${s}.`,
      (h, s) => `صحتك أمانة، والفحص بدري بيفرق. افحص واطمّن. ${s}.`,
      (h, s) => `ابدأ بخطوة صغيرة: افحص واطمّن. ${s}.`,
      (h, s) => `${h}، ومعمل تثق به جنبك في كل خطوة. اتصل 16183 واحجز. ${s}.`,
      (h, s) => `مش لازم تروح لأي مكان. معمل تثق به يجيلك لحد البيت، اسأل واحجز. ${s}.`,
    ],
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

// Short captions for stories (30-90 characters, always with a call to action).
const STORY_CAPTIONS = [
  (h, s) => `${h}. ${s}، واحجز دلوقتي.`,
  (h, s) => `${h} 👆 ${s}. افحص واطمّن.`,
  (h, s) => `${h}، واطمّن بفحص بسيط. ${s}.`,
]

// Order matters: the more specific topics are tested first ("تحمل الأكل" contains "حمل", "دهون الكبد" contains "دهون").
const DETECT_ORDER = ['liver', 'heart', 'thyroid', 'diabetes', 'allergy', 'vitamins', 'hormones', 'sports', 'premarital', 'pregnancy']

export function detectCategory(idea) {
  const text = String(idea || '')
  for (const name of DETECT_ORDER) {
    if (CATEGORIES[name].keywords.some((k) => text.includes(k))) return name
  }
  return 'general'
}

const empty = (s) => !String(s || '').trim()

export function fillPost(post, idea, index) {
  const catName = detectCategory(idea)
  const cat = CATEGORIES[catName]
  const pick = (arr) => arr[((index % arr.length) + arr.length) % arr.length]
  const headline = empty(post.headline) ? pick(cat.headlines) : post.headline
  const service = empty(post.panelService) ? cat.service : post.panelService
  const [concept, subject, mood, accent] = pick(cat.concepts)
  const tags = [...(hashtagBank[catName] || []).slice(0, 3), ...hashtagBank.general.slice(0, 3)]
  return {
    ...post,
    headline,
    caption: empty(post.caption) ? pick(post.type === 'story' ? STORY_CAPTIONS : cat.captions)(headline, service) : post.caption,
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
