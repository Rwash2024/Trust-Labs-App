import { supabase } from './supabase'
import { packages as staticPackages, prepInstructions as staticPrepInstructions } from '../data/packages'
import { packageImages } from '../data/packageImages'
import { allTests as staticAllTests } from '../data/tests'
import { popularTests as staticPopularTests } from '../data/popularTests'
import { branches as staticBranchGroups, mapsUrl, whatsappUrl } from '../data/branches'

export async function fetchPackages() {
  if (!supabase) return staticPackages
  const { data, error } = await supabase.from('packages').select('*').order('sort_order')
  if (error || !data || data.length === 0) return staticPackages
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    testCount: row.test_count,
    tests: row.tests,
    image: packageImages[row.image_key] ?? packageImages[row.id],
  }))
}

export async function fetchPrepInstructions() {
  if (!supabase) return staticPrepInstructions
  const { data, error } = await supabase.from('prep_instructions').select('*')
  if (error || !data || data.length === 0) return staticPrepInstructions
  return Object.fromEntries(data.map((row) => [row.test_name, row.instruction]))
}

export async function fetchAllTests() {
  if (!supabase) return staticAllTests
  const { data, error } = await supabase.from('tests').select('code, name, price').order('name')
  if (error || !data || data.length === 0) return staticAllTests
  return data
}

export async function fetchPopularTests() {
  if (!supabase) return staticPopularTests
  const { data, error } = await supabase.from('tests').select('code, name, price').eq('popular', true).order('name')
  if (error || !data || data.length === 0) return staticPopularTests
  return data
}

export async function fetchBranchGroups() {
  if (!supabase) return staticBranchGroups
  const { data, error } = await supabase.from('branches').select('*').order('sort_order')
  if (error || !data || data.length === 0) return staticBranchGroups

  const groups = new Map()
  for (const b of data) {
    if (!groups.has(b.governorate)) groups.set(b.governorate, [])
    groups.get(b.governorate).push({
      name: b.name,
      address: b.address,
      phone: b.phone,
      hours: b.hours,
      mapsUrl: mapsUrl(`${b.name} ${b.address}`),
      whatsappUrl: whatsappUrl(b.phone, b.name),
    })
  }
  return Array.from(groups.entries()).map(([governorate, list]) => ({ governorate, list }))
}
