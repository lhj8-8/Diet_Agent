from flask import Blueprint, request, jsonify
from datetime import datetime

from services.planning_service import regenerate_daily_plan
from services.calorie_service import compute_and_save_daily_calorie_summary
from models.recommendation_model import list_recommendations, confirm_recommendations
from models.calorie_model import get_daily_summary
from db.database import get_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import timedelta

plan_bp = Blueprint("plan", __name__)


def _to_date(s: str):
    return datetime.strptime(s, "%Y-%m-%d").date()


def _monday_of(d):
    # Monday=0
    return d - timedelta(days=d.weekday())


@plan_bp.route("/week", methods=["GET"])
@jwt_required()
def get_week_plan():
    """주간 추천(월~일) 조회/생성

    - start(선택): YYYY-MM-DD (해당 날짜가 속한 주의 월요일을 기준으로 7일)
      * start가 월요일이 아니라면 자동으로 그 주의 월요일로 보정
    - force(선택): 1이면 7일 모두 새로 생성(기존 추천은 덮어씀)
    """

    user_id = int(get_jwt_identity())
    start = request.args.get("start")
    force = (request.args.get("force") or "0") == "1"

    today = datetime.now().date()
    base = _to_date(start) if start else today
    week_start = _monday_of(base)

    days = []
    for i in range(7):
        d = (week_start + timedelta(days=i)).isoformat()
        if force:
            # 프론트에서 week 재생성 시에도 날짜별로 다른 조합이 나오도록 nonce를 섞어줌
            nonce = request.args.get("nonce")
            rec = regenerate_daily_plan(int(user_id), d, progress=70, nonce=nonce or f"week-{d}")
        else:
            rec = list_recommendations(int(user_id), d, include_confirmed=True)
            diets = rec.get("diets", []) if rec else []
            workouts = rec.get("workouts", []) if rec else []
            if len(diets) == 0 and len(workouts) == 0:
                nonce = request.args.get("nonce")
                rec = regenerate_daily_plan(int(user_id), d, progress=70, nonce=nonce or f"week-{d}")

        days.append({
            "date": d,
            "recommendations": _pack_recs(rec),
        })

    return jsonify({
        "start": week_start.isoformat(),
        "days": days,
    })

# POST /api/plan/generate  {userId, date, progress?}
@plan_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_plan():
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())
    date = data.get("date")

    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    # 1️⃣ 새 추천 생성 (기존 confirmed 있어도 새로 만듦)
    regenerate_daily_plan(user_id, date, progress=70)

    # 2️⃣ 다시 조회할 때 confirmed 포함
    rec = list_recommendations(user_id, date, include_confirmed=True)

    cal = compute_and_save_daily_calorie_summary(user_id, date)

    return jsonify({
        "message": "새 추천 식단이 생성되었습니다.",
        "recommendations": _pack_recs(rec),
        "calorie_summary": _pack_cal(cal),
    })


# GET /api/plan/<user_id>?date=YYYY-MM-DD
@plan_bp.route("/me", methods=["GET"])
@jwt_required()
def get_plan():
    user_id = get_jwt_identity()
    date = request.args.get("date")
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    rec = list_recommendations(user_id, date, include_confirmed=True)
    cal = get_daily_summary(user_id, date)

    return jsonify({
        "date": date,
        "recommendations": _pack_recs(rec),
        "calorie_summary": _pack_cal(cal),
    })


# POST /api/plan/apply  {userId, date}
# 추천(confirmed=0)을 "기록"으로 확정 저장하고, 추천은 confirmed=1로 변경
@plan_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_plan():
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())
    date = data.get("date")
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    rec = list_recommendations(user_id, date, include_confirmed=False)
    diets = rec.get("diets", []) if rec else []
    workouts = rec.get("workouts", []) if rec else []

    inserted_diets = 0
    inserted_acts = 0

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()

    try:
        # 🔴 1️⃣ today_meals 확보
        cur.execute("""
        SELECT id FROM today_meals
        WHERE user_id = ? AND date = ?
        """, (user_id, date))
        row = cur.fetchone()

        if row:
            today_meal_id = row["id"]
        else:
            cur.execute("""
            INSERT INTO today_meals (user_id, date, created_at)
            VALUES (?, ?, ?)
            """, (user_id, date, now))
            today_meal_id = cur.lastrowid

        # 🔴 2️⃣ today_meal_items insert (수정됨)
        for r in diets:
            cur.execute("""
            INSERT INTO today_meal_items (
                today_meal_id,
                user_id,
                date,
                meal_type,
                food_name,
                calories,
                protein,
                source,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'recommendation', ?)
            """, (
                today_meal_id,
                user_id,
                date,
                r["meal_type"],
                r["menu"],
                int(r["calories"] or 0),
                int(r["protein"] or 0),
                now,
            ))
            inserted_diets += 1

        # 🔴 3️⃣ activities는 그대로 OK
        completed_at = f"{date}T00:00:00"
        for r in workouts:
            cur.execute("""
            INSERT INTO activities
            (user_id, workout, duration, calories, completed_at, intensity, source)
            VALUES (?, ?, ?, ?, ?, ?, 'recommendation')
            """, (
                user_id,
                r["workout"],
                int(r["duration"] or 0),
                int(r["calories"] or 0),
                completed_at,
                "중간",
            ))
            inserted_acts += 1

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

    confirm_recommendations(user_id, date)

    cal = compute_and_save_daily_calorie_summary(user_id, date)
    rec2 = list_recommendations(user_id, date, include_confirmed=True)

    return jsonify({
        "message": "추천을 기록으로 반영했습니다.",
        "applied": {"diet_logs": inserted_diets, "activity_logs": inserted_acts},
        "recommendations": _pack_recs(rec2),
        "calorie_summary": _pack_cal(cal),
    })



def _pack_recs(rec):
    diets = rec.get("diets", []) if rec else []
    workouts = rec.get("workouts", []) if rec else []
    return {
        "diets": [
            {
                "id": r["id"],
                "meal_type": r["meal_type"],
                "menu": r["menu"],
                "calories": r["calories"],
                "created_at": r["created_at"],
                "confirmed": int(r["confirmed"] or 0),
            }
            for r in diets
        ],
        "workouts": [
            {
                "id": r["id"],
                "workout": r["workout"],
                "duration": r["duration"],
                "calories": r["calories"],
                "created_at": r["created_at"],
                "confirmed": int(r["confirmed"] or 0),
            }
            for r in workouts
        ],
    }

def _pack_cal(row):
    if not row:
        return None
    return {
        "bmr": row["bmr"],
        "tdee": row["tdee"],
        "intake": row["intake"],
        "exercise": row["exercise"],
        "deficit": row["deficit"],
        "est_weight_change_kg": row["est_weight_change_kg"],
        "updated_at": row["updated_at"],
    }

# 기존 AI 추천 적용에서 아침/점심/저녁 중 하나만 택하여 적용할 수 있는 라우트
# POST /api/plan/apply/partial
# body: { date: "YYYY-MM-DD", meal_types: ["breakfast", "lunch"] }

@plan_bp.route("/apply/partial", methods=["POST"])
@jwt_required()
def apply_plan_partial():
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())
    date = data.get("date")
    meal_types = data.get("meal_types", [])

    if not date or not meal_types:
        return jsonify({"message": "date와 meal_types가 필요합니다."}), 400

    rec = list_recommendations(user_id, date, include_confirmed=False)
    diets = rec.get("diets", []) if rec else []

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()

    try:
        # 🔴 1️⃣ today_meals 확보 (여기!)
        cur.execute("""
        SELECT id FROM today_meals
        WHERE user_id = ? AND date = ?
        """, (user_id, date))
        row = cur.fetchone()

        if row:
            today_meal_id = row["id"]
        else:
            cur.execute("""
            INSERT INTO today_meals (user_id, date, created_at)
            VALUES (?, ?, ?)
            """, (user_id, date, now))
            today_meal_id = cur.lastrowid

        inserted = 0
        applied_ids = []

        # 🔴 2️⃣ meal_type별 INSERT
        for r in diets:
    # ✅ 유저가 선택한 meal_type만 적용
            if r["meal_type"] not in meal_types:
                continue

            cur.execute("""
                INSERT INTO today_meal_items (
                    today_meal_id,
                    user_id,
                    date,
                    meal_type,
                    food_name,
                    calories,
                    protein,
                    source,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'recommendation', ?)
            """, (
                today_meal_id,
                user_id,
                date,
                r["meal_type"],
                r["menu"],
                int(r["calories"] or 0),
                int(r["protein"] or 0),
                now,
            ))

            inserted += 1
            applied_ids.append(r["id"])

        # 🔴 3️⃣ confirmed 처리
        if applied_ids:
            cur.execute(
                f"""
                UPDATE diet_recommendations
                SET confirmed = 1
                WHERE id IN ({",".join(["?"] * len(applied_ids))})
                """,
                applied_ids
            )

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

    cal = compute_and_save_daily_calorie_summary(user_id, date)

    return jsonify({
        "message": "선택한 식단만 기록으로 반영했습니다.",
        "applied_count": inserted,
        "calorie_summary": _pack_cal(cal),
    })

