const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const contracts = {
  'index.html': ['data-next-match', 'data-next-match-logo', 'data-next-match-date', 'data-next-match-location', 'data-match-countdown', 'data-countdown-months', 'data-countdown-days', 'data-countdown-hours', 'data-countdown-minutes', 'data-countdown-seconds', 'data-instagram-api="/api/instagram"'],
  'meet-our-team.html': ['data-roster-grid', 'data-roster-status', 'data-roster-api="/api/roster"'],
  'schedule.html': ['data-schedule-list', 'data-calendar-panel', 'data-calendar-frame', 'data-calendar-empty', 'data-team-calendar', 'schedule-config.js'],
  'forms.html': ['data-forms-list', 'data-forms-status', 'data-forms-api="/api/forms"'],
  'gallery.html': ['data-gallery-list', 'data-gallery-status', 'data-gallery-api="/api/gallery"'],
  'gallery-detail.html': ['data-gallery-detail', 'data-gallery-detail-title', 'data-gallery-detail-caption', 'data-gallery-detail-status', 'data-gallery-lightbox', 'data-gallery-lightbox-image', 'data-gallery-lightbox-close', 'data-gallery-api="/api/gallery"'],
  'contact.html': ['data-contact-form', 'data-contact-status', 'data-turnstile-container', 'contact-config.js', 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', 'name="name"', 'name="email"', 'name="phone"', 'name="message"'],
};

for (const [page, hooks] of Object.entries(contracts)) {
  test(`${page} preserves live-data and accessibility contracts`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const hook of hooks) assert.ok(html.includes(hook), `Missing ${hook}`);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate element IDs');
    for (const match of html.matchAll(/(?:aria-labelledby|aria-controls|aria-describedby)="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), `Unresolved ARIA reference: ${id}`);
    }
    for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
      if (!/^(?:https?:|data:|mailto:)/.test(match[1])) assert.ok(fs.existsSync(path.join(root, match[1])), `Broken local reference: ${match[1]}`);
    }
    assert.ok(html.includes('aria-current="page"'));
    assert.ok(!html.includes('vision.css') && !html.includes('preview-contact-note') && !html.includes('stopImmediatePropagation'), 'Preview code leaked into production');
  });
}
