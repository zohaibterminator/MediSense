from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class User(BaseModel):
    email: EmailStr
    password: str

    class Config:
        from_attributes = True


class Chat(BaseModel):
    title: str
    user_id: UUID

    class Config:
        from_attributes = True


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class Message(BaseModel):
    content: str
    role: ChatRole

    class Config:
        from_attributes = True


class Vote(BaseModel):
    chat_id: UUID
    message_id: UUID
    is_upvoted: bool

    class Config:
        from_attributes = True


class Document(BaseModel):
    id: UUID
    created_at: datetime
    title: str
    content: Optional[str]
    user_id: UUID

    class Config:
        from_attributes = True


class Suggestion(BaseModel):
    id: UUID
    document_id: UUID
    document_created_at: datetime
    original_text: str
    suggested_text: str
    description: Optional[str]
    is_resolved: bool
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
