from db.database import get_connection
from datetime import datetime


def save_diet_recommendation(user_id, date, meal_type, menu, calories, protein):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO diet_recommendations
        (user_id, date, meal_type, menu, calories, protein, created_at, confirmed)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """,
        (
            user_id,
            date,
            meal_type,
            menu,
            calories,
            protein,
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def save_workout_recommendation(user_id, date, workout, duration, calories):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO workout_recommendations
        (user_id, date, workout, duration, calories, created_at, confirmed)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        """,
        (user_id, date, workout, duration, calories, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def clear_recommendations(user_id, date):
    """해당 날짜의 추천을 초기화(미확정/확정 모두 삭제)"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM diet_recommendations WHERE user_id=? AND date=?", (user_id, date))
    cur.execute("DELETE FROM workout_recommendations WHERE user_id=? AND date=?", (user_id, date))
    conn.commit()
    conn.close()


def list_recommendations(user_id, date, include_confirmed=True):
    conn = get_connection()
    cur = conn.cursor()

    if include_confirmed:
        cur.execute(
            """
            SELECT
                id,
                meal_type,
                menu,
                calories,
                protein,
                created_at,
                COALESCE(confirmed,0) AS confirmed
            FROM diet_recommendations
            WHERE user_id=? AND date=?
            ORDER BY id ASC
            """,
            (user_id, date),
        )
    else:
        cur.execute(
            """
            SELECT
                id,
                meal_type,
                menu,
                calories,
                protein,
                created_at,
                COALESCE(confirmed,0) AS confirmed
            FROM diet_recommendations
            WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0
            ORDER BY id ASC
            """,
            (user_id, date),
        )
    diets = cur.fetchall()

    if include_confirmed:
        cur.execute(
            """
            SELECT id, workout, duration, calories, created_at, COALESCE(confirmed,0) AS confirmed
            FROM workout_recommendations
            WHERE user_id=? AND date=?
            ORDER BY id ASC
            """,
            (user_id, date),
        )
    else:
        cur.execute(
            """
            SELECT id, workout, duration, calories, created_at, COALESCE(confirmed,0) AS confirmed
            FROM workout_recommendations
            WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0
            ORDER BY id ASC
            """,
            (user_id, date),
        )
    workouts = cur.fetchall()

    conn.close()
    return {"diets": diets, "workouts": workouts}


def confirm_recommendations(user_id: int, date: str):
    """추천을 확정 처리 (confirmed=1)"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE diet_recommendations SET confirmed=1 WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0", (user_id, date))
    cur.execute("UPDATE workout_recommendations SET confirmed=1 WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0", (user_id, date))
    conn.commit()
    conn.close()
