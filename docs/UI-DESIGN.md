# Cypress Centurion website — UI proposal

Approved and implemented October 12, 2026. This document records the design direction and integration requirements. Validation details are in UI-VALIDATION.md.

## Vision

A polished athletics website with strong typography, navy and orange identity, clean editorial layouts, and a useful information hierarchy. Existing content determines the page; no invented scores, player biographies, testimonials, or photography.

## Shared design system

- Navy #081e32, accessible orange text #ba430b (bright #ff8b4c on the hero), orange primary buttons with navy text, off-white #f2f3ef, white cards, subtle #d8ddd8 dividers.
- System Arial for body copy; Arial Black for the homepage headline. No external font dependency.
- Desktop content width 1200px, 32px minimum gutters; mobile 20px gutters. Desktop 56px page introduction spacing; mobile 36px.
- Solid navy header in normal document flow; compact logo and uppercase navigation with an orange active underline. Below 1000px, navigation uses a keyboard-contained mobile menu, Escape to close, and focus restoration.
- Left-aligned page titles, small orange section identifiers, restrained borders, consistent spacing and visible keyboard focus. Reduced motion supported.
- Footer retains Instagram and year, adds the team identity and useful navigation. Footer stays in document flow and rests at the viewport bottom on short pages.

## Page-by-page proposal

| Page | Proposed treatment | Existing content retained |
| --- | --- | --- |
| Home | Cinematic video hero, stacked headline, schedule/team links, compact countdown and match logos, a navigation section, higher-contrast sponsor strip above footer | Original video, slogan, live next-match logic, countdown, sponsor logos, optional Instagram feed |
| Team | Three bordered roster columns with orange top edges; stacked on mobile; clean player-row separators | Published player names and team groups; existing expand/collapse behavior at its current breakpoints |
| Schedule | Clear date/opponent hierarchy, team/time rows, upcoming games alongside the month calendar; stacked on mobile, with a scrollable calendar to preserve legibility | Existing grouping, dates, times, opponents, locations, calendar navigation and fallback logic |
| Forms | Spacious white document tiles with clear titles and orange open links | Existing automatically discovered documents and their URLs |
| Gallery | Large, consistently cropped collection covers, clear titles and photo counts, photographer credits | Existing collection API, covers, titles, counts and captions |
| Gallery detail | Three-column photo grid on desktop, two on mobile, left-aligned back link and title; full-image viewer retained | All existing collection photos, alt text and lightbox |
| Contact | Compact white form panel, uppercase labels, consistent field styling, less space reserved for empty error messages | Existing fields, validation, Turnstile protection and delivery integration when applied |

## Data contract — preserve during implementation

The preview copies the production HTML and rendering script, adding a separate CSS layer and a small amount of navigation/identity markup. Its local server proxies GET requests to the current public site. No data schema migration is proposed.

- `/api/roster`: same published Google Sheets source and `ROSTER_CSV_URL` override.
- `/api/schedule`: same `SCHEDULE_CSV_URL`, calendar fallback, grouping and next-match selection.
- `/api/forms`: same R2 bucket bindings, `forms/` prefix and manifest/file-list fallbacks.
- `/api/gallery`: same collections, images, captions and IDs; preserve collection query parameters.
- `/api/instagram`: same conditional feed behavior; do not fabricate content when unavailable.
- `/api/contact`: preserve validation, Turnstile and Resend configuration.
- Keep all current `data-*` hooks, IDs needed by JavaScript, URL routes and environment settings.

Preview-only changes: contact submission is disabled and the captcha is hidden. Gallery images load eagerly to make screenshots complete. Neither preview change should be carried into production; retain lazy loading and live contact security/delivery there.

The production implementation omits all preview-only changes. Photos retain lazy loading and async decoding, with reserved dimensions. The video respects reduced motion and data saving, pauses offscreen/in background tabs, and has a visible pause/play control. A current gallery photo supplies its poster. Countdown values are not announced to screen readers every second, and hidden tabs skip countdown rendering. The photo dialog contains keyboard focus and restores focus to the originating thumbnail.

## Preview artifacts and reproducibility

- `vision.css`: exact proposed stylesheet overrides.
- `build.cjs`: creates seven preview page copies with the proposed additions.
- `server.cjs`: serves the preview and reads public API responses; blocks API writes.
- `screenshots/`: desktop and mobile screenshots of all seven page types. Gallery detail screenshots show the top of the collection rather than all 75 photos.
- `overview.html`: screenshot comparison board.

These are local archives of the approved concept and are excluded from deployment. The production HTML, `styles.css`, and `script.js` are now the source of truth. Do not regenerate the archived concept from the redesigned production pages, which already contain the approved additions.

## Future changes

1. Review the screenshots and select any adjustments.
2. Edit the production stylesheet and HTML directly; the approved design is already applied.
3. Keep API functions and production rendering behavior intact; omit preview submission blocking and eager image loading.
4. Verify actual data on all pages, mobile menu, roster controls, calendar navigation, form links, photo viewer, keyboard focus, and contact validation/delivery configuration.
5. Refresh stylesheet cache versions. Commit and deploy only when requested.

## Verification completed

The concept rendered the real roster, schedule, forms and galleries. Production implementation checks are documented in UI-VALIDATION.md. Contact was validated locally without sending a message. All data integrations remain in place.
