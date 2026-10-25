# Rased (by Elm) — Amplitude demo site

**What this is:** a look-alike of Rased, Elm's fleet-management service: the rased.sa marketing page plus a signed-in Rased platform.
Two maintenance coordinators book a workshop service. Ramla Contracting's booking always fails, while Wahat Logistics books and pays. Everything is sent to Amplitude project **888338**.

Site: `https://khaledismail-sandbox.github.io/rased-demo/`

---

## 1. Demo script — Dropper (Ramla Contracting, the default)

1. Open the site. *(Optional)* Click **Contact Us** → pick a fleet size → **Submit** → Thank you page.
2. Go to `/login/` (add `login/` to the site URL). The User ID is already filled in: `ramla_contracting-u001`. Click **Sign in**.
3. **Dashboard** → in the left menu click **Maintenance Management**.
4. Click **Book a workshop**.
5. Tick **Select all vehicles** (all 6 show "No odometer feed") → choose a **Service type** → **Start request**.
6. Fill in **Workshop city** (Dammam), **Preferred date** and **Time slot**. The odometer reading is locked to the telematics feed, which has nothing to report.
7. Click **Submit booking**. A banner appears: *"Booking couldn't be completed — 6 vehicles have no odometer feed (ODOMETER_FEED_MISSING)"*.
8. Click **Retry booking** 4–5 times quickly. It does nothing, and Amplitude records this as a Rage Click and a Dead Click.
9. Leave through the left menu (for example **Dashboard**). This records the abandon.

**What to show next in Amplitude**
- The funnel: Fleet Dashboard Viewed → Maintenance Module Opened → Service Request Started → **Workshop Booking Submitted** (Ramla drops at step 4) → Maintenance Order Paid.
- The `Workshop Booking Failed` event, broken down by `error_code` = `ODOMETER_FEED_MISSING`.
- The Session Replay of this session: the error banner, then the rage clicks on Retry.
- The **account** view: Ramla Contracting (300 vehicles, only 21% linked to telematics).

## 2. Demo script — Converter (Wahat Logistics)

1. At the very bottom of the login page (or any platform page) are two tiny letters, **d** and **c**. Click **c**.
   You are taken back to Sign in with `wahat_logistics-u001` filled in.
2. **Sign in** → **Maintenance Management** → **Book a workshop**.
3. Pick vehicles (they show "Live odometer") → service → **Start request** → city (Riyadh), date, slot → **Submit booking**.
4. **Booking Confirmation** → choose a payment method → **Pay**.
5. **Maintenance Orders** shows the new paid order at the top.

To switch back to Ramla, click the tiny **d**.

## 3. Show the fix

Add `platform/maintenance/book-improved/` to the site URL. Nothing links to this page and it needs no sign-in.
It is the same 6 fields split into 3 short steps. Vehicles, city and date are already filled in, there is an "N items to go" counter, and each vehicle without a feed gets its own odometer box (or click **Use last recorded readings**). It ends with **Booking confirmed**.
This page sends nothing to Amplitude.

## 4. Verification (browser console)

```
localStorage.rased_rec = '1'      // turn the recorder on, then reload and run the script
RasedAnalytics.recDump()          // table of every identify/track, in call order
RasedAnalytics.recClear()         // empty the log
RasedAnalytics.sdkCheck()         // SDK, Session Replay, Guides & Surveys, Experiment, user/device/account
```
Rows marked `queued` were held back until the identify, setGroup and groupIdentify calls (logged as a `flush` row) had been sent.

## 5. Publishing on the GitHub website (no terminal)

Repo: `khaledismail-sandbox/rased-demo`

1. In Finder, open `Desktop/rased-demo` and press **Cmd + Shift + .** to show hidden files, so `.nojekyll` is visible.
2. On github.com open the repo → **Add file → Upload files**.
3. Drag in the **contents** of `Desktop/rased-demo/`: `.nojekyll`, `index.html`, `README.md`, and the folders `assets`, `demo-request`, `login`, `platform`.
   **Skip `_reference/` and `_tools/`.** The website uploader ignores `.gitignore`, so anything you drag in gets published.
   If the uploader refuses (limit of 100 files per upload), upload one folder at a time.
4. Commit directly to `main`.
5. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `main` / `(root)` → Save.**
6. Wait 1–2 minutes, then open `https://khaledismail-sandbox.github.io/rased-demo/`. For later updates, repeat steps 2–4 with only the changed files.
7. **Before recording replays:** the Session Replay mask level set in Amplitude is currently **medium**. The Amplitude setting overrides the site's code. In Amplitude go to **Session Replay → Settings → Privacy** and set the default mask level to **Light**. Otherwise text in replays may be masked.

---

### For maintainers
- Pages are generated from `_tools/pages/*.html` by `_tools/build.sh`. The fix page is edited directly.
- `_tools/measure_palette.py` measures the colours, and `_tools/case_audit.py` checks that every link's path matches exactly, including upper/lower case (it must report 0 mismatches).
- All tracking goes through `assets/js/analytics.js`.
