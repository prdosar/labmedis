FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py ./

# Signal that the container runs a long-lived process (bot polling).
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "bot.py"]
