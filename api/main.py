from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.db.database import engine, Base
from api.routers import authentication, chat, images
import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MediSense",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(authentication.router, prefix="/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(images.router, prefix="/images", tags=["Images"])


@app.get("/")
async def root():
    return {"message": "All Okay"}