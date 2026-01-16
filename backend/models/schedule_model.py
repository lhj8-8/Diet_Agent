from db.database import get_connection
from datetime import datetime

def add_schedule(user_id, date, start, end, title, memo):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO schedules
        (user_id, date, start_time, end_time, title, memo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, date, start, end, title, memo, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_schedule_by_date(user_id, date):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM schedules
        WHERE user_id=? AND date=?
        ORDER BY start_time
    """, (user_id, date))
    rows = cur.fetchall()
    conn.close()
    return rows
