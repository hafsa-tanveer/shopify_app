"""
In-process daily scan scheduler. There's no live Shopify integration in this
app, so a "scan" (scheduled or manual) doesn't regenerate catalog/order data
-- it just recomputes the products/variants-scanned counts from whatever is
currently seeded and stamps `last_scanned_at`, which is what the dashboard's
scan context and the manual-scan cooldown are built on.
"""

from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import distinct, func

from . import models
from .database import SessionLocal

COOLDOWN = timedelta(minutes=15)
DAILY_SCAN_HOUR = 9
DAILY_SCAN_MINUTE = 0

scheduler = BackgroundScheduler()


def run_scan(seller_id: str) -> Optional[models.StoreScanState]:
    db = SessionLocal()
    try:
        state = db.query(models.StoreScanState).filter_by(seller_id=seller_id).first()
        if state is None:
            return None

        state.variants_scanned_count = (
            db.query(func.count(models.Variant.id))
            .filter(models.Variant.seller_id == seller_id)
            .scalar()
        ) or 0
        state.products_scanned_count = (
            db.query(func.count(distinct(models.Variant.product_id)))
            .filter(models.Variant.seller_id == seller_id)
            .scalar()
        ) or 0
        state.last_scanned_at = datetime.utcnow()

        db.commit()
        db.refresh(state)
        db.expunge(state)
        return state
    finally:
        db.close()


def schedule_daily_scans() -> None:
    db = SessionLocal()
    try:
        for state in db.query(models.StoreScanState).all():
            scheduler.add_job(
                run_scan,
                args=[state.seller_id],
                trigger=CronTrigger(
                    hour=DAILY_SCAN_HOUR,
                    minute=DAILY_SCAN_MINUTE,
                    timezone=ZoneInfo(state.timezone),
                ),
                id=f"daily-scan-{state.seller_id}",
                replace_existing=True,
            )
    finally:
        db.close()
