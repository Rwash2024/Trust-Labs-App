// Trust Labs — Facebook Messenger AI agent (Edge Function)
// Receives Meta webhook events for the Trust Labs Page, answers customers with
// Claude grounded in real data (tests/prices, packages, branches, prep
// instructions) and hands over to a human when needed.
//
// Deploy:  supabase functions deploy messenger-webhook --no-verify-jwt
//   (--no-verify-jwt: Meta can't send a Supabase JWT; requests are authenticated
//    by the X-Hub-Signature-256 HMAC below instead.)
// Secrets: ANTHROPIC_API_KEY, META_VERIFY_TOKEN, META_APP_SECRET, META_PAGE_ACCESS_TOKEN
// Tables:  supabase/messenger_agent_migration.sql
// Webhook callback URL: https://<project>.supabase.co/functions/v1/messenger-webhook
//   Subscribe the Page to: messages, message_echoes (so a human reply pauses the bot)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN')
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
const META_PAGE_ACCESS_TOKEN = Deno.env.get('META_PAGE_ACCESS_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MODEL = Deno.env.get('MESSENGER_MODEL') ?? 'claude-sonnet-5-5'
const GRAPH_URL = 'https://graph.facebook.com/v21.0/me/messages'
const RESULTS_PORTAL_URL = 'http://webresults.trustlabseg.com/Login/Index/?Type=Individual'
const HOME_VISIT_FEE = 75
const HOTLINE = '16183'
const WHATSAPP = '+201277610492'

const HANDOFF_HOURS = 12 // after a human takes over, the bot stays silent this long
const HISTORY_MESSAGES = 12
const MAX_MESSAGE_CHARS = 1000
const PER_USER_PER_HOUR = 30
const MAX_MESSENGER_CHARS = 1900 // Messenger limit is 2000 per message

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}
type Supabase = ReturnType<typeof getSupabaseClient>

// --- Meta signature -------------------------------------------------------

async function validSignature(rawBody: string, header: string | null) {
  if (!META_APP_SECRET || !header?.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)))
  const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('')
  const given = header.slice('sha256='.length)
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}

// --- Messenger send API ---------------------------------------------------

async function graphSend(body: Record<string, unknown>) {
  const res = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` },
    body: JSON.stringify({ messaging_type: 'RESPONSE', ...body }),
  })
  if (!res.ok) console.error('Graph send failed', res.status, await res.text())
}

function typing(psid: string) {
  return graphSend({ recipient: { id: psid }, sender_action: 'typing_on' })
}

function splitForMessenger(text: string) {
  const parts: string[] = []
  let rest = text.trim()
  while (rest.length > MAX_MESSENGER_CHARS) {
    let cut = rest.lastIndexOf('\n', MAX_MESSENGER_CHARS)
    if (cut < MAX_MESSENGER_CHARS / 2) cut = rest.lastIndexOf(' ', MAX_MESSENGER_CHARS)
    if (cut < MAX_MESSENGER_CHARS / 2) cut = MAX_MESSENGER_CHARS
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

async function sendText(psid: string, text: string) {
  for (const part of splitForMessenger(text)) {
    await graphSend({ recipient: { id: psid }, message: { text: part } })
  }
}

// --- Tools ----------------------------------------------------------------

const TOOLS = [
  {
    name: 'search_tests',
    description:
      'يدوّر في كتالوج التحاليل الحقيقي ويرجّع الاسم والسعر. أسماء التحاليل في الكتالوج بالإنجليزي، فترجم اسم التحليل لمصطلحه الإنجليزي الشائع (مثلاً "صورة دم" = CBC، "سكر صائم" = Glucose Fasting، "فيتامين د" = Vitamin D) وابعت كلمة أو اتنين بس. لو ملقتش نتيجة جرّب كلمة تانية قبل ما تقول إن التحليل مش موجود.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'كلمة بحث بالإنجليزي، مثلاً "CBC" أو "TSH" أو "Vitamin D"' } },
      required: ['query'],
    },
  },
  {
    name: 'get_prep_instructions',
    description: 'يجيب تعليمات التحضير الحقيقية لتحليل معين (زي الصيام) من قاعدة البيانات.',
    input_schema: {
      type: 'object',
      properties: { test_name: { type: 'string', description: 'اسم التحليل بالعربي زي ما هو مسجّل، مثلاً "سكر صائم" أو "PSA"' } },
      required: ['test_name'],
    },
  },
  {
    name: 'track_sample',
    description: 'يجيب حالة عينة العميل الحقيقية من رقم موبايله.',
    input_schema: {
      type: 'object',
      properties: { phone: { type: 'string', description: 'رقم موبايل العميل، 11 رقم' } },
      required: ['phone'],
    },
  },
  {
    name: 'submit_complaint',
    description: 'يسجّل شكوى أو اقتراح أو استفسار حقيقي في نظام الجودة عشان فريق خدمة العملاء يتواصل مع العميل.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        type: { type: 'string', enum: ['شكوى', 'اقتراح', 'استفسار'] },
        branch_name: { type: 'string', description: 'اسم الفرع لو الشكوى خاصة بفرع معين، وإلا سيبها فاضية' },
        message: { type: 'string', description: 'تفاصيل المشكلة أو الاقتراح' },
      },
      required: ['name', 'phone', 'type', 'message'],
    },
  },
  {
    name: 'create_booking',
    description: 'يسجّل حجز حقيقي (زيارة منزلية أو حجز فرع) بعد ما تجمع كل بيانات العميل المطلوبة.',
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['home', 'branch'], description: 'home = زيارة منزلية، branch = حجز في الفرع' },
        name: { type: 'string', description: 'الاسم الرباعي' },
        phone: { type: 'string' },
        dob: { type: 'string', description: 'تاريخ الميلاد بصيغة YYYY-MM-DD' },
        address: { type: 'string', description: 'العنوان بالتفصيل — مطلوب لو mode=home' },
        branch_name: { type: 'string', description: 'اسم الفرع — مطلوب لو mode=branch' },
        preferred_date: { type: 'string', description: 'الميعاد المفضل زي ما كتبه العميل' },
        tests: { type: 'array', items: { type: 'string' }, description: 'أسماء التحاليل أو الباقة المطلوبة' },
        notes: { type: 'string' },
      },
      required: ['mode', 'name', 'phone', 'dob', 'tests'],
    },
  },
  {
    name: 'handoff_to_human',
    description:
      'يحوّل المحادثة لموظف خدمة العملاء ويوقّف الرد الآلي. استخدمه لو العميل طلب موظف، أو زعلان/عنده شكوى حساسة، أو بيسأل عن نتيجته أو حالته الطبية، أو في أي حاجة مش قادر تجاوب عليها من البيانات اللي عندك.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'سبب التحويل بجملة قصيرة' } },
      required: ['reason'],
    },
  },
]

const INVALID_PHONE_MESSAGE =
  'رقم الموبايل مش صحيح أو شكله مش حقيقي. اطلب من العميل رقم موبايل مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015) قبل ما تكمّل.'

function cleanEgyptPhone(value: unknown): string | null {
  let digits = String(value ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
  if (digits.startsWith('0020')) digits = digits.slice(4)
  else if (digits.startsWith('20') && digits.length > 11) digits = digits.slice(2)
  if (digits.startsWith('1') && digits.length === 10) digits = `0${digits}`
  if (!/^01[0125]\d{8}$/.test(digits)) return null
  const sub = digits.slice(3)
  const fake =
    /^(\d)\1+$/.test(sub) ||
    /(\d)\1{6,}/.test(sub) ||
    /^(\d\d)\1{3,}$/.test(sub) ||
    sub === sub.slice(0, 3).repeat(3).slice(0, 8) ||
    '01234567890123456789'.includes(sub) ||
    '98765432109876543210'.includes(sub)
  return fake ? null : digits
}

function generateBookingRef() {
  return `BK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

// Strip characters that have meaning in PostgREST filters / LIKE patterns.
function safeSearchTerm(raw: unknown) {
  return String(raw ?? '').replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

async function runTool(supabase: Supabase, psid: string, name: string, input: any) {
  switch (name) {
    case 'search_tests': {
      // The catalog spells some very common tests out in full, so map the usual abbreviations.
      const ALIASES: Record<string, string> = { cbc: 'Complete Blood Picture', 'complete blood count': 'Complete Blood Picture' }
      let term = safeSearchTerm(input.query)
      term = ALIASES[term.toLowerCase()] ?? term
      if (!term) return { found: false, message: 'محتاج كلمة بحث.' }
      const { data } = await supabase.from('tests').select('name, price').ilike('name', `%${term}%`).order('name').limit(8)
      if (!data || data.length === 0) {
        return { found: false, message: 'مفيش نتيجة بالاسم ده. جرّب مصطلح تاني، ولو برضه مفيش قول للعميل إن الموظف هيأكد له السعر.' }
      }
      return { found: true, results: data }
    }

    case 'get_prep_instructions': {
      const term = safeSearchTerm(input.test_name)
      const { data } = await supabase.from('prep_instructions').select('test_name, instruction').ilike('test_name', `%${term}%`).limit(3)
      if (!data || data.length === 0) {
        return { found: false, message: 'مفيش تعليمات تحضير خاصة مسجّلة للتحليل ده، غالبًا مش محتاج استعداد خاص.' }
      }
      return { found: true, results: data }
    }

    case 'track_sample': {
      const phone = cleanEgyptPhone(input.phone)
      if (!phone) return { found: false, message: INVALID_PHONE_MESSAGE }
      const { data, error } = await supabase.rpc('get_sample_status_by_phone', { p_phone: phone })
      if (error || !data || data.length === 0) {
        return { found: false, message: `مفيش حجز مسجّل بالرقم ده، تأكد إنه صح أو كلّم الخط الساخن ${HOTLINE}.` }
      }
      return { found: true, results: data }
    }

    case 'submit_complaint': {
      const phone = cleanEgyptPhone(input.phone)
      if (!phone) return { success: false, message: INVALID_PHONE_MESSAGE }
      const { error } = await supabase.from('complaints').insert({
        name: input.name,
        phone,
        type: input.type,
        branch_name: input.branch_name || null,
        message: input.message,
      })
      if (error) return { success: false, message: `حصل خطأ وإحنا بنسجل الشكوى، جرب تاني أو كلّم الخط الساخن ${HOTLINE}.` }
      return { success: true, message: 'اتسجلت الشكوى بنجاح، فريق الجودة هيتواصل خلال 24 ساعة.' }
    }

    case 'create_booking': {
      const phone = cleanEgyptPhone(input.phone)
      if (!phone) return { success: false, message: INVALID_PHONE_MESSAGE }
      const bookingRef = generateBookingRef()
      const homeVisitFee = input.mode === 'home' ? HOME_VISIT_FEE : 0
      const { error } = await supabase.from('bookings').insert({
        booking_ref: bookingRef,
        source: 'messenger_agent',
        mode: input.mode,
        name: input.name,
        phone,
        dob: input.dob,
        address: input.address || null,
        branch_name: input.branch_name || null,
        preferred_date: input.preferred_date || null,
        tests: input.tests || [],
        subtotal: 0,
        home_visit_fee: homeVisitFee,
        total: homeVisitFee,
        notes: input.notes || null,
      })
      if (error) return { success: false, message: `حصل خطأ وإحنا بنسجل الحجز، جرب تاني أو كلّم الخط الساخن ${HOTLINE}.` }
      return { success: true, booking_ref: bookingRef, home_visit_fee: homeVisitFee, message: 'اتسجل الحجز بنجاح.' }
    }

    case 'handoff_to_human': {
      await supabase
        .from('messenger_conversations')
        .upsert({ psid, handoff_at: new Date().toISOString(), handoff_reason: String(input.reason ?? '').slice(0, 300), updated_at: new Date().toISOString() })
      return { success: true, message: `اتحولت المحادثة لموظف خدمة العملاء. قول للعميل إن حد من الفريق هيرد عليه هنا في أقرب وقت، ولو مستعجل يكلم ${HOTLINE} أو واتساب ${WHATSAPP}.` }
    }

    default:
      return { error: 'unknown tool' }
  }
}

// --- Claude ---------------------------------------------------------------

async function buildSystemPrompt(supabase: Supabase) {
  const [{ data: packages }, { data: branches }] = await Promise.all([
    supabase.from('packages').select('name, price, test_count').order('sort_order').limit(20),
    supabase.from('branches').select('governorate, name, address, phone, hours').order('sort_order').limit(30),
  ])

  return `إنت المساعد الذكي لصفحة Trust Labs على فيسبوك (معمل تحاليل طبية في مصر، 19 فرع، تأسس 1989). بترد على رسايل الماسنجر بالعامية المصرية، ودود ومحترم ومختصر.

أسلوب الرد (مهم لأن ده ماسنجر):
- نص عادي بس: ممنوع markdown (مفيش ** ولا # ولا جداول). لو محتاج قايمة استخدم سطر لكل بند بشرطة أو إيموجي.
- ردود قصيرة (٣-٦ سطور غالبًا). سؤال واحد في المرة لما تجمع بيانات.
- Trust Labs بتتكتب بالإنجليزي دايمًا.

قواعد صارمة:
- السعر: ممنوع تقول أي سعر من دماغك. دور بأداة search_tests (أسماء التحاليل في الكتالوج بالإنجليزي) أو خده من الباقات تحت. لو ملقتش التحليل بعد محاولتين، قول إن موظف خدمة العملاء هيأكد له السعر واستخدم handoff_to_human.
- لو في أكتر من نتيجة قريبة (مثلاً أكتر من نوع)، اعرضهم باختصار مع الأسعار وخلّي العميل يختار.
- الأسعار ممكن تتغير: لو سألوا عن الحجز قول إن السعر النهائي بيتأكد وقت الحجز.
- إنت مش دكتور: ممنوع تفسّر نتيجة تحليل أو تشخّص أو تنصح بعلاج أو دواء. اعتذر بلطف ووجّهه لدكتوره المعالج. ممنوع تقول إن قيمة "طبيعية" أو "عالية".
- نتايج التحاليل نفسها مش عندك. وجّه العميل لبوابة النتائج: ${RESULTS_PORTAL_URL} ، ولو عنده مشكلة فيها حوّله لموظف.
- متطلبش من العميل أي بيانات طبية أو نتايج في الشات. بيانات الحجز بس (اسم، موبايل، تاريخ ميلاد، عنوان/فرع) وبعد ما تنبهه بجملة قصيرة إنها هتُستخدم للتواصل بخصوص طلبه بس.
- تتبع العينة: اطلب رقم الموبايل واستخدم track_sample.
- الشكاوى: اجمع الاسم والموبايل والتفاصيل واستخدم submit_complaint، وكمان حوّل لموظف لو العميل متضايق.
- الحجز: اسأل الأول "زيارة منزلية ولا الفرع؟"، وبعدين اجمع: الاسم الرباعي، الموبايل، تاريخ الميلاد، العنوان (منزلية) أو الفرع، التحاليل، الميعاد المفضل. الزيارة المنزلية رسومها ${HOME_VISIT_FEE} جنيه. لما تخلص استخدم create_booking وادّي العميل رقم الحجز.
- تعليمات التحضير (صيام وغيره): استخدم get_prep_instructions وانقلها زي ما هي من غير ما تغيّر فيها.
- لو العميل طلب موظف أو بيشتكي بعصبية أو الموضوع طبي/نتيجة أو سؤال برا نطاقك: استخدم handoff_to_human.
- لو سلّم عليك بس، رحّب بيه واسأله تحب تساعده في إيه (أسعار، حجز، فروع، باقات، نتايج).
- مواعيد الفروع: السبت–الخميس، ٨ ص – ١١ م (الجمعة إجازة)، وفرع المهندسين ١٠ ص – ١٠ م. الخط الساخن ${HOTLINE}، واتساب ${WHATSAPP}.
- متتكلمش عن حاجة برا نطاق المعمل. مفيش عروض أو خصومات إلا لو موجودة قدامك في البيانات.

الباقات الحالية: ${JSON.stringify(packages || [])}
الفروع: ${JSON.stringify(branches || [])}`
}

async function callClaude(messages: any[], systemPrompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system: systemPrompt, tools: TOOLS, messages }),
  })
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// --- Conversation ---------------------------------------------------------

async function loadHistory(supabase: Supabase, psid: string) {
  const { data } = await supabase
    .from('messenger_messages')
    .select('role, content')
    .eq('psid', psid)
    .order('created_at', { ascending: false })
    .limit(HISTORY_MESSAGES)
  const rows = (data ?? []).reverse()
  while (rows.length && rows[0].role !== 'user') rows.shift()
  // The API needs strictly alternating roles: merge consecutive same-role rows.
  const merged: { role: string; content: string }[] = []
  for (const r of rows) {
    const last = merged[merged.length - 1]
    if (last && last.role === r.role) last.content += `\n${r.content}`
    else merged.push({ role: r.role, content: r.content })
  }
  return merged
}

async function isHandedOff(supabase: Supabase, psid: string) {
  const { data } = await supabase.from('messenger_conversations').select('handoff_at').eq('psid', psid).maybeSingle()
  if (!data?.handoff_at) return false
  return Date.now() - new Date(data.handoff_at).getTime() < HANDOFF_HOURS * 3600_000
}

async function remember(supabase: Supabase, psid: string, role: 'user' | 'assistant', content: string, mid?: string) {
  const { error } = await supabase.from('messenger_messages').insert({ psid, role, content, mid: mid ?? null })
  return !error // false => duplicate mid (webhook retry)
}

async function handleUserMessage(supabase: Supabase, psid: string, mid: string | undefined, text: string | null, hasAttachment: boolean) {
  if (await isHandedOff(supabase, psid)) {
    console.log('skip: conversation is handed off to a human')
    return
  }

  if (!text) {
    if (hasAttachment) {
      await sendText(psid, 'أهلاً بيك في Trust Labs 🌿 مش قادر أشوف الصور أو أسمع الرسائل الصوتية هنا. ممكن تكتبلي سؤالك؟ ولو محتاج موظف كلّم الخط الساخن 16183.')
    }
    return
  }

  if (!(await remember(supabase, psid, 'user', text.slice(0, MAX_MESSAGE_CHARS), mid))) {
    console.log('skip: duplicate mid or messenger_messages insert failed (is the migration applied?)')
    return
  }

  // Per-user hourly cap — protects the Anthropic bill from loops/abuse.
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await supabase
    .from('messenger_messages')
    .select('*', { count: 'exact', head: true })
    .eq('psid', psid)
    .eq('role', 'user')
    .gt('created_at', hourAgo)
  if ((count ?? 0) > PER_USER_PER_HOUR) {
    if (count === PER_USER_PER_HOUR + 1) await sendText(psid, `وصلت للحد المسموح من الرسائل دلوقتي، جرّب بعد شوية أو كلّم الخط الساخن ${HOTLINE}.`)
    return
  }

  await typing(psid)
  const systemPrompt = await buildSystemPrompt(supabase)
  const messages: any[] = await loadHistory(supabase, psid)

  let answer = ''
  for (let i = 0; i < 5; i++) {
    const result = await callClaude(messages, systemPrompt)
    if (result.stop_reason !== 'tool_use') {
      answer = result.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
      break
    }
    messages.push({ role: 'assistant', content: result.content })
    const toolResults = []
    for (const block of result.content) {
      if (block.type !== 'tool_use') continue
      const output = await runTool(supabase, psid, block.name, block.input)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  if (!answer) answer = `معلش، محتاج موظف يساعدك في الموضوع ده. كلّمنا على الخط الساخن ${HOTLINE} أو واتساب ${WHATSAPP} 🙏`
  await remember(supabase, psid, 'assistant', answer)
  await sendText(psid, answer)
  console.log('replied', { chars: answer.length })
}

// A reply typed by a human in the Page inbox arrives as an echo with no app_id:
// pause the bot for that customer so it doesn't talk over the employee.
async function handleEcho(supabase: Supabase, event: any) {
  const msg = event.message
  if (msg?.app_id) return // sent by an app (us), not a person
  const psid = event.recipient?.id
  if (!psid) return
  await supabase
    .from('messenger_conversations')
    .upsert({ psid, handoff_at: new Date().toISOString(), handoff_reason: 'human reply from Page inbox', updated_at: new Date().toISOString() })
}

async function processPayload(payload: any) {
  if (payload.object !== 'page') return
  const supabase = getSupabaseClient()
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      try {
        console.log('event', {
          echo: !!event.message?.is_echo,
          hasMessage: !!event.message,
          hasText: !!event.message?.text,
          other: event.message ? undefined : Object.keys(event).filter((k) => !['sender', 'recipient', 'timestamp'].includes(k)),
        })
        if (event.message?.is_echo) await handleEcho(supabase, event)
        else if (event.message && event.sender?.id) {
          await handleUserMessage(supabase, event.sender.id, event.message.mid, event.message.text ?? null, !!event.message.attachments?.length)
        }
      } catch (err) {
        console.error('messenger event failed', err)
        if (event.sender?.id) {
          await sendText(event.sender.id, `معلش حصلت مشكلة مؤقتة. كلّمنا على الخط الساخن ${HOTLINE} أو واتساب ${WHATSAPP} 🙏`).catch(() => {})
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Webhook verification handshake (done once when you set the callback URL in the Meta app).
  if (req.method === 'GET') {
    const ok =
      META_VERIFY_TOKEN &&
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === META_VERIFY_TOKEN
    return ok ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('forbidden', { status: 403 })
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const rawBody = await req.text()
  if (!(await validSignature(rawBody, req.headers.get('x-hub-signature-256')))) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('bad request', { status: 400 })
  }

  // Kill switch: `supabase secrets set MESSENGER_PAUSED=true` makes the agent stop replying
  // (Meta still gets a 200 so it doesn't retry or disable the webhook). Unset it to resume.
  if (Deno.env.get('MESSENGER_PAUSED') === 'true') {
    console.log('paused: MESSENGER_PAUSED=true, ignoring event')
    return new Response('EVENT_RECEIVED', { status: 200 })
  }

  // Meta expects a 200 within a few seconds; the Claude call runs after we answer.
  // @ts-ignore EdgeRuntime is provided by Supabase's edge runtime
  EdgeRuntime.waitUntil(processPayload(payload))
  return new Response('EVENT_RECEIVED', { status: 200 })
})
