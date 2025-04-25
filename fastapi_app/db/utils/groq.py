from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os
load_dotenv()


def getGroq():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY")
    )