"""
Screening Worker Service Facade.
The authoritative background worker implementation resides in backend.app.workers.screening_worker.
This facade maintains backwards-compatibility for existing service imports without duplicating worker logic.
"""
from backend.app.workers.screening_worker import RealInferenceWorker, screening_worker

ScreeningWorker = RealInferenceWorker

__all__ = ["RealInferenceWorker", "ScreeningWorker", "screening_worker"]
