# Health Check Dashboard — Backend

Read-only analytics API over synced Shopify catalog/order data (FLH-2917):
conflict detection, variant data-quality checks, order & inventory impact,
orders-needing-action aging, a per-variant conflict-details view, CSV export,
and scan scheduling (daily + manual with a 15-minute cooldown). No auth, no
bulk-editing — this is a health-check surface, not a catalog editor.

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
```

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Seed / reset the database

The seed script drops and recreates all tables, so running it again is how you
reset + reseed:

```bash
python -m app.seed
```

This generates, for a single `seller_id` (`seller_demo_001`, store domain
`aurora-apparel.myshopify.com`):
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

## Run the API

```bash
uvicorn app.main:app --reload
```

API docs (interactive): http://127.0.0.1:8000/docs

Starting the app also starts an in-process daily scheduler (APScheduler) that
scans each seeded seller at 9:00 AM in their stored timezone — see `app/scheduler.py`.

## Endpoints

All under `/health-check`, all take `seller_id` as a query param.

| Method & path | Notes |
|---|---|
| `GET /summary` | `total_conflicts`, `orders_affected`, `inventory_units_affected`, `orders_awaiting_action`. Orders/inventory figures now cover conflicts **and** data-quality gaps (union). |
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
  override with the `DATABASE_URL` env var.
- All datetimes are naive UTC (no offset suffix) — the frontend explicitly
  treats them as UTC when parsing; don't assume a bare `new Date(...)` on the
  client will do the right thing with them.
- No Alembic — schema changes go into `models.py`, then `python -m app.seed`
  to rebuild.
- No auth, no bulk-editing/auto-fix endpoints, no fulfilled/delivered/
  returned/cancelled order reporting, no multi-store aggregation (all out of
  scope per the ticket).
