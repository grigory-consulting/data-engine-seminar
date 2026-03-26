FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-21-jre-headless procps curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY train_model.py train_model.ipynb ./
