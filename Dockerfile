FROM python:3.12-slim

WORKDIR /fastapi_app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY fastapi_app/ .

ENV PYTHONPATH=/

EXPOSE 8000

CMD ["uvicorn", "fastapi_app.main:app", "--host", "0.0.0.0", "--port", "8000"]