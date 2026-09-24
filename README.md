# RR Solar Solutions — Website + Lead System

Next.js 16 (App Router) + TypeScript + Tailwind CSS + MongoDB. Lead-generation site for RR Solar Solutions, Lucknow, with lead storage, email notifications and a protected admin dashboard.

**→ See [SETUP.md](./SETUP.md) for MongoDB, Resend and deployment steps.**

## Run it

```bash
# delete the partial node_modules folder first if one exists
cp .env.example .env.local    # then fill in the values
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

## Structure

```
app/
  layout.tsx              SEO metadata, global CSS
  page.tsx                section composition + LocalBusiness JSON-LD
  globals.css             Tailwind + brand classes (.btn-solar, .container-x…)
  api/contact/route.ts    lead capture: validate → save → notify
  api/admin/…             login, logout, list leads, update lead
  admin/page.tsx          dashboard (server-rendered)
  admin/LeadsTable.tsx    dashboard UI (client)
  admin/login/page.tsx    password login
  sitemap.ts robots.ts    generated automatically
middleware.ts             guards /admin and /api/admin/leads
  opengraph-image.tsx     auto-generated 1200×630 social preview card
  manifest.ts             PWA manifest
  admin/reports/          monthly report dashboard
  api/admin/reports/      .xlsx export endpoint
proxy.ts                  auth guard (Next 16 renamed this from middleware.ts)
components/               Header, Hero, Services, WhyUs, Segments, Process,
                          CtaBanner, Faq, Contact, Footer, WhatsAppFab,
                          Logo, Icon, Analytics, TrackedLink, Charts
lib/
  site.ts                 ALL business content — edit this one file
  lead-types.ts           client-safe types, statuses, ₹ formatter
  analytics.ts            typed track() helper; no-ops when analytics is off
  attribution.ts          first-touch source capture (UTM + referrer)
  auth.ts                 HMAC signed-cookie session (Web Crypto, edge-compatible)
  server/                 ← server-only. Never imported by a client component.
    db.ts                 cached, serverless-safe Atlas client
    leads.service.ts      the only module that touches the leads collection
    reports.service.ts    aggregation pipelines for the monthly report
    email.service.ts      Resend templates: team alert + customer auto-reply
```

## Why it's laid out this way

**`lib/server/` mirrors NestJS providers.** `leads.service.ts` is the only module that touches MongoDB; `reports.service.ts` is the only one that aggregates. The API routes are thin controllers that validate input and call a service. When staff logins and role permissions force a real backend, each file becomes an `@Injectable()` class with the same method signatures — the UI never knew where the data lived.

**`lib/lead-types.ts` is deliberately separate** so client components can import `LEAD_STATUSES` and the `Lead` type without dragging the MongoDB driver into the browser bundle. That isn't hypothetical: it broke the build the first time, because `LeadsTable.tsx` imported a type from the same file as the driver.

**Aggregation happens in MongoDB, not in Node.** `reports.service.ts` uses `$group` pipelines rather than fetching documents and reducing them in JavaScript, so reporting stays fast as the collection grows into thousands of leads.

## Editing content

Almost everything the client will want changed lives in `lib/site.ts`: phone numbers, email, address, the 8 services, the 6 why-us points, segments and the 4-step process. No component edits needed.

## Brand tokens (`tailwind.config.ts`)

| Token | Hex | Use |
|---|---|---|
| `navy` | `#0E2A5C` | headings, dark sections |
| `navy-900` | `#071634` | footer |
| `solar` | `#F5911E` | primary CTA, accents |
| `leaf` | `#2E9E4F` | success, eco cues |

## Lead capture

`POST /api/contact` validates (name, Indian mobile format, email), drops honeypot bot submissions, then **writes to MongoDB first** and only afterwards attempts notifications. A failed email never fails the request, because the lead is already stored.

Two emails go out via Resend:

- **Team alert** → `LEAD_NOTIFY_EMAIL`, with Call and WhatsApp buttons and `reply-to` set to the customer
- **Customer auto-reply** → confirmation with next steps (only if they gave an email)

Either can be switched off with `NOTIFY_TEAM=false` / `AUTO_REPLY=false`.

If `MONGODB_URI` is unset the site still runs and logs leads to the console — handy in dev, but set it before launch.

## Admin dashboard

`/admin` — password login, 8-hour session. Filter by status, search, expand a row for the full message with one-tap Call/WhatsApp, update status, add internal notes, export CSV.

Pipeline: **New → Contacted → Visit Booked → Quoted → Won / Lost**. Each lead also carries system size (kW), quote amount (₹), site-visit date and assigned technician.

## Monthly reports

`/admin/reports` — pick any month from the last 18.

- **Headline stats:** enquiries, conversion rate, closed value, open pipeline, kW sold
- **12-month trend** — all enquiries vs. won, side by side. A widening gap means leads are arriving but not closing.
- **Pipeline status** donut, **lead source**, **service mix**, **top locations**
- **Download Excel** — two-sheet `.xlsx`: a formatted summary and the full lead detail with autofilter

Conversion rate is measured against *decided* leads (won ÷ (won + lost)), not total leads. Counting leads still in the pipeline as failures would understate performance early in a month.

Revenue figures come from the **quote amount** you record against each lead — leave it blank until you've actually quoted, or the pipeline number is fiction.

## Project photos

`/admin/projects` — upload a photo, give it a **title** and **location**, optionally capacity in kW, service type and completion month. It appears on the website immediately under **Our Work**, with the location shown on each card.

Hide a project without deleting it using the **Hide** button; delete removes the photo permanently.

**Where the images live.** In MongoDB, not an external blob service. That needs no extra signup, behaves identically locally and in production, and a few dozen compressed photos sit comfortably inside the free tier. If the gallery grows into hundreds of images, move the `media` collection to S3 or Vercel Blob — only `storeImage`/`readImage` in `projects.service.ts` change.

**Two-stage compression, and there's a reason for both:**

1. **In the browser** (`lib/image-resize.ts`) — downscaled to 1600px JPEG before upload. Vercel rejects request bodies over ~4.5 MB, and phone photos are routinely 8–12 MB, so without this a normal photo would simply fail in production. It also makes uploads far quicker on a mobile connection.
2. **On the server** (sharp) — re-encoded to WebP at 1600px, quality 80. A 4032×3024 photo came out 95% smaller in testing. EXIF is stripped in the process, which matters because phone photos carry GPS coordinates of the customer's home.

The server-side pass is the real boundary: sharp throws on anything that isn't genuinely an image, so a renamed file never reaches the database.

Images are served from `/api/media/<id>` with `immutable` cache headers — a new upload always gets a new id, so they cache forever safely.

**Homepage caching.** The page is ISR with `revalidate = 300`, and the projects API calls `revalidatePath('/')` on every change, so edits appear at once while the page stays static and fast. If the database is unreachable the gallery is skipped rather than taking the site down.

## Database connection: blocked SRV DNS

`mongodb+srv://` needs a DNS SRV lookup over UDP port 53. Many office networks, ISPs and corporate resolvers refuse it — you see `querySrv ECONNREFUSED` and the admin panel goes down, intermittently, depending on which network you're on.

`lib/server/db.ts` handles this automatically:

1. Try the normal connection.
2. If it fails **specifically because of SRV resolution**, resolve `_mongodb._tcp.<cluster>` and the cluster's TXT record over **DNS-over-HTTPS** (Cloudflare, falling back to Google). DoH runs on port 443, so it works anywhere a browser works.
3. Rebuild the plain `mongodb://` seed-list URI the driver would have built itself — shard hosts, ports, `replicaSet`, `authSource`, TLS — and connect with that.
4. Cache the resolved URI so later connections skip the lookup entirely.

Auth failures and timeouts are *not* retried this way — only genuine SRV failures — so a wrong password still fails fast with a clear message instead of being masked.

`MONGODB_DNS_SERVERS` still works as a cheaper first attempt, but is now optional.

## Adding your real logo

Drop the file at **`public/logo.png`** (or `.jpg`). The quotation PDF picks it up automatically for both the letterhead and the watermark — no code change. Until then it draws a vector stand-in.

Use a square-ish transparent PNG, around 400×400, for the cleanest result.

## PDF quotations

Open a lead in `/admin`, fill in **system size (kW)** and **quote amount (₹)**, then either **Download PDF** or **Email to customer**. Emailing attaches the PDF via Resend and advances the lead to *Quoted* — but only after the email actually succeeds, so a send failure never leaves a lead falsely marked as quoted.

The PDF shows system size, generation and savings estimates, the pricing breakdown, subsidy, net cost, scope and terms, and signature blocks. All maths lives in `lib/quotation.ts` as pure functions — no I/O — so the same numbers can drive a future customer-facing savings calculator.

**Subsidy** (`SUBSIDY` in `lib/quotation.ts`): ₹30,000/kW for the first 2 kW, ₹18,000 for the third, capped at ₹78,000. Applied automatically only when the service matches rooftop or residential — commercial and industrial quotes get no subsidy line. Override per request with `?subsidy=false`.

**Estimates** (`ASSUMPTIONS`): 1,450 units per kWp per year and ₹8/unit. Tune these for your actual region and tariff. The PDF prints both assumptions verbatim and states the figures are indicative, not guaranteed.

Two deliberate choices worth knowing:

- The PDF says **"Rs."**, not **₹**. pdf-lib's standard fonts use WinAnsi encoding, which has no ₹ glyph — drawing it throws at render time. Embedding a Unicode TTF would fix it at the cost of shipping a font file.
- There's an explicit note that the subsidy is a **post-commissioning bank transfer, not an upfront discount**. Customers routinely assume otherwise and are unpleasantly surprised at payment time.

## Site visits

`/admin/visits` — everything with a visit date, grouped by day, with Today/Tomorrow labels, assignee, and one-tap Call/WhatsApp.

**Overdue** is called out separately at the top: the visit date has passed and the lead isn't marked Won. That's the list that quietly loses deals.

## Automated monthly report

`vercel.json` schedules `/api/cron/monthly-report` **daily** at 04:00 UTC (09:30 IST). The route exits immediately unless it's the 1st of the month.

That's deliberate: Vercel's Hobby plan restricts cron frequency, and a daily job that self-checks the date works on every plan, where a true monthly cron expression may not. Add `?force=1` to trigger it manually.

The email contains headline stats, source/service/city breakdowns, and the full Excel workbook attached. Protected by `CRON_SECRET`, which Vercel sends as a bearer token. If the secret is missing in production the route refuses to run rather than exposing business data.

## Logging

`lib/server/logger.ts`. Every API route, service and admin page uses it — there are no bare `console.*` calls left in the codebase.

**Two formats.** Pretty and colourised in development; single-line JSON in production so Vercel log drains (or Datadog, Axiom, whatever you add later) can parse it without regex.

```
INFO  lead.updated rid=a1b2c3 method=PATCH route=admin.leads.update leadId=66b1… fields=status,notes
WARN  auth.login_failed rid=d4e5f6 route=admin.login ip=203.0.113.9
ERROR lead.save_failed rid=g7h8i9 route=contact service=Rooftop Solar errCode=ECONNREFUSED
```

**Redaction is automatic and verified.** Anything whose key looks like a password, secret, token, api key, cookie or connection URI becomes `[redacted]`; connection strings keep the host but lose the password; emails become `r***h@example.com`; phone numbers become `******3210` — enough to match a support query, not enough to dial. It recurses into nested objects, and catches credentials embedded in otherwise innocent strings.

I tested this by logging a payload containing every real secret in this project and confirming not one appeared in the output.

**`rid`** is a per-request id on every line, so you can follow one request end to end. `log.timer()` emits duration in `ms` on completion.

**Stack traces are suppressed in production** — they're noisy and leak filesystem paths. Set `LOG_LEVEL=debug` to widen output; levels are `debug` / `info` / `warn` / `error`, defaulting to `info` in production and `debug` in development.

Events worth alerting on: `auth.login_failed` repeating (brute force), `lead.save_failed` (leads being lost), `lead.notify_failed` (emails not arriving), `cron.unauthorised`.

## Lead source attribution

`lib/attribution.ts` captures **first-touch** source in the browser (UTM parameters, then referrer classification) and stores it for the session. Someone who arrives from Google, browses for an hour, then submits is still credited to Google rather than "Direct".

First-touch, not last-touch, because the useful question is "which channel *found* me this customer" — that's what decides ad spend. The server re-validates the reported source against the allowed list, since anything sent from a browser can be forged.

## SEO

Server-rendered HTML, `ElectricalContractor` + `FAQPage` structured data, auto-generated OG image, sitemap, robots, canonical, `lang="en-IN"`, one `<h1>`. The FAQ section doubles as ranking content and rich-result eligibility — edit the questions in `lib/site.ts`.

## Analytics

GA4 and Microsoft Clarity, both free, both optional — set `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_CLARITY_ID` and they load; leave them empty and no script is ever fetched. Conversion events (`lead_submit`, `whatsapp_click`, `call_click`, `quote_cta_click`) fire through `lib/analytics.ts`, which silently no-ops when analytics is disabled.

**These are `NEXT_PUBLIC_*` vars — they're baked in at build time.** Set them in Vercel before deploying, and redeploy after changing them.

## Deploy

See [SETUP.md](./SETUP.md). Short version: push to GitHub → import on [vercel.com](https://vercel.com) → add the environment variables → add `rrsolarsolutions.in` as a domain.

## Before going live

- [ ] Replace the placeholder logo SVG in `components/Logo.tsx` with the real logo file (drop a PNG/SVG into `public/` and swap in `next/image`)
- [ ] Add real project photos to a gallery section (rooftop installs sell far better than stock imagery)
- [ ] Confirm the Google Maps embed pin in `components/Contact.tsx` matches the exact shop location
- [ ] Create/claim the Google Business Profile for "RR Solar Solutions, Lucknow" — biggest local-SEO lever
- [ ] Add GA4 + Meta Pixel before running ads
- [ ] Add an `og-image.jpg` (1200×630) to `public/` and reference it in `app/layout.tsx`

## Roadmap and when to move to NestJS

Scope agreed: **reports → quotations → site visits**. The schema for all three already exists (`systemKw`, `quoteAmount`, `visitDate`, `assignedTo`), so the next two features are additive, not structural.

| Feature | Status |
|---|---|
| Monthly reports + Excel export | **Built** |
| PDF quotations, emailed to the customer | **Built** |
| Site-visit scheduling | **Built** |
| Automated monthly report email | **Built** |
| **Staff logins with roles** | Not built — **this is the trigger to move to NestJS** |

The current single-password login is right for a small team sharing one credential. The moment you need "sales sees only their leads, technicians see only their visits, admin sees revenue", you need real user records, roles and guards — which is exactly what NestJS is good at, and what would be awkward to bolt onto API routes.

Because every database call already goes through `lib/server/*.service.ts`, that migration is a port rather than a rewrite: the services become `@Injectable()` classes, the routes become controllers, and the frontend keeps calling the same endpoints.

## Other ideas

- Solar savings calculator (bill → kW → subsidy → payback) as a lead magnet
- Individual `/services/[slug]` pages — 8 pages ranking separately in Lucknow search
- WhatsApp lead alerts via Meta Cloud API (fastest response = highest conversion)
- PM Surya Ghar subsidy explainer page
- Hindi/English toggle via `next-intl`
