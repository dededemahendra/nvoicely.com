# Auth email setup (sign-in code + magic link via Resend)

The app uses **passwordless sign-in**: the user enters their email and Appwrite
sends a **6-digit code** plus a **sign-in link**. Both resolve to the same
session, because the magic link embeds the same one-time code as its secret:

```
https://<your-app>/auth/verify?userId=<userId>&secret=<otp>
```

- Typing the code calls `account.createSession(userId, otp)`.
- Clicking the link hits `/auth/verify`, which calls the same thing.

The **app side is already implemented** (`/login`, `/auth/verify`, and the
helpers in `app/lib/auth.ts`). What remains is **Appwrite console config** so
the emails actually send through Resend, plus the email template.

> Note: the existing `RESEND_API_KEY` only powers the **invoice** email function
> (`appwrite/functions/send-invoice-email`). Auth emails are sent by Appwrite
> core through the project's **SMTP** settings, which is a separate config.

---

## 1. Verify a sending domain in Resend

1. Resend dashboard → **Domains → Add Domain** (e.g. `yourdomain.com`).
2. Add the DNS records Resend shows (SPF, DKIM) and wait for **Verified**.
3. Pick a sender address on that domain, e.g. `noreply@yourdomain.com`.

(You also need a Resend **API key**: Resend dashboard → API Keys.)

---

## 2. Point Appwrite's SMTP at Resend

Appwrite Console → your project → **Settings → SMTP** → enable custom SMTP:

| Field | Value |
|---|---|
| Sender name | e.g. `Ledger` |
| Sender email | `noreply@yourdomain.com` (must be on the verified domain) |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | your **Resend API key** |
| Secure / Encryption | `SSL` for 465, `TLS` for 587 |

Save. Use Appwrite's "send test email" if available to confirm delivery.

---

## 3. Customize the OTP email template

Appwrite Console → **Auth → Templates → OTP** (the email sent by
`createEmailToken`). Put **both** the code and the sign-in link in the body, e.g.:

```html
<p>Your sign-in code is <strong>{{otp}}</strong>.</p>
<p>Or just click to sign in:</p>
<p><a href="https://<your-app>/auth/verify?userId={{user}}&secret={{otp}}">Sign in</a></p>
<p>This code expires in 15 minutes.</p>
```

- Replace `<your-app>` with your deployed origin (e.g. `https://app.yourdomain.com`).
- Confirm which variables your Appwrite version exposes in the OTP template
  (typically `{{otp}}`, `{{project}}`, and a user identifier). If the **userId**
  isn't available as a template variable, the **code still works**; the embedded
  link is optional (users can type the 6-digit code instead).

---

## 4. Google sign-in

The login page already has **Continue with Google** wired up
(`loginWithGoogle()` → `account.createOAuth2Session`). It redirects to `/` on
success and back to `/login` on failure. You just need to enable the provider.

### 4a. Create a Google OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen** → configure (External), add your
   app name, support email, and (for production) your domain. Add yourself as a
   test user while it's in "Testing".
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   **Web application**.
4. Under **Authorized redirect URIs**, add Appwrite's OAuth2 callback (the exact
   URL is shown in the Appwrite Google provider screen in step 4b):
   ```
   https://<APPWRITE_ENDPOINT>/v1/account/sessions/oauth2/callback/google/<PROJECT_ID>
   ```
   e.g. `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/<PROJECT_ID>`
5. Copy the **Client ID** and **Client Secret**.

### 4b. Enable Google in Appwrite

Appwrite Console → **Auth → Settings → OAuth2 Providers → Google** → toggle on:
- **App ID** = Google **Client ID**
- **App Secret** = Google **Client Secret**

Appwrite shows the callback URL to paste back into step 4a if you haven't already.

### 4c. Allow the app origin

Appwrite Console → **Overview → Platforms** → make sure your web origin
(e.g. `http://localhost:5173` for dev and your production domain) is registered,
so the redirect back to `/` is permitted.

Once enabled, the button signs the user in and lands them on the dashboard;
first-time Google users get an account created automatically.

---

## Troubleshooting

- **No email arrives** → SMTP not configured, or sender domain not verified in
  Resend. Check the Appwrite **Logs** for SMTP errors.
- **Link says "invalid or expired"** → the OTP/token expired (request a new one)
  or the `userId`/`secret` in the link don't match the template variables.
- **Password sign-in** is still available (expand "Sign in with a password") for
  accounts that have a password set.
