from datetime import datetime


def time_to_minutes(t: str) -> int:
    """
    "09:30" → 570
    """
    h, m = map(int, t.split(":"))
    return h * 60 + m


def minutes_to_time(m: int) -> str:
    """
    570 → "09:30"
    """
    return f"{m // 60:02d}:{m % 60:02d}"


def calculate_free_slots(schedules):
    """
    schedules: [{start_time, end_time}]
    """
    slots = []

    sorted_schedules = sorted(
        schedules,
        key=lambda x: x["start_time"]
    )

    for i in range(len(sorted_schedules) - 1):
        end = time_to_minutes(sorted_schedules[i]["end_time"])
        start = time_to_minutes(sorted_schedules[i + 1]["start_time"])

        if start > end:
            slots.append({
                "start": minutes_to_time(end),
                "end": minutes_to_time(start),
                "duration": start - end
            })

    return slots


def detect_meal_type(start_time: str):
    """
    시간대 → 식사 종류
    """
    minutes = time_to_minutes(start_time)

    if 11 * 60 <= minutes <= 14 * 60:
        return "lunch"
    if 17 * 60 <= minutes <= 20 * 60:
        return "dinner"
    return None

def normalize_date(date_str: str) -> str:
    """
    다양한 형식의 날짜 문자열을 "YYYY-MM-DD" 형식으로 정규화
    """
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"지원하지 않는 날짜 형식: {date_str}")
