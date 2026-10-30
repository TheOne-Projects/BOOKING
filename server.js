'use strict';
/**
 * Bahia Palace booking app — start with:  node server.js
 * Configuration: .env (copy .env.example). No npm packages required.
 */
const http = require('http');
const config = require('./src/config');
const { App } = require('./src/http');
const { Store } = require('./src/store');
const { Payments } = require('./src/payments');
const { Mailer } = require('./src/mailer');
const { Booking } = require('./src/booking');
const routes = require('./src/routes');
const { log, logError } = require('./src/util');

function createApp(cfg = config) {
  const store = new Store(cfg.dataDir);
  // PayPal keys and the payment mode (dashboard PayPal page, or .env), one ticket folder per mode.
  const payments = new Payments({ config: cfg, store });
  const mailer = new Mailer({ smtp: cfg.smtp, from: cfg.mail.from, replyTo: cfg.mail.replyTo, outboxDir: store.outboxDir });
  const booking = new Booking({ config: cfg, store, payments, mailer });
  const app = new App({ trustProxy: cfg.trustProxy });
  routes.install(app, { config: cfg, booking, store });
  const server = http.createServer(app.handler());
  server.requestTimeout = 120000;
  server.headersTimeout = 30000;
  server.keepAliveTimeout = 5000;
  // stock / paypal: the ones of the mode in use at start (kept for scripts and tests).
  return { server, booking, store, payments, mailer, stock: booking.stock, paypal: booking.paypal };
}

function start() {
  const { server, booking } = createApp();
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      logError(`Port ${config.port} is already used by another program. Set a different PORT in .env (for example PORT=8081) and start again.`);
    } else if (e.code === 'EACCES') {
      logError(`Not allowed to use port ${config.port}. Use a number above 1024 (for example PORT=8080).`);
    } else {
      logError('Server error:', e.message);
    }
    process.exit(1);
  });
  server.listen(config.port, config.host, () => {
    log(`Booking app v${config.version} listening on port ${config.port}`);
    log(`  Booking page: ${config.baseUrl}/`);
    log(`  Dashboard:    ${config.baseUrl}/admin`);
    const pp = booking.paypal;
    const chosen = booking.payments.saved().mode && booking.payments.saved().mode !== config.paypal.mode;
    log(`  PayPal mode:  ${pp.mode}${chosen ? ` (chosen on the dashboard's PayPal page; PAYPAL_MODE=${config.paypal.mode} is not used)` : ''}${pp.disabledReason ? ' – DISABLED: ' + pp.disabledReason : ''}`);
    log(`  Email:        ${config.smtp.host ? config.smtp.host + ':' + config.smtp.port : 'not configured – emails go to data/outbox/'}`);
    log(`  Tickets:      ${booking.payments.ticketsDir(pp.mode)}`);
    const venue = require('./src/dates').inTz(config.timezone);
    log(`  Venue time:   ${venue.date} ${venue.time} (${config.timezone}, tz data ${process.versions.tz || 'unknown'})`);
    if (!config.admin.password) log('  WARNING: ADMIN_PASSWORD is not set – the dashboard is disabled.');
  });

  // Fingerprint new ticket files in the background (outside any lock; cached on disk).
  setTimeout(() => booking.stock.warmHashes(), 5000).unref();
  const tick = () => booking.reconcile().catch((e) => logError('Reconcile crashed', e));
  const timer = setInterval(tick, config.reconcileIntervalMs);
  setTimeout(tick, 3000).unref();

  const shutdown = (sig) => {
    log(`${sig} received, shutting down`);
    clearInterval(timer);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (e) => logError('Unhandled promise rejection:', e));
}

// Start unless a test harness loads this file. (Don't rely on require.main: cPanel's
// Passenger and some other hosts load the startup file through their own wrapper.)
if (!process.env.BOOKING_NO_AUTOSTART) start();

module.exports = { createApp };
