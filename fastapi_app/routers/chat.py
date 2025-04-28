from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi_app.routers.schemas.models import Message, Chat
from fastapi_app.db.database import get_db
from sqlalchemy.orm import Session
from langchain_groq import ChatGroq
from fastapi_app.db import models
from fastapi_app.db.utils.vector_store import *
from fastapi_app.db.utils.groq import getGroq
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from uuid import UUID
import asyncio

router = APIRouter()


async def generate_stream(runnable, input_text):
    """Generator function to yield chunks of the response"""
    async for chunk in runnable.astream(input_text):
        yield f"data: {chunk}\n\n"
        await asyncio.sleep(0.02)  # Small delay to prevent overwhelming the client


@router.post("/create_chat/")
async def create_chat(chat: Chat, db: Session = Depends(get_db)):
    try:
        chat.user_id = UUID(chat.user_id)

        existing_chat = db.query(models.Chat).filter(models.Chat.title == chat.title and models.Chat.user_id == chat.user_id).first()
        if existing_chat:
            raise HTTPException(
                status_code=400,
                detail="Chat with this title already exists"
            )

        db_chat = models.Chat(
            title=chat.title,
            user_id=chat.user_id,
            visibility=chat.visibility
        )

        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)

        return {
            "message": "Chat created successfully",
            "chat_id": str(db_chat.id)
        }

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.post("/infer/")
def infer_diagnosis(message: Message, db: Session = Depends(get_db), llm: ChatGroq = Depends(getGroq)):
    template = '''
    You're a compassionate AI doctor designed to help users with medical inquiries. Your primary goal is to provide accurate medical advice, recommend treatment options for various health conditions, and prioritize the well-being of individuals seeking assistance. In this particular task, your objective is to diagnose a medical condition and suggest treatment options to the user. You will be provided with the user's query, and relevant context to make an accurate assessment. Remember, if there's any uncertainty or the condition is complex, always advise the user to seek professional medical help promptly. \
    Please be thorough in your assessment and ensure that your recommendations are based on the provided context. If the context does not match the query, you can say that you don't have the expertise to deal with the issue. Your responses should be clear and informative. Your guidance could potentially have a significant impact on someone's health, so accuracy and empathy are crucial in your interactions with users. \

    Context: {context}

    Here is the question: {user_input}
    '''

    retriever = vector_store()

    prompt = ChatPromptTemplate.from_template(
        template
    )

    runnable = (
        {"context": retriever | format_docs , "user_input": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return StreamingResponse(
        generate_stream(runnable, message.content),
        media_type="text/event-stream"
    )