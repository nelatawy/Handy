# Migrations

Alembic migrations (via Flask-Migrate) live here once a `DATABASE_URL` is configured.

To generate the initial migration once the DB is reachable:

```
export FLASK_APP=run.py
flask db init
flask db migrate -m "initial schema"
flask db upgrade
```
