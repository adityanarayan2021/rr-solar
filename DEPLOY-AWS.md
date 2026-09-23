# Deploying to AWS

Two viable paths. Read the first section before choosing — it decides which one applies to you.

---

## Which one?

| | Amplify Hosting | EC2 + PM2 + Nginx |
|---|---|---|
| Setup time | ~15 min | ~60 min |
| Skill needed | Connect repo, add env vars | Basic Linux terminal |
| **Next.js 16 support** | **Officially only up to 15** | **Any version — it's just Node** |
| Cost after free tier | Usage-based, small for this traffic | ~$8–10/mo for t3.micro |
| Free tier | 500k SSR requests, 1,000 build min/mo | 750 hrs/mo of t3.micro for 12 months |
| Request body limit | Yes (Lambda-based) | **None** |
| You manage | Nothing | OS updates, Node, SSL renewal |

**Recommendation:** try **Amplify** first — it's 15 minutes, and if it builds you're done. AWS docs list support only through Next.js 15, so it may fail on 16.3. If it does, go to **EC2**, which has no version constraints because it just runs `npm start` on a normal server.

Before either: **Atlas → Network Access → allow `0.0.0.0/0`**, or the app can't reach your database.

---

# Option A — AWS Amplify Hosting

## 1. Create the app

1. AWS Console → search **Amplify** → **Create new app**
2. **Deploy your app** → **GitHub** → authorise → pick `rr-solar`, branch `main`
3. Amplify auto-detects Next.js. Confirm the build settings show:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

## 2. Environment variables

**App settings → Environment variables.** Add everything from `DEPLOY.md` section 4 — `MONGODB_URI`, `MONGODB_DB`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET`, and the optional ones you want.

**Do not add `MONGODB_DNS_SERVERS`** — that's a workaround for your office network only.

## 3. Deploy

Save and deploy. First build takes 5–10 minutes.

**If the build fails with a Next.js version error**, that's the Next 16 limitation. Either downgrade to Next 15 (`npm install next@15`, retest everything) or switch to Option B. I'd switch — downgrading a framework to suit a host is the wrong trade.

## 4. Domain

**Hosting → Custom domains → Add domain.** If your domain is in Route 53, Amplify wires the DNS itself. Otherwise it shows CNAME records to add at your registrar. SSL is automatic.

## 5. Monthly report cron

`vercel.json` does nothing on AWS. Use EventBridge Scheduler:

1. Console → **Amazon EventBridge** → **Schedules** → **Create schedule**
2. Recurring, cron expression `0 4 * * ? *` (daily 04:00 UTC = 09:30 IST)
3. Target: **API destination** → your URL `https://yourdomain/api/cron/monthly-report`
4. Add header `Authorization: Bearer YOUR_CRON_SECRET`

The route exits by itself on any day that isn't the 1st, so a daily trigger is correct.

---

# Option B — EC2 (works with any Next.js version)

## 1. Launch the instance

1. Console → **EC2** → **Launch instance**
2. Name: `rr-solar`
3. AMI: **Ubuntu Server 24.04 LTS**
4. Type: **t3.micro** (free tier eligible for 12 months)
5. Key pair: create one, download the `.pem` — you cannot download it again
6. Network settings → **Edit** → add inbound rules:
   - SSH (22) from **My IP** only
   - HTTP (80) from Anywhere
   - HTTPS (443) from Anywhere
7. Storage: 20 GB gp3
8. Launch

## 2. Connect

From PowerShell, in the folder holding your `.pem`:

```powershell
icacls rr-solar.pem /inheritance:r
icacls rr-solar.pem /grant:r "$($env:USERNAME):(R)"
ssh -i rr-solar.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 3. Install Node, git and PM2

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
node -v   # expect v22.x
```

## 4. Add swap — do not skip this

t3.micro has 1 GB of RAM. `next build` with sharp will run out of memory and the build will fail with an unhelpful "Killed" message. A 2 GB swap file fixes it permanently:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # confirm swap shows 2Gi
```

## 5. Get the code

```bash
cd /home/ubuntu
git clone https://github.com/adityanarayan2021/rr-solar.git
cd rr-solar
npm ci
```

For a private repo, generate a deploy key on the server (`ssh-keygen -t ed25519`) and add the public key under GitHub repo → Settings → Deploy keys.

## 6. Environment variables

```bash
nano .env.local
```

Paste the same variables as `DEPLOY.md` section 4 — **minus** `MONGODB_DNS_SERVERS`, and with `NODE_ENV=production` added. Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
chmod 600 .env.local    # readable only by you
```

## 7. Build and start

```bash
npm run build
pm2 start npm --name rr-solar -- start
pm2 save
pm2 startup      # run the command it prints, so it restarts after reboot
pm2 logs rr-solar --lines 30
```

The app is now on `localhost:3000` inside the server. Nginx makes it public.

## 8. Nginx

```bash
sudo nano /etc/nginx/sites-available/rr-solar
```

```nginx
server {
    listen 80;
    server_name rrsolarsolutions.in www.rrsolarsolutions.in;

    # Photo uploads: allow comfortably more than the app itself accepts
    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rr-solar /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://YOUR_EC2_IP` — the site should load.

## 9. Domain and HTTPS

Point DNS at the server first. In EC2, allocate an **Elastic IP** and associate it with the instance, otherwise the public IP changes on every restart.

At your registrar:

- `A` record `@` → your Elastic IP
- `A` record `www` → your Elastic IP

Once DNS resolves:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d rrsolarsolutions.in -d www.rrsolarsolutions.in
```

Certbot edits the Nginx config and sets up automatic renewal. Verify:

```bash
sudo certbot renew --dry-run
```

## 10. Cron for the monthly report

```bash
crontab -e
```

Add:

```
0 4 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://rrsolarsolutions.in/api/cron/monthly-report >> /home/ubuntu/cron.log 2>&1
```

## 11. Deploying updates

```bash
cd /home/ubuntu/rr-solar
git pull
npm ci
npm run build
pm2 restart rr-solar
```

Worth saving as `deploy.sh`:

```bash
printf '#!/bin/bash\nset -e\ncd /home/ubuntu/rr-solar\ngit pull\nnpm ci\nnpm run build\npm2 restart rr-solar\n' > deploy.sh
chmod +x deploy.sh
```

---

## Post-deployment checklist

Same as `DEPLOY.md` section 7 — run every item against the live URL.

---

## AWS-specific gotchas

| Issue | Cause and fix |
|---|---|
| Build killed with no error | Out of memory on t3.micro. Add the swap file (step 4) |
| `/admin` shows the database error | Atlas Network Access isn't `0.0.0.0/0` |
| Site dies after instance restart | `pm2 startup` wasn't run, or its printed command wasn't executed |
| IP changed after reboot | Allocate an Elastic IP |
| 413 on photo upload | `client_max_body_size` missing from the Nginx config |
| Analytics missing | `NEXT_PUBLIC_*` variables are baked in at build — rebuild after changing them |
| Amplify build fails on Next version | The Next 16 limitation. Switch to EC2 |
| Free tier bill arrives anyway | Elastic IPs cost money when *not* attached to a running instance; data transfer out is billed beyond 100 GB |

**Set a billing alarm** before you start: Billing → Budgets → create a $5 monthly budget with an email alert. AWS does not stop charging when the free tier ends, and an unnoticed resource running for a month is the usual way people get a surprise bill.

---

## My honest read

For a solar company's brochure-and-leads site, AWS is more machinery than the job needs. Netlify or Render cost less in both money and your time, and nothing here uses AWS-specific services.

AWS makes sense if you already run infrastructure there, need Indian data residency (`ap-south-1` Mumbai), or expect to add AWS services later. If you're choosing purely on cost and simplicity, EC2 free tier is genuinely free for 12 months — but you own the OS updates, the SSL renewals, and the 2am restart when something breaks.
