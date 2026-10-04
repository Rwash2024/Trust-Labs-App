import { mapsUrl, whatsappUrl } from '../../../src/lib/links'

// Replace with the client's real branches, grouped by governorate.
const groups = [
  {
    governorate: 'القاهرة',
    list: [
      { name: 'الفرع الرئيسي', address: 'العنوان', phone: '01000000000', hours: 'يوميًا: 8ص - 10م' },
    ],
  },
]

export const branches = groups.map((group) => ({
  ...group,
  list: group.list.map((b) => ({
    ...b,
    mapsUrl: mapsUrl(`${b.name} ${b.address}`),
    whatsappUrl: whatsappUrl(b.phone, b.name),
  })),
}))
