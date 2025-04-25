from fastapi import APIRouter, HTTPException, Depends
from fastapi_app.routers.schemas.models import Message
from fastapi_app.db.database import get_db
from sqlalchemy.orm import Session
from langchain_groq import ChatGroq
from fastapi_app.db import models
from fastapi_app.db.utils.vector_store import *
from fastapi_app.db.utils.groq import getGroq
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()

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

    result = runnable.invoke(message.content)

    return {
        "response": result
    }