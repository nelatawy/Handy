"""rating_service — job ratings (BACKEND_PLAN.md §7)."""

from app.extensions import db
from app.models.enums import JobStatus
from app.models.job import Job
from app.models.rating import Rating
from app.models.worker_profile import WorkerProfile

PAGE_SIZE = 10


class RatingServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def rate_job(job_id: str, user_id: str, stars: int, comment: str | None) -> Rating:
    job = Job.query.get(job_id)
    if job is None:
        raise RatingServiceError("Job not found", code="not_found", status_code=404)
    if job.user_id != user_id:
        raise RatingServiceError("Not your job", code="forbidden", status_code=403)
    if job.status != JobStatus.FINISHED:
        raise RatingServiceError("Only a finished job can be rated", code="invalid_state")
    if Rating.query.filter_by(job_id=job_id).first() is not None:
        raise RatingServiceError("This job has already been rated", code="already_rated", status_code=409)

    rating = Rating(job_id=job_id, worker_id=job.worker_id, user_id=user_id, stars=stars, comment=comment)
    db.session.add(rating)

    profile = WorkerProfile.query.filter_by(user_id=job.worker_id).first()
    if profile is not None:
        total_stars = profile.average_rating * profile.ratings_count + stars
        profile.ratings_count += 1
        profile.average_rating = total_stars / profile.ratings_count

    db.session.commit()
    return rating


def get_worker_ratings(worker_id: str, page: int) -> dict:
    profile = WorkerProfile.query.filter_by(user_id=worker_id).first()

    query = Rating.query.filter_by(worker_id=worker_id).order_by(Rating.created_at.desc())
    total = query.count()
    ratings = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()

    return {
        "ratings": [
            {
                "id": r.id,
                "jobId": r.job_id,
                "stars": r.stars,
                "comment": r.comment,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in ratings
        ],
        "average": profile.average_rating if profile else 0.0,
        "count": total,
        "page": page,
    }
