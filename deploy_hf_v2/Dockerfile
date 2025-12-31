
# Use official Python runtime as a parent image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright and Audio/Video
# (Some might be needed depending on the base image, but playwright install-deps usually handles it)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only to save space)
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy the rest of the application
COPY . .

# Expose port (Render uses $PORT, usually 8000 or 10000, but we default to 8000)
ENV PORT=8000
EXPOSE 8000

# Start command
# We use shell form to expand $PORT if needed, but uvicorn handles --port nicely
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
