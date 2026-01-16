from datetime import datetime
import random
from utils.time_utils import normalize_date
from models.schedule_model import get_schedule_by_date
from models.recommendation_model import clear_recommendations, list_recommendations
from services.recommendation_service import recommend_diet, recommend_workout
from utils.time_utils import normalize_date


_MEAL_KEYWORDS = {
    "breakfast": ["아침", "아침식사", "조식"],
    "lunch": ["점심", "점심식사"],
    "dinner": ["저녁", "저녁식사"],
    "snack": ["간식"],
}

_WORKOUT_KEYWORDS = ["운동", "헬스", "pt", "피티", "러닝", "런닝", "조깅", "요가", "필라테스"]
_FREE_KEYWORDS = ["휴식", "자유", "여유", "빈시간", "프리"]

def _infer_meals_from_schedules(schedules):
    titles = " ".join([(s["title"] or "") for s in schedules]).lower()
    meals = set()
    for meal_type, keys in _MEAL_KEYWORDS.items():
        for k in keys:
            if k.lower() in titles:
                meals.add(meal_type)
                break
    return sorted(meals)

def _infer_need_workout(schedules):
    titles = " ".join([(s["title"] or "") for s in schedules]).lower()
    if any(k in titles for k in [w.lower() for w in _WORKOUT_KEYWORDS]):
        return True
    if any(k.lower() in titles for k in _FREE_KEYWORDS):
        return True
    return False

def _signature(rec):
    """추천 조합 비교용 시그니처"""
    if not rec:
        return ((), ())
    diets = tuple((r["meal_type"], r["menu"]) for r in (rec.get("diets") or []))
    workouts = tuple(
        (r["workout"], int(r["duration"] or 0))
        for r in (rec["workouts"] or [])
    )


def regenerate_daily_plan(user_id: int, date: str, progress: int = 70, nonce: str | int | None = None):
    """
    일정 기반 자동 추천(식단/운동)을 생성하고 DB에 저장합니다.
    - 기존 추천은 (user_id, date) 기준으로 삭제 후 재생성
    - meal_type: breakfast | lunch | dinner | snack
    """
    date = normalize_date(date)
    schedules = get_schedule_by_date(user_id, date)

    # (요청사항) '다시 추천' 시 직전 추천과 동일 조합이 나오지 않도록 최대한 회피
    prev = list_recommendations(user_id, date, include_confirmed=False)
    prev_sig = _signature(prev)
    prev_meal_map = {}
    try:
        for r in (prev.get("diets") or []):
            prev_meal_map[r["meal_type"]] = r["menu"]
    except Exception:
        prev_meal_map = {}
    prev_workouts = []
    try:
        prev_workouts = [r["workout"] for r in (prev.get("workouts") or []) if r.get("workout")]
    except Exception:
        prev_workouts = []

    meals = _infer_meals_from_schedules(schedules)
    if not meals:
        meals = ["breakfast", "lunch", "dinner"]

    # 동일 조합이면 몇 번 재시도
    attempts = 5
    for _ in range(attempts):
        # (버그픽스) 프론트에서 nonce를 보내면 매번 다른 조합이 나오도록 RNG를 분리
        # - week 생성/다시추천에서도 date+nonce 기반으로 변하도록 함
        seed = f"{user_id}|{date}|{nonce}|{_}|{datetime.utcnow().timestamp()}" if nonce is not None else f"{user_id}|{date}|{_}|{datetime.utcnow().timestamp()}"
        rng = random.Random(seed)

        clear_recommendations(user_id, date)

        for meal_type in meals:
            exclude = []
            if prev_meal_map.get(meal_type):
                exclude = [prev_meal_map.get(meal_type)]
            recommend_diet(user_id, date, meal_type, exclude_menus=exclude, rng=rng)

        if _infer_need_workout(schedules):
            recommend_workout(user_id, date, progress=progress, exclude_workouts=prev_workouts, rng=rng)

        cur = list_recommendations(user_id, date)
        if prev_sig == ((), ()):  # 이전 추천이 없으면 1회 생성으로 충분
            return cur
        if _signature(cur) != prev_sig:
            return cur

    # 그래도 동일하면(후보가 적은 경우) 마지막 결과 반환
    return list_recommendations(user_id, date)
