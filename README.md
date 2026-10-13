# 2026 Texas Universal Beauty Schedule

A responsive Candyland-themed guide to the October 30–November 1 Texas Our Little Miss State Universal Beauty Competition at Texas A&M Hotel and Convention Center.

## Features

- All 13 events, with day filters, search, event categories, attire, check-in notes, and event details.
- Contestant checkboxes build a separate **My schedule** tab. Switch between everyone being watched and one contestant.
- Required/shared events always appear; entered optionals are matched from the roster. Unknown optional selections remain visible with a confirmation note.
- Watch selections and optional personal profiles are stored only in the current browser. They do not register contestants and do not sync between devices.
- Personal profiles can be added or edited if the official roster is unavailable or an optional was added at registration.
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

The source leaves most check-in and arrival times blank. These display **To be announced**. ProAm / Optional Talent check-in is the supplied 6:30 PM. Never substitute an event's start time for a missing check-in time.

Edit `src/data.js` to update events. Each event has a stable ID. Optional `divisions` or `contestantIds` arrays can restrict a future event to specific contestants. Current required events apply to every division, as stated in the source. Add specific division check-in rows only when the organizer provides them.

## Live roster connection

**The official roster is not connected yet.** No real contestant records are bundled initially. The app displays this clearly and supports personal profiles while access is supplied.

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

Use `optionals: null` for unknown entries and `[]` for known no entries. Supported keys: `practice-interview`, `pro-am`, `optional-talent`, `livin-doll`, `photogenic`, `commercial-print`, `prettiest-best`, and `other-optional`. The Big Forms importer includes free coupon entries and ignores decline/deferred-entry answers. IDs are derived from the source submission ID without exposing it, so two contestants with the same name remain separate.

### Import a sanitized snapshot

Download the private Big Forms workbook to a location outside the repository, then run:

```sh
npm run import:roster -- /private/path/texas-our-little-miss-contestants.xlsx
npm test
npm run build
```

This saves only approved scheduling fields in `public/data/roster.json`. Review that file before committing and deploying. Snapshot imports do not update automatically; use the live connection for ongoing updates. Do not copy the source workbook into `public/`.

## Hosting

The Netlify project is `texas-universal-beauty-2026` (ID `29ab997e-0f97-4f5b-a994-87c96dc31405`). `netlify.toml` specifies the build, publish directory, function bundling, and response headers. `.netlify/` and local secret files are ignored.

The source repository is https://github.com/collettelawsupport/2026-Texas-Universal-Beauty-Schedule.

Automatic publishing is connected to the repository’s `main` branch. Each push triggers a Netlify build. Configure roster secrets in Netlify before redeploying to activate the live roster.

For an occasional manual deploy (the next `main` push replaces it):

```sh
npm run build
netlify deploy --prod --no-build --site 29ab997e-0f97-4f5b-a994-87c96dc31405
```

The site requests no search-engine indexing. This is not an access-control mechanism: published contestant scheduling fields are visible to anyone with the site link. The full private workbook never ships to browsers. No tracking or analytics are included.
