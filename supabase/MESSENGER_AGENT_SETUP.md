# إعداد Agent ماسنجر لصفحة Trust Labs

الملفات:
- `supabase/functions/messenger-webhook/index.ts` — الـ Edge Function (الـ Agent)
- `supabase/messenger_agent_migration.sql` — جداول المحادثات

الفكرة: عميل يبعت رسالة على الصفحة ← Meta تبعتها للـ webhook ← Claude يرد من الأسعار/الفروع/الباقات الحقيقية في Supabase ← الرد يرجع على ماسنجر. لو موظف رد من صندوق الصفحة، الـ Agent يسكت 12 ساعة لنفس العميل.

---

## الجزء 1: النشر على Supabase

### 1) إنشاء الجداول
Supabase Dashboard ← SQL Editor ← الصق محتوى `supabase/messenger_agent_migration.sql` ← Run.

### 2) تجهيز الـ CLI (مرة واحدة)
```bash
npm i -g supabase        # أو: npx supabase ...
supabase login
supabase link --project-ref <PROJECT_REF>
```
الـ `PROJECT_REF` هو الجزء الأول من رابط المشروع `https://<PROJECT_REF>.supabase.co`.

### 3) الأسرار (Secrets)
`ANTHROPIC_API_KEY` موجود بالفعل لأن `chat-assistant` بيستخدمه. ضيف أسرار Meta (هتجيب قيمها من الجزء 2):

```bash
supabase secrets set META_VERIFY_TOKEN=<أي نص عشوائي طويل تختاره>
supabase secrets set META_APP_SECRET=<App Secret من Meta>
supabase secrets set META_PAGE_ACCESS_TOKEN=<Page Access Token من Meta>
```
ولدّ الـ verify token بأمر زي: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

### 4) النشر
```bash
supabase functions deploy messenger-webhook --no-verify-jwt
```
`--no-verify-jwt` ضروري لأن Meta مش بتبعت JWT. الأمان بيتم بالتحقق من توقيع `X-Hub-Signature-256` داخل الكود.

رابط الـ webhook:
`https://<PROJECT_REF>.supabase.co/functions/v1/messenger-webhook`

### 5) اختبار التحقق
```bash
curl "https://<PROJECT_REF>.supabase.co/functions/v1/messenger-webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=123"
```
لازم يرجّع `123`. لو رجّع `forbidden` يبقى الـ token غلط أو السر مش متضاف.

---

## الجزء 2: الربط مع Meta

### 1) إنشاء التطبيق
1. ادخل على https://developers.facebook.com/apps بحساب فيه صلاحية Admin على صفحة Trust Labs.
2. **Create App** ← اختار use case: **Other** ← النوع **Business** ← سمّيه (مثلاً "Trust Labs Assistant") وحدد الـ Business Portfolio بتاع المعمل.
3. من لوحة التطبيق ضيف المنتج **Messenger** (Messenger API).

### 2) App Secret
**App settings ← Basic ← App Secret ← Show**. ده قيمة `META_APP_SECRET`.

### 3) Page Access Token
**Messenger ← API setup ← Generate access tokens ← Add or remove Pages**، اختار صفحة Trust Labs، ثم **Generate token**. ده قيمة `META_PAGE_ACCESS_TOKEN`. احفظه سري، ومتبعتوش في أي شات.

### 4) ربط الـ Webhook
في نفس صفحة **Messenger ← API setup ← Configure webhooks**:
- **Callback URL**: رابط الـ function فوق.
- **Verify token**: نفس قيمة `META_VERIFY_TOKEN`.
- اضغط **Verify and save** (لازم الـ function تكون منشورة وفيها الأسرار قبل الخطوة دي).
- اضغط **Add subscriptions** على الصفحة واختار: `messages` و `message_echoes`.
  (`message_echoes` هو اللي بيخلّي الـ Agent يسكت لما موظف يرد يدوي.)

### 5) التجربة في وضع التطوير
وهو في Development mode، التطبيق بيرد بس لحسابات عليها دور في التطبيق (Admin / Developer / Tester). ضيف نفسك ومن هتختبر معاهم من **App roles**، وابعت رسائل للصفحة من حساب شخصي.

اختبر على الأقل:
- "بكام صورة الدم؟" و"بكام فيتامين د؟"
- "الباقات اللي عندكم" و"فرع المهندسين فين؟"
- "محتاج سحب منزلي" (لحد ما يعمل حجز) — الحجز بيتسجل فعلاً في جدول `bookings`، فاستخدم بيانات تجريبية وامسحها بعدين.
- "نتيجتي فيها ارتفاع في الكرياتينين يعني إيه؟" (لازم يرفض ويحوّل لدكتور).
- "عايز أكلم موظف" (لازم يحوّل ويسكت).
- رد يدوي من صندوق الصفحة ثم رسالة جديدة من العميل (لازم الـ Agent ما يردش).

### 6) الإطلاق للعامة (Live)
عشان يرد على أي حد (مش بس أصحاب الأدوار):
1. **App settings ← Basic**: أضف Privacy Policy URL، وأيقونة، وفئة التطبيق.
2. **Business Verification** للـ Business Portfolio (App settings أو Business settings ← Security center).
3. **App Review**: اطلب **Advanced Access** لصلاحية `pages_messaging` (ومعاها `pages_manage_metadata` لو طلبها)، مع فيديو بيوضح استخدام التطبيق للرد على استفسارات العملاء.
4. بعد الموافقة حوّل التطبيق لـ **Live mode**.

المراجعة بتاخد من أيام لأسابيع، فابدأ فيها بدري.

### 7) إعدادات الصفحة
- من **Meta Business Suite ← Inbox ← Automations** اقفل أي رد آلي قديم عشان ما يتكررش مع الـ Agent.
- لو الصفحة بتستخدم أدوات تانية للرسايل، تأكد إن التطبيق الجديد هو المستقبل الأساسي للرسايل (Page settings ← Advanced messaging).

---

## ملاحظات تشغيل
- **السجلات**: Supabase ← Edge Functions ← messenger-webhook ← Logs.
- **سياسة 24 ساعة**: Meta بتسمح بالرد خلال 24 ساعة من آخر رسالة من العميل، والـ Agent بيرد فورًا فمفيش مشكلة.
- **التحويل لموظف**: الموظف بيشوف المحادثة في صندوق الصفحة (Inbox). أول ما يرد، الـ Agent بيسكت 12 ساعة (`HANDOFF_HOURS` في الكود).
- **الأسعار**: بتتقرا لحظيًا من جدول `tests` فأي تعديل من لوحة الأدمن بيظهر فورًا.
- **التكلفة**: فيه حد 30 رسالة/ساعة لكل عميل، وكل رد بيستخدم Claude (راجع صفحة الاستخدام في Anthropic Console).
- **موديل Claude**: افتراضيًا `claude-sonnet-5-5`، وتقدر تغيّره بسر `MESSENGER_MODEL`.
- **الصور والرسائل الصوتية**: الـ Agent مش بيقراها، بيطلب من العميل يكتب سؤاله.
