from typing import Any

from fastapi import APIRouter

from app.services.notion import create_daily_record, create_issue_record

router = APIRouter()


@router.post("/daily-records")
async def save_daily_record(payload: dict[str, Any]):
    return await create_daily_record(payload)


@router.post("/issue-records")
async def save_issue_record(payload: dict[str, Any]):
    return await create_issue_record(payload)
