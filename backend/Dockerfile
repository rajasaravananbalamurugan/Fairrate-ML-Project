# FAIRRATE Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (including build tools if needed for scikit-learn / tesseract fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend, config, data, models, and ml modules
COPY backend ./backend
COPY config ./config
COPY data ./data
COPY models ./models
COPY ml ./ml

ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
