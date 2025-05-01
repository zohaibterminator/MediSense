from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class User(BaseModel):
    email: EmailStr
    password: str

    class Config:
        orm_mode = True


class Chat(BaseModel):
    title: str
    user_id: UUID

    class Config:
        orm_mode = True


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class Message(BaseModel):
    content: str
    role: ChatRole

    class Config:
        orm_mode = True


class Vote(BaseModel):
    chat_id: UUID
    message_id: UUID
    is_upvoted: bool

    class Config:
        orm_mode = True


class Document(BaseModel):
    id: UUID
    created_at: datetime
    title: str
    content: Optional[str]
    user_id: UUID

    class Config:
        orm_mode = True


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
        orm_mode = True
