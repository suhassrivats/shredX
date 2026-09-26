"""
Migration: Make users.password_hash nullable

Users who sign in with Google or Apple have no password. Databases created
before social login declared password_hash NOT NULL, so creating those users
fails. SQLite can't drop NOT NULL in place, so the users table is rebuilt from
its own schema with only that constraint removed. A backup copy of the
database is written first. Safe to run more than once.

Usage (Fly.io): flyctl ssh console --app fittrack-api -C "python migrations/make_password_hash_nullable.py"
"""

import os
import re
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db
from sqlalchemy import text, inspect

NOT_NULL = re.compile(r'(password_hash\s+VARCHAR\(\d+\))\s+NOT NULL', re.IGNORECASE)


def migrate():
    with app.app_context():
        column = next(c for c in inspect(db.engine).get_columns('users') if c['name'] == 'password_hash')
        if column['nullable']:
            print("✓ users.password_hash is already nullable")
            return

        if db.engine.dialect.name != 'sqlite':
            with db.engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
            print("✓ users.password_hash is now nullable")
            return

        db_path = db.engine.url.database
        backup = f"{db_path}.backup-{datetime.utcnow():%Y%m%d%H%M%S}"
        with db.engine.connect() as conn:
            conn.execute(text("VACUUM INTO :path"), {'path': backup})
        print(f"✓ Backed up database to {backup}")

        with db.engine.begin() as conn:
            table_sql = conn.execute(text(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")).scalar()
            index_sqls = conn.execute(text(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='users' AND sql IS NOT NULL")).scalars().all()

            new_sql, count = NOT_NULL.subn(r'\1', table_sql)
            if count != 1:
                raise RuntimeError(f"Expected one NOT NULL password_hash in schema, found {count}:\n{table_sql}")
            new_sql = re.sub(r'^CREATE TABLE\s+"?users"?', 'CREATE TABLE users_new', new_sql, flags=re.IGNORECASE)

            before = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            conn.execute(text(new_sql))
            conn.execute(text("INSERT INTO users_new SELECT * FROM users"))
            conn.execute(text("DROP TABLE users"))
            conn.execute(text("ALTER TABLE users_new RENAME TO users"))
            for sql in index_sqls:
                conn.execute(text(sql))
            after = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            if before != after:
                raise RuntimeError(f"Row count changed from {before} to {after}; rolling back")

        print(f"✓ users.password_hash is now nullable ({after} users kept)")


if __name__ == '__main__':
    migrate()
