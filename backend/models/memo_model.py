from db.database import get_connection
from datetime import datetime
from utils.time_utils import normalize_date

def upsert_memo(user_id: int, date: str, content: str):
    date = normalize_date(date)
    conn = get_connection()
    cur = conn.cursor()

    # (user_id, date) 유니크가 없으므로: 기존 있으면 업데이트, 없으면 INSERT
    cur.execute(
        "SELECT id FROM memos WHERE user_id=? AND date=? ORDER BY id DESC LIMIT 1",
        (user_id, date)
    )
    row = cur.fetchone()
    now = datetime.utcnow().isoformat()

    if row:
        cur.execute(
            "UPDATE memos SET content=?, created_at=? WHERE id=?",
            (content, now, row["id"])
        )
    else:
        cur.execute(
            "INSERT INTO memos (user_id, date, content, created_at) VALUES (?, ?, ?, ?)",
            (user_id, date, content, now)
        )

    conn.commit()
    conn.close()

def get_memo(user_id: int, date: str):
    date = normalize_date(date)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, user_id, date, content, created_at FROM memos WHERE user_id=? AND date=? ORDER BY id DESC LIMIT 1",
        (user_id, date)
    )
    row = cur.fetchone()
    conn.close()
    return row

def list_memos(user_id: int, limit: int = 30):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, user_id, date, content, created_at FROM memos WHERE user_id=? ORDER BY date DESC, id DESC LIMIT ?",
        (user_id, limit)
    )
    rows = cur.fetchall()
    conn.close()
    return rows

def delete_memo(user_id: int, memo_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM memos WHERE id=? AND user_id=?", (memo_id, user_id))
    conn.commit()
    conn.close()
    return cur.rowcount
