import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import asyncio
from contextlib import asynccontextmanager

from routes import stream, summary, attacks, simulate, upload, ingest, risk, alerts, blacklist, predict
from services.data_store import data_store
from services.simulator import load_dataset, background_sim_loop

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load dataset at startup
    dataset_path = os.path.join(os.path.dirname(__file__), "data", "cicids2018.csv")
    events = load_dataset(dataset_path)
    data_store.events = events
    
    # Start background loop
    task = asyncio.create_task(background_sim_loop())
    yield
    task.cancel()


app = FastAPI(title="NetSentinel API", version="1.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route registration (all under /api prefix) ────────────────────────────────
app.include_router(stream.router,    prefix="/api")
app.include_router(summary.router,   prefix="/api")
app.include_router(attacks.router,   prefix="/api")
app.include_router(simulate.router,  prefix="/api")
app.include_router(upload.router,    prefix="/api")
app.include_router(ingest.router,    prefix="/api")
app.include_router(risk.router,      prefix="/api")
app.include_router(alerts.router,    prefix="/api")
app.include_router(blacklist.router, prefix="/api")
app.include_router(predict.router,   prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
