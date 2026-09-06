import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    root_dir = os.path.dirname(os.path.abspath(__file__))
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)

    print("=" * 70)
    print("🚀 Starting E-Waste Saathi — Real-World E-Waste Formalization Platform")
    print("   SIH26229 — Ministry of Mines (MoM)")
    print("   Tagline: Collect Better. Earn Fairly. Recycle Safely.")
    print("=" * 70)
    print("🌐 Unified Landing Page:       http://localhost:8000")
    print("📱 Collector Mobile App:       http://localhost:8000/collector")
    print("🏭 Authorized Recycler Portal: http://localhost:8000/recycler")
    print("🛡 Ministry & Admin Portal:    http://localhost:8000/admin")
    print("📚 OpenAPI Interactive Docs:   http://localhost:8000/docs")
    print("=" * 70)

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
