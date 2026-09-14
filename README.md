# Health Check Dashboard (FLH-2917)

A merchant-facing Shopify Health Check dashboard: catalog data-conflict
detection, variant data-quality checks, order & inventory impact, an
orders-needing-action view with aging brackets, a per-variant conflict-details
modal, CSV export, and scan scheduling (daily + manual with a server-enforced
15-minute cooldown). No auth, no bulk-editing/auto-fix — this is a
health-check surface, not a catalog editor.

Two projects, run together:

- **`health-check-backend/`** — FastAPI + SQLAlchemy + SQLite read-only
  analytics API over synced Shopify catalog/order data.
- **`health-check-frontend/`** — React (Vite) UI, styled to match a
  Shopify-admin look (dark app bar, green primary action, red/amber badges).

## Quick start

Two terminals, backend first:

```bash
# Terminal 1 — backend
cd health-check-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # seed the SQLite db with demo data
uvicorn app.main:app --reload
```

```bash
# Terminal 2 — frontend
cd health-check-frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The API itself is at http://127.0.0.1:8000
(interactive docs at `/docs`).

Once both are up, they keep running in the background — you only need to
redo `pip install`/`npm install` if dependencies change, and only need to
reseed (`python -m app.seed`) to reset demo data.

## Folder structure

```
health-check-backend/
  requirements.txt
  health_check.db          # created on first run / reseed (sqlite)
  app/
    main.py                # FastAPI app entrypoint + scheduler lifespan
    database.py             # engine/session/Base setup
    models.py                # SQLAlchemy models
    schemas.py                # Pydantic response models
    seed.py                    # dummy data generator / db reset tool
    scheduler.py                # APScheduler: daily scan + manual run_scan()
    services/
      health_metrics.py          # shared query helpers (single source of truth)
    routers/
      health_check.py             # conflict/quality/impact/orders/export endpoints
      scan.py                       # POST /scan, GET /scan/status

health-check-frontend/
  src/
    main.jsx              # entry point
    App.jsx                # routes: /, /products, /orders
    constants.js             # SELLER_ID, conflict/quality type + age-bracket metadata
    api/
      client.js               # fetch wrapper (GET/POST, JSON + blob, structured errors)
      healthCheck.js            # typed calls to every health-check endpoint
    hooks/
      useFetch.js               # loading/error/data fetch hook
      useCooldownTimer.js         # server-timestamp-derived countdown
    context/
      ScanContext.jsx              # scan status + toast, shared across pages
    utils/
      date.js                       # parseServerDate — treats bare backend timestamps as UTC
    components/
      Layout.jsx                # dark app bar + <Outlet />, wraps ScanProvider
      StatCard.jsx / StatusBadge.jsx / FilterChip.jsx / Breadcrumb.jsx
      StatusSummaryBanner.jsx      # 4.1 status pill
      ConflictBreakdownRow.jsx      # 4.2 breakdown row
      QualityTile.jsx                # 4.3 data-quality tile
      ImpactSummary.jsx / ImpactGroupTable.jsx   # 4.4 impact
      AgingCard.jsx                   # 4.5 aging bracket card
      VariantsTable.jsx                 # Products drill-through (conflict + quality)
      OrdersTable.jsx                     # Orders drill-through
      ProductConflictModal.jsx              # 4.7 conflict-details modal
      ScanButton.jsx / ExportButton.jsx / Toast.jsx
      LoadingState.jsx / ErrorState.jsx
    pages/
      Dashboard.jsx          # "/"
      FilteredProducts.jsx    # "/products?type=..."
      OrdersList.jsx           # "/orders?bracket=..."
```

Adding a new screen later means adding a page under `pages/`, a route in
`App.jsx`, and any new API calls in `api/healthCheck.js` — no restructuring
needed.

## Seed data

`python -m app.seed` drops and recreates all tables, so running it again is
how you reset + reseed. It generates, for a single `seller_id`
(`seller_demo_001`, store domain `aurora-apparel.myshopify.com`):

- 200 variants across ~25 products (multiple variants per product)
- ~15% of variants with ≥1 **pending** conflict, spread across the five
  conflict types (weighted so SKU/barcode dominate), plus a few planted
  **resolved** conflicts
- Deliberately planted data-quality issues: duplicate barcodes/SKUs, missing
  barcodes/SKUs (with realistic overlap), and continue-selling variants
- 150 orders; 45 are pending+unfulfilled ("needing action"), stratified
  evenly across the 0-3 / 4-10 / 11+ day aging brackets
- One `StoreScanState` row (scan metadata, starts unscanned)

The console output after seeding reports every quality-check count and the
aging-bracket spread so you can confirm the data looks right without hitting
the API.

Starting the backend also starts an in-process daily scheduler (APScheduler)
that scans each seeded seller at 9:00 AM in their stored timezone — see
`health-check-backend/app/scheduler.py`.

## API endpoints

All under `/health-check`, all take `seller_id` as a query param.

| Method & path | Notes |
|---|---|
| `GET /summary` | `total_conflicts`, `orders_affected`, `inventory_units_affected`, `orders_awaiting_action`. Orders/inventory figures cover conflicts **and** data-quality gaps (union). |
| `GET /conflicts/breakdown` | Count per conflict type (`state=pending`), always all 5 types. |
| `GET /conflicts/variants?type=` | Drill-through variants for a conflict type. |
| `GET /quality/breakdown` | Count + severity per data-quality check, always all 6 types. |
| `GET /quality/variants?type=` | Drill-through variants for a quality check, with `issue_reason`. |
| `GET /impact` | Top-line orders/inventory affected + a 4-group breakdown (SKU/Barcode mismatches, Missing identifiers, Duplicate identifiers, Continue-selling oversell). Group figures are independent and don't need to sum to the top line. |
| `GET /orders/aging` | Pending+unfulfilled order count per aging bracket (`0-3`, `4-10`, `11+`). |
| `GET /orders?bracket=` | Pending+unfulfilled orders in one bracket. |
| `GET /conflicts/details?variant_id=` | Per-field Field/Current/Latest/Status for the conflict-details modal. |
| `GET /export` | CSV download with all 4 breakdowns (`text/csv`). |
| `POST /scan` | Triggers a manual scan; `429` with `next_eligible_at`/`seconds_remaining` if still in the 15-minute cooldown. |
| `GET /scan/status` | Current scan metadata + cooldown state (poll this for a resumable countdown). |

## Notes

- SQLite file lives at `health-check-backend/health_check.db` by default,
  override with the `DATABASE_URL` env var. No Alembic — schema changes go
  into `models.py`, then `python -m app.seed` to rebuild.
- The frontend talks to the backend at `http://localhost:8000` by default,
  override with `VITE_API_BASE_URL`.
- `seller_id` is hardcoded to `seller_demo_001` (backend seed + frontend
  `src/constants.js`) — no auth/seller-switching yet.
- All backend datetimes are naive UTC (no offset suffix). The frontend
  **must** parse them through `parseServerDate` (`src/utils/date.js`), never
  a bare `new Date(isoString)` — the ECMA-262 Date Time String Format treats
  a timezone-less string as *local* time, which silently breaks the scan
  cooldown countdown for any viewer not in UTC+0.
- The dashboard only shows totals and breakdown counts, never raw variant
  data — variant records only appear on the Products drill-through.
- Quality-check drill-through rows show a disabled "Edit variant" affordance
  — bulk-editing is out of scope for this release (ticket §8), as is
  fulfilled/delivered/returned/cancelled order reporting and multi-store
  aggregation.
- Styling is Tailwind CSS v4 (via `@tailwindcss/vite`) with a `@theme` block
  in `src/index.css` defining the Shopify-style palette (`shopify-green`,
  `shopify-red`, `shopify-amber`, `shopify-blue`, etc.) — restyle by reusing
  those tokens, not ad hoc slate/indigo classes.
