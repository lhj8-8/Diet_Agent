from db.database import get_connection
from datetime import datetime

def log_activity(user_id, workout, duration, calories):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO activities
        (user_id, workout, duration, calories, completed_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, workout, duration, calories, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_daily_activity(user_id, date):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT SUM(calories) AS burned
        FROM activities
        WHERE user_id=? AND DATE(completed_at)=?
    """, (user_id, date))
    row = cur.fetchone()
    conn.close()
    return row["burned"] or 0
