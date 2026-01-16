from db.database import get_connection
from datetime import datetime
from utils.time_utils import normalize_date

def upsert_daily_summary(user_id: int, date: str, bmr: float, tdee: float, intake: float, exercise: float, deficit: float, est_weight_change_kg: float):
    date = normalize_date(date)
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM calorie_summaries WHERE user_id=? AND date=? LIMIT 1",
        (user_id, date)
    )
    row = cur.fetchone()
    now = datetime.utcnow().isoformat()

    if row:
        cur.execute(
            """
            UPDATE calorie_summaries
            SET bmr=?, tdee=?, intake=?, exercise=?, deficit=?, est_weight_change_kg=?, updated_at=?
            WHERE id=?
            """,
            (bmr, tdee, intake, exercise, deficit, est_weight_change_kg, now, row["id"])
        )
    else:
        cur.execute(
            """
            INSERT INTO calorie_summaries (user_id, date, bmr, tdee, intake, exercise, deficit, est_weight_change_kg, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, date, bmr, tdee, intake, exercise, deficit, est_weight_change_kg, now)
        )

    conn.commit()
    conn.close()

def get_daily_summary(user_id: int, date: str):
    date = normalize_date(date)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT user_id, date, bmr, tdee, intake, exercise, deficit, est_weight_change_kg, updated_at
        FROM calorie_summaries
        WHERE user_id=? AND date=?
        """,
        (user_id, date)
    )
    row = cur.fetchone()
    conn.close()
    return row
