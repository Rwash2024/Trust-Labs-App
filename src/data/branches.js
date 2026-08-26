export function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function whatsappUrl(phone, branchName) {
  const international = `2${phone}`
  const message = encodeURIComponent(`السلام عليكم، عايز أستفسر عن ${branchName}.`)
  return `https://wa.me/${international}?text=${message}`
}

export const branches = [
  {
    governorate: 'القاهرة',
    list: [
      { name: 'فرع مصر الجديدة', address: '60 شارع الخليفة المأمون - مصر الجديدة', phone: '01101866533', hours: '8ص - 11م' },
      { name: 'فرع التجمع الخامس', address: 'CMC Mall - التسعين الشمالي - خلف مستشفى الجوي - التجمع الخامس', phone: '01101866255', hours: '8ص - 11م' },
      { name: 'فرع مدينة نصر', address: '7 عمارات مشروع إسكان شباب المهندسين - مدينة نصر', phone: '01101877944', hours: '8ص - 11م' },
      { name: 'فرع حلوان', address: '26 ش شريف متفرع من ش حيدر - مول دهب الدور الأول - حلوان', phone: '01101866477', hours: '8ص - 11م' },
      { name: 'فرع شبرا', address: '90 ش شبرا الدور الأول - دوران شبرا - القاهرة', phone: '01101877811', hours: '8ص - 11م' },
    ],
  },
  {
    governorate: 'الجيزة',
    list: [
      { name: 'فرع المهندسين', address: '10 شارع البطل احمد عبد العزيز - الدور الرابع - المهندسين', phone: '01101877855', hours: '10ص - 10م' },
      { name: 'فرع الدقي', address: '97 شارع التحرير - أعلى مطعم جاد - الدور الخامس - الدقي', phone: '01101866211', hours: '8ص - 11م' },
      { name: 'فرع الجيزة', address: '5 شارع مراد - الدور التاني - ميدان الجيزة', phone: '01101866511', hours: '8ص - 11م' },
      { name: 'فرع المنيل', address: '9 شارع السرايا - المنيل - فوق كنتاكي', phone: '01101866233', hours: '8ص - 11م' },
      { name: 'فرع فيصل', address: 'برج الأطباء الدور الثالث - أول فيصل', phone: '01101877833', hours: '8ص - 11م' },
      { name: 'فرع أكتوبر', address: 'أبراج برعي بلازا – البرج الثاني – الدور الثاني – ميدان الحصري - 6 أكتوبر', phone: '01101866377', hours: '8ص - 11م' },
      { name: 'فرع الشيخ زايد 1', address: 'الحي الثالث مركز عنايه الطبي الدور الثاني أمام مستشفى زايد التخصصي - الشيخ زايد', phone: '01101866355', hours: '8ص - 11م' },
      { name: 'فرع الشيخ زايد 2', address: '43 - الحي السادس عشر المجاورة الأولى - مول بدر الدين - الدور الثاني - الشيخ زايد', phone: '01101866499', hours: '8ص - 11م' },
    ],
  },
  {
    governorate: 'الفيوم',
    list: [
      { name: 'فرع الفيوم', address: 'برج أبو خلف مسعود الدور الثالث أعلى روزانا - ميدان المسلة - الفيوم', phone: '01101866399', hours: '8ص - 11م' },
    ],
  },
  {
    governorate: 'بني سويف',
    list: [
      { name: 'فرع الندى', address: 'ش بورسعيد برج الندى الدور الثاني علوي - بني سويف', phone: '01101866411', hours: '8ص - 11م' },
      { name: 'فرع الواسطى', address: 'شارع أحمد عرابي – خلف باتا – بجوار مكتب الشؤون الاجتماعية – الدور الأول - الواسطى', phone: '01101866155', hours: '8ص - 11م' },
    ],
  },
  {
    governorate: 'الغردقة',
    list: [
      { name: 'فرع الغردقة', address: 'مول سفن ستارز - أعلى سبينيس - شارع النصر - الغردقة', phone: '01101866557', hours: '8ص - 11م' },
    ],
  },
  {
    governorate: 'شرم الشيخ',
    list: [
      { name: 'فرع شرم الشيخ 1 (نبق)', address: 'ريكسوس بريميوم سي جيت - خليج نبق - شرم الشيخ', phone: '01101866117', hours: '8ص - 11م' },
      { name: 'فرع شرم الشيخ 2 (حي النور)', address: 'حي النور - سنتر الشروق - الدور الأول - شرم الشيخ', phone: '01101866133', hours: '8ص - 11م' },
    ],
  },
].map((group) => ({
  ...group,
  list: group.list.map((b) => ({
    ...b,
    mapsUrl: mapsUrl(`${b.name} ${b.address}`),
    whatsappUrl: whatsappUrl(b.phone, b.name),
  })),
}))
