# Backend scaffold — real authentication & server-side data

This folder is a **ready-to-activate scaffold** that closes the two findings the
static app cannot fix on its own:

- **#1 — Cosmetic auth.** Today the PIN is checked in client JavaScript and the
  data lives in `localStorage`, so anyone with dev tools bypasses it. This
  scaffold moves authentication to **Supabase Auth (JWT)** and authorisation to
  **Postgres Row-Level Security**, so the *database* refuses unauthorised access
  regardless of what the browser does.
- **#5 — Sensitive data on the client / editable audit trail.** Financials,
  supplier bank details and the audit log move into Postgres. The `audit_log`
  table is **INSERT-only** (UPDATE/DELETE blocked by a trigger), so it becomes
  tamper-evident.

Nothing here is wired into `index.html` yet — the live app is unchanged until
you choose to switch it on.

## Files
| File | Purpose |
|------|---------|
| `schema.sql` | Postgres tables, roles, RLS policies, immutable audit log |
| `auth.js` | Drop-in browser adapter (inert until you add your Supabase keys) |

## Activation (about 30–45 min)

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. **Run the schema:** SQL Editor → paste `schema.sql` → Run.
3. **Create users:** Authentication → Users → invite one account per staff
   member (email + password). Magic-link or SSO also work.
4. **Assign roles:** for each user, copy their UUID and run:
   ```sql
   insert into profiles (id, full_name, role)
   values ('<uuid>', 'Jarrod Hulo', 'Managing Director');
   ```
5. **Add the keys:** open `auth.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   (Project Settings → API). The anon key is safe in the browser — RLS, not the
   key, decides access. **Never** put the `service_role` key in front-end code.
6. **Load the SDK + adapter** in `index.html` `<head>` (and allow the host in
   the CSP — see note below):
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="backend/auth.js"></script>
   ```
7. **Swap the login + data layer** in `js/app.js`:
   - Replace the PIN screen's `tryLogin()` with a real email/password form that
     calls `await Backend.signIn(email, password)`.
   - On boot, call `Backend.init()` and gate the app on
     `await Backend.currentUser()` instead of the `sessionStorage` flag.
   - Replace `DB.*` array reads with `await Backend.list('purchases')` etc., and
     the `save*` handlers' `DB.*.push()` + `saveDB()` with
     `await Backend.insert('purchases', row)`.
   - Replace `audit(...)` with `await Backend.log(...)`.

### CSP note
After activation, update the `connect-src` and `script-src` directives (in
`index.html`, `vercel.json`, and `serve.js`) to allow your Supabase project, e.g.:
```
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
connect-src 'self' https://<your-project>.supabase.co wss://<your-project>.supabase.co;
```

## What this fixes vs. doesn't
- ✅ Real per-user login; the PIN is no longer the security boundary.
- ✅ Server-enforced authorisation — a hacked browser still can't read another
  role's data or rewrite history.
- ✅ Financial data and audit log held server-side; audit log is append-only.
- ⚠️ The four in-codebase fixes (XSS escaping, backup validation, CSP/SRI,
  input validation) still apply and are already implemented in the static app —
  keep them; they protect the authenticated UI too.
