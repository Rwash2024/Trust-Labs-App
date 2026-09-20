// Trust Labs App — AI chat assistant Edge Function
// Talks to the Claude API, grounded in real data from Supabase (packages,
// branches, featured tests, prep instructions) and able to call tools that
// read/write real rows (sample tracking, complaints, bookings) instead of
// inventing answers.
//
// Deploy: supabase functions deploy chat-assistant
// Requires secret: ANTHROPIC_API_KEY (Project Settings > Edge Functions > Secrets)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Created lazily (not at module scope) so a missing/misconfigured env var
// can't crash every request — including the CORS preflight OPTIONS request.
function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

const MODEL = 'claude-sonnet-5'
const RESULTS_PORTAL_URL = 'http://webresults.trustlabseg.com/Login/Index/?Type=Individual'
const HOME_VISIT_FEE = 75
const HOTLINE = '16183'

function generateBookingRef() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `BK-${rand}`
}

const TOOLS = [
  {
    name: 'get_prep_instructions',
    description: 'يجيب تعليمات التحضير الحقيقية لتحليل معين (زي الصيام) من قاعدة البيانات.',
    input_schema: {
      type: 'object',
      properties: { test_name: { type: 'string', description: 'اسم التحليل، مثلاً "صورة دم كاملة" أو "فيتامين د"' } },
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
]

async function runTool(supabase: ReturnType<typeof createClient>, name: string, input: any) {
  switch (name) {
    case 'get_prep_instructions': {
      const { data } = await supabase
        .from('prep_instructions')
        .select('test_name, instruction')
        .ilike('test_name', `%${input.test_name}%`)
        .limit(3)
      if (!data || data.length === 0) return { found: false, message: 'مفيش تعليمات تحضير خاصة مسجّلة للتحليل ده، غالبًا مش محتاج استعداد خاص.' }
      return { found: true, results: data }
    }

    case 'track_sample': {
      const { data, error } = await supabase.rpc('get_sample_status_by_phone', { p_phone: input.phone })
      if (error || !data || data.length === 0) {
        return { found: false, message: 'مفيش حجز مسجّل بالرقم ده، تأكد إنه صح أو كلّم الخط الساخن.' }
      }
      return { found: true, results: data }
    }

    case 'submit_complaint': {
      const { error } = await supabase.from('complaints').insert({
        name: input.name,
        phone: input.phone,
        type: input.type,
        branch_name: input.branch_name || null,
        message: input.message,
      })
      if (error) return { success: false, message: 'حصل خطأ وإحنا بنسجل الشكوى، جرب تاني أو كلّم الخط الساخن.' }
      return { success: true, message: 'اتسجلت الشكوى بنجاح، فريق الجودة هيتواصل خلال 24 ساعة.' }
    }

    case 'create_booking': {
      const bookingRef = generateBookingRef()
      const homeVisitFee = input.mode === 'home' ? HOME_VISIT_FEE : 0
      const { error } = await supabase.from('bookings').insert({
        booking_ref: bookingRef,
        source: 'chat_assistant',
        mode: input.mode,
        name: input.name,
        phone: input.phone,
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
      if (error) return { success: false, message: 'حصل خطأ وإحنا بنسجل الحجز، جرب تاني أو كلّم الخط الساخن.' }
      return { success: true, booking_ref: bookingRef, home_visit_fee: homeVisitFee, message: 'اتسجل الحجز بنجاح.' }
    }

    default:
      return { error: 'unknown tool' }
  }
}

async function buildSystemPrompt(supabase: ReturnType<typeof createClient>) {
  const [{ data: packages }, { data: branches }, { data: featured }] = await Promise.all([
    supabase.from('packages').select('name, price, test_count').order('sort_order').limit(20),
    supabase.from('branches').select('governorate, name, address, phone, hours').order('sort_order').limit(30),
    supabase.from('featured_tests').select('name, price, highlight').order('sort_order').limit(10),
  ])

  return `إنت المساعد الذكي لتطبيق Trust Labs (معمل تحاليل طبية في مصر). بترد بالعربي المصري، ودود ومختصر ومباشر.

قواعد صارمة:
- ردودك لازم تعتمد على البيانات الحقيقية اللي معاك تحت أو اللي بتجيبها من الأدوات (tools). ممنوع تختلق سعر أو حالة عينة أو أي رقم مش موجود عندك.
- إنت مش دكتور: لو حد سأل يفسّرله نتيجة تحليل طبيًا أو يشخّص حالة، اعتذر بلطف وقوله يرجع لدكتوره المعالج، وممكن يكلم الخط الساخن ${HOTLINE}.
- نتيجة التحليل نفسها (القيم/PDF) مش عندك، وجّه العميل دايمًا لبوابة النتائج الرسمية: ${RESULTS_PORTAL_URL}
- لو العميل عايز يتتبع عينة، اطلب رقم الموبايل واستخدم أداة track_sample.
- لو العميل عايز يقدّم شكوى، اجمع الاسم ورقم الموبايل ونوع الشكوى وتفاصيلها، واستخدم submit_complaint.
- لو العميل عايز يحجز معاد، اسأله الأول "زيارة منزلية" ولا "يروح الفرع"، وبعدين اجمع: الاسم الرباعي، رقم الموبايل، تاريخ الميلاد، العنوان (لو منزلية) أو اسم الفرع (لو فرع)، التحاليل المطلوبة، والميعاد المفضل — خطوة سؤال واحد في كل مرة مش كل الأسئلة مرة واحدة. لما تجمع كل حاجة استخدم create_booking واعرض على العميل رقم الحجز اللي رجع لك.
- أول ما تبدأ تجمع بيانات شخصية (رقم موبايل، تاريخ ميلاد، عنوان) في أي فلو، نبّه العميل بجملة قصيرة إن بياناته هتُستخدم للتواصل معاه بخصوص طلبه بس.
- خلي ردودك قصيرة ومنظمة (نقط لو محتاج)، من غير حشو.
- لو العميل بس سلّم عليك (هاي/أهلاً/صباح الخير/مساء الخير/السلام عليكم) من غير سؤال محدد، رد بترحيب ودود قصير واسأله محتاج مساعدة في إيه، وفكّره إنه يقدر يدوس على زرار ☰ فوق لو عايز يشوف كل الخدمات.

الباقات الحالية: ${JSON.stringify(packages || [])}
الفروع: ${JSON.stringify(branches || [])}
التحاليل المميزة: ${JSON.stringify(featured || [])}`
}

async function callClaude(messages: any[], systemPrompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const supabase = getSupabaseClient()
    const { message, history = [] } = await req.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: CORS_HEADERS })
    }

    const systemPrompt = await buildSystemPrompt(supabase)
    const messages = [...history, { role: 'user', content: message }]

    // Tool-use loop: Claude may call a tool, we run it, feed the result back, repeat.
    for (let i = 0; i < 4; i++) {
      const result = await callClaude(messages, systemPrompt)

      if (result.stop_reason !== 'tool_use') {
        const reply = result.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        return new Response(JSON.stringify({ reply }), {
          headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
        })
      }

      messages.push({ role: 'assistant', content: result.content })
      const toolResults = []
      for (const block of result.content) {
        if (block.type !== 'tool_use') continue
        const output = await runTool(supabase, block.name, block.input)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) })
      }
      messages.push({ role: 'user', content: toolResults })
    }

    return new Response(JSON.stringify({ reply: 'معلش، محتاج أفاصيل أوضح عشان أقدر أساعدك 🙏' }), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
})
