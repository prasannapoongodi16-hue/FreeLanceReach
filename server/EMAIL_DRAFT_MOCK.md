# Development email draft mock

Email draft generation uses OpenAI by default. For local development without API credits, set `EMAIL_DRAFT_PROVIDER=mock` in the server's private `.env` and keep `NODE_ENV` unset or set to `development`. Mock mode is refused when `NODE_ENV=production`.

Mock drafts are deterministic samples built from the lead and freelancer profile. Their subject and body are labeled as samples, and the body explicitly says the email has not been sent. Generation still uses the normal authenticated lead lookup and saves drafts through the existing `EmailDraft` model. No OpenAI API key is needed in mock mode.

## PowerShell and Thunder Client

1. In a PowerShell window, go to the server folder:

   ```powershell
   Set-Location 'C:\Users\PRASANNA\Documents\Codex\FreelanceReach\server'
   ```

2. Open the existing private `.env` without displaying it in the terminal:

   ```powershell
   notepad .env
   ```

   Set or add `EMAIL_DRAFT_PROVIDER=mock`. Ensure `NODE_ENV` is not `production` (for local development, use `NODE_ENV=development`). Save and close Notepad. Do not remove or share other existing values.

3. Restart the server. If `npm run dev` is running in another terminal, press `Ctrl+C` there, then run:

   ```powershell
   npm run dev
   ```

4. In Thunder Client, sign in through the existing auth endpoint and use the returned bearer token. Send a request to `POST http://localhost:5000/api/email-drafts/generate` with `Authorization: Bearer <token>`, `Content-Type: application/json`, and a body such as:

   ```json
   { "leadId": "<your-owned-lead-id>" }
   ```

   Choose a lead that is not marked do-not-contact. A successful response is `201`; its subject starts with `[SAMPLE]`, its body says `NOT SENT`, and the draft is stored. Retrieve it with `GET http://localhost:5000/api/email-drafts` using the same bearer token.

The production/default provider remains OpenAI (`EMAIL_DRAFT_PROVIDER=openai`, or unset). Never enable mock mode in production.
