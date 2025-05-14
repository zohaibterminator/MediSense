import asyncio
from langchain.memory import ConversationBufferWindowMemory
from uuid import UUID
from sqlalchemy.orm import Session
from api.db import models


async def generate_stream(runnable, input_text):
    async for chunk in runnable.astream(input_text):
        yield f"data: {chunk}\n\n"
        await asyncio.sleep(0.05)


def get_memory(chat_id: UUID, db: Session):
    buffer_memory = ConversationBufferWindowMemory(
        k=3,
        memory_key="buffer_history",
        input_key="user_input",
        return_messages=True
    )

    db_messages = db.query(models.Message).filter(
        models.Message.chat_id == chat_id
    ).order_by(models.Message.created_at.desc()).limit(10).all()

    for msg in reversed(db_messages):
        if msg.role == "user":
            buffer_memory.chat_memory.add_user_message(msg.content)
        else:
            buffer_memory.chat_memory.add_ai_message(msg.content)

    return buffer_memory