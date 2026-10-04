import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير متصل')
  return supabase
}

const IMAGES_BUCKET = 'trust-labs-images'

// ---- Image uploads (packages photos + featured test photos) ----
export async function adminUploadImage(file, folder) {
  const client = requireClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await client.storage.from(IMAGES_BUCKET).upload(path, file, { cacheControl: '3600' })
  if (error) throw error
  const { data } = client.storage.from(IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ---- Featured tests (home page carousel) ----
export async function adminListFeaturedTests() {
  const { data, error } = await requireClient().from('featured_tests').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function adminSaveFeaturedTest(item) {
  const payload = {
    name: item.name,
    price: item.price,
    highlight: item.highlight,
    image_url: item.image_url || null,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (item.id) {
    const { error } = await requireClient().from('featured_tests').update(payload).eq('id', item.id)
    if (error) throw error
  } else {
    const { error } = await requireClient().from('featured_tests').insert(payload)
    if (error) throw error
  }
}

export async function adminDeleteFeaturedTest(id) {
  const { error } = await requireClient().from('featured_tests').delete().eq('id', id)
  if (error) throw error
}

// ---- Packages ----
export async function adminListPackages() {
  const { data, error } = await requireClient().from('packages').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function adminSavePackage(pkg) {
  const { error } = await requireClient().from('packages').upsert({
    id: pkg.id,
    name: pkg.name,
    name_en: pkg.name_en || null,
    price: pkg.price,
    price_foreign: pkg.price_foreign === '' || pkg.price_foreign == null ? null : Number(pkg.price_foreign),
    test_count: pkg.tests.length,
    tests: pkg.tests,
    image_key: pkg.image_key || pkg.id,
    image_url: pkg.image_url || null,
    sort_order: pkg.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function adminDeletePackage(id) {
  const { error } = await requireClient().from('packages').delete().eq('id', id)
  if (error) throw error
}

// ---- Tests ----
export async function adminListTests({ search = '', limit = 50, offset = 0 } = {}) {
  let query = requireClient().from('tests').select('*', { count: 'exact' }).order('name').range(offset, offset + limit - 1)
  if (search.trim()) query = query.ilike('name', `%${search.trim()}%`)
  const { data, error, count } = await query
  if (error) throw error
  return { rows: data, count }
}

export async function adminSaveTest(test) {
  const { error } = await requireClient().from('tests').upsert({
    code: test.code,
    name: test.name,
    price: test.price,
    price_foreign: test.price_foreign === '' || test.price_foreign == null ? null : Number(test.price_foreign),
    popular: !!test.popular,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function adminDeleteTest(code) {
  const { error } = await requireClient().from('tests').delete().eq('code', code)
  if (error) throw error
}

// ---- Branches ----
export async function adminListBranches() {
  const { data, error } = await requireClient().from('branches').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function adminSaveBranch(branch) {
  const payload = {
    governorate: branch.governorate,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    hours: branch.hours,
    maps_url: branch.maps_url || null,
    sort_order: branch.sort_order ?? 0,
  }
  if (branch.id) {
    const { error } = await requireClient().from('branches').update(payload).eq('id', branch.id)
    if (error) throw error
  } else {
    const { error } = await requireClient().from('branches').insert(payload)
    if (error) throw error
  }
}

export async function adminDeleteBranch(id) {
  const { error } = await requireClient().from('branches').delete().eq('id', id)
  if (error) throw error
}

// ---- Prep instructions ----
export async function adminListPrepInstructions() {
  const { data, error } = await requireClient().from('prep_instructions').select('*').order('test_name')
  if (error) throw error
  return data
}

export async function adminSavePrepInstruction(item) {
  const { error } = await requireClient().from('prep_instructions').upsert({
    test_name: item.test_name,
    instruction: item.instruction,
  })
  if (error) throw error
}

export async function adminDeletePrepInstruction(testName) {
  const { error } = await requireClient().from('prep_instructions').delete().eq('test_name', testName)
  if (error) throw error
}

// ---- Sample tracking ----
export async function adminListSamples() {
  const { data, error } = await requireClient()
    .from('sample_tracking')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminCreateSample({ booking_ref, patient_name, phone, branch_name }) {
  const { error } = await requireClient().from('sample_tracking').insert({
    booking_ref: booking_ref?.trim() || null,
    patient_name: patient_name.trim(),
    phone: phone.trim(),
    branch_name: branch_name?.trim() || null,
  })
  if (error) throw error
}

export async function adminUpdateSampleStatus(id, status) {
  const { error } = await requireClient()
    .from('sample_tracking')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function adminUpdateSample(id, { booking_ref, patient_name, phone, branch_name }) {
  const { error } = await requireClient()
    .from('sample_tracking')
    .update({
      booking_ref: booking_ref?.trim() || null,
      patient_name: patient_name.trim(),
      phone: phone.trim(),
      branch_name: branch_name?.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteSample(id) {
  const { error } = await requireClient().from('sample_tracking').delete().eq('id', id)
  if (error) throw error
}

// ---- News (أخبار المعمل) ----
export async function adminListNews() {
  const { data, error } = await requireClient().from('news').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function adminSaveNews(item) {
  const payload = {
    title: item.title,
    description: item.description || null,
    image_url: item.image_url || null,
    news_date: item.news_date || null,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (item.id) {
    const { error } = await requireClient().from('news').update(payload).eq('id', item.id)
    if (error) throw error
  } else {
    const { error } = await requireClient().from('news').insert(payload)
    if (error) throw error
  }
}

export async function adminDeleteNews(id) {
  const { error } = await requireClient().from('news').delete().eq('id', id)
  if (error) throw error
}

// ---- Partners (شركاء النجاح) ----
export async function adminListPartners() {
  const { data, error } = await requireClient().from('partners').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function adminSavePartner(item) {
  const payload = {
    name: item.name,
    image_url: item.image_url || null,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (item.id) {
    const { error } = await requireClient().from('partners').update(payload).eq('id', item.id)
    if (error) throw error
  } else {
    const { error } = await requireClient().from('partners').insert(payload)
    if (error) throw error
  }
}

export async function adminDeletePartner(id) {
  const { error } = await requireClient().from('partners').delete().eq('id', id)
  if (error) throw error
}

// ---- Complaints & feedback ----
export async function adminListComplaints() {
  const { data, error } = await requireClient()
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminUpdateComplaintStatus(id, status) {
  const { error } = await requireClient()
    .from('complaints')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteComplaint(id) {
  const { error } = await requireClient().from('complaints').delete().eq('id', id)
  if (error) throw error
}

// ---- Visit ratings ("قيّم زيارتك" survey) ----
export async function adminListVisitRatings() {
  const { data, error } = await requireClient()
    .from('visit_ratings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ---- Bookings (created via the chat assistant) ----
export async function adminListBookings() {
  const { data, error } = await requireClient()
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminUpdateBookingStatus(id, status) {
  const { error } = await requireClient()
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---- About page content ----
export async function adminGetAboutContent() {
  const { data, error } = await requireClient().from('about_content').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function adminSaveAboutContent(content) {
  const { error } = await requireClient()
    .from('about_content')
    .upsert({
      id: 1,
      tagline: content.tagline,
      founded_year: content.founded_year,
      branches_count: content.branches_count,
      cases_count: content.cases_count,
      story_p1: content.story_p1,
      story_p2: content.story_p2,
      pillars: content.pillars,
      team: content.team,
      accreditations: content.accreditations,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

// ---- كارت الثقة — staff filling in a patient's (or a family member's)
// medical file after a test/scan is done. Staff reads/writes patient_cards
// and family_members directly (RLS already grants "authenticated" full
// access to both) — no need for the phone-gated RPCs the patient app uses.
const REPORTS_BUCKET = 'patient-reports'

export async function adminFindPatientCard(query) {
  const q = query.trim()
  if (!q) return null
  const { data, error } = await requireClient()
    .from('patient_cards')
    .select('*')
    .or(`card_code.eq.${q},phone.eq.${q}`)
    .maybeSingle()
  if (error) throw error
  return data
}

// Every activated card, newest first, plus how many cards exist in total.
export async function adminListActivatedCards() {
  const client = requireClient()
  const [list, total] = await Promise.all([
    client
      .from('patient_cards')
      .select('card_code, card_type, name, phone, gender, dob, blood_group, activated_at, expires_at')
      .not('activated_at', 'is', null)
      .order('activated_at', { ascending: false }),
    client.from('patient_cards').select('card_code', { count: 'exact', head: true }),
  ])
  if (list.error) throw list.error
  if (total.error) throw total.error
  return { cards: list.data, total: total.count }
}

export async function adminListFamilyMembers(cardCode) {
  const { data, error } = await requireClient()
    .from('family_members')
    .select('*')
    .eq('card_code', cardCode)
    .order('created_at')
  if (error) throw error
  return data
}

export async function adminUpdatePatientMedicalFile(cardCode, { diagnoses, current_medications, investigation, imaging }) {
  const { error } = await requireClient()
    .from('patient_cards')
    .update({
      diagnoses: diagnoses?.trim() || null,
      current_medications: current_medications?.trim() || null,
      investigation: investigation?.trim() || null,
      imaging: imaging?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('card_code', cardCode)
  if (error) throw error
}

export async function adminUpdateFamilyMemberMedicalFile(id, { diagnoses, current_medications, investigation, imaging }) {
  const { error } = await requireClient()
    .from('family_members')
    .update({
      diagnoses: diagnoses?.trim() || null,
      current_medications: current_medications?.trim() || null,
      investigation: investigation?.trim() || null,
      imaging: imaging?.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

// kind: 'investigation' | 'imaging'. target: { cardCode } for the holder, or
// { cardCode, memberId } for a family member.
export async function adminUploadPatientReport(file, kind, target) {
  const client = requireClient()
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `${target.cardCode}/${target.memberId || 'self'}-${kind}-${Date.now()}.${ext}`
  const { error: uploadError } = await client.storage.from(REPORTS_BUCKET).upload(path, file)
  if (uploadError) throw uploadError

  const column = kind === 'investigation' ? 'investigation_file_path' : 'imaging_file_path'
  const table = target.memberId ? 'family_members' : 'patient_cards'
  const match = target.memberId ? { id: target.memberId } : { card_code: target.cardCode }
  const { error: updateError } = await client.from(table).update({ [column]: path }).match(match)
  if (updateError) throw updateError

  return path
}

// كارت الثقة pricing — one settings row (id = 1), see trust_card_pricing_migration.sql.
// This is the single source of truth for both prices; the customer-facing
// request form reads it through the public get_trust_card_prices RPC, not
// this table directly, so commission stays staff-only.
export async function adminGetTrustCardPricing() {
  const { data, error } = await requireClient().from('trust_card_pricing').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function adminSaveTrustCardPricing({ personal_price, personal_commission, family_price, family_commission }) {
  const { error } = await requireClient()
    .from('trust_card_pricing')
    .update({
      personal_price,
      personal_commission,
      family_price,
      family_commission,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) throw error
}

// ---- Trust Card orders ----
export async function adminListTrustCardRequests() {
  const { data, error } = await requireClient()
    .from('trust_card_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminUpdateTrustCardRequestStatus(id, status) {
  const { error } = await requireClient()
    .from('trust_card_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteTrustCardRequest(id) {
  const { error } = await requireClient().from('trust_card_requests').delete().eq('id', id)
  if (error) throw error
}

// ---- Management report (Excel) ----
// Everything created between two local dates (inclusive), for the reports tab.
export async function adminFetchReportData(fromDate, toDate) {
  const client = requireClient()
  const from = new Date(`${fromDate}T00:00:00`).toISOString()
  const to = new Date(`${toDate}T23:59:59.999`).toISOString()
  const inRange = (table, columns = '*') =>
    client.from(table).select(columns).gte('created_at', from).lte('created_at', to).order('created_at')

  const [cards, samples, bookings, complaints, ratings, scans] = await Promise.all([
    inRange('trust_card_requests'),
    inRange('sample_tracking'),
    inRange('bookings'),
    inRange('complaints'),
    inRange('visit_ratings'),
    inRange('qr_scans'),
  ])
  for (const r of [cards, samples, bookings, complaints, ratings]) if (r.error) throw r.error

  return {
    cards: cards.data,
    samples: samples.data,
    bookings: bookings.data,
    complaints: complaints.data,
    ratings: ratings.data,
    // Optional: an empty list (not an error) until qr_scans_migration.sql has run.
    scans: scans.error ? [] : scans.data,
  }
}
