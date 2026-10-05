import os
import sys
import uvicorn

# Ensure the backend directory is in the Python system path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("=" * 60)
    print("Starting GhostNet AI Backend Server...")
    print("Kasimedu Fishing Harbour & Chennai Coastline Pilot")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
