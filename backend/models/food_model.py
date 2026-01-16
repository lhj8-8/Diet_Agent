from db.database import get_connection
from datetime import datetime


# 사용자 음식 선호 저장
def save_food_preferences(user_id, likes, dislikes, allergies):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO food_preferences (user_id, likes, dislikes, allergies, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            likes=excluded.likes,
            dislikes=excluded.dislikes,
            allergies=excluded.allergies,
            updated_at=excluded.updated_at
    """, (user_id, likes, dislikes, allergies, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


# 사용자 음식 선호 조회
def get_food_preferences(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT likes, dislikes, allergies
        FROM food_preferences
        WHERE user_id=?
    """, (user_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


# 🔥 CSV 기반 음식 후보 조회 (추천용)
def get_food_candidates(meal_type, dislikes=None, allergies=None, likes=None):
    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT *
        FROM foods
        WHERE meal_type=?
    """
    params = [meal_type]

    if allergies:
        query += " AND (allergy IS NULL OR allergy NOT LIKE ?)"
        params.append(f"%{allergies}%")

    if dislikes:
        for d in dislikes.split(","):
            query += " AND name NOT LIKE ?"
            params.append(f"%{d.strip()}%")

    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    # likes가 있으면, 우선적으로 like 키워드가 포함된 후보를 사용
    if likes:
      try:
        like_keywords = [x.strip() for x in str(likes).split(",") if x.strip()]
        if like_keywords:
          preferred = [r for r in rows if any(k in (r.get("name") or "") for k in like_keywords)]
          if preferred:
            return preferred
      except Exception:
        pass
    return rows
