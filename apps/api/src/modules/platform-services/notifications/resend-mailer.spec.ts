import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ResendMailer, assertResendEnv, resendOptionsFromEnv } from './mailer.js';

/**
 * RC-10 — مزوّد `resend` عبر HTTP.
 *
 * العقد الذي يجب أن يُحترم مُثبَّتٌ هنا مقابل خادمٍ محلّي يقلّد واجهة Resend: مصادقة
 * بـBearer، جسمٌ يحمل `from`/`to`/`subject`/`text`، و`reply_to` و`headers` عند وجودها.
 * والمهمّ أن الرفض (4xx/5xx) يُرفَع كخطأ تسليمٍ لا كخطأ برمجة — المُستدعي يسجّله على
 * الرسالة ويعيد المحاولة، كما يفعل مع رفض SMTP بالضبط.
 */

type Captured = {
  authorization?: string;
  contentType?: string;
  body: Record<string, unknown>;
};

class FakeResendApi {
  private server: Server;
  readonly requests: Captured[] = [];
  /** Status the fake answers with; flipped per test. */
  status = 200;
  statusText = 'OK';

  constructor() {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        this.requests.push({
          authorization: req.headers.authorization,
          contentType: req.headers['content-type'],
          body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'),
        });
        res.writeHead(this.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'email_test_123' }));
      });
    });
  }

  async listen(): Promise<number> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    return (this.server.address() as AddressInfo).port;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

describe('ResendMailer (RC-10)', () => {
  let fake: FakeResendApi;
  let port: number;

  const mailer = () =>
    new ResendMailer({
      apiKey: 're_test_key',
      endpoint: `http://127.0.0.1:${port}`,
      from: 'no-reply@erp.local',
    });

  beforeAll(async () => {
    fake = new FakeResendApi();
    port = await fake.listen();
  });

  afterAll(async () => {
    await fake.close();
  });

  it('posts a bearer-authenticated JSON payload with the message fields', async () => {
    await mailer().send({
      to: 'user@example.test',
      subject: 'Reset your password',
      text: 'open this link',
    });

    expect(fake.requests).toHaveLength(1);
    const request = fake.requests[fake.requests.length - 1]!;
    expect(request.authorization).toBe('Bearer re_test_key');
    expect(request.contentType).toBe('application/json');
    expect(request.body).toMatchObject({
      from: 'no-reply@erp.local',
      to: ['user@example.test'],
      subject: 'Reset your password',
      text: 'open this link',
    });
  });

  it('carries the html alternative, reply-to and RFC 8058 headers when present', async () => {
    await mailer().send({
      to: 'user@example.test',
      subject: 'campaign',
      text: 'plain',
      html: '<p>rich</p>',
      replyTo: 'support@erp.local',
      headers: { 'List-Unsubscribe': '<https://erp.local/unsub>' },
    });

    const request = fake.requests[fake.requests.length - 1]!;
    expect(request.body).toMatchObject({
      html: '<p>rich</p>',
      reply_to: 'support@erp.local',
      headers: { 'List-Unsubscribe': '<https://erp.local/unsub>' },
    });
  });

  it('prefers the message identity over the environment default, encoded as a display name', async () => {
    await mailer().send({
      to: 'user@example.test',
      subject: 'from tenant',
      text: 'body',
      from: 'tenant@erp.local',
      fromName: 'منشأة',
    });

    const request = fake.requests[fake.requests.length - 1]!;
    // The Arabic name is RFC 2047 encoded, so the address still parses.
    expect(String(request.body.from)).toContain('<tenant@erp.local>');
    expect(String(request.body.from)).toContain('=?UTF-8?B?');
  });

  it('raises a delivery error — not a programming error — when the API refuses', async () => {
    fake.status = 422;
    fake.statusText = 'Unprocessable Entity';
    try {
      await expect(
        mailer().send({ to: 'bad@example.test', subject: 'x', text: 'y' }),
      ).rejects.toThrow(/resend: 422/);
    } finally {
      fake.status = 200;
      fake.statusText = 'OK';
    }
  });

  it('raises on a 5xx too, so the outbox retries rather than marking the mail sent', async () => {
    fake.status = 503;
    fake.statusText = 'Service Unavailable';
    try {
      await expect(
        mailer().send({ to: 'user@example.test', subject: 'x', text: 'y' }),
      ).rejects.toThrow(/resend: 503/);
    } finally {
      fake.status = 200;
      fake.statusText = 'OK';
    }
  });
});

describe('resend configuration (RC-10)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('refuses to claim the transport is usable without an API key', () => {
    delete process.env.RESEND_API_KEY;
    expect(() => assertResendEnv({})).toThrow(/RESEND_API_KEY is not set/);
    expect(() => assertResendEnv({ RESEND_API_KEY: 're_live' })).not.toThrow();
  });

  it('fails the send with a message that names the fix, before any request is made', async () => {
    // The guard must live at the point of use: an empty bearer token would come back
    // from Resend as a bare 401 and tell the operator nothing about what to change.
    const recorder = new FakeResendApi();
    const port = await recorder.listen();
    try {
      await new ResendMailer({ apiKey: '', endpoint: `http://127.0.0.1:${port}`, from: 'a@b.test' }).send({
        to: 'user@example.test',
        subject: 'x',
        text: 'y',
      });
      expect.unreachable('send must not resolve without an API key');
    } catch (error) {
      expect((error as Error).message).toMatch(/RESEND_API_KEY is not set/);
      expect((error as Error).message).toMatch(/pick another provider/);
    }
    expect(recorder.requests).toHaveLength(0);
    await recorder.close();
  });

  it('defaults the endpoint to the production API and strips a trailing slash', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_ENDPOINT;
    expect(resendOptionsFromEnv().endpoint).toBe('https://api.resend.com');

    process.env.RESEND_ENDPOINT = 'http://127.0.0.1:9999/';
    expect(resendOptionsFromEnv().endpoint).toBe('http://127.0.0.1:9999');
  });
});
