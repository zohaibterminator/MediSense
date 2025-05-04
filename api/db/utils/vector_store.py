from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from dotenv import load_dotenv
import os
load_dotenv()


model_name = "abhinand/MedEmbed-large-v0.1"
model_kwargs = {'device': 'cpu'}
encode_kwargs = {'normalize_embeddings': False}

embeddings = HuggingFaceEmbeddings(
    model_name=model_name,
    model_kwargs=model_kwargs,
    encode_kwargs=encode_kwargs
)

def vector_store(top_k=3):
    retriever = QdrantVectorStore.from_existing_collection(
        embedding=embeddings,
        collection_name="medical_embeddings",
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    ).as_retriever(search_type="mmr", search_kwargs={"k": top_k})
    return retriever


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)