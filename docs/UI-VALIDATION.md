# UI redesign validation

October 12, 2026. The approved concept has been implemented on all seven page types.

## Integration preservation

- All original `data-*` hooks were compared with the pre-redesign HTML and preserved.
- `functions/`, `schedule-config.js`, and `contact-config.js` are unchanged.
- Roster, forms, schedule and gallery were rendered through the existing public APIs in a read-only local preview proxy.
- Turnstile and contact delivery configuration remain in production. Preview-only submission blocking and eager gallery loading were excluded.
- Seven automated Node tests cover data hooks, local references, unique IDs, ARIA references and absence of preview-only code. Run `node --test tests/site-contract.test.cjs`.
- JavaScript syntax checks and `git diff --check` passed.

## Browser checks

- All seven pages at widths 320, 390, 768, 999, 1000 and 1440px: 42 responsive checks passed, with no page-level horizontal overflow and no footer stopping above the viewport bottom.
- Mobile menu: closed links are inert; open menu contains keyboard focus; Shift+Tab wraps; Escape closes and restores focus; underlying page regions are inert while open.
- Roster: mobile expansion reveals the fourth and later players and updates the expanded state.
- Calendar: next month and previous month work. Mobile month navigation remains fully visible while the date grid can scroll horizontally at readable cell widths.
- Photo collection: all 75 photos remain lazy-loaded. Clicking a thumbnail opens the dialog, Tab stays in it, Escape closes it, and focus returns to the thumbnail.
- Contact: empty submission shows field-specific errors and focuses the name field. No real email was sent.
- Video: pause/play controls work. The implementation pauses offscreen and in hidden tabs, respects reduced-motion/data-saving preferences, and skips hidden-tab countdown rendering.
- Desktop and mobile screenshots were retained locally in `design-preview/implementation-screenshots/` and visually inspected. Preview files and screenshots are excluded from deployment by `.gitignore`.

## Performance safeguards

- No framework, dependency installation, external font, analytics, or additional application script was introduced.
- Images reserve layout space with dimensions/aspect ratios; gallery images retain native lazy loading and async decoding.
- Original hero video URL is unchanged. Video preloading is disabled and its current-gallery-photo poster covers paused/unavailable playback.
- Removed obsolete header scroll/resize work and the old match-logo animation observer; static logos no longer reserve compositing layers.
- Shared CSS and JavaScript together are approximately 19 KB when gzipped (measured locally). This is an asset-size measurement, not a Lighthouse score or a mobile-network timing benchmark.

## Verification limits

The production Turnstile key rejects localhost with error 110200, which Cloudflare documents as an unauthorized hostname. Its production configuration was preserved rather than weakened for local QA: https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/ . Actual email delivery was not exercised. No claim is made that every browser, device or failure condition has been exhaustively tested.
