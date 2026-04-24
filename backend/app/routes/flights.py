from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class FlightQueryRequest(BaseModel):
    flights: List[str] = Field(default_factory=list)
    start: str
    end: str


@router.post("/")
async def search_flights(payload: FlightQueryRequest) -> Dict[str, Any]:
    raise HTTPException(
        status_code=418,
        detail={
            "message": "ROUTE_ACTIVE_BACKEND_APP_ROUTES_FLIGHTS",
            "payload": payload.model_dump(),
        },
    )
