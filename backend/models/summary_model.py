from db.database import get_connection

def get_daily_summary(user_id, date):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT SUM(calories) AS target
        FROM workout_recommendations
        WHERE user_id=? AND date=?
    """, (user_id, date))
    target = cur.fetchone()["target"] or 0

    cur.execute("""
        SELECT SUM(calories) AS actual
        FROM activities
        WHERE user_id=? AND DATE(completed_at)=?
    """, (user_id, date))
    actual = cur.fetchone()["actual"] or 0

    conn.close()

    progress = int((actual / target) * 100) if target else 0

    return {
        "target": target,
        "actual": actual,
        "progress": min(progress, 100)
    }
