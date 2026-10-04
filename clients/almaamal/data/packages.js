import { packageImages } from './packageImages'

// The lab does not publish packages or prices; these are suggested standard panels for the demo.
// Photos are shared across packages: new ids map onto the closest bundled image.
const imageFallback = {
  'liver-ibs': 'liver', hormones: 'fertility-women', immunity: 'thyroid', vitamins: 'bronze', kids: 'children',
  'premarital-m': 'fertility-men', 'premarital-f': 'fertility-women',
}

export const packages = [
  {
    id: 'liver',
    name: 'وظائف الكبد',
    price: null,
    testCount: 6,
    tests: ['ALT', 'AST', 'Bilirubin (Total)', 'Albumin', 'ALP', 'GGT'],
  },
  {
    id: 'kidney',
    name: 'وظائف الكلى',
    price: null,
    testCount: 6,
    tests: ['Creatinine', 'Urea', 'Uric Acid', 'Sodium (Na)', 'Potassium (K)', 'Urine Analysis'],
  },
  {
    id: 'thyroid',
    name: 'الغدة الدرقية',
    price: null,
    testCount: 3,
    tests: ['TSH', 'Free T3', 'Free T4'],
  },
  {
    id: 'golden-women',
    name: 'متابعة السكر',
    price: null,
    testCount: 6,
    tests: ['Blood Glucose (Fasting)', 'HbA1c', 'Creatinine', 'Cholesterol (Total)', 'Triglycerides', 'Urine Analysis'],
  },
  {
    id: 'bronze',
    name: 'الفيتامينات والمعادن',
    price: null,
    testCount: 6,
    tests: ['Vitamin D', 'Vitamin B12', 'Folic Acid', 'Iron', 'Ferritin', 'Calcium (Total)'],
  },
  {
    id: 'silver',
    name: 'فحص شامل',
    price: null,
    testCount: 10,
    tests: ['CBC', 'ESR', 'ALT', 'AST', 'Creatinine', 'Urea', 'Blood Glucose (Fasting)', 'Lipid Profile', 'TSH', 'Urine Analysis'],
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
