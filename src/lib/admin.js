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
    price: pkg.price,
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
