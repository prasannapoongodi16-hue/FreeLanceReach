# Phase 8: Gmail setup

Gmail sending is per freelancer. FreelanceReach requests only `gmail.send`; it never reads inbox messages. Each send must use an existing draft, be explicitly approved with `approved: true`, pass owner and do-not-contact checks, and claim that draft before contacting Google. A successful send records Gmail's message ID and timestamp. A send already claimed/sent cannot be retried via the endpoint.

## Google Cloud configuration

1. In Google Cloud Console, select/create the FreelanceReach project, enable **Gmail API**, and configure the OAuth consent screen. For external users, select External and add development test users. Publishing/verification requirements depend on Google account type and deployment.
2. Create an OAuth client with application type **Web application**.
3. Add this exact authorized redirect URI to the client, and use the identical value in server `.env`:

   `http://localhost:5000/api/gmail/oauth/callback`

   For another host, configure its exact HTTPS callback URI in both places. Do not add a trailing slash or rely on wildcard matching.
4. Put the client ID and secret in the private server `.env`; never commit or send them to clients. Set `GOOGLE_REDIRECT_URI` to the exact URI registered above.
5. Set `GMAIL_TOKEN_ENCRYPTION_KEY` to 32 cryptographically random bytes encoded as 64 hex characters. Example PowerShell generator:

   ```powershell
   $bytes = [byte[]]::new(32)
   [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   [Convert]::ToHexString($bytes)
   ```

   Copy the output into `.env`. Back it up in a secret manager: changing or losing this key makes saved tokens unreadable and requires users to reconnect. Do not use a checked-in or shared example key.

The server uses authorization-code OAuth with random one-time state bound to the logged-in freelancer, expires it after ten minutes, and consumes it on callback. Tokens are encrypted with AES-256-GCM before MongoDB storage. Callback responses do not include credentials; API responses and logs never include tokens. If refresh is rejected or Gmail returns unauthorized, the connection is marked revoked and the freelancer must reconnect. A transient/ambiguous Gmail send remains `sending` to avoid an accidental duplicate; check the Gmail Sent folder before any manual database recovery.

## Thunder Client

Sign in using the existing auth flow and set `Authorization: Bearer <token>` for authenticated requests.

1. **Start connection:** `POST http://localhost:5000/api/gmail/connect` with no body. Open the returned `authorizationUrl` in a browser, sign in to Google, and grant the requested send permission. Google returns to the configured callback and redirects to `CLIENT_URL/gmail?gmail=connected` (or `gmail=failed`).
2. **Check status:** `GET http://localhost:5000/api/gmail/status`. The response reports only `connected`, `connectedAt`, and `reconnectRequired`.
3. **Send approved draft:** first review the saved draft and its lead recipient, then call `POST http://localhost:5000/api/gmail/drafts/<draftId>/send` with JSON `{ "approved": true }`. Expected response is `200` with `gmailMessageId` and `sentAt`. Only a draft owned by the current freelancer and a valid lead business email can be used.
4. **Verify duplicate protection:** repeat the send request. It returns `404` or `409` and does not issue another Gmail send.
5. **Disconnect:** `DELETE http://localhost:5000/api/gmail/disconnect`. Status then reports disconnected.

Do not call the send endpoint for sample/test drafts if you do not intend to contact the real recipient. All send requests are rate limited. OAuth start/callback is also rate limited.
