FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data

# Trains the drug-likeness model at build time, so the image always ships a
# model matching exactly this code + data (see app/ml/train.py).
RUN python -m app.ml.train

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
