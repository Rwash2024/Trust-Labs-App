# دليل نشر الموقع الجديد على cPanel (trustlabseg.com)

الملف الجاهز: `trustlabs-website-live.zip` (49 ملف، 1.7 ميجا) وبداخله `.htaccess` و`index.html` في الجذر.
المصدر المفتوح للمراجعة: مجلد `website-live`.

## قبل أي حاجة (لازم)
1. **انقل `public_html.zip` بره `public_html`** (File Manager ← `public_html` ← اضغط عليه ← Move ← اكتب `/`). ده مفتوح للتحميل حاليًا (1.4 جيجا فيها `wp-config.php`).
2. النسخة الاحتياطية من All-in-One WP Migration اتحمّلت (قلت إنك عملتها). تأكد إن الملف على جهازك وحجمه أكبر من صفر.
3. اختار وقت هادي (آخر الليل مثلًا). التبديل بياخد ثواني.

## الرفع
1. cPanel ← **File Manager**، وادخل الفولدر الرئيسي `/home2/trustlabseg` (مش `public_html`).
2. **+ Folder** ← اسمه `new-site` ← Create.
3. افتح `new-site` ← **Upload** ← اختار `trustlabs-website-live.zip`.
4. بعد الرفع: اختار الزيب ← **Extract** ← الوجهة `/new-site` ← Extract Files.
5. افتح **Settings** (فوق اليمين) وفعّل **Show Hidden Files (dotfiles)** ثم Save. دلوقتي لازم تشوف `.htaccess` جوه `new-site`.
6. تأكد إن `index.html` موجود **مباشرة** جوه `new-site` (مش جوه فولدر فرعي تاني). لو لقيته جوه فولدر، انقل المحتوى لبره.
7. امسح ملف الزيب من `new-site`.

## التبديل (الخطوة اللي بتظهر الموقع الجديد)
> الدومين الأساسي بيقرا دايمًا من فولدر اسمه `public_html`، فهنبدّل الأسماء.

في File Manager (الفولدر الرئيسي `/home2/trustlabseg`):
1. اضغط على `public_html` ← **Rename** ← `public_html_OLD`.
2. اضغط على `new-site` ← **Rename** ← `public_html`.

الموقع الجديد اشتغل. افتح `https://www.trustlabseg.com` واعمل Ctrl+F5.

## للرجوع للقديم لو حصلت مشكلة (دقيقة)
1. `public_html` ← Rename ← `new-site`.
2. `public_html_OLD` ← Rename ← `public_html`.

## اختبار بعد النشر (5 دقايق)
- الرئيسية بتفتح، والقايمة (8 عناصر) والشات والـ QR ظاهرين.
- الحجز: اضغط "احجز" ويفتح `app.trustlabseg.com/booking`.
- صفحة النتائج ← مريض / طبيب / مستشفى / مركز بتفتح بوابة النتايج.
- الروابط القديمة بتتحوّل:
  - `https://www.trustlabseg.com/?page_id=247` ← `/about.html`
  - `https://www.trustlabseg.com/about-us/` ← `/about.html`
  - `https://www.trustlabseg.com/contact-us/` ← `/contact.html`
  - `https://www.trustlabseg.com/customer-cabinet/` ← التطبيق
- رابط غلط زي `/xyz` يفتح صفحة 404 بتاعتنا.
- `https://www.trustlabseg.com/robots.txt` و`/sitemap.xml` بيفتحوا.

## بعد النشر
1. **Google Search Console**: ابعت `sitemap.xml`، وافحص الرئيسية، ولو فيه تحذير أمان قدّم طلب مراجعة.
2. **Google Analytics**: اتأكد إن الزيارات بتظهر (بنفس الـ ID بتاع التطبيق).
3. **تنضيف الموقع القديم** (سوا): اتغيّر باسورد قاعدة البيانات، ومفاتيح الأمان، وباسوردات WordPress وFTP وcPanel. وبعد أسبوع من الاستقرار نحذف `public_html_OLD` بعد نسخة أخيرة.
4. إيميلات الشركة ما بتتأثرش (سجلات MX ما اتغيّرتش).

## معروف إنه ناقص (مش عطل)
- الأسعار وقايمة التحاليل (1,117) نسخة ثابتة من قايمة 2026. مش بتتحدث تلقائيًا من قاعدة البيانات.
- شروط التحضير 9 شروط بس (الباقي مش مدخل في قاعدة البيانات).
- الحجز وطلب كارت الثقة والشكاوى بتتم من التطبيق.
- مفيش قسم تقييمات عملاء ولا صفحة "خدمات الشركات" ولا الوظائف (التحويلات القديمة لها بتروح لصفحة تواصل معنا).
