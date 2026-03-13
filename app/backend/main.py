"""
main.py — FastAPI app entry point.
"""
import os

import paths  # noqa: F401 — must be first: patches sys.path before any tool imports
from db import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, billing, clients, command, outputs, skills, tools, workflows

app = FastAPI(title="Agency Dashboard API", version="1.0.0")

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB on startup
@app.on_event("startup")
def startup():
    init_db()


# Health check
@app.get("/")
def health():
    return {"status": "ok"}


# Routers — order matters: /clients/active before /clients/{slug}
app.include_router(auth.router)
app.include_router(billing.router)
app.include_router(clients.router)   # registers /active before /{slug} internally
app.include_router(tools.router)
app.include_router(outputs.router)
app.include_router(command.router)
app.include_router(workflows.router)
app.include_router(skills.router)
