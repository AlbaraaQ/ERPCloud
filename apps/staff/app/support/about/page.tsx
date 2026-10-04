'use client';

import { Screen } from '../../../components/screen';
import { apiBaseUrl } from '../../../lib/api';

/**
 * RC-7 / item 10 — «عن البرنامج» وحدها.
 *
 * كان في الصفحة قسمَان آخران: «حالة التنفيذ» (أرقام محسوبة من شجرة التنقّل) و«تحديث
 * البرنامج» (نصٌّ يقول «أعد تحميل الصفحة»). القسم الأول وعد بمعلومةٍ عن اكتمال المنتج
 * لا تعني المشغّل شيئاً، والثاني ليس ميزةً بل إعادة صياغةٍ لكلمة «سحابي». حُذفا بقرار
 * المالك، ومعهما مدخل «تحديث البرنامج» من شجرة التنقّل — وهو لم يكن إلا مرساةً إلى
 * `#updates` داخل هذه الصفحة نفسها، فحذف القسم دونه كان سيترك مدخّلاً لا يشير إلى شيء.
 */
export default function AboutPage() {
  return (
    <Screen title="عن البرنامج" subtitle="معلومات الإصدار." crumbs={['الدعم الفني']}>
      <section className="card">
        <h2>Cloud SaaS ERP</h2>
        <dl className="kv">
          <dt>النسخة</dt>
          <dd dir="ltr">0.1.0</dd>
          <dt>البنية</dt>
          <dd>NestJS + PostgreSQL (RLS) + Next.js</dd>
          <dt>عنوان الـ API</dt>
          <dd dir="ltr">{apiBaseUrl}</dd>
          <dt>وثائق الـ API</dt>
          <dd>
            <a href="/api/v1/../docs" dir="ltr">
              /api/docs
            </a>
          </dd>
        </dl>
      </section>
    </Screen>
  );
}
