# تفعيل الدفع الأونلاين (Paymob)

الكود جاهز لكن **مقفول** لحد ما تخلّص الخطوات دي بالترتيب. لو فتحته قبل كده، المريض هيختار
"فيزا" ويتسجل له حجز من غير ما يقدر يدفع.

## إزاي بيشتغل
1. المريض يضغط "تأكيد ودفع بالفيزا" → الحجز يتسجل في `bookings` بحالة دفع `pending`.
2. الدالة `create-paymob-payment` تحسب المبلغ **من أسعار قاعدة البيانات** (مش من المتصفح)،
   وتعمل Intention عند Paymob، وترجّع رابط صفحة الدفع الخاصة بـ Paymob.
3. المريض يدخل بيانات الكارت **على صفحة Paymob** (بياناته مبتعدّيش علينا).
4. Paymob يبعت نتيجة الدفع للدالة `paymob-webhook`. الـ callback بتاع Intention API توقيعه مش موثّق،
   فالدالة **ما بتثقش في محتواه**: بتاخد رقم المعاملة بس، وتسأل Paymob مباشرة (Transaction Inquiry بالـ API key)،
   وتربط الرد بالدفعة عن طريق `order.id`، وتتأكد من المبلغ، وبعدين تحدّث حالة الحجز. **ده المصدر الوحيد لحالة "تم الدفع"** — صفحة الرجوع للموقع
   مجرد رسالة للمريض ويقدر أي حد يزوّر رابطها.

## الخطوات

### 1) من حسابك على Paymob (ابعتهم لنفسك بس، مش في أي شات)
- `Secret key` و`Public key` (بيبدأوا بـ `egy_sk_` و`egy_pk_` لحسابات مصر)، و`Integration ID` لـ Online Card (رقم)،
  و`HMAC` و`API key` (من نفس صفحة Settings ← API Keys). مكانهم في الداشبورد موضّح في صفحة **Getting Integration Credentials** في توثيق Paymob.
- ابدأ بمفاتيح **test**. عندهم كروت تجريبية في صفحة **Test Credentials** في نفس التوثيق.

### 2) قاعدة البيانات
شغّل `supabase/paymob_payments_migration.sql` في SQL Editor.

### 3) الأسرار
```
supabase secrets set PAYMOB_SECRET_KEY=...
supabase secrets set PAYMOB_PUBLIC_KEY=...
supabase secrets set PAYMOB_INTEGRATION_ID=...
supabase secrets set PAYMOB_HMAC_SECRET=...
supabase secrets set PAYMOB_API_KEY=...   # كارت "API key" في Settings ← API Keys (بيتحقق بيه الـ webhook من Paymob)
supabase secrets set APP_URL=https://<دومين الموقع بدون / في الآخر>
supabase secrets set HOME_VISIT_FEE=75   # لازم يساوي brand.homeVisitFee
```
أو من Project Settings → Edge Functions → Secrets.

### 4) نشر الدوال
```
supabase functions deploy create-paymob-payment
supabase functions deploy paymob-webhook --no-verify-jwt
```
`--no-verify-jwt` ضروري للـ webhook بس: Paymob مش بيبعت JWT، والتوقيع هو اللي بيحمي الدالة.

### 5) تجربة بمفاتيح test
- فعّل `VITE_ONLINE_PAYMENT_ENABLED=true` في إعدادات Vercel وأعد البناء.
- اعمل حجز بالفيزا بكارت تجريبي، وتأكد إن:
  - الدفع نجح → في تاب الحجوزات يظهر "تم الدفع ✅"، وفي جدول `payments` الحالة `paid`.
  - جرّب كارت مرفوض → الحالة `failed` والحجز يفضل موجود.
  - Supabase → Edge Functions → `paymob-webhook` → Logs ما فيهاش `invalid_hmac` ولا `amount_mismatch`.
- بس بعد كده بدّل المفاتيح بالـ live.

## حاجات لازم تعرفها
- حجز الفيزا بيتسجل ويتبعت لـ Formspree والـ ERP **قبل** الدفع. اللي يشتغل على الحجوزات
  لازم يبص على "حالة الدفع" ما يأكدش حجز حالته "بانتظار الدفع".
- الاسترداد حاليًا يدوي من لوحة Paymob. لما يتم، الـ webhook بيحدّث الحالة لـ "مسترد"
  (لو Paymob بعت الـ callback — جرّبه في الـ test قبل ما تعتمد عليه).
- الحجز الدولي (`InternationalBooking`) لسه كاش بس.
- `store/data-safety.md` مكتوب فيه "no payments in the app": راجعه قبل رفع نسخة جديدة على Google Play.
