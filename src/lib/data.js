import { supabase } from './supabase'
import { packages as staticPackages, prepInstructions as staticPrepInstructions } from '../data/packages'
import { packageImages } from '../data/packageImages'
import { allTests as staticAllTests } from '../data/tests'
import { popularTests as staticPopularTests } from '../data/popularTests'
import { featuredTests as staticFeaturedTests } from '../data/featuredTests'
import { branches as staticBranchGroups, mapsUrl, whatsappUrl } from '../data/branches'
import { defaultAboutContent } from '../data/aboutContent'

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
    image: row.image_url || packageImages[row.image_key] || packageImages[row.id],
  }))
}

export async function fetchSampleStatusByPhone(phone) {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_sample_status_by_phone', { p_phone: phone })
  if (error || !data) return []
  return data
}

export const LAUNCH_OFFER_TOTAL_SEATS = 100

// null = feature unavailable (Supabase not configured, or the migration hasn't
// been run yet) — callers should hide the offer entirely in that case, not show "0".
export async function fetchLaunchOfferRemaining() {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_launch_offer_remaining')
  if (error || data === null || data === undefined) return null
  return data
}

// Attempts to claim one launch-offer seat for this phone number. Resolves to
// true only if the fee should actually be waived for this booking (a seat was
// available and this phone hadn't already redeemed one).
export async function redeemLaunchOfferSeat(phone, bookingRef) {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('redeem_launch_offer', { p_phone: phone, p_booking_ref: bookingRef })
  if (error) return false
  return data === true
}

export async function fetchFeaturedTests() {
  if (!supabase) return staticFeaturedTests
  const { data, error } = await supabase.from('featured_tests').select('*').order('sort_order')
  if (error || !data || data.length === 0) return staticFeaturedTests
  return data.map((row) => ({
    code: `featured-${row.id}`,
    name: row.name,
    price: row.price,
    highlight: row.highlight,
    image: row.image_url,
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
  const { data, error } = await supabase
    .from('tests')
    .select('code, name, price')
    .eq('popular', true)
    .order('price')
    .limit(20)
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
      mapsUrl: b.maps_url || mapsUrl(`${b.name} ${b.address}`),
      whatsappUrl: whatsappUrl(b.phone, b.name),
    })
  }
  return Array.from(groups.entries()).map(([governorate, list]) => ({ governorate, list }))
}

export async function fetchNews() {
  if (!supabase) return []
  const { data, error } = await supabase.from('news').select('*').order('sort_order')
  if (error || !data) return []
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image_url,
    date: row.news_date,
  }))
}

export async function fetchPartners(staticFallback) {
  if (!supabase) return staticFallback
  const { data, error } = await supabase.from('partners').select('*').order('sort_order')
  if (error || !data || data.length === 0) return staticFallback
  return data.map((row) => ({ name: row.name, src: row.image_url }))
}

export async function submitComplaint({ name, phone, type, branchName, rating, message }) {
  if (!supabase) throw new Error('الخدمة غير متاحة حاليًا')
  const { error } = await supabase.from('complaints').insert({
    name: name.trim(),
    phone: phone.trim(),
    type,
    branch_name: branchName?.trim() || null,
    rating: rating || null,
    message: message.trim(),
  })
  if (error) throw error
}

export async function fetchAboutContent() {
  if (!supabase) return defaultAboutContent
  const { data, error } = await supabase.from('about_content').select('*').eq('id', 1).maybeSingle()
  if (error || !data) return defaultAboutContent
  return {
    tagline: data.tagline || defaultAboutContent.tagline,
    founded_year: data.founded_year ?? defaultAboutContent.founded_year,
    branches_count: data.branches_count ?? defaultAboutContent.branches_count,
    cases_count: data.cases_count || defaultAboutContent.cases_count,
    story_p1: data.story_p1 || defaultAboutContent.story_p1,
    story_p2: data.story_p2 || defaultAboutContent.story_p2,
    pillars: data.pillars?.length ? data.pillars : defaultAboutContent.pillars,
    team: data.team?.length ? data.team : defaultAboutContent.team,
    accreditations: data.accreditations?.length ? data.accreditations : defaultAboutContent.accreditations,
  }
}
