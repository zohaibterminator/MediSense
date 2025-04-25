from sqlalchemy import (
    Column,
    String,
    DateTime,
    Text,
    Enum,
    ForeignKey,
    Boolean,
    JSON,
    PrimaryKeyConstraint,
    ForeignKeyConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship, validates
from datetime import datetime
import uuid as uuid_lib
from fastapi_app.db.utils.hashing import hash_password

Base = declarative_base()

class User(Base):
    __tablename__ = "User"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    email = Column(String(64), nullable=False)
    password = Column(String(128), nullable=False)

    @validates("password")
    def validate_password(self, key, user_password):
        return hash_password(user_password)

    chats = relationship("Chat", back_populates="user")
    documents = relationship("Document", back_populates="user")
    suggestions = relationship("Suggestion", back_populates="user")


class Chat(Base):
    __tablename__ = "Chat"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    title = Column(Text, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    visibility = Column(Enum('public', 'private', name="visibility_enum"), nullable=False, default='private')

    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat")
    votes = relationship("Vote", back_populates="chat")


class Message(Base):
    __tablename__ = "Message"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("Chat.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")
    votes = relationship("Vote", back_populates="message")


class Vote(Base):
    __tablename__ = "Vote"

    chat_id = Column(UUID(as_uuid=True), ForeignKey("Chat.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(UUID(as_uuid=True), ForeignKey("Message.id", ondelete="CASCADE"), nullable=False)
    is_upvoted = Column(Boolean, nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint('chat_id', 'message_id'),
    )

    chat = relationship("Chat", back_populates="votes")
    message = relationship("Message", back_populates="votes")


class Document(Base):
    __tablename__ = "Document"

    id = Column(UUID(as_uuid=True), nullable=False, default=uuid_lib.uuid4)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("User.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint('id', 'created_at'),
    )

    user = relationship("User", back_populates="documents")
    suggestions = relationship("Suggestion", back_populates="document")


class Suggestion(Base):
    __tablename__ = "Suggestion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4, nullable=False)
    document_id = Column(UUID(as_uuid=True), nullable=False)
    document_created_at = Column(DateTime, nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    is_resolved = Column(Boolean, nullable=False, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(
            ['document_id', 'document_created_at'],
            ['Document.id', 'Document.created_at'],
            ondelete="CASCADE"
        ),
    )

    user = relationship("User", back_populates="suggestions")
    document = relationship("Document", back_populates="suggestions")