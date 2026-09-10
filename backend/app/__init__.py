from flask import Flask, jsonify
from flask_cors import CORS

from app.config import CONFIG_BY_NAME
from app.extensions import bcrypt, db, jwt, migrate, socketio


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(CONFIG_BY_NAME[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Must run before socketio.init_app()'s *first* call: flask_socketio's @socketio.on
    # decorator attaches straight to `self.server` if one already exists at decoration
    # time, instead of queuing in `self.handlers` for replay on future init_app() calls
    # (see flask_socketio.SocketIO.on). Since this module only executes once (Python
    # caches imports), decorating before the first init_app ensures the handlers land
    # in `self.handlers` and get correctly re-registered on every later create_app()
    # call — e.g. once per test — not just the first one.
    from . import sockets as _sockets  # noqa: F401 — registers Socket.IO connect/disconnect handlers

    configured_frontend = app.config.get("FRONTEND_URL", "http://localhost:4200")
    allowed_origins = list(dict.fromkeys([
        configured_frontend,
        "http://localhost:4200",
        "http://localhost:5173",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:5173",
    ]))

    # CORS must be initialized BEFORE socketio and blueprint registration so that
    # preflight OPTIONS requests are handled before any route/middleware intercepts them.
    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    socketio.init_app(
        app, cors_allowed_origins=allowed_origins, async_mode=app.config["SOCKETIO_ASYNC_MODE"]
    )

    from app import models  # noqa: F401 — registers models with SQLAlchemy metadata

    register_blueprints(app)
    register_error_handlers(app)
    _register_cors_fallback(app, allowed_origins)

    return app


def _register_cors_fallback(app: Flask, allowed_origins: list[str]) -> None:
    """Guarantee CORS headers on every response — including 500s.

    flask-cors adds headers via after_request, but when Flask's own
    exception handler generates a 500 response it can bypass those hooks.
    This explicit hook runs last and stamps the header if it is missing.
    """
    @app.after_request
    def _add_cors_headers(response):
        origin = None
        from flask import request as _req
        try:
            origin = _req.headers.get("Origin", "")
        except RuntimeError:
            pass  # No active request context (e.g. during testing teardown)

        if origin in allowed_origins:
            response.headers.setdefault("Access-Control-Allow-Origin", origin)
            response.headers.setdefault("Access-Control-Allow-Credentials", "true")
            response.headers.setdefault(
                "Access-Control-Allow-Headers", "Content-Type, Authorization"
            )
            response.headers.setdefault(
                "Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
        return response


def register_blueprints(app: Flask) -> None:
    from app.blueprints.ai import ai_bp
    from app.blueprints.auth import auth_bp
    from app.blueprints.jobs import jobs_bp
    from app.blueprints.offers import offers_bp
    from app.blueprints.otp import otp_bp
    from app.blueprints.payments import payments_bp
    from app.blueprints.payments.routes import webhooks_bp
    from app.blueprints.ratings import ratings_bp
    from app.blueprints.requests import requests_bp
    from app.blueprints.users import users_bp
    from app.blueprints.workers import workers_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(otp_bp, url_prefix="/api/otp")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(offers_bp, url_prefix="/api/offers")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(webhooks_bp, url_prefix="/api/webhooks")
    app.register_blueprint(ratings_bp, url_prefix="/api/ratings")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(workers_bp, url_prefix="/api/workers")
    app.register_blueprint(ai_bp, url_prefix="/api/ai-suggest")


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": {"code": "not_found", "message": "Resource not found"}}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": {"code": "bad_request", "message": str(e)}}), 400

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": {"code": "server_error", "message": "Internal server error"}}), 500
