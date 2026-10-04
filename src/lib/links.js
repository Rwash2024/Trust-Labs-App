export function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function whatsappUrl(phone, branchName) {
  // Only mobile numbers can receive WhatsApp; hotlines (e.g. 15810) get no WhatsApp button.
  if (!/^01[0125]d{8}$/.test(phone)) return null
  const international = `2${phone}`
  const message = encodeURIComponent(`السلام عليكم، عايز أعرف عنوان ${branchName} فين بالظبط؟`)
  return `https://wa.me/${international}?text=${message}`
}
