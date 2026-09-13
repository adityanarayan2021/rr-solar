# Setup Guide — MongoDB, Email, Admin, Deploy

Follow in order. Total time: about 45 minutes, all on free tiers.

---

## 1. MongoDB Atlas (free M0 cluster)

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com) — no card required.
2. **Build a Database → M0 Free**. Pick region **Mumbai (ap-south-1)** — lowest latency for Lucknow users.
3. **Database Access → Add New Database User.** Username `rrsolar`, generate a strong password, role *Read and write to any database*. Copy the password now; Atlas won't show it again.
4. **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**. Vercel's serverless functions don't have fixed IPs, so this is required. Your database is still protected by the username, password and TLS.
5. **Database → Connect → Drivers → Node.js** and copy the connection string. It looks like:

```
mongodb+srv://rrsolar:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with the real password. If the password contains `@ : / ? # [ ] %`, URL-encode it (e.g. `@` → `%40`) or the connection silently fails.

Collections and indexes are created automatically on the first lead — nothing to set up manually.

---

## 2. Resend (email notifications)

1. Sign up at [resend.com](https://resend.com). Free tier: **3,000 emails/month, 100/day** — far above what a lead form needs.
2. **API Keys → Create API Key** (sending permission). Copy it.
3. **Domains → Add Domain → `rrsolarsolutions.in`.** Resend gives you DNS records — add them at your domain registrar:
   - **SPF** (TXT) — proves your server may send as your domain
   - **DKIM** (TXT/CNAME) — cryptographically signs your mail
   - **DMARC** (TXT) — tells inboxes what to do with failures

   **Do not skip this.** Without SPF and DKIM your lead alerts land in spam, which defeats the whole point.

4. Wait for Resend to show the domain as *Verified* (usually minutes, sometimes hours).
5. Set `MAIL_FROM="RR Solar Solutions <noreply@rrsolarsolutions.in>"`.

Before the domain verifies you can test with `onboarding@resend.dev`, but that only delivers to your own signup address.

**Why `noreply@` and not the customer's address:** the code sends *from* your domain and sets `reply-to` to the customer. Sending *from* a visitor's address looks like spoofing and gets filtered. Hitting Reply in Gmail still goes to the customer.

---

## 3. Admin credentials

```bash
# Generate a random signing secret
openssl rand -base64 32
```

On Windows without openssl, run in PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Set `AUTH_SECRET` to that value and `ADMIN_PASSWORD` to a long password you'll share with your team. Changing `AUTH_SECRET` instantly logs everyone out — useful if a laptop goes missing.

Generate a second random value for `CRON_SECRET` the same way — that's what authorises the automated monthly report.

---

## 3b. Check the quotation figures before sending any to a customer

Open `lib/quotation.ts` and confirm these against your actual business:

```ts
SUBSIDY     // ₹30,000/kW first 2 kW, ₹18,000 third kW, ₹78,000 cap
ASSUMPTIONS // 1,450 units per kWp/year, ₹8 per unit tariff
```

The subsidy slabs reflect the PM Surya Ghar scheme as researched in August 2026 — **government rates change, so verify at [pmsuryaghar.gov.in](https://pmsuryaghar.gov.in) before your first customer quotation.** The generation and tariff figures are regional estimates that should be tuned to Lucknow conditions and your customers' actual slab rates.

These numbers go directly onto a document a customer may treat as a commitment. Get them right before the first send, not after.

---

## 4. Analytics — both free, both optional

### Google Analytics 4 (traffic and conversions)

1. [analytics.google.com](https://analytics.google.com) → create a property for `rrsolarsolutions.in`.
2. **Admin → Data Streams → Web** → add your site → copy the **Measurement ID** (`G-XXXXXXXXXX`).
3. Set `NEXT_PUBLIC_GA_ID`.

### Microsoft Clarity (heatmaps and session recordings)

[clarity.microsoft.com](https://clarity.microsoft.com) — **free forever, no traffic limits, no paid tier**. Create a project, copy the Project ID, set `NEXT_PUBLIC_CLARITY_ID`.

Clarity is worth more than GA4 in the early days: you can *watch* a recording of someone abandoning the form and see exactly which field lost them. Because the code tags sessions with events, you can filter to "only sessions where someone submitted a lead" and compare against those who didn't.

### Events already wired

| Event | Fires when |
|---|---|
| `lead_submit` | form submitted successfully — **your primary conversion** |
| `lead_submit_failed` | submission errored |
| `whatsapp_click` | any WhatsApp button (tagged with location: hero, header, floating button…) |
| `call_click` | any phone number tapped |
| `quote_cta_click` | "Book Free Site Survey" / "Request a Quotation" |

In GA4, mark `lead_submit` as a **Key Event** (Admin → Events) so it shows as a conversion. That's what lets you measure cost-per-lead if you ever run Google Ads.

### Google Search Console (free, and the one people skip)

[search.google.com/search-console](https://search.google.com/search-console) → add `rrsolarsolutions.in` → verify (paste the HTML-tag token into `NEXT_PUBLIC_GOOGLE_VERIFICATION`) → submit `https://www.rrsolarsolutions.in/sitemap.xml`. This is how you find out which searches you're actually appearing for in Lucknow.

> **Build-time gotcha:** every `NEXT_PUBLIC_*` variable is baked into the JavaScript bundle when the site is *built*, not read when it runs. Add them in Vercel **before** deploying — and after changing one, redeploy or nothing changes. I hit this during testing: setting them at start-up produced a page with no analytics at all.

---

## 5. Local run

Copy `.env.example` to `.env.local`, fill in the values, then:

```bash
npm install
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin

Submit a test enquiry, then confirm it appears in the admin table.

---

## 6. Deploy to Vercel

1. Push the folder to a GitHub repository.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Next.js is auto-detected; no build settings to change.
3. **Settings → Environment Variables** — add every variable from `.env.local` for the Production environment: `MONGODB_URI`, `MONGODB_DB`, `RESEND_API_KEY`, `MAIL_FROM`, `LEAD_NOTIFY_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`.
4. Deploy.
5. **Settings → Domains → Add `rrsolarsolutions.in`**, then update the DNS records at your registrar as Vercel instructs. HTTPS is issued automatically.

Environment variables are only read at build/boot — after changing one, redeploy.

---

## 7. SEO checklist for launch day

Already built into the code:

- Server-rendered HTML — Google sees full content, not an empty shell
- `ElectricalContractor` structured data with address, geo coordinates, opening hours, service catalogue and area served (Lucknow + UP)
- `FAQPage` structured data on 7 real buying questions — these can win expandable rich results in search
- Auto-generated Open Graph image, so WhatsApp and LinkedIn previews show a branded card
- `sitemap.xml`, `robots.txt`, canonical URL, `lang="en-IN"`, a single `<h1>`, semantic headings
- Analytics loaded *after* the page is interactive, so they don't drag down Core Web Vitals (a ranking signal)

Still on you, and these matter more than any code:

1. **Google Business Profile** — claim "RR Solar Solutions, Lucknow". For a local service business this outranks almost everything else. Add photos, hours, service area.
2. **Real project photos.** Stock solar images convert poorly and add nothing to SEO. Photos of your actual Lucknow installs do both.
3. **Customer reviews** on the Business Profile. Ask every happy customer.
4. Submit the sitemap in Search Console and check the **Rich Results Test** at [search.google.com/test/rich-results](https://search.google.com/test/rich-results) — paste your live URL and confirm both structured-data blocks are detected.
5. **NAP consistency** — Name, Address, Phone identical everywhere online (site, Business Profile, JustDial, IndiaMART). Mismatches genuinely hurt local ranking.

Do not add fake review or rating schema. Google penalises self-serving `aggregateRating` markup, and it's the most common way local sites get their rich results pulled.

---

## How a lead actually flows

```
Visitor submits form
        │
        ├─ validate (name, Indian mobile, email) ── invalid ─→ inline error, nothing saved
        ├─ honeypot check ───────────────────────── bot ─────→ fake success, nothing saved
        │
        ├─ 1. SAVE TO MONGODB  ← source of truth
        │      └─ fails? → visitor is told to call you. Nothing is silently lost.
        │
        └─ 2. NOTIFY (best effort, never blocks the response)
               ├─ team alert  → rrsolarsolutions2@gmail.com, reply-to = customer
               └─ auto-reply  → the customer, if they gave an email
```

The ordering is the important part. Email is unreliable — inboxes go down, keys expire, quotas run out. Because the lead is written to MongoDB *before* any email is attempted, a failed notification costs you a ping, not a customer. Every lead is recoverable from `/admin` even if no email ever arrives.

---

## Admin dashboard

`/admin`, password-protected, session lasts 8 hours.

- Filter by status: New / Contacted / Quoted / Won / Lost
- Search across name, phone, email, city, service
- Click a row to expand: full message, one-tap Call and WhatsApp buttons
- Change status and add internal notes (notes save on blur)
- **Export CSV** of the current filtered view

Security: `middleware.ts` guards `/admin/*` and `/api/admin/leads/*`. The session is an HMAC-SHA256 signed, httpOnly cookie — a forged or tampered cookie is rejected (verified). Wrong-password attempts are delayed 600 ms to blunt brute forcing.

---

## Verified vs. not verified

**Tested and passing on my side:**

- Production build compiles clean, all 15 routes generate
- `/admin/reports` and the export endpoint are auth-guarded (307 / 401 when logged out, 200 when logged in)
- Excel export produces a valid workbook: 2 sheets, branded headers, 14 columns, autofilter, ₹ number format — opened and inspected the generated file, not just its status code
- Reports UI rendered against mock data: charts draw (2 SVGs, 6 donut segments, 24 trend bars), Indian currency formats correctly (₹23,40,000 — lakh grouping, not ₹2,340,000)
- **Quotation PDF generated and visually inspected** — see `quotation-sample.pdf` / `.png`. Valid PDF 1.7, correct layout. Caught and fixed a logo collision (fixed x-offsets instead of measured text widths) that only showed up on render.
- **Subsidy maths verified against the slabs:** 1 kW → ₹30,000 · 2 kW → ₹60,000 · 2.5 kW → ₹69,000 · 3 kW → ₹78,000 · 5 kW and 10 kW → ₹78,000 (capped). Commercial quote correctly gets zero subsidy.
- Site-visits view rendered against mock data: day grouping, Today/Tomorrow labels, overdue detection, unassigned fallback
- New routes are auth-guarded: `/admin/visits` → 307, quotation route → 401
- Cron auth: no header → 401, wrong secret → 401, correct secret → skips politely when it isn't the 1st, `?force=1` proceeds to the send step
- OG image renders (1200×630 PNG, 95 KB); `sitemap.xml`, `robots.txt`, `manifest.webmanifest` all serve correctly
- Both JSON-LD blocks present in the HTML (`ElectricalContractor` + `FAQPage`); canonical, `og:image`, `twitter:card`, `lang="en-IN"`, exactly one `<h1>`
- GA4 and Clarity scripts inject when their env vars are set at build time, and the site renders identically with analytics absent
- Unauthenticated `/admin` → 307 redirect to login; unauthenticated API → 401
- Forged session cookie → rejected
- Correct password → session set, `/admin` returns 200; logout → access revoked
- Valid lead accepted; `+91 9580446571` format accepted
- Rejected: short numbers, landline `0522…`, malformed email
- Honeypot submission returns fake success and stores nothing

**Not tested — you must verify:**

- Actual MongoDB reads/writes, including the report aggregation pipelines. My sandbox couldn't reach MongoDB's binary download server, so the driver code has never run against a live database. Everything around it is tested; the queries themselves are not.
- Real email delivery via Resend (needs your API key and a verified domain).

### First-run test script

Once `MONGODB_URI` is set locally, do this in order — it exercises every untested path in about five minutes:

1. Submit the website form → expect the success message.
2. Open `/admin` → the lead should appear with status **New** and a source of **Direct**.
3. Open the lead, set status **Won**, system size `3`, quote amount `195000`.
4. Open `/admin/reports` → enquiries `1`, conversion `100%`, closed value `₹1,95,000`, `3 kW` sold.
5. Click **Download Excel** → confirm both sheets and that the quote shows as ₹1,95,000.
6. Visit `/?utm_source=google&utm_medium=cpc&utm_campaign=test`, submit another lead, and confirm it records as **Paid Ads** in the source breakdown.
7. Set a visit date on a lead → check `/admin/visits` groups it under the right day.
8. On the same lead, click **Download PDF** → confirm the quotation matches `quotation-sample.pdf`.
9. With `RESEND_API_KEY` set, click **Email to customer** → confirm the PDF arrives and the status flips to *Quoted*.
10. Trigger the report email manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/monthly-report?force=1"
```

If step 4 or 5 shows zeros while step 2 showed the lead, the aggregation pipeline is the problem — tell me and I'll fix it.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Form says "Something went wrong. Please call us" | `MONGODB_URI` wrong, or Atlas Network Access doesn't allow `0.0.0.0/0` |
| Leads save but no email | `RESEND_API_KEY` missing, or domain not verified in Resend |
| Emails land in spam | SPF/DKIM DNS records missing or not propagated |
| `/admin` login says "not configured" | `ADMIN_PASSWORD` or `AUTH_SECRET` missing in Vercel env vars |
| Logged out constantly | `AUTH_SECRET` differs between deployments, or wasn't set for Production |
| Atlas connection fails with a valid password | Special characters in the password need URL-encoding |
| Reports show leads but ₹0 everywhere | Quote amount not filled in on any lead — revenue comes from that field |
| Every lead shows source "Direct" | Normal for people typing the URL directly; check a visit with `?utm_source=…` to confirm capture works |
| Excel download does nothing | You're logged out — the export route requires a session |
