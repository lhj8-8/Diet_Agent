import random


def select_intensity_by_progress(progress: int) -> str:
    """
    진행률 → 운동 강도
    """
    if progress < 60:
        return "low"
    elif progress < 85:
        return "medium"
    return "high"


def filter_workouts_by_time(workouts, free_minutes: int):
    """
    여유 시간보다 긴 운동 제거
    """
    return [
        w for w in workouts
        if w["duration"] <= free_minutes
    ]


def pick_random_workout(workouts):
    if not workouts:
        return None
    return random.choice(workouts)
