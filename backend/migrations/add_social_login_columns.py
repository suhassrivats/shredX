"""
Migration: Add google_sub and apple_sub columns to users

db.create_all() does not add columns to existing tables, so databases created
before social login need these added by hand. Safe to run more than once.

Usage (Fly.io): flyctl ssh console --app fittrack-api -C "python migrations/add_social_login_columns.py"
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db
from sqlalchemy import text, inspect


def migrate():
    with app.app_context():
        existing = {c['name'] for c in inspect(db.engine).get_columns('users')}
        with db.engine.begin() as conn:
            for column in ('google_sub', 'apple_sub'):
                if column in existing:
                    print(f"✓ users.{column} already exists")
                    continue
                # SQLite can't ADD COLUMN with UNIQUE, so enforce it via an index.
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(255)"))
                conn.execute(text(f"CREATE UNIQUE INDEX ix_users_{column} ON users ({column})"))
                print(f"✓ Added users.{column}")


if __name__ == '__main__':
    migrate()
