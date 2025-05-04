FROM python:3.12-slim

WORKDIR /

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . ./api

ENV PYTHONPATH=/

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]