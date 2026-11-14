import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptToken, encryptToken, sendGmailMessage, stateDigest } from './gmailService.js';

const key = 'a'.repeat(64);

test('OAuth tokens are encrypted with authenticated encryption and state is hashed', () => {
  const encrypted = encryptToken('secret-token', Buffer.from(key, 'hex'));
  assert.notEqual(encrypted, 'secret-token');
  assert.equal(decryptToken(encrypted, Buffer.from(key, 'hex')), 'secret-token');
  assert.notEqual(stateDigest('random-state'), 'random-state');
  assert.throws(() => decryptToken(encrypted, Buffer.alloc(32, 2)));
});

test('Gmail send uses a mocked Gmail API and never exposes the bearer token in its result', async () => {
  const old = { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI, GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY };
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:5000/api/gmail/oauth/callback', GMAIL_TOKEN_ENCRYPTION_KEY: key });
  let request;
  try {
    const messageId = await sendGmailMessage({
      connection: { encryptedAccessToken: encryptToken('private-token'), expiresAt: new Date(Date.now() + 3600000) },
      draft: { recipient: 'client@example.com', subject: 'Approved subject', body: 'Approved body' },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ id: 'gmail-123' }) };
      }
    });
    assert.equal(messageId, 'gmail-123');
    assert.match(request.url, /gmail\.googleapis\.com/);
    assert.equal(request.options.headers.authorization, 'Bearer private-token');
    assert.match(Buffer.from(JSON.parse(request.options.body).raw, 'base64url').toString(), /To: client@example.com/);
    assert.doesNotMatch(JSON.stringify({ messageId }), /private-token/);
  } finally {
    for (const [name, value] of Object.entries(old)) value === undefined ? delete process.env[name] : process.env[name] = value;
  }
});

test('revoked refresh token marks the connection revoked and requests reconnection', async () => {
  const old = { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI, GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY };
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:5000/api/gmail/oauth/callback', GMAIL_TOKEN_ENCRYPTION_KEY: key });
  const connection = { encryptedAccessToken: encryptToken('old-access'), encryptedRefreshToken: encryptToken('revoked-refresh'),
    expiresAt: new Date(0), revokedAt: null, save: async function save() {} };
  try {
    await assert.rejects(sendGmailMessage({ connection, draft: {}, fetchImpl: async () => ({ ok: false, status: 400 }) }), /expired or revoked/i);
    assert.ok(connection.revokedAt instanceof Date);
  } finally {
    for (const [name, value] of Object.entries(old)) value === undefined ? delete process.env[name] : process.env[name] = value;
  }
});
