import os


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me")

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # 'eventlet' in dev/prod for real async I/O; 'threading' in tests so
    # Socket.IO emits are delivered synchronously and deterministically
    # against flask_socketio's test client (see tests/test_sockets.py).
    SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "eventlet")

    AUTHEVO_API_KEY = os.environ.get("AUTHEVO_API_KEY")
    AUTHEVO_MODE = os.environ.get("AUTHEVO_MODE", "mock")

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

    PAYMOB_API_KEY = os.environ.get("PAYMOB_API_KEY")
    PAYMOB_INTEGRATION_ID = os.environ.get("PAYMOB_INTEGRATION_ID")
    PAYMOB_HMAC_SECRET = os.environ.get("PAYMOB_HMAC_SECRET")
    PAYMOB_MODE = os.environ.get("PAYMOB_MODE", "mock")


class DevConfig(BaseConfig):
    DEBUG = True


class TestConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    SOCKETIO_ASYNC_MODE = "threading"


class ProdConfig(BaseConfig):
    DEBUG = False


CONFIG_BY_NAME = {
    "development": DevConfig,
    "testing": TestConfig,
    "production": ProdConfig,
}
