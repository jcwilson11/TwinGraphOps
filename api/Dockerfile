FROM python:3.11.15-slim

WORKDIR /app

COPY requirements.txt constraints.txt ./

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools \
    && pip install --no-cache-dir --upgrade --force-reinstall -c constraints.txt wheel jaraco.context \
    && pip install --no-cache-dir -r requirements.txt -c constraints.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
