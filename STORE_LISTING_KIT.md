# EDEN — STORE LISTING KIT (Google Play + Apple App Store)

Everything you need to fill both consoles, field by field. Written from what
the app ACTUALLY does (no inflated claims — reviewers verify).

**App facts used throughout**
- Name: **Eden** · Package: `com.eden.mobile` · Version 1.0.0
- Nigerian rental platform: browse → inspect (3 passes, ₦2,148 incl. 7.5% VAT, Paystack) → apply (NIN-verified) → rent into secure escrow → landlord paid on confirmation (48h auto-release) → dispute freezes funds
- Landlord side: listings, applications, escrow payouts
- Artisans for repairs · Support: in-app tickets, hotline 0811 178 3575, WhatsApp
- 18+ · Privacy: https://web-portal-eta-smoky.vercel.app/privacy · Terms: https://web-portal-eta-smoky.vercel.app/terms
- Entity: Shalom Datatech Ltd (CAC 9394286)

---

## 0. BEFORE YOU SUBMIT (verify these first)

- [ ] **Name conflict check** — search "Eden" in both stores' search. It's a common name; if it's taken, we need a suffix (e.g. "Eden: Rent Safely").
- [ ] **GEMINI_API_KEY** set on the `ai-assistant` EF in prod (the AI button is on every screen — reviewers WILL tap it).
- [ ] **Demo accounts work** — run `supabase/demo-accounts.sql`, sign in with both in a dev build.
- [ ] **Walk the tenant journey yourself** once (browse → inspection passes → apply) with the demo tenant.
- [ ] **48h auto-release**: after deploying the auto-release EF (step 15), confirm in its function logs that Supabase's scheduler runs it (every 15 min, no Postgres cron); optionally create a test escrow with a short deadline to watch it release.
- [ ] FCM V1 credentials in the Expo dashboard (blocks Android push in prod).
- [ ] Privacy + terms pages still live (they were).
- [ ] **Review your currently-active ads** (Dashboard → `advertisements` table): the app is on the hook for the ads it displays — any ad with restricted/inappropriate content or a broken target link gets the *app* rejected, not the advertiser.

---

## 1. APPLE — App Store Connect

### 1.1 App Information
| Field | Value |
|---|---|
| Name | Eden |
| Subtitle (≤30) | `Rent smarter. Pay safer.` |
| Primary language | English (US) |
| SKU | eden-app |
| Primary category | **Lifestyle** |
| Secondary category | Finance |
| Content rights | None |
| Price | Free (no in-app purchases — rent/inspection fees are real-world services paid via Paystack) |

### 1.2 App Review Information
**Contact:** your name, phone (with +234), email.

**Demo account 1** — Name: `Demo Tenant` · Email: `tenant.demo@edendemo.com` · Password: `EdenTenant#2026`
**Demo account 2** — Name: `Demo Landlord` · Email: `landlord.demo@edendemo.com` · Password: `EdenLandlord#2026`

**Review notes (paste verbatim):**
```
Eden is a rental platform for Nigeria.

IMPORTANT: reviewers cannot self-register — signup requires Nigerian NIN
(national ID) verification against NIMC. Use the demo accounts below; both
land directly in the app with identity verification already completed:

Tenant:   tenant.demo@edendemo.com  /  EdenTenant#2026
Landlord: landlord.demo@edendemo.com  /  EdenLandlord#2026

Suggested tenant flow: Home → open a listing → "Inspection Passes"
(₦2,148 for 3 passes, real Paystack payment) → book an inspection on the
listing → Apply → track the application under Applications.
Suggested landlord flow: Landlord dashboard → Listings / Applications / Escrow.

Payments: inspection passes and rent are paid with live Paystack charges
(no IAP). Rent goes into secure escrow and is released to the landlord when
the tenant confirms the property (automatic release after a 48-hour window).
The AI assistant is powered by Google Gemini. Push notifications use Expo.
The app shows third-party banner ads (labeled "Ad"); they are identical for
all users and not personalized.
```

**Attachment:** optional — a short Loom/video of the tenant flow.
**Export compliance:** **No** (exempt — TLS + SHA-256 only, no non-exempt crypto).

### 1.3 Age Rating questionnaire (answer honestly)
- Violence (all types), blood/gore, horror, medical, alcohol/tobacco, drugs, mature/suggestive, profanity, gambling (real or simulated), dating/romance, weapons: **None / No**
- **User-provided content (content from other users): YES** — property listings and artisan profiles are created by users and shown to other users; tenant↔landlord and tenant↔support chat is private 1:1. If asked for clarification: listings are structured listing data (title, price, photos, amenities), not social posts.
- **Unrestricted web access: No** (webview only loads your fixed privacy/terms pages)
- Real-time chat with strangers: **No** (1:1 with known parties only)

→ Expected result: **12+**. (If Apple pushes 17+ on the UGC answer, reply in App Review Information: the chat is private 1:1 and listings are structured data, and offer to add a report/flag button.)

### 1.4 App Privacy label (the questionnaire)
**Data collected** (tap exactly these):

| Data type | Collected | Purpose | Linked to identity | Used to track across companies |
|---|---|---|---|---|
| Name | Yes | App Functionality | Yes | No |
| Contact info (email, phone) | Yes | App Functionality | Yes | No |
| Photos or videos (profile photo, ID images, property photos) | Yes | App Functionality (KYC + listings) | Yes | No |
| Financial info (landlord bank account number) | Yes | App Functionality (payouts) + Fraud Prevention | Yes | No |
| Payment card info | **No** (handled by Paystack checkout) | — | — | — |
| Government ID (NIN + ID document images) | Yes | App Functionality (identity verification) | Yes | No |
| User content (application messages, complaints, support tickets, listings) | Yes | App Functionality | Yes | No |
| Browsing history (property views) | Yes | App Functionality | Yes | No |
| Location | **No** (no location permission requested) | — | — | — |
| Health / fitness | No | — | — | — |
| Diagnostics / crash logs | Yes | App Functionality (bug fixing) | No | No |
| Other data / device ID (push token) | Yes | App Functionality (push notifications) | Yes | No |
| Identifiers (ad ID) | No | — | — | — |

**Data used to track you across other companies' apps/websites: None.**
**Data used for targeted advertising: None.** ← stays correct even though the app
**shows third-party ads**: no user data is collected or used for ads, there is no
ad SDK, and ads are identical for all users (non-personalized). All in-app ad
banners are labeled "Ad".

**Third parties receiving data (for their own use / for your app's purposes):**
| Party | Data | Purpose |
|---|---|---|
| Supabase (app + auth + DB hosting) | account, contact, photos, government ID, financial, user content, browsing, diagnostics | App Functionality |
| Paystack | contact info, payment/financial info | App Functionality (payments & payouts) |
| Google (Sign in with Google; Gemini AI) | email + name (sign-in); chat prompts (AI assistant) | App Functionality |
| Expo (push notifications) | device/push token | App Functionality |
| NIMC / Smile ID | name, DOB, NIN | App Functionality (identity verification) |

### 1.5 Screenshots (REQUIRED sets)
- **iPhone 6.9"** (1320×2868) and **iPhone 6.5"** (1284×2778)
- **iPad Pro 13"** (2064×2752) and **iPad Pro 11"** (1668×2388) — `supportsTablet: true`, iPad set is mandatory
- Suggested 6 screens per device: Home (listings) · Property detail · Inspection pass payment · Escrow confirmation · Application sent · Landlord dashboard
- Descriptions (one line each, max 45 chars): e.g. "Browse listings", "Full property details", "Secure Paystack checkout", "Escrow protects your rent", "Apply in a few steps", "Landlord dashboard"

---

## 2. GOOGLE — Play Console

### 2.1 Account type (decision)
- **Org account (Shalom Datatech Ltd)** = recommended; no tester-wait, looks legit, survives ownership issues.
- **Personal account created after 13 Nov 2023** = you MUST run a **closed test with 12+ testers for 14 consecutive days** before production. If you're on personal, either do that or upgrade to org.

### 2.2 Store listing copy
**App name:** Eden
**Short description (≤80):**
```
Rent safer in Nigeria: inspect before you apply, escrow-protected rent.
```
**Keywords (≤80, commas, no spaces):**
```
rent,rentals,apartment,house,escrow,Lagos,Ibadan,property,Nigeria
```
**Full description (paste — honest, under 4000 chars):**
```
Finding a rental in Nigeria shouldn't feel like a gamble. Eden gives you the tools to verify before you pay: inspect the property first, apply with your verified identity, and pay rent through a secure escrow that only releases when you confirm.

HOW IT WORKS

1. BROWSE — View rental properties with photos, prices, fees and amenities, and filter by what you need.
2. INSPECT — Before you can apply, book an on-the-ground inspection. A pack of 3 inspection passes costs ₦2,148 (7.5% VAT included), paid securely through Paystack.
3. APPLY — Your NIN-verified profile and biodata go straight to the landlord. Track every application in the app.
4. PAY INTO ESCROW — Approved? Your rent is held in a secure escrow, not sent straight to anyone.
5. MOVE IN & CONFIRM — Inspect what you were promised. Confirm the property and the funds release to the landlord. If something's wrong, file a dispute and the funds freeze until it's resolved. There's a 48-hour window after move-in.

FOR LANDLORDS
List your property, review verified applicants, and receive payouts after the tenant confirms. Manage listings, applications, escrow and payouts from one dashboard.

ALSO INSIDE
• Local artisans — find plumbers, electricians and repair services, and request work
• Maintenance & complaints — open requests with photos and track them
• AI assistant — answers on prices, areas, tenant rights and how the app works (AI-generated, verify important details)
• In-app support — tickets, 24/7 hotline and WhatsApp

TRANSPARENT FEES
Prices shown in the app are what you pay — rent, the 5% platform service fee, a ₦1,000 escrow fee, plus any caution/legal/agency fees stated on the listing. No hidden charges.

Eligibility: 18+ only. Identity is verified with your NIN during sign-up.

Support: in-app Help & Support, or call/WhatsApp 0811 178 3575.
Privacy: web-portal-eta-smoky.vercel.app/privacy
```

### 2.3 Data Safety form (field by field)
**"Do you collect or share the following data types with third parties?"**

| Data type | Collected? | Shared? | Shared with | Why |
|---|---|---|---|---|
| Name | Yes | Yes | Supabase, NIMC/Smile ID | App is not functional without it (identity) |
| Email | Yes | Yes | Supabase, Paystack, Google (sign-in) | Sign-in + receipts |
| Phone number | Yes | Yes | Supabase, Paystack | Contact + payouts |
| Photo | Yes | Yes | Supabase, NIMC/Smile ID | Profile, ID verification, listings |
| Government ID | Yes | Yes | NIMC/Smile ID, Supabase | Identity verification |
| Financial info | Yes | Yes | Paystack, Supabase | Rent, fees, payouts |
| Payment card info | No (Paystack) | — | — | — |
| User content | Yes | Yes | Supabase | Applications, listings, support |
| Browsing history (property views) | Yes | Yes | Supabase | App functionality |
| App activity | Yes | Yes | Supabase | App functionality |
| Crash logs / diagnostics | Yes | No (or Supabase) | — | Fix bugs |
| Device ID | Yes | Yes | Supabase, Expo | Push notifications |
| Location | **No** | — | — | — (permission not requested) |

**Ads (separate block in the form):**
- Your app contains ads? **Yes** — third-party ads shown as in-app banners + push notifications.
- Ads personalized using user data? **No** — identical ads shown to all users, no targeting, no profiling.
- Which SDK serves the ads? **None** — self-served from your own Supabase `advertisements` table (no AdMob/Facebook/Unity SDK), so **no extra data-sharing entries are needed for ads**.
- All in-app ad banners carry a visible "Ad" label (Play requirement).

For every "Yes": **"Is this use necessary for the app to work?" = YES.**
**Encryption in transit: Yes. At rest: Yes.**
**Retention:** "We retain data while the account is active; on deletion, personal data is deleted and financial transaction records are kept anonymized as required by law."
**Deletion mechanism:** **In the app** — "Profile → Account → Delete My Account" (and via support). ← this now genuinely works (batch 23).
**"Do you allow users to delete their data?" Yes. "Do you respond to rights requests?" Yes (support).**

**Permission justifications (app content screen):**
- Camera: "profile photo, ID document photos for verification, property and maintenance photos"
- Photos/media (`READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE`): "select photos from your gallery for listings, ID verification and support"
- Notifications: "rental updates, application decisions, escrow deadlines"
- Vibration: "UI feedback"

### 2.4 Content rating questionnaire
- Violence, alcohol/tobacco/drugs, sex (nude/suggestive): **None**
- **Profanity: Mild** (private 1:1 chats between users)
- **Chat/communications: Yes** — "1:1 private chat with known users (tenant ↔ landlord, tenant ↔ support); no public rooms"
- **Real-world purchases: Yes** — "rent and inspection passes paid via Paystack (external payment for real-world goods/services — not in-app purchases)"
- **Advertising: YES** — "In-app banner ads + ad push notifications. **Not personalized** — the same ads are shown to all users; no user data is used for ad targeting. Self-served from our own database (no AdMob or other ad SDK). All banners are clearly labeled 'Ad'."
- **Location data collected: No**
- **Subscriptions: No**

→ Expected result: **12+** (private chat + real payments).

### 2.5 Other Play fields
- **Target audience: adults/teens per questionnaire.**
- **App content → "Notes to reviewer" (paste):**
```
Demo accounts (signup requires Nigerian NIN verification, so reviewers
cannot self-register — please use these):

Tenant:   tenant.demo@edendemo.com  /  EdenTenant#2026
Landlord: landlord.demo@edendemo.com  /  EdenLandlord#2026

Tenant flow: Home → open a listing → Inspection Passes (live Paystack,
₦2,148) → book inspection → Apply.
Landlord flow: Landlord dashboard → Listings / Applications / Escrow.
The AI assistant uses Google Gemini. Push notifications use FCM.
```
- **Permissions:** Data Safety above.
- **Target API: 36** (set — ahead of the Aug 31 2026 requirement).
- **Screenshots:** phone 6" (1080×1920) + 6.3–6.4" (1080×2340); tablet 10" (1600×2560) since the app supports tablets. Icon 512×512, feature graphic 1024×500.
- **AAB** via `eas build -p android --profile production` (EAS projectId already in app.json).

### 2.6 Android developer verification (enforcement starts 30 Sep 2026)
Have ready: org registration docs (CAC certificate for Shalom Datatech Ltd), your real name + address, a video-ID step may be requested. Org accounts = faster approval than personal.

---

## 3. PRODUCTION DEPLOY STEPS (status list — check off as done)

1. ☐ FCM V1 credentials → Expo dashboard `israelite125/eden-home` (blocks Android prod push)
2. ☐ Supabase Auth → **Google** sign-in enabled
3. ☐ Supabase Auth → **Apple** sign-in (Services ID + Key ID) + test in an iOS dev build
4. ☐ `.env`: real `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
5. ☐ Run `20260825000000_make_request_images_public.sql` (SQL Editor)
6. ☐ Deploy `add-property` EF
7. ☐ Run `20260826000000_auto_sync_property_status.sql` + `select public.sync_property_statuses();`
8. ☐ Run `20260827000000_inspection_passes.sql`
9. ☐ Deploy `initialize-inspection-pack` → `verify-inspection-pack` → `book-inspection` (LAST)
10. ☐ Run `20260828000000_simplify_ad_push.sql` — adds the `push_sent_at` flag to each ad and removes all the earlier ad-push/auto-release cron machinery (safe no matter what you already ran). Heads-up: existing active ads then get pushed one per 15 min (catch-up); to skip that: `update public.advertisements set push_sent_at = now() where push_sent_at is null;`
11. ☐ `supabase functions deploy send-ad-notification --no-verify-jwt --cron "*/15 * * * *"` (one command — Supabase schedules it)
12. ☐ Env on `send-ad-notification`: `EXPO_PUSH_ACCESS_TOKEN` (same token as your `send-push-notification`). That's the whole setup — no secrets, no copy-paste values. New ads push automatically within 15 min of going active (or press Invoke to push now). Check reach: `select title, push_sent_at, push_users from public.advertisements order by created_at desc limit 5;`
13. ☐ Unschedule any LEFTOVER old ad cron jobs of your own (the pre-existing ones, if any): `select jobid, jobname from cron.job;` → `select cron.unschedule('<name>');` — else double-sends
14. ☐ Run `20260827020000_app_settings.sql` · toggle: `update public.app_settings set value='on'/'off' where key='maintenance_mode';` · announce builds: set `latest_version` (+ `release_notes`, store URLs)
15. ☐ `supabase functions deploy auto-release-escrow --no-verify-jwt --cron "*/15 * * * *"` + env `PAYSTACK_SECRET_KEY` (same key your other Paystack functions use). Also scheduled by Supabase — no DB step, no secret.
16. ☐ `supabase functions deploy delete-account` (normal JWT — no extra envs)
17. ☐ Run `supabase/demo-accounts.sql` in production → test BOTH logins in a dev build
18. ☐ Verify `GEMINI_API_KEY` env on the `ai-assistant` EF

---

## 4. LEGAL-DOC FOLLOW-UPS (your web pages, not code)

- [ ] Privacy policy still says "SMS/push notification gateways" — no SMS provider exists in the app. Either remove the SMS mention or build SMS. (Apple/Play reviewers can be told your docs match the app.)
- [ ] Terms: "within 1 business day"-style payout promises — align with the real "a few business days" wording now used in the app.
- [ ] **eden.ng is NOT yours** (for sale on GoDaddy) — do not list it as your website in either console. Use `https://web-portal-eta-smoky.vercel.app` (or a domain you actually own) as the "website" field.
