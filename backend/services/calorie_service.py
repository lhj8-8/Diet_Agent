from __future__ import annotations
from db.database import get_connection
from models.calorie_model import upsert_daily_summary, get_daily_summary
# from services.workout_service import get_workout_calories_map # 제거: 새로 임포트

# 기본 활동계수
_ACTIVITY = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

def _calc_bmr(weight_kg: float | None, height_cm: float | None, age: int | None, sex: str | None) -> float:
    """
    Mifflin-St Jeor (추정)
    sex: 'male' | 'female' | None
    """
    if not weight_kg or not height_cm:
        return 0.0

    age = age if (age and age > 0) else 25
    sex = (sex or "").lower()

    s = 5 if sex == "male" else (-161 if sex == "female" else -78)  # 모르면 중간값
    return 10 * float(weight_kg) + 6.25 * float(height_cm) - 5 * float(age) + s

def compute_and_save_daily_calorie_summary(user_id: int, date: str):
    """
    - intake: diets(calories 합) + diet_recommendations(calories 합, confirmed=0만)
    - exercise: activities(calories 합) + workout_recommendations(calories 합, confirmed=0만)
    - tdee: bmr * activity_factor
    - deficit: (tdee + exercise) - intake
    - est_weight_change_kg: deficit / 7700
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT height, weight, age, sex, activity_level FROM users WHERE id=?", (user_id,))
    u = cur.fetchone()

    height = u["height"] if u else None
    weight = u["weight"] if u else None
    age = u["age"] if u else None
    sex = u["sex"] if u else None
    activity_level = u["activity_level"] if u else None
    factor = _ACTIVITY.get((activity_level or "sedentary").lower(), 1.2)

    bmr = _calc_bmr(weight, height, age, sex)
    tdee = bmr * factor if bmr else 0.0

    # intake: 기록 + (미확정 추천만)
    cur.execute("SELECT COALESCE(SUM(calories), 0) AS v FROM diets WHERE user_id=? AND date=?", (user_id, date))
    intake_diets = float(cur.fetchone()["v"] or 0)

    cur.execute(
        "SELECT COALESCE(SUM(calories), 0) AS v FROM diet_recommendations WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0",
        (user_id, date),
    )
    intake_rec = float(cur.fetchone()["v"] or 0)

    intake = intake_diets + intake_rec

    # exercise: 실제 + (미확정 추천만)
    cur.execute(
        "SELECT COALESCE(SUM(calories), 0) AS v FROM activities WHERE user_id=? AND DATE(completed_at)=?",
        (user_id, date),
    )
    ex_actual = float(cur.fetchone()["v"] or 0)

    cur.execute(
        "SELECT COALESCE(SUM(calories), 0) AS v FROM workout_recommendations WHERE user_id=? AND date=? AND COALESCE(confirmed,0)=0",
        (user_id, date),
    )
    ex_rec = float(cur.fetchone()["v"] or 0)

    exercise = ex_actual + ex_rec

    deficit = (tdee + exercise) - intake
    est_weight_change_kg = deficit / 7700.0 if deficit else 0.0

    conn.close()

    upsert_daily_summary(
        user_id=user_id,
        date=date,
        bmr=round(bmr, 2),
        tdee=round(tdee, 2),
        intake=round(intake, 2),
        exercise=round(exercise, 2),
        deficit=round(deficit, 2),
        est_weight_change_kg=round(est_weight_change_kg, 4),
    )

    return get_daily_summary(user_id, date)
