import random
from datetime import datetime

from models.recommendation_model import (
    save_diet_recommendation,
    save_workout_recommendation
)
from models.food_model import (
    get_food_preferences,
    get_food_candidates
)
from models.workout_model import get_workouts_by_intensity

from utils.time_utils import normalize_date


"""추천 서비스

요청사항:
- /myinfo에서 '다시 추천'을 누를 때마다 새 추천 조합이 나오도록
  가능한 한 직전 추천과 동일한 메뉴/운동을 피해서 뽑습니다.

주의:
- 후보가 1개뿐이면 동일 메뉴가 다시 나올 수밖에 없습니다.
  그 경우에도 '매번 추천 생성'은 수행됩니다.
"""


# 식단 추천
def recommend_diet(user_id, date, meal_type, exclude_menus=None, rng: random.Random | None = None):
    date = normalize_date(date)

    pref = get_food_preferences(user_id)
    likes = (pref.get("likes") if pref else None) or None
    dislikes = (pref.get("dislikes") if pref else None) or None
    allergies = (pref.get("allergies") if pref else None) or None

    foods = get_food_candidates(
        meal_type=meal_type,
        dislikes=dislikes,
        allergies=allergies,
        likes=likes,
    )

    exclude_set = set([m for m in (exclude_menus or []) if m])
    if foods and exclude_set:
        filtered = [f for f in foods if f.get("name") not in exclude_set]
        foods = filtered or foods

    if not foods:
        menu = "닭가슴살 샐러드"
        calories = 450
        protein = 30
    else:
        picker = rng if rng is not None else random
        food = picker.choice(foods)
        menu = food["name"]
        calories = food.get("calories", 400)
        protein = food.get("protein", 0)

    save_diet_recommendation(
        user_id=user_id,
        date=date,
        meal_type=meal_type,
        menu=menu,
        calories=calories,
        protein=protein
    )


# 운동 추천
def recommend_workout(user_id, date, progress=70, exclude_workouts=None, rng: random.Random | None = None):
    """
    progress : 전날 기준 진행률 (%)
    """

    date = normalize_date(date)

    # 진행률 기반 강도 조절
    if progress < 60:
        intensity = "low"
    elif progress < 85:
        intensity = "medium"
    else:
        intensity = "high"

    workouts = get_workouts_by_intensity(intensity)

    # 이전 추천과 동일한 운동은 가능한 한 제외
    exclude_set = set([w for w in (exclude_workouts or []) if w])
    if workouts and exclude_set:
        filtered = [w for w in workouts if (w.get("name") not in exclude_set)]
        workouts = filtered or workouts

    # 후보 없을 때 fallback
    if not workouts:
        workout_name = "걷기"
        duration = 30
        calories = 120
    else:
        picker = rng if rng is not None else random
        workout = picker.choice(workouts)
        workout_name = workout["name"]
        duration = workout.get("duration", 30)
        calories = workout.get("calories", 150)

    save_workout_recommendation(
        user_id=user_id,
        date=date,
        workout=workout_name,
        duration=duration,
        calories=calories
    )
