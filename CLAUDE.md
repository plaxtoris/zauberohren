# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an experimental FastAPI-based web application with story generation capabilities using Google Cloud services and LLMs. The application includes text-to-speech functionality and serves content through a web interface.

## Commands

### Run the server
```bash
# Development mode with auto-reload
python src/server.py --reload --port 8000

# Production mode
uvicorn src.server:app --host 0.0.0.0 --port 80 --workers 2
```

### Run story generation
```bash
python src/run.py
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Docker operations
```bash
# Build container
docker build -t experimental:latest .

# Run container
docker run -p 80:80 experimental:latest
```

## Architecture

### Core Components

- **src/server.py**: FastAPI application entry point with static file serving and templating
- **src/generator.py**: Story generation logic using LLM models
- **src/tts.py**: Text-to-speech functionality using Google Cloud TTS
- **src/llm.py**: LLM integration and API wrapper
- **src/database.py**: SQLite database operations
- **src/run.py**: Batch story generation with parallel processing

### Directory Structure

- `/src`: Main application code
- `/data`: Runtime data storage (database, cache)
- `/src/static`: Static assets
- `/src/templates`: Jinja2 templates

### Key Dependencies

- FastAPI with Uvicorn for web serving
- Google Cloud Text-to-Speech and Storage
- SQLite for data persistence
- Concurrent processing with ProcessPoolExecutor

## Environment Configuration

Set PYTHONPATH when running locally:
```bash
export PYTHONPATH=/workspaces/experimental/src
```

Required environment variables in `.env`:
- GOOGLE_APPLICATION_CREDENTIALS: Path to Google Cloud credentials JSON
- DOMAIN_WRAPPER: API endpoint for LLM wrapper
- LITELLM_MASTER_KEY: Authentication key for LLM service

## Deployment

GitHub Actions workflow deploys to Docker Hub on push to main branch. The deployment builds and pushes a Docker image tagged as `latest`.