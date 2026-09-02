# تطوير SEO لجليس الكليني

هذه الحزمة لا تستبدل ملفات JSON الموجودة في مستودعك.

## طريقة الاستخدام

ارفع الملفات الموجودة في هذه الحزمة إلى **جذر المستودع** واسمح باستبدال:
- `index.html`
- `main.js`
- `style.css`

وأضف:
- `robots.txt`
- `.nojekyll`
- `tools/generate-seo.mjs`
- `.github/workflows/generate-seo.yml`

بعد أول Push، شغّل GitHub Action يدويًا من تبويب Actions إذا لزم الأمر.

الـAction يقرأ جميع ملفات JSON وManifest تلقائيًا ويولد:

- صفحات كتب قابلة للفهرسة تحت `books/`
- صفحات لكل صفحة كتاب تحت `pages/`
- صفحات المؤلفين تحت `authors/`
- صفحات الموضوعات تحت `topics/`
- `sitemap.xml` وملفات sitemap مجزأة تحت `seo-sitemaps/`

لا تعدّل ملفات الروايات الـJSON يدويًا من أجل SEO.

## ملاحظة مهمة

الـAction يكتب الملفات المولّدة في المستودع نفسه. لذلك يجب أن تكون صلاحية GitHub Actions للـrepository مضبوطة للسماح بالكتابة إلى Contents. إعداد Pages الحالي من نفس الفرع سيستفيد تلقائيًا من الصفحات الجديدة.
