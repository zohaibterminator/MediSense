# 🧠 MediSense – AI-Powered Medical Diagnostic Assistant

MediSense is a multimodal AI assistant that diagnoses diseases based on lab reports and medical images. It combines Retrieval-Augmented Generation (RAG) and Vision-Language Modeling (VLM) to provide high-quality diagnostic assistance, specialist recommendations, and anomaly detection.

---

## 🚀 Features

- 🧬 **LLM-based Diagnosis:** Fine-tuned LLaMA 3.2 11B on a radiological dataset using QLoRA.
- 🔍 **Hybrid RAG System:** Combines BM25 + Semantic Search using LangChain.
- 🩻 **Vision-to-Text Support:** Converts medical images (e.g. X-rays) to captions for LLM input.
- 📊 **Structured Lab Report Parsing** and intelligent recommendation generation.
- 💬 **Groq-powered Inference:** Uses LLaMA 3.3 70B via Groq for high-speed inference.
- 🧠 **Custom Embeddings:** Uses a medical-domain embedding model from Hugging Face.
- ☁️ **Deployed on HF Inference Endpoints** and integrated into a FastAPI backend.
- 🔐 **User & Chat Storage:** Fully integrated with Supabase.

---

## 🧠 Models Used

| Component          | Model Used                                | Hosting                     |
|-------------------|--------------------------------------------|-----------------------------|
| VLM               | LLaMA 3.2 11B Vision (QLoRA fine-tuned)    | Hugging Face Endpoint       |
| Alternate LLM     | LLaMA 3.3 70B                              | Groq Inference              |
| Embeddings        | medEmbed-base-v0.1                         | Hugging Face Endpoint       |

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
git clone https://github.com/your-username/medisense.git
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

- Hugging Face for hosting endpoints
- Groq for ultra-fast LLM inference
- LangChain for chaining + hybrid RAG
- ROCOv2 and Qwen for medical imaging support
