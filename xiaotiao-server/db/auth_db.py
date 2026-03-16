import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict

AUTH_DB_PATH = os.getenv("AUTH_DB_PATH", "./db/auth.db")
AUTH_DB_DIR = os.path.dirname(AUTH_DB_PATH)

if AUTH_DB_DIR and not os.path.exists(AUTH_DB_DIR):
    os.makedirs(AUTH_DB_DIR, exist_ok=True)


def init_auth_db() -> None:
    conn = sqlite3.connect(AUTH_DB_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)")
    conn.commit()
    conn.close()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(AUTH_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def get_user_by_username(username: str) -> Optional[Dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, username, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def create_user(user_id: str, username: str, password_hash: str) -> Dict:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, username, password_hash, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    return get_user_by_id(user_id) or {"id": user_id, "username": username}


def create_session(token: str, user_id: str, expires_at: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, datetime.now(timezone.utc).isoformat(), expires_at),
        )
        conn.commit()


def delete_session(token: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM auth_sessions WHERE token = ?", (token,))
        conn.commit()


def get_user_by_token(token: str) -> Optional[Dict]:
    if not token:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.created_at, s.expires_at
            FROM auth_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, now_iso),
        ).fetchone()
    return dict(row) if row else None
