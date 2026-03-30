"""
stream.py — SSE streaming route.
GET /api/stream  →  Server-Sent Events replaying DataStore.events in real-time.

Contract:
- Streams one event every 100–300 ms (random delay).
- Skips events whose src_ip is in DataStore.blacklist.
- Uses DataStore.sim_pointer to track position; loops back when exhausted.
- Event format: data: {JSON}\n\n
"""

import asyncio
import json
import random

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services.data_store import data_store

router = APIRouter(tags=["stream"])


@router.get("/stream")
async def stream_events():
    """SSE endpoint — streams events from DataStore with blacklist filtering."""

    async def event_generator():
        while True:
            events = data_store.events
            if not events:
                # No data yet — heartbeat comment to keep connection alive
                yield ": heartbeat\n\n"
                await asyncio.sleep(1)
                continue

            # Bounds-check the pointer
            if data_store.sim_pointer >= len(events):
                data_store.sim_pointer = 0

            event = events[data_store.sim_pointer]
            data_store.sim_pointer += 1

            # Skip blacklisted IPs
            if event.get("src_ip") in data_store.blacklist:
                await asyncio.sleep(0.05)
                continue

            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(random.uniform(0.1, 0.3))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
