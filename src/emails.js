'use strict';
/**
 * Email templates (customer ticket delivery + admin notifications).
 * Table-based HTML with inline styles so it renders in Gmail, Outlook and Apple Mail.
 */
const { escapeHtml: e, formatMoney } = require('./util');
const { formatLong } = require('./dates');

const C = {
  bg: '#eef1ee',
  card: '#ffffff',
  ink: '#15261f',
  muted: '#56685f',
  line: '#dfe6e2',
  soft: '#f4f7f5',
  brand: '#0f5a4a',
  gold: '#e8a317',
};

function layout({ preheader, title, body, footer }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${e(preheader || '')}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${C.card};border-radius:14px;overflow:hidden;border:1px solid ${C.line};">
${body}
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
<tr><td style="padding:18px 8px;font:12px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};text-align:center;">${footer || ''}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function header(siteName) {
  return `<tr><td style="background:${C.brand};padding:22px 28px;border-bottom:4px solid ${C.gold};">
<div style="font:bold 20px/1.2 Arial,Helvetica,sans-serif;color:#fff;letter-spacing:.2px;">${e(siteName)}</div>
</td></tr>`;
}

function itemsTable(order) {
  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:8px 0;font:15px/1.4 Arial,Helvetica,sans-serif;color:${C.ink};border-bottom:1px solid ${C.line};">${i.qty} × ${e(i.name)}</td>
<td align="right" style="padding:8px 0;font:15px/1.4 Arial,Helvetica,sans-serif;color:${C.ink};border-bottom:1px solid ${C.line};">${e(
        formatMoney(i.lineTotal, order.currency)
      )}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}
<tr><td style="padding:10px 0 0;font:bold 15px/1.4 Arial,Helvetica,sans-serif;color:${C.ink};">Total paid</td>
<td align="right" style="padding:10px 0 0;font:bold 15px/1.4 Arial,Helvetica,sans-serif;color:${C.ink};">${e(formatMoney(order.total, order.currency))}</td></tr>
</table>`;
}

function nl2br(s) {
  return e(s).replace(/\n/g, '<br>');
}

/** The email that delivers the tickets to the customer. */
function ticketEmail({ order, settings, downloadUrl, attached }) {
  const date = formatLong(order.visitDate);
  const count = order.tickets.length;
  const firstName = String(order.customer.name || '').split(' ')[0] || 'there';
  const subject = `Your tickets for ${date} – order ${order.id}`;
  const attachLine = attached
    ? `Your ${count === 1 ? 'ticket is' : `${count} tickets are`} attached to this email.`
    : `Download your ${count === 1 ? 'ticket' : `${count} tickets`} with the button below.`;

  const body = `${header(settings.siteName)}
<tr><td style="padding:28px 28px 8px;">
<p style="margin:0 0 6px;font:14px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};">Hello ${e(firstName)},</p>
<h1 style="margin:0 0 14px;font:bold 26px/1.25 Arial,Helvetica,sans-serif;color:${C.ink};">Your tickets are ready</h1>
<p style="margin:0 0 18px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${C.ink};">Thank you for your booking. ${e(attachLine)}</p>
</td></tr>
<tr><td style="padding:0 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.soft};border:1px solid ${C.line};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div style="font:13px/1.4 Arial,Helvetica,sans-serif;color:${C.muted};">Visit date</div>
<div style="font:bold 20px/1.35 Arial,Helvetica,sans-serif;color:${C.ink};margin-top:2px;">${e(date)}</div>
${settings.openingHours ? `<div style="font:14px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};margin-top:2px;">${e(settings.openingHours)}</div>` : ''}
</td></tr></table>
</td></tr>
<tr><td style="padding:18px 28px 6px;">${itemsTable(order)}</td></tr>
<tr><td style="padding:6px 28px 0;font:13px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};">Order number: <strong style="color:${C.ink};">${e(order.id)}</strong></td></tr>
<tr><td align="center" style="padding:24px 28px 8px;">
<a href="${e(downloadUrl)}" style="display:inline-block;background:${C.brand};color:#ffffff;text-decoration:none;font:bold 15px/1 Arial,Helvetica,sans-serif;padding:15px 26px;border-radius:999px;">Download your tickets</a>
</td></tr>
<tr><td style="padding:18px 28px 6px;">
<div style="font:bold 15px/1.4 Arial,Helvetica,sans-serif;color:${C.ink};margin-bottom:4px;">On the day</div>
<p style="margin:0;font:15px/1.6 Arial,Helvetica,sans-serif;color:${C.ink};">${nl2br(settings.ticketInstructions || '')}</p>
${settings.address ? `<p style="margin:10px 0 0;font:14px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};">${e(settings.address)}</p>` : ''}
</td></tr>
<tr><td style="padding:22px 28px 28px;font:14px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};">
${settings.supportEmail ? `Questions? Reply to this email or write to <a href="mailto:${e(settings.supportEmail)}" style="color:${C.brand};">${e(settings.supportEmail)}</a>.` : 'Questions? Just reply to this email.'}
</td></tr>`;

  const html = layout({
    preheader: `${count} ticket${count === 1 ? '' : 's'} for ${date}. Order ${order.id}.`,
    title: subject,
    body,
    footer: `${e(settings.siteName)}. You receive this email because you booked tickets on our website.`,
  });

  const text = [
    `Hello ${firstName},`,
    '',
    'Your tickets are ready. ' + attachLine,
    '',
    `Visit date: ${date}`,
    settings.openingHours ? settings.openingHours : null,
    '',
    ...order.items.map((i) => `${i.qty} x ${i.name}  ${formatMoney(i.lineTotal, order.currency)}`),
    `Total paid: ${formatMoney(order.total, order.currency)}`,
    `Order number: ${order.id}`,
    '',
    `Download your tickets: ${downloadUrl}`,
    '',
    'On the day:',
    settings.ticketInstructions || '',
    settings.address || null,
    '',
    settings.supportEmail ? `Questions? Write to ${settings.supportEmail}` : 'Questions? Just reply to this email.',
    '',
    settings.siteName,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject, html, text };
}

function simpleAdmin({ settings, title, lines, link, linkLabel }) {
  const body = `${header(settings.siteName + ' · Admin')}
<tr><td style="padding:24px 28px;">
<h1 style="margin:0 0 14px;font:bold 21px/1.3 Arial,Helvetica,sans-serif;color:${C.ink};">${e(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 8px;font:15px/1.55 Arial,Helvetica,sans-serif;color:${C.ink};">${e(l)}</p>`).join('')}
${link ? `<p style="margin:18px 0 0;"><a href="${e(link)}" style="color:${C.brand};font:bold 15px Arial,Helvetica,sans-serif;">${e(linkLabel || 'Open dashboard')}</a></p>` : ''}
</td></tr>`;
  return {
    subject: `[${settings.siteName}] ${title}`,
    html: layout({ preheader: lines[0] || title, title, body, footer: 'Automatic message from your booking app.' }),
    text: [title, '', ...lines, '', link ? `${linkLabel || 'Open dashboard'}: ${link}` : ''].join('\n'),
  };
}

function adminSaleEmail({ order, settings, adminUrl }) {
  return simpleAdmin({
    settings,
    title: `New sale ${formatMoney(order.total, order.currency)} – ${order.id}`,
    lines: [
      `${order.items.map((i) => `${i.qty} × ${i.name}`).join(', ')} for ${formatLong(order.visitDate)}.`,
      `Customer: ${order.customer.name} <${order.customer.email}>${order.customer.phone ? ', ' + order.customer.phone : ''}`,
      `PayPal capture: ${(order.paypal && order.paypal.captureId) || '—'}`,
    ],
    link: `${adminUrl}#orders/${order.id}`,
    linkLabel: 'View order',
  });
}

function adminAlertEmail({ settings, title, lines, adminUrl, orderId }) {
  return simpleAdmin({
    settings,
    title,
    lines,
    link: orderId ? `${adminUrl}#orders/${orderId}` : adminUrl,
    linkLabel: orderId ? 'Open order' : 'Open dashboard',
  });
}

module.exports = { ticketEmail, adminSaleEmail, adminAlertEmail };
