from models.schedule_model import add_schedule, get_schedule_by_date

def create_schedule(
    user_id, date, start_time, end_time, title, memo=""
):
    add_schedule(
        user_id,
        date,
        start_time,
        end_time,
        title,
        memo
    )


def get_daily_schedule(user_id, date):
    return get_schedule_by_date(user_id, date)


def calculate_free_slots(schedules):
    """
    일정 사이 여유 시간 계산
    """
    free_slots = []

    schedules = sorted(schedules, key=lambda x: x["start_time"])

    for i in range(len(schedules) - 1):
        end = schedules[i]["end_time"]
        start = schedules[i + 1]["start_time"]
        if end < start:
            free_slots.append({
                "start": end,
                "end": start
            })

    return free_slots
