# Deployment Guide

About 30 minutes end to end.

---

## 0. Before you start — two things that must happen first

**Rotate the MongoDB password.** The current one was shared in a chat. Atlas → **Database Access** → Edit user → **Edit Password** → generate → update `MONGODB_URI` everywhere.

**Change the admin password.** Same reason. Any long random string; update `ADMIN_PASSWORD`.

**Atlas Network Access must allow `0.0.0.0/0`.** Vercel's functions have no fixed IP addresses, so an IP allowlist cannot work. Atlas → **Network Access** → Add IP Address → **Allow Access from Anywhere**. The database is still protected by username, password and TLS.

---

## 1. Put the code on GitHub

```bash
cd Documents\rr-solar
git init
git add .
git commit -m "RR Solar Solutions website"
```

Check that `.env.local` is **not** in the commit:

```bash
git status --short
git ls-files | findstr env
```

You should see `.env.example` only. If `.env.local` appears, stop — `.gitignore` isn't working and you'd publish your database password.

Create a **private** repo at [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/rr-solar.git
git branch -M main
git push -u origin main
```

---

## 2. Pick a host

**Vercel Hobby is free but explicitly non-commercial.** A solar company's website is a business site, so the correct plan is **Pro at about $20/month**. Vercel treats "commercial" broadly — a site that generates business for anyone involved counts. Running a client-facing business site on Hobby risks suspension.

Alternatives if $20/month isn't wanted right now:

| Host | Notes |
|---|---|
| **Vercel Pro** | Best Next.js support, zero config, ~$20/mo. Recommended. |
| **Netlify** | Comparable pricing; Next.js support is good but slightly behind Vercel's. |
| **Railway / Render** | Runs it as a normal Node server. Usage-based, often cheaper. No serverless body-size limit. |
| **A VPS (Hostinger, DigitalOcean)** | ~₹400–800/month, full control, but you manage Node, PM2, Nginx and SSL yourself. |

The instructions below are for Vercel. The others follow the same shape: connect the repo, set environment variables, deploy.

---

## 3. Import the project on Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub
2. **Add New → Project** → import `rr-solar`
3. Framework is auto-detected as Next.js — **change nothing** in build settings
4. **Do not deploy yet.** Add the environment variables first (next step), or the first build ships without analytics and the site errors on `/admin`.

---

## 4. Environment variables

**Settings → Environment Variables.** Add each for the **Production** environment (tick Preview too if you want preview deploys to work).

### Required

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas string **with the rotated password** |
| `MONGODB_DB` | `rrsolar` |
| `ADMIN_PASSWORD` | Your new admin password |
| `AUTH_SECRET` | From `.env.local` (or regenerate: `openssl rand -base64 32`) |

### Recommended

| Variable | Value |
|---|---|
| `CRON_SECRET` | From `.env.local` — authorises the monthly report job |
| `RESEND_API_KEY` | From resend.com, for lead alert emails |
| `MAIL_FROM` | `RR Solar Solutions <noreply@rrsolarsolutions.in>` once the domain is verified in Resend |
| `LEAD_NOTIFY_EMAIL` | `rrsolarsolutions2@gmail.com` |
| `NOTIFY_TEAM` | `true` |
| `AUTO_REPLY` | `true` |

### Optional

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity project id |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Search Console token |
| `NEXT_PUBLIC_ENABLE_CALL` | `false` (currently hidden) |
| `NEXT_PUBLIC_ENABLE_EMAIL_QUOTATION` | `false` (currently hidden) |
| `LOG_LEVEL` | `info` in production |

### Do NOT copy across

**`MONGODB_DNS_SERVERS`** — that exists only to work around your local network blocking MongoDB SRV lookups. Vercel's DNS resolves SRV records correctly, and overriding the resolver there adds latency for no benefit.

> **`NEXT_PUBLIC_*` variables are baked in at build time.** Set them *before* deploying, and **redeploy** after changing any of them or nothing will change. The server-side ones (`MONGODB_URI`, `RESEND_API_KEY`, `NOTIFY_TEAM`, `AUTO_REPLY`, `LOG_LEVEL`) are read at runtime and only need a restart.

---

## 5. Deploy

Hit **Deploy**. First build takes 2–4 minutes.

You'll get a URL like `rr-solar-abc123.vercel.app`. Test it before attaching the real domain.

---

## 6. Connect rrsolarsolutions.in

**Settings → Domains → Add** `rrsolarsolutions.in`. Vercel shows the DNS records to create at your domain registrar — usually:

- `A` record for `@` → `76.76.21.21`
- `CNAME` for `www` → `cname.vercel-dns.com`

DNS propagation takes anywhere from minutes to a few hours. HTTPS is issued automatically once it resolves.

Also add `www.rrsolarsolutions.in` and set one as the redirect target so you don't split SEO across two hostnames.

---

## 7. Post-deployment checklist

Work through these on the live URL:

- [ ] Homepage loads, all sections render
- [ ] Submit the contact form → success message
- [ ] Lead appears in `/admin` (log in with your new password)
- [ ] Lead alert email arrived (if Resend is configured)
- [ ] `/admin/projects` → upload a photo → appears under **Our Work** on the homepage
- [ ] `/admin/reports` → loads, **Download Excel** works
- [ ] `/admin/visits` → loads
- [ ] Log out → `/admin` redirects to login (not an error loop)
- [ ] `https://rrsolarsolutions.in/sitemap.xml` and `/robots.txt` respond
- [ ] Paste the URL into WhatsApp — the branded preview card should appear
- [ ] Run the live URL through [Rich Results Test](https://search.google.com/test/rich-results) — LocalBusiness and FAQ should both be detected

Then trigger the monthly report manually to prove it works:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://rrsolarsolutions.in/api/cron/monthly-report?force=1"
```

---

## 8. Cron job

`vercel.json` already schedules `/api/cron/monthly-report` daily at 04:00 UTC (09:30 IST). The route exits immediately unless it's the 1st of the month.

Vercel picks this up automatically on deploy — check **Settings → Cron Jobs** to confirm it registered. Cron jobs require a paid plan.

---

## 9. After launch — the non-code work that matters more

1. **Google Business Profile** for "RR Solar Solutions, Lucknow". For a local service business this outranks almost anything the website can do alone.
2. **Submit the sitemap** in [Search Console](https://search.google.com/search-console).
3. **Real project photos** via `/admin/projects` — they convert far better than stock imagery.
4. **Replace the logo** — `components/Logo.tsx` is a hand-coded approximation of your banner, not the real artwork.
5. **Verify the subsidy figures** in `lib/quotation.ts` before sending any customer quotation.

---

## Deploying updates

```bash
git add .
git commit -m "describe the change"
git push
```

Vercel rebuilds automatically on every push to `main`. Roll back instantly from **Deployments → ⋯ → Promote to Production** on any earlier build.

---

## Known platform limits

| Limit | Effect |
|---|---|
| Request body ~4.5 MB | Photo uploads are downscaled in the browser first, so this is already handled |
| Function timeout | Quotation PDF and Excel export set `maxDuration = 60`; fine on Pro |
| Atlas M0 storage 512 MB | Roughly 2,000+ compressed photos. Upgrade or move `media` to S3 if you ever approach it |
| Resend free tier | 3,000 emails/month, 100/day — far above a lead form's needs |

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `/admin` shows "Can't reach the database" | Atlas Network Access isn't `0.0.0.0/0`, or the password wasn't updated after rotating |
| Build fails on `sharp` | Make sure `sharp` is in `dependencies` (it is) and `package-lock.json` was committed |
| Analytics missing | `NEXT_PUBLIC_*` set after the build — redeploy |
| Emails not arriving | Domain not verified in Resend, or SPF/DKIM records not added |
| Cron never runs | `CRON_SECRET` missing, or the plan doesn't include cron jobs |
| Photo upload fails on live site but works locally | Body size limit — confirm browser-side downscaling is running (the picker should show `8 MB → 400 KB`) |
