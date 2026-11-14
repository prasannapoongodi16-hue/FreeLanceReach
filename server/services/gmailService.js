import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const OAUTH_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const config = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GMAIL_TOKEN_ENCRYPTION_KEY } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw Object.assign(new Error('Gmail OAuth is not configured'), { statusCode: 503 });
  }
  if (!GMAIL_TOKEN_ENCRYPTION_KEY || !/^[\da-f]{64}$/i.test(GMAIL_TOKEN_ENCRYPTION_KEY)) {
    throw Object.assign(new Error('Gmail token encryption is not configured'), { statusCode: 503 });
  }
  return { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, key: Buffer.from(GMAIL_TOKEN_ENCRYPTION_KEY, 'hex') };
};

export const encryptToken = (token, key = config().key) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
};

export const decryptToken = (value, key = config().key) => {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

export const stateDigest = (state) => crypto.createHash('sha256').update(state).digest('hex');
export const createOAuthUrl = (state) => {
  const c = config();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: c.GOOGLE_CLIENT_ID, redirect_uri: c.GOOGLE_REDIRECT_URI,
    response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', state }).toString();
  return url.toString();
};

const readJson = async (response) => {
  if (!response.ok) throw Object.assign(new Error('Google request failed'), { statusCode: response.status, providerError: true });
  return response.json();
};

export const exchangeCode = async (code, fetchImpl = fetch) => {
  const c = config();
  const response = await fetchImpl(OAUTH_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.GOOGLE_CLIENT_ID, client_secret: c.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }) });
  return readJson(response);
};

export const sendGmailMessage = async ({ connection, draft, fetchImpl = fetch }) => {
  config();
  let accessToken = decryptToken(connection.encryptedAccessToken);
  if (connection.expiresAt <= new Date()) {
    try {
      const response = await fetchImpl(OAUTH_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: decryptToken(connection.encryptedRefreshToken), grant_type: 'refresh_token' }) });
      const refreshed = await readJson(response);
      accessToken = refreshed.access_token;
      connection.encryptedAccessToken = encryptToken(accessToken);
      connection.expiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000);
      await connection.save();
    } catch (error) {
      if (error.statusCode === 400 || error.statusCode === 401) {
        connection.revokedAt = new Date();
        await connection.save();
        throw Object.assign(new Error('Gmail access expired or revoked. Reconnect your account.'), { statusCode: 401 });
      }
      throw error;
    }
  }
  const mime = [
    `To: ${draft.recipient}`,
    `Subject: ${draft.subject.replace(/[\r\n]/g, ' ')}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', draft.body
  ].join('\r\n');
  const response = await fetchImpl(GMAIL_ENDPOINT, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }) });
  const result = await readJson(response);
  return result.id;
};

export const oauthScope = SCOPE;
