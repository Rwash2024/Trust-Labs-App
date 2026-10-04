# ربط الحجوزات بـ Trust Lab Ops — إعداد Database Webhook

الكود والدالة (`forward-booking-to-erp`) نُشرت بالفعل. الخطوة الوحيدة الباقية بتتعمل
مرة واحدة من لوحة تحكم Supabase (مش من الكود)، لأن مفتاحنا الخاص (`FORWARD_WEBHOOK_SECRET`)
لازم يتحط في مكان مش بيتحفظ في GitHub.

## قبل ما تبدأ
شغّل الملفين دول في **SQL Editor** لو لسه ما عملتهمش:
- `supabase/bookings_synced_to_erp_migration.sql`

## الخطوات
1. افتح مشروع Supabase → **Database** → **Webhooks** (في القائمة الجانبية).
2. **Create a new webhook**.
3. املأ:
   - **Name:** `forward-booking-to-erp`
   - **Table:** `bookings`
   - **Events:** ✅ Insert بس (سيب Update وDelete من غير تفعيل)
   - **Type:** `Supabase Edge Functions`
   - **Edge Function:** اختار `forward-booking-to-erp`
   - **HTTP Headers:** ضيف هيدر واحد:
     - Name: `x-forward-secret`
     - Value: (هبعتهولك في رسالة منفصلة عشان ما يتسجلش هنا)
4. احفظ.

## اختبار
اعمل حجز حقيقي (فرع أو منزلي) من التطبيق، وبعدها:
- في تاب "الحجوزات" بالأدمن، لازم عمود جديد يظهر يقول الحجز اتبعت للـ ERP (هنضيفه لو حبيت تتابعه من هناك بدل الـ logs).
- أو افتح **Edge Functions** → `forward-booking-to-erp` → **Logs** في Supabase، وشوف إن الطلب راح بنجاح.

## تنويه أمان
السر المشترك مع Trust Lab Ops (`x-webhook-secret`) اتشاف قبل كده في الشات وفي لقطة شاشة.
هو شغّال دلوقتي، بس لو حابب حماية أفضل، اطلب من مطوّر الـ ERP يغيّره (rotate) وابعتلي القيمة
الجديدة عشان أحدّثها في أسرار Supabase بتاعنا.
