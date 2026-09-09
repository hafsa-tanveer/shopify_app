# Health Check Dashboard — Frontend

React (Vite) merchant-facing UI for the full Health Check dashboard (FLH-2917):
conflict breakdown, variant data-quality checks, order & inventory impact,
orders-needing-action aging, a conflict-details modal, CSV export, and a
scan button with a server-enforced 15-minute cooldown. Styled to match a
Shopify-admin look (dark app bar, green primary action, red/amber badges).
Talks to the FastAPI backend at `http://localhost:8000` (override with
`VITE_API_BASE_URL`).

## Folder structure

```
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

## Setup

```bash
npm install
```

## Run

Make sure the backend is running first (`uvicorn app.main:app --reload` from
`health-check-backend/`, seeded via `python -m app.seed`), then:

```bash
npm run dev
```

Opens at http://localhost:5173.

## Notes

- `seller_id` is hardcoded to `seller_demo_001` in `src/constants.js` (matches
  the backend seed data) — no auth/seller-switching yet.
- The dashboard only shows totals and breakdown counts, never raw variant
  data. Variant records only appear on the Products drill-through.
- Quality-check drill-through rows show a disabled "Edit variant" affordance
  — bulk-editing is out of scope for this release (ticket §8).
- **Always parse backend timestamps through `parseServerDate` (`src/utils/date.js`)**,
  never a bare `new Date(isoString)`. The API returns naive UTC timestamps
  with no offset suffix, and the ECMA-262 Date Time String Format treats a
  timezone-less date-time string as **local** time — skipping this helper
  silently breaks the scan cooldown countdown for any viewer not in UTC+0.
- Styling is Tailwind CSS v4 (via `@tailwindcss/vite`) with a `@theme` block
  in `src/index.css` defining the Shopify-style palette (`shopify-green`,
  `shopify-red`, `shopify-amber`, `shopify-blue`, etc.) — restyle by reusing
  those tokens, not ad hoc slate/indigo classes.
