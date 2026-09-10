from functools import wraps

from flask_jwt_extended import get_jwt, jwt_required


def role_required(role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") != role:
                return {"error": {"code": "forbidden", "message": "Insufficient role"}}, 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def user_required(fn):
    return role_required("user")(fn)


def worker_required(fn):
    return role_required("worker")(fn)
