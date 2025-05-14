from sqlalchemy import (
    Column,
    String,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship, validates
from datetime import datetime
import uuid as uuid_lib
from api.db.utils.hashing import hash_password

Base = declarative_base()

class User(Base):
    __tablename__ = "User"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    email = Column(String(64), nullable=False)
    password = Column(String(128), nullable=False)

    @validates("password")
    def validate_password(self, user_password):
        return hash_password(user_password)

    chats = relationship("Chat", back_populates="user")


class Chat(Base):
    __tablename__ = "Chat"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    title = Column(Text, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("User.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "Message"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("Chat.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")