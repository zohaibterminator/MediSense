from openai import OpenAI
import json
import base64
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from uuid import UUID
from api.db.utils.groq import getGroq
from api.db.utils.llama import getLlama
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.orm import Session
from api.db.utils.groq import getGroq
from langchain_groq import ChatGroq
from api.db.database import get_db
from api.db.utils.vector_store import vector_store, format_docs
from api.db.utils.chat_utils import generate_stream, get_memory
import tempfile
import os
from fastapi.responses import StreamingResponse
from langchain_core.output_parsers import StrOutputParser
from api.db import models


router = APIRouter()

@router.post("/{chat_id}/infer/image")
async def infer_image(chat_id: UUID, message: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), llm: ChatGroq = Depends(getGroq), vlm: OpenAI = Depends(getLlama)):
    try:
        buffer_memory = get_memory(chat_id, db)

        if file.content_type != "image/jpeg" and file.content_type != "image/png":
            raise HTTPException(400, detail="Only JPEG and PNG images are accepted")

        with tempfile.NamedTemporaryFile(delete=False, suffix="jpg") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        with open(temp_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        system_message = """You are a specialized Vision-Language Model (VLM) trained to analyze and describe medical images, including radiology scans (e.g., X-rays, MRIs, and CT scans) and other diagnostic visuals. Your descriptions should be clear, concise, and medically accurate, focusing on identifying anatomical structures, abnormalities, and relevant clinical findings. Avoid speculation and use standard medical terminology where applicable. If findings are inconclusive, state so clearly. Your descriptions will be used to support clinical insights, not to provide a definitive diagnosis."""

        chat_completion = vlm.chat.completions.create(
            model="tgi",
            messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": system_message + "\n\n" + message
                    }
                ]
            }
        ],
            top_p=None,
            temperature=0.7,
            max_tokens=1024,
            stream=False,
            seed=None,
            stop=None,
            frequency_penalty=None,
            presence_penalty=None
        )
        image_description = chat_completion.choices[0].message.content
        os.unlink(temp_path)

        template = '''
        You're a compassionate AI doctor designed to help users with medical inquiries. Your primary goal is to provide accurate medical advice, recommend treatment options for various health conditions, and prioritize the well-being of individuals seeking assistance. In this particular task, your objective is to diagnose a medical condition and suggest treatment options to the user. You will be provided with the user's query, and relevant context to make an accurate assessment. Remember, if there's any uncertainty or the condition is complex, always advise the user to seek professional medical help promptly.\
        You are given a description of a medical image. Please analyze the description and provide a diagnosis and treatment options. \
        Please be thorough in your assessment. Your responses should be clear and informative. Your guidance could potentially have a significant impact on someone's health, so accuracy and empathy are crucial in your interactions with users. Your response should be in markdown format. Ensure you add '|' with the last word of each heading, and also at the end of each paragraph and lists, so that your responses can be parsed properly. \

        Previous 3 Exchanges: {buffer_history}

        Description of the medical image: {image_description}
        '''

        prompt = ChatPromptTemplate.from_template(
            template
        )

        runnable = (
            {
                "image_description": RunnablePassthrough(),
                "buffer_history": RunnableLambda(lambda x: buffer_memory.load_memory_variables(x)),
            }
            | prompt
            | llm
            | StrOutputParser()
        )

        user_message = models.Message(
            chat_id=chat_id,
            content=message,
            role="user"
        )

        db.add(user_message)
        db.commit()

        return StreamingResponse(
            generate_stream(runnable, image_description),
            media_type="text/event-stream"
        )

    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        print(e)
        raise HTTPException(500, detail=str(e))