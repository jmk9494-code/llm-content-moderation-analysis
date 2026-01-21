FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port (if needed for a web server, adjust as appropriate)
EXPOSE 8000

# Default command (adjust to your entrypoint)
CMD ["python", "src/audit_runner.py"]
