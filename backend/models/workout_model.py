from db.database import get_connection


# 모든 운동 조회
def get_all_workouts():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM workouts")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# 🔥 강도별 운동 조회 (추천용)
def get_workouts_by_intensity(intensity):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT *
        FROM workouts
        WHERE intensity=?
    """, (intensity,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
