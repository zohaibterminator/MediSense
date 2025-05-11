from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_qdrant import QdrantVectorStore as Qdrant, FastEmbedSparse, RetrievalMode
import os
load_dotenv()


embeddings = HuggingFaceEndpointEmbeddings(
    model=os.getenv("EMBEDDING_ENDPOINT"),
    huggingfacehub_api_token=os.getenv("HF_TOKEN")
)
sparse_embeddings = FastEmbedSparse(model_name="Qdrant/BM25")

def vector_store(top_k=5):
    qdrant_vs = Qdrant.from_existing_collection(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        collection_name="medical_embeddings",
        embedding=embeddings,
        vector_name='MedEmbed-base-v0.1',
        sparse_embedding=sparse_embeddings,
        sparse_vector_name='bm25',
        retrieval_mode=RetrievalMode.HYBRID,
        metadata_payload_key=None,
        content_payload_key="text",
    )

    return qdrant_vs.as_retriever(search_type="mmr", search_kwargs={"k": top_k})


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)