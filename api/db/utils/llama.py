from openai import OpenAI
from dotenv import load_dotenv
import os
load_dotenv()

def getLlama():
    vlm = OpenAI(
        base_url = os.getenv('API_URL'),
        api_key = os.getenv('HF_TOKEN'),
    )
    try:
        yield vlm
    finally:
        print("lmao")