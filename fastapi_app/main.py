from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_app.db.database import engine, Base
from fastapi_app.routers import authentication, chat
import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Medisense",
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


@app.get("/")
async def root():
    return {"message": "Al Okay"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)