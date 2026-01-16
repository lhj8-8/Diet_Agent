# routes/ai_tools.py
from datetime import datetime
from db.database import get_connection

from models.user_model import get_user_by_id, update_user_profile
from models.diet_model import get_diet_by_date
from models.calorie_model import get_daily_summary


def _row_to_dict(row):
    if row is None:
        return None
    try:
        return dict(row)
    except Exception:
        return {k: row[k] for k in row.keys()}


def _today_str():
    return datetime.now().strftime("%Y-%m-%d")


def tool_get_user_profile(user_id: int):
    row = get_user_by_id(user_id)
    if not row:
        return {"ok": False, "error": "user not found"}

    d = _row_to_dict(row)
    return {
        "ok": True,
        "profile": {
            "id": d.get("id"),
            "email": d.get("email"),
            "name": d.get("name"),
            "height": d.get("height"),
            "weight": d.get("weight"),
            "goal": d.get("goal"),
            "environment": d.get("environment"),  # ✅ 추가
            "equipment": d.get("equipment"),      # ✅ 추가
            "created_at": d.get("created_at"),
        },
    }


def tool_update_user_profile(user_id: int, name=None, height=None, weight=None, goal=None, environment=None, equipment=None):
    """
    채팅에서 사용자가 말한 프로필/환경/장비 정보를 DB에 저장(업데이트)
    - 사용자가 말하지 않은 값은 기존 DB 값을 유지
    """
    row = get_user_by_id(user_id)
    if not row:
        return {"ok": False, "error": "user not found"}

    d = _row_to_dict(row)

    new_name = name if name is not None else d.get("name")
    new_height = height if height is not None else d.get("height")
    new_weight = weight if weight is not None else d.get("weight")
    new_goal = goal if goal is not None else d.get("goal")

    new_environment = environment if environment is not None else d.get("environment")
    new_equipment = equipment if equipment is not None else d.get("equipment")

    update_user_profile(
        user_id,
        new_name,
        new_height,
        new_weight,
        new_goal,
        new_environment,
        new_equipment,
    )

    return {
        "ok": True,
        "updated": {
            "name": new_name,
            "height": new_height,
            "weight": new_weight,
            "goal": new_goal,
            "environment": new_environment,
            "equipment": new_equipment,
        },
    }


def tool_get_recent_activities(user_id: int, limit: int = 5):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT workout, calories, completed_at
        FROM activities
        WHERE user_id=?
        ORDER BY completed_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    )
    rows = cur.fetchall()
    conn.close()

    items = []
    for r in rows or []:
        rd = _row_to_dict(r)
        items.append(
            {
                "workout": rd.get("workout"),
                "calories": rd.get("calories"),
                "completed_at": rd.get("completed_at"),
            }
        )
    return {"ok": True, "items": items}


def tool_get_diet_by_date(user_id: int, date: str = None):
    if not date:
        date = _today_str()

    row = get_diet_by_date(user_id, date)
    if not row:
        return {"ok": True, "date": date, "diet": None}

    d = _row_to_dict(row)
    return {
        "ok": True,
        "date": date,
        "diet": {
            "id": d.get("id"),
            "date": d.get("date"),
            "content": d.get("content"),
            "calories": d.get("calories"),
            "created_at": d.get("created_at"),
        },
    }


def tool_get_calorie_summary(user_id: int, date: str = None):
    if not date:
        date = _today_str()

    row = get_daily_summary(user_id, date)
    if not row:
        return {"ok": True, "date": date, "summary": None}

    d = _row_to_dict(row)
    return {
        "ok": True,
        "date": date,
        "summary": {
            "bmr": d.get("bmr"),
            "tdee": d.get("tdee"),
            "intake": d.get("intake"),
            "exercise": d.get("exercise"),
            "deficit": d.get("deficit"),
            "est_weight_change_kg": d.get("est_weight_change_kg"),
            "updated_at": d.get("updated_at"),
        },
    }
    

def tool_get_nutrition_goal(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT calories, protein FROM user_nutrition_goal WHERE user_id=?",
        (user_id,)
    )
    row = cur.fetchone()
    conn.close()
    if row:
        return {"ok": True, "calories": row["calories"], "protein": row["protein"]}
    return {"ok": False}


def tool_get_effective_nutrition_goal(user_id: int):
    """
    우선순위:
    1) diet_goals (값이 있고 > 0)
    2) user_nutrition_goal
    """
    conn = get_connection()
    cur = conn.cursor()

    # 1️⃣ diet_goals 조회
    cur.execute(
        """
        SELECT type, target_calories, target_protein, target_activity_kcal
        FROM diet_goals
        WHERE user_id=?
        """,
        (user_id,)
    )
    dg = cur.fetchone()

    # 2️⃣ nutrition_goal 조회
    cur.execute(
        """
        SELECT calories, protein, activity_kcal
        FROM user_nutrition_goal
        WHERE user_id=?
        """,
        (user_id,)
    )
    ng = cur.fetchone()

    conn.close()

    def valid(v):
        return v is not None and v != 0

    result = {
        "type": None,
        "calories": None,
        "protein": None,
        "activity_kcal": None,
        "source": {}
    }

    if dg:
        if valid(dg["target_calories"]):
            result["calories"] = dg["target_calories"]
            result["source"]["calories"] = "diet_goals"
        if valid(dg["target_protein"]):
            result["protein"] = dg["target_protein"]
            result["source"]["protein"] = "diet_goals"
        if valid(dg["target_activity_kcal"]):
            result["activity_kcal"] = dg["target_activity_kcal"]
            result["source"]["activity_kcal"] = "diet_goals"

        if dg["type"]:
            result["type"] = dg["type"]

    if ng:
        if result["calories"] is None and valid(ng["calories"]):
            result["calories"] = ng["calories"]
            result["source"]["calories"] = "nutrition_goal"
        if result["protein"] is None and valid(ng["protein"]):
            result["protein"] = ng["protein"]
            result["source"]["protein"] = "nutrition_goal"
        if result["activity_kcal"] is None and valid(ng["activity_kcal"]):
            result["activity_kcal"] = ng["activity_kcal"]
            result["source"]["activity_kcal"] = "nutrition_goal"

    return {"ok": True, "goal": result}
