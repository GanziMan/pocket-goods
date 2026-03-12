import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

from routers import generate, export
from services.fonts import ensure_fonts

load_dotenv()

app = FastAPI(title="Pocket Goods API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(export.router)


@app.on_event("startup")
async def startup():
    ensure_fonts()  # 폰트 파일 없으면 자동 다운로드


@app.get("/health")
def health():
    return {"status": "ok"}
