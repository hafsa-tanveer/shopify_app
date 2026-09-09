from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..scheduler import COOLDOWN, run_scan

router = APIRouter(prefix="/health-check", tags=["scan"])


def _status_payload(state: models.StoreScanState) -> schemas.ScanStatusResponse:
    now = datetime.utcnow()
    seconds_remaining = 0
    next_eligible = None
    if state.last_scanned_at:
        remaining = COOLDOWN - (now - state.last_scanned_at)
        if remaining.total_seconds() > 0:
            seconds_remaining = int(remaining.total_seconds())
            next_eligible = state.last_scanned_at + COOLDOWN

    return schemas.ScanStatusResponse(
        seller_id=state.seller_id,
        store_domain=state.store_domain,
        timezone=state.timezone,
        last_scanned_at=state.last_scanned_at,
        products_scanned_count=state.products_scanned_count,
        variants_scanned_count=state.variants_scanned_count,
        daily_scan_time_local="09:00",
        cooldown_seconds_remaining=seconds_remaining,
        next_manual_eligible_at=next_eligible,
    )


@router.get("/scan/status", response_model=schemas.ScanStatusResponse)
def get_scan_status(seller_id: str = Query(...), db: Session = Depends(get_db)):
    state = db.query(models.StoreScanState).filter_by(seller_id=seller_id).first()
    if state is None:
        raise HTTPException(status_code=404, detail=f"No scan state for seller_id '{seller_id}'")
    return _status_payload(state)


@router.post("/scan", response_model=schemas.ScanTriggerResponse)
def trigger_scan(seller_id: str = Query(...), db: Session = Depends(get_db)):
    state = db.query(models.StoreScanState).filter_by(seller_id=seller_id).first()
    if state is None:
        raise HTTPException(status_code=404, detail=f"No scan state for seller_id '{seller_id}'")

    now = datetime.utcnow()
    if state.last_scanned_at and now - state.last_scanned_at < COOLDOWN:
        remaining = COOLDOWN - (now - state.last_scanned_at)
        next_eligible = state.last_scanned_at + COOLDOWN
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Scan already run recently. Try again in a few minutes.",
                "next_eligible_at": next_eligible.isoformat(),
                "seconds_remaining": int(remaining.total_seconds()),
            },
        )

    updated = run_scan(seller_id)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"No scan state for seller_id '{seller_id}'")
    return _status_payload(updated)
