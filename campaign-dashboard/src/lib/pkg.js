// Optional package details typed in with the campaign idea: a name, and a price if he wants it in the copy.

export const MAX_PACKAGE_NAME = 40
const MAX_PRICE = 1000000

export function validatePackage({ name = '', price = '' } = {}) {
  const cleanName = String(name ?? '').trim()
  const rawPrice = price === null || price === undefined ? '' : String(price).trim()

  if (!cleanName && !rawPrice) return { ok: true, pkg: null }
  if (!cleanName) return { ok: false, message: 'اكتب اسم الباقة الأول لو عايز تحط سعر.' }
  if (cleanName.length > MAX_PACKAGE_NAME) return { ok: false, message: `اسم الباقة أطول من ${MAX_PACKAGE_NAME} حرف، قصّره.` }
  if (!rawPrice) return { ok: true, pkg: { name: cleanName, price: null } }

  const n = Number(rawPrice)
  if (!Number.isInteger(n) || n <= 0 || n > MAX_PRICE) {
    return { ok: false, message: 'السعر لازم يكون رقم صحيح أكبر من صفر.' }
  }
  return { ok: true, pkg: { name: cleanName, price: n } }
}
