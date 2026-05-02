# Cypress Centurion Boys Soccer

Static website for Cypress Centurion Boys Soccer, ready for Cloudflare Pages.

Deployment is managed through Cloudflare Pages connected to GitHub.

## Asset Paths

Static assets are served from `https://assets.chsboyssoccer.com` using these folders:

- Images: `https://assets.chsboyssoccer.com/images/[filename]`
- Videos: `https://assets.chsboyssoccer.com/media/[filename]`
- Forms: `https://assets.chsboyssoccer.com/forms/[filename]`

## Cloudflare Pages Settings

- Build command: leave blank
- Build output directory: `/`
- Production branch: `main`

## Google Sheets Schedule

The Upcoming Games cards and homepage Upcoming Match block are loaded from the
Cloudflare Pages Function at `/api/schedule`.

The preferred schedule source is a published Google Sheets CSV. Create a Google Sheet
named `Cypress HS Soccer Schedule` with a first tab that uses this exact header row:

`date,time,team,opponent,location,homeAway,status,logoKey,logoUrl`

Minimum required columns per row:

- `date`
- `team`
- `opponent`

Supported date formats:

- `YYYY-MM-DD`
- `M/D/YYYY`

Example row:

`2026-01-12,5:00 PM,Varsity,Valencia HS,Valencia HS (Placentia),Away,scheduled,Valencia HS,`

Publish the sheet tab as CSV, then add the published CSV URL to Cloudflare Pages as:

`SCHEDULE_CSV_URL`

The function parses future events, sorts them by date/time, chooses the next `Varsity`
match for the homepage, and caches the JSON response at Cloudflare's edge for 5 minutes.

If `SCHEDULE_CSV_URL` is not configured yet, `/api/schedule` temporarily falls back to
the original public Google Calendar iCal feed so the live site keeps working during setup.

Optional fields:

- `time`: shown on schedule cards; blank becomes `Time TBD`
- `location`: shown on schedule cards and homepage; blank becomes `Location TBD`
- `homeAway`: use `Home` or `Away`; away games render summaries with `@`
- `status`: `cancelled`, `canceled`, and `postponed` rows are hidden
- `logoKey`: maps the opponent to one of the supported logo keys below
- `logoUrl`: overrides the logo map with a direct image URL

Supported opponent logo keys:

- `Anaheim HS`
- `Beckman HS`
- `Buena Park HS`
- `Cal HS`
- `Corona del Mar HS`
- `Cypress HS`
- `Cypress High School`
- `Crean Luthern HS`
- `Edison HS`
- `El Toro HS`
- `Laguna Hills HS`
- `Newport Harbor HS`
- `Santa Ana Valley HS`
- `St. Margarets HS`
- `Sunny Hills HS`
- `Trabuco Hills HS`
- `Troy HS`
- `Valencia HS`
- `Valencia HS (Placentia)`
- `Villa Park HS`
- `Warren HS`
- `Yorba Linda HS`

## Google Sheets Roster

The Team page loads live roster data from the Cloudflare Pages Function at `/api/roster`.
That function fetches the published Google Sheets CSV and groups players by `team`.

The sheet should have these headers:

`team,name`

By default it uses:

`https://docs.google.com/spreadsheets/d/e/2PACX-1vSj9425PibPbiWiL0mqfM63_ncS0R6dHQgE5GJ0ConpoV2cyCeFET2f2GcfdOJPlEEC_UDGoHwUEOet/pub?gid=0&single=true&output=csv`

To change it in Cloudflare without editing code, add a Pages environment variable:

`ROSTER_CSV_URL`

## Asset Forms

The Forms page loads files from the Cloudflare Pages Function at `/api/forms`.

Preferred setup for automatic discovery:

1. Store form files under the `forms/` prefix in the same Cloudflare R2 bucket that backs
   `https://assets.chsboyssoccer.com`.
2. Add an R2 bucket binding to the Pages project named `ASSETS_BUCKET` or `FORMS_BUCKET`.
3. Keep the public asset base at `https://assets.chsboyssoccer.com/forms/`.

With the bucket binding in place, `/api/forms` lists the `forms/` prefix directly, so new
files appear on the Forms page after the API cache refreshes.

Fallback setup if bucket listing is not configured:

Create `https://assets.chsboyssoccer.com/forms/forms.json` with either an array of filenames:

`["tryout-form.pdf", "player-contract.pdf"]`

or named entries:

`{"forms":[{"name":"Tryout Form","path":"tryout-form.pdf"}]}`

Optional Cloudflare Pages environment variables:

- `FORMS_PUBLIC_BASE_URL`: defaults to `https://assets.chsboyssoccer.com/forms/`
- `FORMS_MANIFEST_URL`: defaults to `https://assets.chsboyssoccer.com/forms/forms.json`

## Contact Form

The Contact page posts to the Cloudflare Pages Function at `/api/contact`.
It uses Cloudflare Turnstile for spam protection and Resend for email delivery.

Required Cloudflare Pages environment variables:

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`

The message is sent to `cypresshighsoccer@gmail.com` and copied to the email entered in the form.

Frontend setup:

1. Create a Cloudflare Turnstile widget.
2. Copy the Turnstile site key.
3. Paste it into `contact-config.js` as `turnstileSiteKey`.

Email setup:

1. Create a Resend account.
2. Verify the sending domain/email.
3. Create a Resend API key.
4. Add the API key as `RESEND_API_KEY`.
5. Add the verified sender as `CONTACT_FROM_EMAIL`, for example `Cypress High Soccer <forms@yourdomain.com>`.
