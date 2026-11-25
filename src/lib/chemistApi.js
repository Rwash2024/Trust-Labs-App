// Thin wrappers over the chemist-tracking RPCs, the manage-chemist edge
// function and the staff live-trip queries. Every failure is thrown as an
// Error with an Arabic message the UI can show as-is.
import { supabase } from './supabase'

const GENERIC = 'حصلت مشكلة، جرّب تاني'
const NOT_ALLOWED = 'مش مسموح لك بالعملية دي'
const NOT_AVAILABLE = 'العملية مش متاحة دلوقتي'
const ARABIC = /[؀-ۿ]/

function requireClient() {
  if (!supabase) throw new Error('Supabase غير متصل')
  return supabase
}

// RPC messages are English except the rate-limit ones (already Arabic).
function toError(error) {
  const message = error?.message ?? ''
  const hasArabic = ARABIC.test(message)
  if (error?.code === '42501') return new Error(NOT_ALLOWED)
  if (error?.code === '55000') return new Error(hasArabic ? message : NOT_AVAILABLE)
  if (error?.code === 'P0001' && hasArabic) return new Error(message)
  return new Error(GENERIC)
}

async function rpc(name, params) {
  const { data, error } = await requireClient().rpc(name, params)
  if (error) throw toError(error)
  return data
}

// ---- Staff ----
export async function listAvailableChemists() {
  return (await rpc('list_available_chemists')) ?? []
}

export function assignChemist(bookingId, chemistId) {
  return rpc('assign_chemist', { p_booking: bookingId, p_chemist: chemistId })
}

export async function staffCreateHomeBooking(fields) {
  const data = await rpc('staff_create_home_booking', {
    p_name: fields.name,
    p_phone: fields.phone,
    p_address: fields.address,
    p_location_link: fields.locationLink ?? null,
    p_date: fields.date,
    p_tests: fields.tests,
    p_payment_method: fields.paymentMethod,
    p_notes: fields.notes ?? null,
  })
  return Array.isArray(data) ? data[0] : data
}

export async function cancelTrip(bookingId, final = false) {
  await rpc('cancel_trip', { p_booking: bookingId, p_final: final })
}

// ---- Chemist ----
export async function myVisits() {
  return (await rpc('chemist_my_visits')) ?? []
}

export async function startTrip(id) {
  await rpc('chemist_start_trip', { p_booking: id })
}

export async function sendPing(id, { lat, lng, accuracy }) {
  await rpc('chemist_ping', { p_booking: id, p_lat: lat, p_lng: lng, p_accuracy: accuracy ?? null })
}

export async function arrive(id) {
  await rpc('chemist_arrive', { p_booking: id })
}

// ---- Public ----
export function getTripByToken(token) {
  return rpc('get_trip_by_token', { p_token: token })
}

export function findTrip(phone, ref) {
  return rpc('find_trip', { p_phone: phone, p_booking_ref: ref })
}

// ---- Admin: chemist accounts (edge function) ----
export async function manageChemist(body) {
  const { data, error } = await requireClient().functions.invoke('manage-chemist', { body })
  if (error) {
    // On non-2xx the client wraps the Response in error.context.
    let message = ''
    try {
      message = (await error.context.json())?.error ?? ''
    } catch {
      // body was not JSON
    }
    throw new Error(message || GENERIC)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

// ---- Live trips (staff, direct selects under RLS) ----
const PING_WINDOW_MS = 24 * 60 * 60 * 1000

function cairoToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now)
}

export async function listLiveTrips() {
  const client = requireClient()
  const today = cairoToday()
  const { data: rows, error } = await client
    .from('bookings')
    .select(
      'id, name, phone, address, preferred_date, trip_status, trip_started_at, trip_arrived_at, track_token, chemists!bookings_assigned_chemist_id_fkey(name)',
    )
    .eq('mode', 'home')
    .not('assigned_chemist_id', 'is', null)
    .or(`preferred_date.eq.${today},trip_status.eq.on_way`)
  if (error) throw toError(error)
  if (!rows?.length) return []

  const since = new Date(Date.now() - PING_WINDOW_MS).toISOString()
  const { data: pings, error: pingError } = await client
    .from('chemist_pings')
    .select('booking_id, lat, lng, at')
    .in('booking_id', rows.map((r) => r.id))
    .gte('at', since)
    .order('at', { ascending: false })
  if (pingError) throw toError(pingError)

  const latest = new Map()
  for (const p of pings ?? []) if (!latest.has(p.booking_id)) latest.set(p.booking_id, p)

  return rows.map((r) => {
    const ping = latest.get(r.id)
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      preferred_date: r.preferred_date,
      trip_status: r.trip_status,
      trip_started_at: r.trip_started_at,
      trip_arrived_at: r.trip_arrived_at,
      track_token: r.track_token,
      chemist_name: r.chemists?.name ?? null,
      last_lat: ping?.lat ?? null,
      last_lng: ping?.lng ?? null,
      last_ping_at: ping?.at ?? null,
    }
  })
}

export function subscribeLiveTrips(onChange) {
  const client = requireClient()
  const channel = client
    .channel(`live-trips-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chemist_pings' }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, onChange)
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
