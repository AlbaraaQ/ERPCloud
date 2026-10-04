'use client';

import { useState } from 'react';

import { Notice } from '../../../components/data-view';
import { Screen } from '../../../components/screen';
import { ApiError, apiPost } from '../../../lib/api';
import { useSession } from '../../../lib/session';

/**
 * RC-9 — «طلب المساعدة» صار استمارةً تُرسَل فعلاً.
 *
 * كانت الصفحة تعرض بيانات الجلسة وزرّ «نسخ» والخطوات السريعة، ولا نداءَ واحدٌ لأي
 * مسار: من يقرأ «أرفق هذه المعلومات عند مراسلة الدعم» يظنّ أن هناك بريداً أو نموذجاً،
 * وليس وراءهما شيء. المرسل يُلصق في الحافظة وينساه.
 *
 * الآن تُرسَل إلى `POST /public/leads` — وهو بابٌ قائمٌ ومحميٌّ بثلاث طبقات (مصيدة ·
 * محدّد معدّل · قيد فريد على العنوان)، ويُسجِّل الطلب في قائمة العملاء المتوقّعين في
 * لوحة المنصة حيث يُفرَّز. **لا باب جديد**: إضافة مسارٍ خاصٍّ بالدعم كانت ستعني جدولاً
 * وحمايةً وقائمةً أخرى في اللوحة، كلُّها لعملٍ يفعله `leads` اليوم.
 *
 * ما لا يقوله النموذج — وهو ما يجب أن يعرفه المرسل: الجواب **202** بمرجعٍ قصير، ولا
 * يُعلم أحداً في المنصة بالبريد. الطلب يُقرأ من قائمة الطلبات في لوحة المنصة، وهذا ما
 * تكتبه الشاشة صراحةً بدل أن توعد ببريدٍ لن يأتي.
 */
export default function HelpPage() {
  const { me } = useSession();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'danger' | 'info'; text: string }>();
  const [reference, setReference] = useState<string>();

  const session = {
    tenant: me?.membership.tenantName,
    tenantCode: me?.membership.tenantCode,
    user: me?.user.email,
    at: new Date().toISOString(),
    url: typeof window === 'undefined' ? '' : window.location.href,
  };

  /** بيانات الجلسة تُلصَق في الرسالة نفسها: القارئ في اللوحة لا يرى من أين أتى الطلب. */
  const composed = [
    `الموضوع: ${subject.trim() || 'طلب دعم'}`,
    '',
    message.trim(),
    '',
    '— بيانات الجلسة —',
    `المنشأة: ${session.tenant ?? '—'} (${session.tenantCode ?? '—'})`,
    `المستخدم: ${session.user ?? '—'}`,
    `الوقت: ${session.at}`,
    `الشاشة: ${session.url}`,
  ].join('\n');

  async function submit() {
    setBusy(true);
    setNotice(undefined);
    setReference(undefined);
    try {
      const result = await apiPost<{ reference: string }>(
        '/public/leads',
        {
          fullName: me?.user.fullName || me?.user.email || 'مستخدم',
          companyName: session.tenant || 'منشأة',
          email: me?.user.email,
          message: composed,
          locale: 'ar',
          acceptsMarketing: false,
          // المصيدة: حقلٌ مخفيٌّ لا يملؤه إنسان. يُرسَل فارغاً دائماً — ولو مُلئَ (أي بواسطة
          // أداةٍ آلية) رفض الخادم الطلب بصمت وأعاد 202 كأنه قُبِل.
          website: '',
        },
        { anonymous: true },
      );
      setReference(result.reference);
      setNotice({
        kind: 'ok',
        text: `وصل الطلب برقم ${result.reference}. اذكره في أي متابعة.`,
      });
      setSubject('');
      setMessage('');
    } catch (error) {
      setNotice({
        kind: 'danger',
        text: error instanceof ApiError ? error.message : 'تعذّر إرسال الطلب — حاول بعد قليل.',
      });
    } finally {
      setBusy(false);
    }
  }

  const tooShort = message.trim().length < 10;

  return (
    <Screen title="إطلب المساعدة" subtitle="استمارةٌ تُرسَل إلى فريق التشغيل وتُسجَّل برقم مرجعي." crumbs={['الدعم الفني']}>
      <Notice notice={notice} />

      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          if (tooShort || busy) return;
          void submit();
        }}
      >
        <h2>استمارة الدعم</h2>
        <label className="field">
          <span>الموضوع</span>
          <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="مثال: لا أستطيع حفظ فاتورة" />
        </label>
        <label className="field">
          <span>ماذا حدث؟ وما الذي توقّعتَه؟ ({message.trim().length}/2000)</span>
          <textarea
            className="input"
            rows={7}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="اشرح الخطوات التي أوصلتك إلى المشكلة، ورقم الرسالة أو الفاتورة إن وُجد."
          />
        </label>
        <p className="muted">
          تُلصَق بيانات جلستك (المنشأة · المستخدم · الوقت · الشاشة) تلقائياً في نصّ الطلب، فلا حاجة لنسخها.
        </p>
        <button className="btn primary" type="submit" disabled={busy || tooShort}>
          {busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
        </button>
        {tooShort && message.length > 0 ? <p className="muted">اكتب عشرة أحرف على الأقل.</p> : null}
      </form>

      <section className="card">
        <h2>بيانات جلستك</h2>
        <dl className="kv">
          <dt>المنشأة</dt>
          <dd>
            {session.tenant} (<span dir="ltr">{session.tenantCode}</span>)
          </dd>
          <dt>المستخدم</dt>
          <dd dir="ltr">{session.user}</dd>
          <dt>الوقت</dt>
          <dd dir="ltr">{session.at}</dd>
        </dl>
        <button
          className="btn"
          type="button"
          style={{ marginTop: 10 }}
          onClick={() =>
            void navigator.clipboard.writeText(JSON.stringify(session, null, 2))
          }
        >
          نسخ بيانات الدعم
        </button>
      </section>

      <section className="card">
        <h2>ماذا يحدث بعد الإرسال؟</h2>
        <ol className="muted" style={{ lineHeight: 2 }}>
          <li>يُسجَّل الطلب في قائمة «العملاء المتوقّعون» في لوحة المنصة، ويصلك رقمٌ مرجعيٌّ الآن.</li>
          <li>يصلك بريد تأكيد على عنوانك — ولا يعني وصوله أن أحداً بدأ المعالجة.</li>
          <li>المعالجة تُتابع من فريق التشغيل، والرقم المرجعي هو ما يُستحضَر به الطلب.</li>
        </ol>
        {reference ? <p className="muted" dir="ltr">ref: {reference}</p> : null}
      </section>

      <section className="card">
        <h2>خطوات سريعة</h2>
        <ol className="muted" style={{ lineHeight: 2 }}>
          <li>تأكد أن الاشتراك فعّال من شاشة «الترخيص».</li>
          <li>راجع «صحة النظام» في لوحة المنصة للتأكد من اتصال الواجهة بالخادم.</li>
          <li>إذا ظهرت رسالة «لا تملك صلاحية»، اطلب من مالك الحساب منحك الصلاحية.</li>
        </ol>
      </section>
    </Screen>
  );
}
