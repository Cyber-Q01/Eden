# EdenHome Security & Performance Audit Report

## 1. Security Findings & Actions Taken

### 1.1 Privilege Escalation (FIXED)
- **Issue:** The `public.handle_new_user()` trigger blindly accepted the `role` from auth metadata, allowing any user to register as an `ADMIN`.
- **Fix:** Updated the trigger in `supabase_schema.sql` to explicitly restrict role assignment. Any attempt to sign up as `ADMIN` now defaults to `TENANT`.

### 1.2 Broken Access Control (FIXED)
- **Issue:** The RLS policy for the `users` table allowed users to update their own record without restricting the `role` column.
- **Fix:** Tightened the `UPDATE` policy on `public.users` in `supabase_schema.sql` to prevent users from changing their own `role`.

### 1.3 Hardcoded Credentials (FIXED)
- **Issue:** `mailer.js` contained plaintext SMTP credentials.
- **Fix:** Replaced hardcoded credentials with `process.env` variables.

### 1.4 Insecure ID Verification Flow (HIGH)
- **Issue:** `app/profilesetup/id-verification.tsx` mocks the Smile ID verification process. This allows users to bypass identity checks entirely.
- **Recommendation:** Implement the production flow as described in the `README.md`, using backend-generated session URLs and webhooks for status verification.

### 1.5 Dependency Vulnerabilities (FIXED)
- **Action:** Ran `npm audit fix` and resolved the high-severity vulnerability in `@xmldom/xmldom`.
- **Remaining Issues:** Some moderate vulnerabilities remain in the Expo ecosystem that require breaking-change updates to resolve fully.

---

## 2. Performance & Scalability

### 2.1 Missing Database Indexes (FIXED)
- **Issue:** Several tables lacked indexes on foreign keys and frequently queried columns.
- **Fix:** Added the following indexes in `supabase_schema.sql`:
    - `idx_properties_landlord_id`
    - `idx_properties_created_at`
    - `idx_favorites_user_id`

---

## 3. Code Robustness

### 3.1 Unhandled Exceptions & Validation (FIXED)
- **Action:** Improved JSON parsing safety in the `submit-application` Edge Function to prevent crashes on malformed requests.
- **Improvement:** Verified that the frontend uses a central `handleError` utility and `try-catch` blocks for most async operations.

---

## 4. Recommendations for Production
1. **Secret Management:** Ensure all environment variables are correctly set in the Supabase dashboard and your hosting environment.
2. **Production Identity Verification:** Replace the mock verification in `id-verification.tsx` with the real Smile ID hosted web flow.
3. **Rate Limiting:** Implement rate limiting on sensitive Edge Functions to prevent abuse.
