"""worker_service — worker profile read/update (BACKEND_PLAN.md §7).

Not in BACKEND_PLAN.md's original folder listing (only auth/request/job/payment/
rating services were named), but added to keep this business logic out of routes,
consistent with the rest of the codebase.
"""

from app.extensions import db
from app.models.user import User
from app.models.worker_profile import WorkerProfile


class WorkerServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def get_worker_profile_or_404(user_id: str) -> WorkerProfile:
    profile = WorkerProfile.query.filter_by(user_id=user_id).first()
    if profile is None:
        raise WorkerServiceError("Worker not found", code="not_found", status_code=404)
    return profile


def serialize_worker(profile: WorkerProfile) -> dict:
    user = User.query.get(profile.user_id)
    return {
        "id": profile.user_id,
        "username": user.username if user else None,
        "workType": profile.work_type.value,
        "bio": profile.bio,
        "hasShop": profile.has_shop,
        "shopLocation": profile.shop_location,
        "averageRating": profile.average_rating,
        "ratingsCount": profile.ratings_count,
        "completedJobsCount": profile.completed_jobs_count,
    }


def update_worker_profile(user_id: str, bio, has_shop, shop_location) -> WorkerProfile:
    profile = get_worker_profile_or_404(user_id)

    if bio is not None:
        profile.bio = bio
    if has_shop is not None:
        profile.has_shop = has_shop
    if shop_location is not None:
        profile.shop_location = shop_location

    db.session.commit()
    return profile
