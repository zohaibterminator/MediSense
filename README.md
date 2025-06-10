# 🧠 MediSense – AI-Powered Medical Assistant

MediSense is a multimodal AI assistant that diagnoses diseases based on lab reports and medical images. It combines Retrieval-Augmented Generation (RAG) and Vision-Language Modeling (VLM) to provide high-quality diagnostic assistance, and anomaly detection.

---

## 🚀 Features

- 🧬 **LLM-based Diagnosis:** Fine-tuned LLaMA 3.2 11B Vision model on a radiological dataset using QLoRA fine-tuning technique.
- 🔍 **Hybrid RAG System:** Combines BM25 + Semantic Search using Qdrant as the vector database.
- 🩻 **Vision-to-Text Support:** Converts medical images (e.g. X-rays) to medical descriptions for LLM input.
- 📊 **Structured Lab Report Parsing:** Parsing lab reports for analysis using LlamaParse while preserving the structure of the document.
- 💬 **Groq-powered Inference:** Uses LLaMA 3.3 70B open source LLM via Groq for high-speed inference.
- 🧠 **Custom Embeddings:** Uses an open-source embedding model from HuggingFace which is fine-tuned to be medically alligned.
- ☁️ **Deployed on HF Inference Endpoints**: Deployed the fine-tuned Vision model and the embedding model on HF Endpoints and integrated them into the FastAPI backend.
- 🔐 **User & Chat Storage:** Fully integrated with Supabase for storage.

---

## 🧠 Models Used

| Component          | Model Used                                | Hosting                     |
|-------------------|--------------------------------------------|-----------------------------|
| VLM               | LLaMA 3.2 11B Vision (QLoRA fine-tuned)    | HuggingFace Endpoint        |
| LLM               | LLaMA 3.3 70B                              | Groq                        |
| Embedding Model   | medEmbed-base-v0.1                         | HuggingFace Endpoint        |

---

## 🧩 Tech Stack

- **Frontend:** Next.js
- **Backend:** FastAPI
- **Database:** Supabase
- **Vector Store:** Qdrant
- **RAG Framework:** LangChain

---

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/zohaibterminator/MediSense.git
cd medisense
```

### 2. Setup Environment Variables
```ini
DATABASE_URL=...
LLAMA_CLOUD_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_ACCESS_KEY=...
HF_TOKEN=...
VITE_BACKEND_URL=http://localhost:8000
EMBEDDING_ENDPOINT=...
GROQ_API_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
```

### 3. Install Backend Dependencies
```
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Start Frontend
```
npm i
npm run dev
```

---

## 📄 License
This project is licensed under the MIT License.

---

## 🌐 Acknowledgments

- Hugging Face for model hosting and open-source models and datasets
- Groq for ultra-fast LLM inference
- LangChain for chaining
- Qdrant for hybrid RAG
- Meta for open-source LLMs and VLMs
