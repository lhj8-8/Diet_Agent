from models.summary_model import get_daily_summary
from models.activity_model import get_daily_activity
from models.recommendation_model import save_workout_recommendation

def calculate_progress(user_id, date):
    summary = get_daily_summary(user_id, date)
    return summary


def adjust_next_day_plan(user_id, date, next_date):
    summary = get_daily_summary(user_id, date)
    progress = summary["progress"]

    # 진행률 기반 난이도 조절
    if progress < 60:
        duration = 20
        calories = 150
    elif progress < 90:
        duration = 30
        calories = 250
    else:
        duration = 40
        calories = 350

    save_workout_recommendation(
        user_id,
        next_date,
        "맞춤 유산소 운동",
        duration,
        calories
    )
