from db.database import get_connection
from datetime import datetime

def log_message(user_id: int, role: str, message: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO chatbot_logs (user_id, role, message, created_at) VALUES (?, ?, ?, ?)",
        (user_id, role, message, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def list_logs(user_id: int, limit: int = 50, date: str | None = None):
    conn = get_connection()
    cur = conn.cursor()

    if date:
        cur.execute(
            """
            SELECT id, user_id, role, message, created_at
            FROM chatbot_logs
            WHERE user_id=? AND DATE(created_at)=?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, date, limit)
        )
    else:
        cur.execute(
            """
            SELECT id, user_id, role, message, created_at
            FROM chatbot_logs
            WHERE user_id=?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit)
        )

    rows = cur.fetchall()
    conn.close()
    return list(reversed(rows))  # 시간순

def clear_logs(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM chatbot_logs WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return cur.rowcount

