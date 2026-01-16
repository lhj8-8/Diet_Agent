import random


def _split(value):
    """
    "브로콜리,버섯" → ["브로콜리", "버섯"]
    """
    if not value:
        return []
    return [v.strip().lower() for v in value.split(",")]


def filter_foods(foods, dislikes=None, allergies=None):
    dislike_list = _split(dislikes)
    allergy_list = _split(allergies)

    result = []

    for food in foods:
        name = food["name"].lower()
        allergy = (food["allergy"] or "").lower()

        # 알러지 제거
        if allergy and allergy in allergy_list:
            continue

        # 싫어하는 음식 제거
        if any(d in name for d in dislike_list):
            continue

        result.append(food)

    return result


def pick_random_food(foods):
    return random.choice(foods) if foods else None
