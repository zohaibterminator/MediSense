from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from api.routers.schemas.models import Message, Chat
from api.db.database import get_db
from sqlalchemy.orm import Session
from langchain_groq import ChatGroq
from api.db import models
from api.db.utils.vector_store import *
from api.db.utils.groq import getGroq
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from api.db.queries import getMessagesByChatId, getChatbyUserId, getChatById
from api.db.utils.chat_utils import generate_stream, get_memory
from llama_cloud_services import LlamaParse
import os
import tempfile
from uuid import UUID

router = APIRouter()


@router.get("/")
async def get_chats(user_id: UUID, db: Session = Depends(get_db)):
    try:
        chats = getChatbyUserId(db, user_id)
        if not chats:
            raise HTTPException(status_code=404, detail="No chats found for this user.")
        return chats
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.post("/create")
async def create_chat(chat: Chat, db: Session = Depends(get_db)):
    try:
        #chat.user_id = UUID(chat.user_id)

        existing_chat = db.query(models.Chat).filter(models.Chat.title == chat.title and models.Chat.user_id == chat.user_id).first()
        if existing_chat:
            raise HTTPException(
                status_code=400,
                detail="Chat with this title already exists"
            )

        db_chat = models.Chat(
            title=chat.title,
            user_id=chat.user_id,
        )

        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)

        return db_chat

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.patch("/update/{chat_id}")
async def update_chat(chat_id: UUID, title: str, db: Session = Depends(get_db)):
    try:
        chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        chat.title = title
        db.commit()

        return chat

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.delete("/delete/{chat_id}")
async def delete_chat(chat_id: UUID, db: Session = Depends(get_db)):
    try:
        db.query(models.Message).filter(models.Message.chat_id == chat_id).delete()

        chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        db.delete(chat)
        db.commit()

        return {"message": "Chat and all associated messages deleted successfully."}

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.post("/{chat_id}/add_message")
async def add_message(chat_id: UUID, message: Message, db: Session = Depends(get_db)):
    try:
        chat = getChatById(db, chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        db_message = models.Message(
            chat_id=chat_id,
            content=message.content,
            role=message.role if message.role else "user"
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)

        return db_message

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/{chat_id}/get_messages")
async def get_chat_messages(chat_id: UUID, db: Session = Depends(get_db)):
    try:
        messages = getMessagesByChatId(db, chat_id)
        if not messages:
            raise HTTPException(status_code=404, detail="No messages found for this chat.")
        return messages
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        if file.content_type != "application/pdf":
            raise HTTPException(400, detail="Only PDF files are accepted")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        parser = LlamaParse(
            api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
            num_workers=1,
            verbose=True,
            language="en",
            result_type="markdown",
        )

        result = await parser.aparse(temp_path)

        os.unlink(temp_path)

        return {"text": result}

    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        print(e)
        raise HTTPException(500, detail=str(e))


@router.post("/{chat_id}/infer")
async def infer_diagnosis(chat_id: UUID, message: Message, db: Session = Depends(get_db), llm: ChatGroq = Depends(getGroq)):
    try:
        buffer_memory = get_memory(chat_id, db)

        template = '''
        You're a compassionate AI doctor designed to help users with medical inquiries. Your primary goal is to provide accurate medical advice, recommend treatment options for various health conditions, and prioritize the well-being of individuals seeking assistance. In this particular task, your objective is to diagnose a medical condition and suggest treatment options to the user. You will be provided with the user's query, and relevant context to make an accurate assessment. Remember, if there's any uncertainty or the condition is complex, always advise the user to seek professional medical help promptly. \
        Please be thorough in your assessment and ensure that your recommendations are based on the provided context. If the context does not match the query, you can say that you don't have the expertise to deal with the issue. Your responses should be clear and informative. Your guidance could potentially have a significant impact on someone's health, so accuracy and empathy are crucial in your interactions with users. Your response should be in markdown format. Ensure you add '|' with the last word of each heading, and also at the end of each paragraph and lists, so that your responses can be parsed properly. \

        Previous 3 Exchanges: {buffer_history}
        Context: {context}

        Here is the question: {user_input}
        '''

        retriever = vector_store()

        prompt = ChatPromptTemplate.from_template(
            template
        )

        runnable = (
            {
                "context": retriever | format_docs ,
                "user_input": RunnablePassthrough(),
                "buffer_history": RunnableLambda(lambda x: buffer_memory.load_memory_variables(x)),
            }
            | prompt
            | llm
            | StrOutputParser()
        )

        user_message = models.Message(
            chat_id=chat_id,
            content=message.content,
            role="user"
        )

        db.add(user_message)
        db.commit()

        return StreamingResponse(
            generate_stream(runnable, message.content),
            media_type="text/event-stream"
        )

    except Exception as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.post("/retriever_check")
def retriever_check(message: Message):
    try:
        retriever = vector_store()
        print('check1')
        print(message.content)
        docs = retriever.invoke(message.content)
        print('check2')
        return docs

    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )