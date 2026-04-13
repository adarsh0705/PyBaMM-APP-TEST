from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.simulate import router as simulate_router

app = FastAPI(
    title="PyBaMM Cell Simulator",
    description="No-code interface for PyBaMM battery cell simulations",
    version="1.0.0",
)

# Allow ALL origins so React on port 5173 can talk to FastAPI on port 8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulate_router, prefix="/api")


@app.get("/api/health")
async def health():
    import pybamm
    return {
        "status": "ok",
        "pybamm_version": pybamm.__version__,
        "message": "Backend is running correctly",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
