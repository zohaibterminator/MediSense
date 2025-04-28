from fastapi_app.db.database import get_db
from sqlalchemy.orm import Session
from fastapi_app.db import models
from uuid import UUID


def getUserwithEmail(db: Session, email: str):
    return db.query(models.User).filter(
        models.User.email == email
    ).first()


def getMessagesByChatId(db: Session, chat_id: UUID):
    return db.query(models.Message).filter(
            models.Message.chat_id == chat_id
        ).order_by(
            models.Message.created_at
        ).all()


def getChatbyUserId(db: Session, user_id: UUID):
    return db.query(models.Chat).filter(
            models.Chat.user_id == user_id
        ).all()


def getChatById(db: Session, chat_id: UUID):
    return db.query(models.Chat).filter(
            models.Chat.id == chat_id
        ).first()