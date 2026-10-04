import { packageImages } from './packageImages'

// Package names come from the lab's public offers page; the test lists are drawn from each package's
// published description. Prices are not published by the lab (null) — filled in per client.
// Photos are shared across packages: new ids map onto the closest bundled image.
const imageFallback = {
  'liver-ibs': 'liver', hormones: 'fertility-women', immunity: 'thyroid', vitamins: 'bronze', kids: 'children',
  'premarital-m': 'fertility-men', 'premarital-f': 'fertility-women',
}

export const packages = [
  {
    id: 'golden-men',
    name: 'القلب',
    price: null,
    testCount: 6,
    tests: ['Cholesterol (Total)', 'Triglycerides', 'HDL', 'LDL', 'CK-MB', 'Troponin'],
  },
  {
    id: 'liver',
    name: 'الكبد والجهاز الهضمي',
    price: null,
    testCount: 6,
    tests: ['ALT', 'AST', 'Bilirubin (Total)', 'Albumin', 'HBs Ag', 'HCV Ab'],
  },
  {
    id: 'kidney',
    name: 'تحاليل الكلى',
    price: null,
    testCount: 4,
    tests: ['Creatinine', 'Urea', 'Uric Acid', 'GFR'],
  },
  {
    id: 'bone-pain',
    name: 'تحاليل العظام',
    price: null,
    testCount: 4,
    tests: ['Vitamin D', 'Calcium (Total)', 'Phosphorus', 'PTH'],
  },
  {
    id: 'fertility-women',
    name: 'صحة المرأة',
    price: null,
    testCount: 7,
    tests: ['FSH', 'LH', 'Prolactin (PRL)', 'Estradiol (E2)', 'TSH', 'Vitamin D', 'Ferritin'],
  },
  {
    id: 'fertility-men',
    name: 'صحة الرجل',
    price: null,
    testCount: 6,
    tests: ['Testosterone (Total)', 'PSA (Total)', 'FSH', 'LH', 'Vitamin B12', 'HbA1c'],
  },
  {
    id: 'silver',
    name: 'تحاليل زيادة الوزن',
    price: null,
    testCount: 5,
    tests: ['TSH', 'Free T4', 'Cortisol', 'Insulin', 'HOMA-IR'],
  },
  {
    id: 'bronze',
    name: 'تحاليل الكيتو دايت',
    price: null,
    testCount: 9,
    tests: ['ALT', 'AST', 'Creatinine', 'Urea', 'Cholesterol (Total)', 'Triglycerides', 'Sodium (Na)', 'Potassium (K)', 'Ketones'],
  },
  {
    id: 'thyroid',
    name: 'تحاليل الغدة الدرقية',
    price: null,
    testCount: 5,
    tests: ['TSH', 'Free T3', 'Free T4', 'Anti-TPO', 'Anti-Thyroglobulin'],
  },
  {
    id: 'ramadan',
    name: 'تحاليل تساقط الشعر',
    price: null,
    testCount: 6,
    tests: ['Vitamin D', 'Vitamin B12', 'Iron', 'Ferritin', 'Zinc', 'TSH'],
  },
  {
    id: 'golden-women',
    name: 'باقة تحاليل مرض السكري',
    price: null,
    testCount: 8,
    tests: ['Blood Glucose (Fasting)', 'Blood Glucose (2h PP)', 'HbA1c', 'Creatinine', 'Urea', 'Cholesterol (Total)', 'Triglycerides', 'Urine Analysis'],
  },
  {
    id: 'pregnancy',
    name: 'باقة تحاليل سيماجلوتيد-تيرزيباتيد (حقن التخسيس)',
    price: null,
    testCount: 8,
    tests: ['ALT', 'AST', 'Creatinine', 'Urea', 'Amylase', 'Lipase', 'TSH', 'Blood Glucose (Fasting)'],
  },
  {
    id: 'children',
    name: 'باقة تحاليل العناية بالأظافر',
    price: null,
    testCount: 7,
    tests: ['Iron', 'Ferritin', 'Zinc', 'Calcium (Total)', 'Vitamin D', 'Vitamin B12', 'Total Protein'],
  },
  {
    id: 'liver-ibs',
    name: 'باقة تحاليل القولون العصبي',
    price: null,
    testCount: 5,
    tests: ['CBC', 'Stool Analysis', 'Food Allergy Panel', 'H. Pylori', 'CRP'],
  },
  {
    id: 'hormones',
    name: 'باقة الكشف عن الهرمونات',
    price: null,
    testCount: 7,
    tests: ['TSH', 'FSH', 'LH', 'Prolactin (PRL)', 'Testosterone (Total)', 'Estradiol (E2)', 'Cortisol'],
  },
  {
    id: 'immunity',
    name: 'باقة تحاليل المناعة',
    price: null,
    testCount: 6,
    tests: ['CBC', 'Lymphocytes', 'Vitamin D', 'Zinc', 'CRP', 'Immunoglobulins'],
  },
  {
    id: 'vitamins',
    name: 'باقة تحاليل الفيتامينات والمعادن',
    price: null,
    testCount: 7,
    tests: ['Vitamin D', 'Vitamin B12', 'Folic Acid', 'Iron', 'Calcium (Total)', 'Magnesium', 'Zinc'],
  },
  {
    id: 'kids',
    name: 'باقة صحة أولادك',
    price: null,
    testCount: 6,
    tests: ['CBC', 'Vitamin D', 'Iron', 'Ferritin', 'Zinc', 'Thyroid (TSH)'],
  },
  {
    id: 'premarital-m',
    name: 'المقبلين على الزواج',
    price: null,
    testCount: 6,
    tests: ['CBC', 'Blood Group & Rh', 'HBs Ag', 'HCV Ab', 'HIV', 'Semen Analysis'],
  },
  {
    id: 'premarital-f',
    name: 'المقبلات على الزواج',
    price: null,
    testCount: 7,
    tests: ['CBC', 'Blood Group & Rh', 'HBs Ag', 'HCV Ab', 'HIV', 'Rubella IgG', 'TSH'],
  },
].map((pkg) => ({ ...pkg, image: packageImages[pkg.id] || packageImages[imageFallback[pkg.id]] || packageImages.silver }))

export const prepInstructions = {
  'سكر بعد الأكل': 'يُشترط احتساب الساعتين من بداية الأكل، وبعد أخذ العلاج إذا وجد ولا يُسمح بالأكل أو التدخين أثناء الساعتين، كما يُرجى الانتهاء من الأكل خلال 10 دقائق والحضور للمعمل قبل الميعاد بربع ساعة على الأقل',
  'سرعة الترسيب': 'يُفضّل الصيام من 6-8 ساعات',
  'ESR': 'يُفضّل الصيام من 6-8 ساعات',
  'سكر صائم': 'يُشترط الصيام 8 ساعات (تُقبل الحالات من 6-8 ساعات)',
  'Blood Glucose (Fasting)': 'يُشترط الصيام 8 ساعات (تُقبل الحالات من 6-8 ساعات)',
  'HbA1c': 'يُفضّل الصيام 8 ساعات',
  'Urine Analysis': 'يُفضّل أول بول في الصباح',
  'PSA (Total)': 'يمتنع المريض 10 أيام قبل إجراء التحليل عن إدخال منظار أو قسطرة، ولا يجري اختبار Complex PSA - PSA Free مع Total PSA',
  'Semen Analysis': 'يُشترط الامتناع عن الجماع أو الاحتلام لمده لا تقل عن 3 أيام ولا تزيد عن 7 أيام، تُعطى العينة داخل المعمل ولا يُسمح بقبول عينات خارج المعمل مر عليها أكثر من 20 دقيقة',
}
