from db.database import get_connection
from datetime import datetime

def create_user(email, password_hash):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (email, password_hash, created_at)
        VALUES (?, ?, ?)
    """, (email, password_hash, datetime.utcnow().isoformat()))
    conn.commit()
    user_id = cur.lastrowid
    conn.close()
    return user_id


def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email=?", (email,))
    row = cur.fetchone()
    conn.close()
    return row


def get_user_by_id(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id=?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return row


def update_user_profile(user_id, name, height, weight, goal):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE users
        SET name=?, height=?, weight=?, goal=?
        WHERE id=?
    """, (name, height, weight, goal, user_id))
    conn.commit()
    conn.close()
