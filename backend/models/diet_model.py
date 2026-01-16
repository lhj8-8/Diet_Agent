from db.database import get_connection
from datetime import datetime

def save_diet(user_id, date, content, calories):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO diets (user_id, date, content, calories, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, date, content, calories, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_diet_by_date(user_id, date):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM diets
        WHERE user_id=? AND date=?
        ORDER BY id DESC LIMIT 1
    """, (user_id, date))
    row = cur.fetchone()
    conn.close()
    return row
