// Curated "trending" tests highlighted on the Packages page to drive add-on sales.
// `code` matches the `tests` table in Supabase when the test already exists there — the carousel
// looks up the live price/name by this code at render time, falling back to the values below.
// NIPT and the sport package don't exist in Supabase yet — placeholder prices below.
// Add them from Admin > التحاليل > "+ تحليل جديد" using these exact codes ('nipt', 'sport-package')
// once real pricing is confirmed; the card will pick up the live price automatically after that.
export const featuredTests = [
  {
    code: 'nipt',
    name: 'NIPT',
    price: 9999,
    highlight: 'فحص ما قبل الولادة الغير جراحي (NIPT) — نتيجة دقيقة وآمنة لصحة الجنين من عينة دم بسيطة',
  },
  {
    code: '13003',
    name: 'Homocysteine',
    price: 1505,
    highlight: 'مؤشر مهم لصحة القلب والأوعية الدموية ومستويات فيتامين B',
  },
  {
    code: '23422',
    name: 'HOMA-IR',
    price: 706,
    highlight: 'قياس مقاومة الأنسولين — خطوة أساسية لمتابعة السكر والتمثيل الغذائي',
  },
  {
    code: '1409850',
    name: 'Food Print 60',
    price: 7200,
    highlight: 'اكتشف حساسية جسمك من 60 نوع أكل مختلف وحسّن نظامك الغذائي',
  },
  {
    code: 'sport-package',
    name: 'باقة رياضية',
    price: 9999,
    highlight: 'باقة تحاليل متكاملة للرياضيين ومحبي اللياقة البدنية',
  },
]
