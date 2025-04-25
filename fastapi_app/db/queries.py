from fastapi_app.db.database import get_db
from sqlalchemy.orm import Session
from fastapi_app.db import models


def getUserwithEmail(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()