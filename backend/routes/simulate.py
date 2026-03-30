"""
simulate.py — Attack injection route.
POST /api/simulate  →  Inject 10–20 synthetic events of a given attack_type.

Supported attack types: "DoS", "PortScan", "SSH BruteForce", "Botnet"
Returns: { injected: int, attack_type: str }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["simulate"])

SUPPORTED = {"DoS", "PortScan", "SSH BruteForce", "Botnet"}


class SimulateRequest(BaseModel):
    attack_type: str


@router.post("/simulate")
async def run_simulation(body: SimulateRequest):
    if body.attack_type not in SUPPORTED:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported attack_type '{body.attack_type}'. "
                   f"Supported: {sorted(SUPPORTED)}",
        )

    # Import here to avoid circular imports at module load time
    from services.simulator import inject_attack

    try:
        injected_events = inject_attack(body.attack_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "injected":    len(injected_events),
        "attack_type": body.attack_type,
    }


@router.get("/sim/start")
@router.post("/sim/start")
@router.post("/simulate/start")
async def start_sim():
    from services.simulator import start_simulation
    start_simulation()
    return {"status": "started"}


@router.get("/sim/stop")
@router.post("/sim/stop")
@router.post("/simulate/stop")
async def stop_sim():
    from services.simulator import stop_simulation
    stop_simulation()
    return {"status": "stopped"}


@router.get("/simulate/status")
async def sim_status():
    from services.data_store import data_store
    return {
        "sim_running": data_store.sim_running,
        "sim_pointer": data_store.sim_pointer,
    }
