# 2026 Texas Universal Beauty Schedule

A responsive Candyland-themed guide to the October 30–November 1 Texas Our Little Miss State Universal Beauty Competition at Texas A&M Hotel and Convention Center.

## Features

- Candyland home-screen icons for iPhone, iPad, and Android, with the short app name **Texas OLM**. Queens bookmarks use the same artwork with the name **OLM Queens**. Existing saved shortcuts may need to be added again to pick up the icon. See [icon artwork notes](docs/app-icon.md).
- All 13 events, with day filters, search, event categories, attire, check-in notes, and event details.
- Full schedule defaults to **Now & upcoming**: earlier start-time groups disappear when the next distinct start arrives in Central Time. Events sharing a start remain together, even if their end times differ. Before the weekend all events appear; the final farewell stays after the last start. Individual day views and My schedule retain their complete event lists. The open page advances automatically at start/end boundaries and catches up when returning from the background.
- Contestant checkboxes build a separate **My schedule** tab. Switch between everyone being watched and one contestant.
- Organizer-supplied portraits appear beside 16 contestants on roster cards, watch lists, and personal schedules. Photos are mapped to stable contestant IDs in `src/portraits.js`, so optional-entry imports preserve those associations. Victoria Stewart and device-only personal profiles use initials until approved photos are provided. Netlify Image CDN serves small WebP copies; local previews use the supplied originals, and failed image requests fall back to the original or initials.
- Required/shared events appear for competition contestants. Entered optionals are matched from the roster, and unknown entries remain visible with a confirmation note. Optionals-only entrants receive only confirmed optional stage sessions.
- Watch selections and optional personal profiles are stored only in the current browser. They do not register contestants and do not sync between devices.
- Personal profiles can be added or edited if the official roster is unavailable or an optional was added at registration.
- A **Handbook** tab provides the corrected 12-page PDF, topic links, current competition divisions, and separate Livin’ Doll / Sweepstakes divisions.
- A separate `/queens/` section has shared-password access, day filters, assignment search, report times, wardrobe, and print support.
- Print the current view or download a calendar file. Calendar export uses the correct Central Time offsets before and after the November 1 DST change. Downloads are snapshots, not calendar subscriptions.

## Run and verify

```sh
npm ci
npm test
npm run dev
```

Open the printed local URL. `npm run build` writes the static site into `dist/`. Netlify serves the live `/api/roster` function; the local development server intentionally shows the roster as unavailable unless a sanitized snapshot has been imported.

## Official schedule and corrections

Event content was transcribed from the organizer-provided `2026 Texas Universal Beauty Schedule.pub`. The organizer confirmed these AM/PM corrections on October 13, 2026:

- Saturday Playtime / Team OLM: 11:30 AM–12:30 PM.
- Saturday Parent Meeting: noon–12:30 PM.
- Sunday Special Awards: 9:30–10:30 AM.
- Sunday Grand Finals: 11:30 AM–1:30 PM.

On October 29, 2026, the organizer confirmed that all contestants check in **15 minutes before events with a listed check-in**. Official Registration, Welcome to Candyland, and Safe Travels Home have no check-in. Livin’ Doll retains its existing unspecified check-in. The nine remaining events have explicit check-in times, including ProAm / Optional Talent at 6:15 PM. Full schedule, daily views, personalized schedules, printouts, and calendar descriptions use the same event data. Event start times and the separate Queens report assignments are unchanged.

Edit `src/data.js` to update events. Each event has a stable ID. Optional `divisions` or `contestantIds` arrays can restrict a future event to specific contestants. Current required events apply to every division, as stated in the source. Check-in times apply to all contestant divisions.

## Live roster connection

The app currently publishes 17 approved entrants: 15 crown-eligible competition contestants (including two Prince entries), Victoria Stewart in Winners Circle, and Brynley Buzzard as optionals only. The competition roster comes from the organizer-supplied **Contestant Roster.xlsx** snapshot imported October 13, 2026. Stage entries were reconciled with the organizer’s [Google Sheets workbook](https://docs.google.com/spreadsheets/d/1AB5yUJALTwlpdDF8QJbGdROa4SM156mF/edit?gid=1389950232#gid=1389950232) on October 27, 2026. All four public categories are now confirmed for all 17 contestants: Livin’ Doll, Practice Interview, Optional Talent / Command, and aggregate ProAm enrollment. The new source confirms Isabella Chauvette’s Livin’ Doll enrollment and no entries in the other three stage categories; the other 16 contestants match the October 26 import. Brynley’s name retains its asterisk and “Optionals only” explanation; her personal schedule and calendar contain only the three entered stage sessions (ProAm and Talent share one session). Existing contestant IDs, Prince labels, and participation designations are preserved. Confirmed non-entries are excluded from personalized events. This snapshot is updated by importing and publishing a new roster; the live Big Forms connection is not configured.

The source repository, [Texas-Beauty-Big-Forms](https://github.com/collettelawsupport/Texas-Beauty-Big-Forms), stores submissions privately and mirrors a workbook to Google Drive. The full workbook contains addresses, contact information, birth dates, family details, financial charges, and private workflow data. Do not publish or commit the workbook, Google credentials, or download passkey.

The server-side function supports either of these connection methods:

1. Set `BIG_FORMS_URL` and `WORKBOOK_DOWNLOAD_KEY` in **Netlify environment variables, Functions scope**. Use the existing Big Forms workbook passkey. The function requests the existing protected `/api/download-workbook` endpoint over HTTPS, imports the workbook in memory, and sends only an opaque contestant ID, name, division, and optional category keys to the public app. This follows the same source as the Google Drive mirror; it does not require making the workbook public. The existing source endpoint rebuilds the workbook and may also refresh its Drive mirror.
2. Set `ROSTER_FEED_URL` to a dedicated HTTPS JSON feed with the schema below. `ROSTER_FEED_TOKEN` may contain a bearer token if that feed requires it. Secrets remain server-side. Do not point this at the private full workbook URL.

Redeploy after setting environment variables. The Netlify CDN caches successful responses for five minutes; an open app refreshes every five minutes. Changes therefore may take about ten minutes to appear. The Refresh control refreshes the browser view but does not bypass the server cache. Existing names remain in memory when a refresh fails. The app uses a sanitized published snapshot when configured.

```json
{
  "contestants": [
    {
      "id": "stable-opaque-id",
      "name": "Contestant name",
      "division": "7 - 9 years",
      "optionals": ["practice-interview", "pro-am"]
    }
  ]
}
```

Use `optionals: null` for unknown entries and `[]` for known no entries. Victoria Stewart was added October 25, 2026 as `participation: "winners-circle"`: an out-of-state practice participant who attends the same main events but is not eligible for a crown. Her confirmed age division is 3–6 years. The October 26 workbook confirms no stage optional entries (`optionals: []`). Her roster card, personal schedule, and calendar show her Winners Circle status. This marker survives public sanitation and optional-entry imports; it does not exclude main events or imply optional enrollment.

Set `participation: "optionals-only"` only for organizer-confirmed optional-only entrants; the public roster, build, and browser preserve this marker, and later optional-entry imports retain it. The public allowlist is limited to `practice-interview`, `pro-am`, `optional-talent`, and `livin-doll`. ProAm is a single enrollment flag regardless of the number or type of entries. Prettiest & Best, Commercial Print, Photogenic, and other non-stage entries are excluded from the snapshot, API, build output, profile editor, saved profiles, and future imports. The Big Forms importer ignores decline/deferred-entry answers and non-stage coupon selections. IDs are derived from the source submission ID without exposing it, so two contestants with the same name remain separate.

### Import a sanitized snapshot

Save the organizer’s formatted **Contestant Roster** workbook or the private Big Forms workbook outside the repository, then run:

```sh
npm run import:roster -- /private/path/texas-our-little-miss-contestants.xlsx
npm test
npm run build
```

The printable roster importer reads the two first-name / last-name blocks, normalizes age divisions, preserves `program: "prince"`, and derives stable IDs from normalized name and program. It rejects ambiguous duplicate names within a program instead of merging them. Big Forms IDs remain derived from submission IDs; switching sources requires reconciling IDs to preserve existing watch lists.

This saves only approved scheduling fields in `public/data/roster.json`. Review that file before committing and deploying. Snapshot imports do not update automatically; use the live connection for ongoing updates. Do not copy the source workbook into `public/`.

### Attach optional-entry scorecards

```sh
npm run import:optionals -- /private/path/optionals.xlsx
```

This merges highlighted cells from the organizer’s Living Doll, Practice Interview, and Command / Optional Talent scorecards, plus the Pro Am Modeling sheet’s Yes/No enrollment flag. Non-stage sheets and individual ProAm categories are ignored entirely. Blank uncolored cells on the three highlighted scorecards mean no entry; ProAm requires an explicit Yes or No. Blank rows, score/winner fields, comments, and private notes are not published. Identical duplicate rows are combined; conflicting duplicates stop the import. The importer validates headers and highlight colors, accepting equivalent six-digit RGB and opaque eight-digit ARGB colors.

Existing contestant IDs, display names, divisions, Prince labels, and participation statuses are preserved. Names match by division and full name or first/last name when middle names differ. Organizer-confirmed aliases in `scripts/lib/roster-corrections.mjs` map `Silas` to `Silas Elgourbi`, Sydni/Sydney Lee to her daughter Mareigh Chavez, Brittany Pike to her son Paxtyn Pike, and the source typo `Vicroria Stewart` to Victoria Stewart. The children’s names are also confirmed in the workbook’s personal-information responses. The mothers must not be re-added as contestants. Allison Nice, Austyn Tomberlan, and `A` were confirmed as sandbox registrations on October 26 and are excluded before importing entries, including when `--add-unmatched` is used. This exclusion applies to app imports; it does not delete registrations from Big Forms. Ambiguous matches fail. Other unmatched people are reported and not added by default. Only use `--add-unmatched` after reviewing new names with the organizer.

`optionals` lists confirmed entries. `optionalCoverage` lists categories for which both entries and non-entries are known; omitted coverage retains the original complete-array behavior. `optionalDetails` may distinguish Optional Talent from Command Performance only; individual ProAm categories are never published. Imports preserve previously confirmed categories when a newer workbook lacks their sheet. Unknown events stay visible with confirmation notes in the app and personal calendar downloads. Run tests and review the snapshot before publishing.

A fresh `import:roster` replaces the snapshot; reapply optional entries after a new roster import and reconcile identities before switching roster sources.

## Contestant photos

The October 27 photos are stored as `public/assets/portrait-*`. The organizer identified the first clipboard photo as Isabella Chauvette and confirmed that **Analisa Chavez.png** belongs to **Analisa Hernandez**, whose displayed name stays unchanged. **Paxton Pike 1.png** maps to the existing **Paxtyn Pike** record, and **Avienda.jpg** maps to **Aviendha Smith**. Where two photos were supplied, the organizer selected **Mareigh.jpg**, **Jasmine Romero.jpg**, and **Victoria Aurora Dishon2.jpg**. The supplied pictures are preserved without retouching; CSS frames them for each location in the app. Update the approved ID mapping and asset together when replacing a photo.

## Handbook

`public/documents/2026-texas-universal-beauty-handbook.pdf` preserves the supplied handbook’s 12 pages and original layout. Page 2 changes only the outdated main competition adult ranges: **21–28 → 21–39** and **29+ → 40+**. The [official honor-roll registration form](https://honorrollregistration.texasourlittlemiss.net/) supplies the eight main divisions and the October 1, 2026 age cutoff. Livin’ Doll (page 6) and Sweepstakes (page 8) retain their separate divisions as confirmed by the organizer. The original supplied files are not modified.

The Handbook tab is rendered by `src/handbook.js`, with the cover image and corrected PDF served as public assets.

## Hosting

### Queens access and private content

The Queens schedule is an imported snapshot held in the private Netlify Blobs store `queens-content`, key `schedule.json`. It is **not** included in this public repository or the static build. Only the authenticated `/api/queens/schedule` function can read it. Source spreadsheet sharing permissions are independent of this application.

Access settings live in the separate private Blobs store `queens-access`, key `config.json`, with `passwordHash` (salted scrypt, formatted `scrypt$<salt hex>$<derived key hex>`) and `secret` (at least 64 cryptographically random characters). No route serves this store. The `hashPassword` helper in `netlify/lib/queens-auth.mjs` generates a hash. Keep the plain password and access settings out of source, public assets, build variables, and logs. To rotate access, prepare a protected file outside the tracked tree, then use `netlify blobs:set queens-access config.json --input /private/path/config.json`. Strongly consistent reads apply changes on the next request and invalidate existing sessions.

Hosts with secret environment-variable support may alternatively set `QUEENS_PASSWORD_HASH` and `QUEENS_SESSION_SECRET` with Functions scope in production, then redeploy. When both valid environment values exist, they take precedence over the private access store. The current account rejected secret-variable creation, so this site uses private Blobs for its access configuration.

Sessions last 12 hours and use signed, Secure, HttpOnly, same-site host cookies. Login attempts are rate limited; mutation endpoints check the request origin. Every private response disables browser and CDN caching. Sign out clears the browser cookie; an already copied cookie remains usable until expiry or secret rotation. This shared-password section is intended for royalty and chaperones, not individual accounts.

To update the schedule, prepare a reviewed JSON snapshot outside the tracked tree (for example `work/queens-schedule.json`) and upload with the authenticated Netlify CLI:

```sh
netlify blobs:set queens-content schedule.json --input work/queens-schedule.json
```

The JSON contains `title`, `importedAt`, and `events`. Each event has `id`, `date`, `title`, `group`, and at least one of `report` or `start` (24-hour `HH:MM`), plus optional `end`, `royalty`, `chaperones`, `wardrobe`, `notes`, and `dismissal`. Source data is treated as plain text. Follow the source's visible rows, omit hidden legacy tabs, and verify time corrections with the organizer. Uploaded updates appear on the next page load or **Refresh**; the app does not automatically sync Google Sheets. The store is shared across deploys, so do not seed test data into this production store. The simple local static server does not serve the protected Queens functions; use Netlify Dev for function development.

The Netlify project is `texas-universal-beauty-2026` (ID `29ab997e-0f97-4f5b-a994-87c96dc31405`). `netlify.toml` specifies the build, publish directory, function bundling, and response headers. `.netlify/` and local secret files are ignored.

The source repository is https://github.com/collettelawsupport/2026-Texas-Universal-Beauty-Schedule.

Automatic publishing is connected to the repository’s `main` branch. Each push triggers a Netlify build. Configure roster secrets in Netlify before redeploying to activate the live roster.

For an occasional manual deploy (the next `main` push replaces it):

```sh
npm run build
netlify deploy --prod --no-build --site 29ab997e-0f97-4f5b-a994-87c96dc31405
```

The site requests no search-engine indexing. This is not an access-control mechanism: published contestant scheduling fields are visible to anyone with the site link. The full private workbook never ships to browsers. No tracking or analytics are included.

### Handbook reader

All handbook reading links open an in-app page reader, including the cover, topic list, and optional division details. The persistent Back and Close controls, Escape key, and browser Back dismiss it and restore the handbook's scroll position and focus. Pages support zoom and an expandable text version. The separate Download PDF action still offers the original document.

The reader uses committed page images and extracted text so iPhone home-screen apps do not depend on a native PDF viewer's missing browser controls. After changing the PDF, regenerate these assets with Python (`pypdf`, Pillow) and Poppler's `pdftoppm` on PATH:

```sh
python3 scripts/render-handbook.py
```

An optional first argument selects another local copy of the PDF. Commit `public/assets/handbook-page-*.jpg` and `public/data/handbook-pages.json` alongside the PDF update. The handbook integrity test checks the source hash, all 12 images, text availability, and in-app destinations.

Brynley Buzzard’s organizer-supplied portrait was added October 29, 2026, using her existing contestant ID and preserving her optionals-only status.
