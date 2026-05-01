# Cypress Centurion Boys Soccer

Static website for Cypress Centurion Boys Soccer, ready for Cloudflare Pages.

Deployment is managed through Cloudflare Pages connected to GitHub.

## Cloudflare Pages Settings

- Build command: leave blank
- Build output directory: `/`
- Production branch: `main`

## Google Calendar Schedule

1. In Google Calendar, open the team calendar settings.
2. Under access permissions, make the calendar public.
3. Under Integrate calendar, copy the iframe `src` URL.
4. Paste that URL into `schedule-config.js` as `googleCalendarEmbedUrl`.

The Upcoming Games cards are loaded from the Cloudflare Pages Function at `/api/schedule`.
That function fetches the public Google Calendar iCal feed and returns future events as JSON.

By default it uses:

`https://calendar.google.com/calendar/ical/cypresshighsoccer%40gmail.com/public/basic.ics`

To change it in Cloudflare without editing code, add a Pages environment variable:

`GOOGLE_CALENDAR_ICS_URL`

Upcoming game cards can also be added as a local fallback in `schedule-config.js` under `events`.

For the homepage Upcoming Match block, name varsity calendar events like:

`Varsity vs Valencia HS`

or:

`Varsity @ Valencia HS`

Supported opponent logo keys:

- `Anaheim HS`
- `Beckman HS`
- `Buena Park HS`
- `Cal HS`
- `Corona del Mar HS`
- `El Toro HS`
- `Sunny Hills HS`
- `Valencia HS`

## Google Sheets Roster

The Team page loads live roster data from the Cloudflare Pages Function at `/api/roster`.
That function fetches the published Google Sheets CSV and groups players by `team`.

The sheet should have these headers:

`team,name`

By default it uses:

`https://docs.google.com/spreadsheets/d/e/2PACX-1vSj9425PibPbiWiL0mqfM63_ncS0R6dHQgE5GJ0ConpoV2cyCeFET2f2GcfdOJPlEEC_UDGoHwUEOet/pub?gid=0&single=true&output=csv`

To change it in Cloudflare without editing code, add a Pages environment variable:

`ROSTER_CSV_URL`

## Google Drive Forms

The Forms page loads files from the Cloudflare Pages Function at `/api/forms`.
That function lists public files from a Google Drive folder and returns their public links.

Cloudflare Pages environment variable required:

- `GOOGLE_DRIVE_API_KEY`

Optional override:

- `GOOGLE_DRIVE_FORMS_FOLDER_ID`

Google Drive setup:

1. Create a folder named `forms`.
2. Add the form files to that folder.
3. Share the folder publicly, or make each file public.
4. Copy the folder ID from the folder URL.
5. Create a Google Cloud API key with Drive API enabled.
6. Add the API key as a Cloudflare Pages environment variable.

The default forms folder ID is already set in `functions/api/forms.js`.

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
