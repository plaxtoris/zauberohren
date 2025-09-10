from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.templating import Jinja2Templates
from config import STATIC_DIR, TEMPLATES_DIR
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from audio_service import audio_service
from auth_service import auth_service
from db_service import db_service
from dotenv import load_dotenv
import argparse
import uvicorn

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Authentication
security = HTTPBasic()


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials using the auth service."""
    return auth_service.verify_admin_credentials(credentials)


@app.get("/", response_class=HTMLResponse)
async def main(request: Request):
    """Serve the main application page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/impressum", response_class=HTMLResponse)
async def impressum(request: Request):
    """Serve the impressum/legal page."""
    return templates.TemplateResponse("impressum.html", {"request": request})


@app.get("/about", response_class=HTMLResponse)
async def about(request: Request):
    """Serve the about page."""
    return templates.TemplateResponse("about.html", {"request": request})


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    """Serve the admin dashboard page."""
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/api/admin/stats/{period}")
async def get_admin_stats(period: str, username: str = Depends(verify_admin)):
    """Get playtime statistics for admin dashboard."""
    try:
        if period not in ["24h", "7d", "30d", "alltime"]:
            raise HTTPException(status_code=400, detail="Invalid period. Must be one of: 24h, 7d, 30d, alltime")
        stats = db_service.get_playtime_stats(period)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {str(e)}")


@app.post("/api/track-playtime")
async def track_play(data: dict):
    """Track playtime for a specific theme and title."""
    try:
        theme = data.get("theme")
        title = data.get("title")
        duration = data.get("duration", 0)

        if not theme:
            raise HTTPException(status_code=400, detail="Theme is required")
        if not title:
            raise HTTPException(status_code=400, detail="Title is required")
        if not isinstance(duration, (int, float)) or duration <= 0:
            raise HTTPException(status_code=400, detail="Duration must be a positive number")

        db_service.track_playtime(theme, title, int(duration))
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track playtime: {str(e)}")


@app.get("/api/themes")
async def get_themes():
    """Get all available themes and their audio files."""
    try:
        data = db_service.get_data()
        themes = {}
        for item in data:
            theme = item["theme"]
            if theme not in themes:
                themes[theme] = []
            themes[theme].append({"titel": item["titel"], "path": item["path"]})
        return themes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve themes: {str(e)}")


@app.get("/api/audio/{theme}/{title}")
async def stream_audio(theme: str, title: str, request: Request):
    """Stream audio files with support for HTTP Range requests."""
    return audio_service.stream_audio_file(theme, title, request)


@app.post("/api/admin/login")
async def admin_login(credentials: HTTPBasicCredentials = Depends(security)):
    """Admin login endpoint."""
    try:
        username = verify_admin(credentials)
        return {"status": "ok", "username": username}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=80, help="Port to run the server on")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()
    uvicorn.run("server:app", host="0.0.0.0", port=args.port, reload=args.reload)
