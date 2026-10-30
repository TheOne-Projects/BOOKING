# Bahia Palace booking app

Sell entrance tickets online. Customers pick a date and tickets and pay with PayPal (or a card through PayPal). The app then **emails the ticket files from your stock folder automatically**, within seconds.

- Booking page with a date calendar (closed days, sold-out days, same-day cut-off)
- PayPal checkout: PayPal account, debit or credit card
- Automatic delivery: each sale takes the next ticket files from `tickets/stock/`, attaches them to the email and moves them to `tickets/sold/`
- Dashboard at `/admin`: sales, orders, resend tickets, ticket stock and uploads, closing days, prices and texts
- Runs on any host with **Node.js 18 or newer**. It has no npm packages, so there is nothing to install

---

## 1. Try it on your computer (5 minutes, no PayPal needed)

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org>.
2. Open Terminal, go to this folder and start the demo:
   ```
   cd ~/"Booking Flow"
   npm run demo
   ```
3. Open <http://localhost:8080>. Book a few tickets with the **Complete test payment** button.
4. Open <http://localhost:8080/admin> (password `demo1234`) to see the orders and stock.

**Another port:** to use a different port, start the demo with `PORT=9000 npm run demo` (any number from 1025 to 65535) and open `http://localhost:9000`. If the port is already used by another program, the demo moves to the next free port and prints the address to open in Terminal.

The demo uses sample tickets marked "not valid" and its own `demo/` folder, so it never touches your real tickets. Ticket emails are saved as files in `demo/data/outbox/`; open the `.html` file to see what customers receive. Stop the demo with `Ctrl + C`.

---

## 2. How the ticket stock works

```
tickets/
  stock/
    adult/                 ← adult tickets valid on any day
      ticket-0001.pdf
      ticket-0002.pdf
    adult/2026-12-24/      ← adult tickets valid only on 24 Dec 2026 (optional)
    child/                 ← child tickets
  reserved/                ← held while a customer is paying (automatic)
  sold/BP-7K3QX9MZ/        ← tickets sent with order BP-7K3QX9MZ (automatic)
  removed/                 ← duplicates and files you removed (automatic)
```

- **One file = one ticket.** PDF, PNG, JPG, GIF, WEBP or Apple Wallet `.pkpass`.
- The folder name is the ticket type's "Stock folder" in **Settings**. Add a type in Settings and its folder is created for you.
- Files go out in name order. Date-specific tickets are used first for that date, then the any-day ones.
- Add tickets in the dashboard (**Ticket stock** → drop the files), or copy them into the folder by FTP or File Manager.
- **The same ticket is never sold twice.** The app remembers a fingerprint of every file it sold. A file uploaded twice is refused, and a copy of a sold ticket found in stock is moved to `removed/duplicates/`.
- While a customer is in the PayPal window, their tickets are held for 15 minutes (you can change this in Settings). If they don't pay, the tickets go back to stock.
- You get an email when stock runs low (Settings → "Warn me when stock falls to").
- **Test payments use a separate folder.** While test payments (PayPal Sandbox) are on, tickets come from `tickets-sandbox/` instead of `tickets/`. Anyone can open a free PayPal test account, so test payments must never receive your real tickets. On the dashboard's **Ticket stock** page, switch between **Real tickets** and **Test tickets**: uploads go to the folder you have chosen, and the folder in use is marked. Put a few sample tickets in the test folder (or run `npm run sample-tickets` while test payments are on).

---

## 3. Go live: checklist

### a) Hosting

The app needs a host that runs Node.js, keeps files between restarts and can send email. Put it on a subdomain such as `book.bahiapalace.com`, with HTTPS switched on. (Vercel, where many websites live, can't run it: it doesn't keep files.)

**Render (recommended, about $7.25 a month):** Render runs the app, keeps the server secure and up to date, provides HTTPS and backs up your orders and tickets every day (7 days of copies). The included `render.yaml` sets everything up.
1. Put this folder in a **private GitHub repository**. Leave out `.env`, `data/`, `demo/` and the files in `tickets/`. The included `.gitignore` does this if you use git.
2. Collect what Render will ask for: a dashboard password, your email, and your Gmail address and app password (step d). PayPal is connected later, in the dashboard (step c).
3. Sign up at <https://render.com> with your GitHub account. Choose **New → Blueprint**, pick the repository, fill in the values and click **Deploy Blueprint**. Render creates the app in Frankfurt with a 1 GB disk, on the Starter instance ($7 a month plus $0.25 for the disk). The free instance can't keep files or send email.
4. When the deploy shows **Live**, open the address Render shows (like `https://bahia-booking.onrender.com`) and add `/admin` to check the dashboard.
5. **Your own address:** in the service, open **Settings → Custom Domains** and add `book.bahiapalace.com`. At Namecheap (Domain List → bahiapalace.com → Manage → Advanced DNS) add a **CNAME Record** with host `book` and the value Render shows (like `bahia-booking.onrender.com`). Render switches on HTTPS by itself, usually within minutes.
6. In the service's **Environment** tab add `BASE_URL` = `https://book.bahiapalace.com` and save. The app restarts with the new address.

On Render the settings from step b live in the **Environment** tab instead of a `.env` file. Every change you push to GitHub is deployed automatically. A deploy takes the app offline for a few seconds; a payment approved in those seconds is finished automatically when the app is back. Server messages are in the **Logs** tab.

**cPanel hosting with "Setup Node.js App"** (most shared hosts):
1. cPanel → **Domains**: create `book.bahiapalace.com`.
2. Upload this folder (zipped) to your home folder, e.g. `/home/USER/booking`. Don't put it inside `public_html`.
3. cPanel → **Setup Node.js App** → Create application: newest Node.js version, mode *Production*, application root `booking`, URL `book.bahiapalace.com`, startup file `server.js`.
4. Create the `.env` file (step b) in the `booking` folder. You don't need to run "NPM install".
5. Press **Restart**. Turn on SSL for the subdomain (AutoSSL / Let's Encrypt).
6. cPanel → **Cron Jobs**: add a job that runs every 5 minutes:
   `curl -fsS https://book.bahiapalace.com/healthz > /dev/null`
   cPanel puts apps to sleep when nobody visits. This ping wakes the app regularly so it keeps finishing slow payments, retrying emails and returning unpaid tickets to stock.

**Hostinger (Business or Cloud plan) "Node.js Web App"**: add a new website → Node.js Web App → upload the zip, entry file `server.js` → import your `.env` under Environment variables. Hostinger replaces the app's files on every deploy, so set `DATA_DIR` and `TICKETS_DIR` to a folder **outside** the app. Hostinger support can confirm the right path for your plan.

**A small VPS** (Hetzner, DigitalOcean, Contabo…): install Node.js 22, copy the folder to `/opt/booking`, run it as a service and put Caddy in front for automatic HTTPS:
```
# /etc/systemd/system/booking.service
[Service]
WorkingDirectory=/opt/booking
ExecStart=/usr/bin/node server.js
Restart=always
User=booking
[Install]
WantedBy=multi-user.target

# /etc/caddy/Caddyfile
book.bahiapalace.com {
  reverse_proxy 127.0.0.1:3000
}
```

### b) Settings file (`.env`)

Copy `.env.example` to `.env` and fill it in. At least:
- `BASE_URL`: the public address, e.g. `https://book.bahiapalace.com`
- `ADMIN_PASSWORD`: a long password for the dashboard
- `ADMIN_EMAIL`: where sale notifications and alerts go
- Email settings (below). PayPal is connected in the dashboard (step c)

Never share `.env` and never upload it anywhere public.

### c) PayPal

You need a **PayPal Business** account (a personal account can be upgraded for free). Everything else happens on the dashboard's **PayPal** page.
1. Go to <https://developer.paypal.com>, log in with your PayPal account and open **Apps & Credentials**. On the **Sandbox** tab, create an app (type Merchant).
2. In the dashboard, open **PayPal**. Under *Test account (Sandbox)*, paste the app's **Client ID** and **Secret** and click **Connect Sandbox keys**. The app checks the keys with PayPal and sets up the webhook (payment updates for buyers who close the page right after paying, delayed payments and refunds) by itself.
3. Add a few sample tickets to the test folder (dashboard → Ticket stock, while test payments are on). Buy a ticket using a Sandbox **personal** account (developer site → Testing Tools → Sandbox Accounts) and check that the email arrives.
4. When everything works, open the **Live** tab of the same app on developer.paypal.com, paste its Client ID and Secret under *Live account*, and click **Switch to live payments**. From then on the real `tickets/` folder is used. Test orders stay in the order list marked "Test", keep their test tickets, and are not counted in your sales.

The webhook can only be set up while the app runs at its public https address (`BASE_URL`). If you add the address later, click **Check connection** on the PayPal page. You can't leave live payments while a live customer is paying or waiting for tickets.

The keys you connect are saved in `data/paypal.json`, which only the app can read; the secret is never shown again. Back it up with the rest of `data/` and never share it. Keys can also be set in `.env` instead (`PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, plus `PAYPAL_WEBHOOK_ID` for a webhook you create by hand pointing to `https://book.bahiapalace.com/api/paypal/webhook`). Keys connected on the PayPal page take priority.

Currency: PayPal does not support the Moroccan dirham, so prices are in **EUR** by default (change it in Settings). In your PayPal account, allow payments in a currency you don't hold ("accept and convert"). Otherwise PayPal may hold each payment until you accept it by hand. The app keeps those tickets reserved and sends them when PayPal releases the money.

### d) Email

Customers receive their tickets as email attachments, so this must work.

- **Gmail**: turn on 2-Step Verification, create an **App Password** at <https://myaccount.google.com/apppasswords>, then set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER` = your Gmail address, `SMTP_PASS` = the app password, and put the same Gmail address in `MAIL_FROM`. Gmail allows about 500 emails a day.
- **A mailbox on your own domain** (e.g. `tickets@bahiapalace.com` at your host) looks more professional and lands in spam less often. Use your host's SMTP details (usually port 465 with SSL).

Then open **Settings → Send test email** in the dashboard.

### e) Tickets, prices and texts

In the dashboard:
- **Settings**: ticket types and prices, how far ahead to sell, same-day cut-off, opening hours, the instructions printed in the email, support email, and a link to your terms and refund policy (PayPal expects buyers to be able to find these).
- **Calendar**: tick weekly closing days, or click any date to close it.
- **Ticket stock**: upload your ticket files.

### f) Add it to your website

**Option 1, a button (simplest):** point your "Buy tickets" buttons to `https://book.bahiapalace.com`. On bahiapalace.com that means the **Get Your Tickets** buttons on the Tickets page; in Elementor (WordPress) add a Button with that link.

**Option 2, the booking form inside your page:** add this where the form should appear:
```html
<div id="bahia-booking"></div>
<script src="https://book.bahiapalace.com/embed.js" data-target="bahia-booking" data-offset="90" async></script>
```
In Elementor, put it in an **HTML** widget. In a Next.js site (like bahiapalace.com), put the `<div>` in the page and load the script with `<Script src="https://book.bahiapalace.com/embed.js" data-target="bahia-booking" data-offset="90" />` from `next/script`.

`data-offset` is the height of your sticky menu in pixels. Put your site's address in `EMBED_ALLOWED_ORIGINS` (already set to bahiapalace.com in `render.yaml` and `.env.example`). The form resizes itself and works with PayPal inside the page.

To open the form with a date already picked, link to `https://book.bahiapalace.com/?date=2026-12-24`.

---

## 4. Day to day

- **Overview**: today's and this month's sales, a 30-day chart, visits coming up, stock levels, and alerts (anything that needs you shows here in red).
- **Orders**: search by name, email, order number or PayPal ID. Open an order to resend the tickets (to the same or another address), copy the customer's download link, add a note or retry delivery. Export to CSV for your accountant.
- **Refunds**: refund in your PayPal account. With the webhook set up, the order is marked refunded automatically. Without it, click **Mark as refunded**. Tickets already emailed can't be taken back, so refund only tickets the customer hasn't used.
- **Needs attention**: a customer paid but there was no ticket left, for example because the stock folder was empty. Add tickets to stock and delivery is retried automatically within minutes, or click **Retry delivery**.

Customers always see a **Download tickets** button after paying, so they get their tickets even if the email is late. If an email fails, the app retries automatically.

---

## 5. Safety built in

- Prices are always calculated on the server. The browser can't change what is charged, and the captured amount is checked against the order before tickets are sent.
- Tickets are only sent after PayPal confirms the payment as completed.
- If a payment can't be confirmed (bad mobile signal, PayPal slow to answer), the buyer is told not to pay again and the PayPal button is switched off. The app keeps checking with PayPal and sends the tickets as soon as the payment is confirmed. If the same email still pays twice within an hour, you get an alert.
- Orders where money may have moved are never deleted or cancelled by the app without PayPal confirming that nothing was taken. You can't cancel a payment PayPal is still processing.
- A ticket file can't go to two customers, even with many buyers at the same moment and even if the host runs several copies of the app.
- One visitor can't hold more than a few unfinished checkouts, so nobody can block your stock.
- If the server restarts in the middle of a sale, a background job finishes it: it checks with PayPal, sends the tickets, or returns unsold ones to stock.
- Download links contain a long secret code. The dashboard is password-protected, rate-limited and can't be shown inside other sites.
- PayPal webhooks are verified with PayPal before they're trusted.
- Test and live payments are kept apart: each has its own PayPal keys, webhook and ticket folder, and an order always uses the ones of the mode it was made in. Switching to live never sends real tickets to a test order.
- PayPal keys are checked with PayPal before they're saved, and the secret is never shown again.
- Simulated payments (`PAYPAL_MODE=mock`) only work on your own computer, never on a public address, and take tickets from the test folder. Live payments need the public https address.
- Replacing or removing PayPal keys never strands a customer who is paying: the old keys are kept (privately) until the orders made with them are finished. If PayPal can't be asked about a payment that was started, the order is kept and you get an alert instead of a guess.

---

## 6. Troubleshooting

| Problem | What to check |
|---|---|
| "Online payment is temporarily unavailable" | The dashboard's PayPal page says why: usually PayPal isn't connected yet for the mode in use. |
| Uploaded tickets don't appear / the stock count looks wrong | In sandbox mode the app uses the test folder `tickets-sandbox/`, and in live mode the real `tickets/` folder. Check which mode you are in on the dashboard. |
| PayPal buttons don't appear | On the PayPal page, click **Check connection**. Sandbox keys come from the Sandbox tab and live keys from the Live tab on developer.paypal.com. Ad blockers can block PayPal. |
| "Payment updates: Waiting" on the PayPal page | The webhook needs the public https address. Set `BASE_URL`, then click **Check connection**. |
| Emails don't arrive | Settings → Send test email shows the exact error. Check the spam folder. With Gmail you need an App Password. |
| Payment "pending" | PayPal is reviewing it, or your account must accept the currency. The tickets stay reserved and go out automatically once PayPal completes it. |
| Times are off by one hour | Morocco moved to GMT on 20 September 2026. Use a current Node.js version, or set `TIMEZONE=UTC`. The dashboard shows the venue time under Settings → Connection status. |
| Dashboard says it is turned off | Set `ADMIN_PASSWORD` in `.env` (not the example value) and restart. |

Server messages are printed to the app's log (Render: the service's **Logs** tab; cPanel: the log file of the Node.js app; VPS: `journalctl -u booking`).

---

## 7. Backups and updates

- **Back up `data/` and `tickets/` regularly.** They hold all orders, settings and tickets. Code can always be copied again; these folders can't. On Render this happens automatically: the disk is copied every 24 hours and 7 days of copies are kept (service → **Disks** to restore one, which replaces everything on the disk with that day's copy).
- To update the app, replace the code files but keep `.env`, `data/` and `tickets/`. On Render, push the new code to GitHub and it deploys by itself.

## 8. For developers

- `npm test` runs the end-to-end tests: PayPal and SMTP are simulated, including declines, pending payments, webhooks, refunds, races for the last tickets, expiry and crash recovery.
- `npm run sample-tickets` creates sample PDFs (marked "not valid") in the test folder `tickets-sandbox/stock/`, used by PayPal Sandbox and simulated payments. It never writes to your real `tickets/` folder.
- Code: `server.js` (start), `src/booking.js` (order flow), `src/payments.js` (PayPal keys, payment modes, webhook setup), `src/stock.js` (ticket files), `src/paypal.js`, `src/mailer.js` (SMTP), `src/routes.js` (HTTP), `public/` (booking page), `admin/` (dashboard).
- Order statuses: `pending` → `paid` → `fulfilled`. Other statuses: `payment_pending`, `needs_attention`, `expired`, `cancelled`, `failed`, `refunded`, `reversed`.
- Font: Familjen Grotesk, a grotesque with ink traps close to PolySans (SIL Open Font License, included in `public/fonts/`).
