import sqlite3
import os

# Default path from .env or fallback
DB_PATH = os.getenv("DB_PATH", "./db/xiaotiao.db")
DB_DIR = os.path.dirname(DB_PATH)

if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)

def init_db():
    """Run init.sql to ensure all tables and seed data exist"""
    init_sql_path = os.path.join(os.path.dirname(__file__), "init.sql")
    if os.path.exists(init_sql_path):
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        with open(init_sql_path, "r", encoding="utf-8") as f:
            script = f.read()
            conn.executescript(script)
        conn.commit()
        conn.close()

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    try:
        yield db
    finally:
        db.close()
