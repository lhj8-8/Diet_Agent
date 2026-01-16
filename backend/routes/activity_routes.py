from flask import Blueprint, request, jsonify
from datetime import datetime
from db.database import get_connection
from services.calorie_service import compute_and_save_daily_calorie_summary
from flask_jwt_extended import jwt_required, get_jwt_identity

activity_bp = Blueprint("activity", __name__)

_INTENSITY_MAP = {
    "low": 4.0,
    "medium": 7.0,
    "high": 10.0,
    "낮음": 4.0,
    "중간": 7.0,
    "높음": 10.0,
}

def _estimate_calories(minutes: int, intensity: str) -> int:
    m = max(int(minutes or 0), 0)
    if m <= 0:
        return 0
    factor = _INTENSITY_MAP.get((intensity or "medium").lower(), _INTENSITY_MAP.get(intensity, 7.0))
    return int(round(m * float(factor)))

# -------------------------------------------------------
# 기존 호환: 운동 완료 기록
# POST /api/activity/complete  {userId, workout, calories?, duration?}
# -------------------------------------------------------
@activity_bp.route("/complete", methods=["POST"])
@jwt_required()
def complete_activity():
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    workout = (data.get("workout") or "").strip()
    calories = int(data.get("calories") or 0)
    duration = int(data.get("duration") or 0)

    if not user_id or not workout:
        return jsonify({"message": "필수 데이터 누락"}), 400

    if calories <= 0 and duration > 0:
        calories = _estimate_calories(duration, "medium")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO activities
        (user_id, workout, calories, duration, completed_at, intensity, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (int(user_id), workout, calories, duration, datetime.utcnow().isoformat(), data.get("intensity"), "manual"),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "운동이 기록되었습니다."})


# -------------------------------------------------------
# 운동 로그 (localStorage -> DB)
# GET  /api/activity/logs/<user_id>?date=YYYY-MM-DD
# POST /api/activity/logs/<user_id> {date, name, minutes, intensity}
# DELETE /api/activity/logs/<user_id>/<log_id>
# -------------------------------------------------------
@activity_bp.route("/logs", methods=["GET"])
@jwt_required()
def list_activity_logs():
    user_id = get_jwt_identity()
    date = request.args.get("date")
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, workout, duration, calories, completed_at, intensity, source
        FROM activities
        WHERE user_id=? AND DATE(completed_at)=?
        ORDER BY id DESC
        """,
        (user_id, date),
    )
    rows = cur.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "date": date,
            "name": r["workout"] or "",
            "minutes": r["duration"] or 0,
            "calories": r["calories"] or 0,
            "intensity": r["intensity"] or "중간",
            "completedAt": r["completed_at"] or "",
            "source": r["source"] or "manual",
        }
        for r in rows
    ]
    return jsonify({"items": items})


@activity_bp.route("/logs", methods=["POST"])
@jwt_required()
def add_activity_log():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get("date")
    name = (data.get("name") or data.get("workout") or "").strip()
    minutes = int(data.get("minutes") or data.get("duration") or 0)
    intensity = (data.get("intensity") or "중간").strip()

    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400
    if not name:
        return jsonify({"message": "name이 필요합니다."}), 400

    calories = int(data.get("calories") or 0)
    if calories <= 0:
        calories = _estimate_calories(minutes, intensity)

    completed_at = f"{date}T00:00:00"

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO activities (user_id, workout, duration, calories, completed_at, intensity, source)
        VALUES (?, ?, ?, ?, ?, ?, 'manual')
        """,
        (user_id, name, minutes, calories, completed_at, intensity),
    )
    conn.commit()
    conn.close()

    try:
        compute_and_save_daily_calorie_summary(user_id, date)
    except Exception:
        pass

    return jsonify({"message": "운동 로그가 저장되었습니다.", "calories": calories})


@activity_bp.route("/logs/<int:log_id>", methods=["DELETE"])
@jwt_required()
def delete_activity_log(log_id):
    user_id = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT completed_at FROM activities WHERE id=? AND user_id=?", (log_id, user_id))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"message": "대상을 찾을 수 없습니다."}), 404

    date = (row["completed_at"] or "")[:10] if row["completed_at"] else None
    cur.execute("DELETE FROM activities WHERE id=? AND user_id=?", (log_id, user_id))
    conn.commit()
    conn.close()

    if date:
        try:
            compute_and_save_daily_calorie_summary(user_id, date)
        except Exception:
            pass

    return jsonify({"message": "삭제되었습니다."})


# -------------------------------------------------------
# 운동 계획 (days/time/difficulty)
# GET /api/activity/plan/<user_id>
# PUT /api/activity/plan/<user_id> {days:[], time:"19:00", difficulty:"beginner"}
# -------------------------------------------------------
@activity_bp.route("/plan", methods=["GET"])
@jwt_required()
def get_workout_plan():
    user_id = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT days, time, difficulty FROM workout_plans WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"days": ["월", "수", "금"], "time": "19:00", "difficulty": "beginner"})

    days = (row["days"] or "").split(",") if row["days"] else []
    return jsonify({"days": days, "time": row["time"] or "19:00", "difficulty": row["difficulty"] or "beginner"})


@activity_bp.route("/plan", methods=["PUT"])
@jwt_required()
def upsert_workout_plan():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    days = data.get("days") or ["월", "수", "금"]
    if isinstance(days, list):
        days_str = ",".join(days)
    else:
        days_str = str(days)
    time = data.get("time") or "19:00"
    difficulty = data.get("difficulty") or "beginner"

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO workout_plans (user_id, days, time, difficulty, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            days=excluded.days,
            time=excluded.time,
            difficulty=excluded.difficulty,
            updated_at=excluded.updated_at
        """,
        (user_id, days_str, time, difficulty, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "운동 계획이 저장되었습니다."})


# -------------------------------------------------------
# 운동 완료 체크 (날짜별)
# GET /api/activity/daycheck/<user_id>?date=YYYY-MM-DD
# PUT /api/activity/daycheck/<user_id> {date, done:true/false}
# -------------------------------------------------------
@activity_bp.route("/daycheck", methods=["GET"])
@jwt_required()
def get_daycheck():
    user_id = get_jwt_identity()
    date = request.args.get("date")
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT done FROM workout_day_checks WHERE user_id=? AND date=?", (user_id, date))
    row = cur.fetchone()
    conn.close()
    return jsonify({"date": date, "done": bool(row["done"]) if row else False})


@activity_bp.route("/daycheck", methods=["PUT"])
@jwt_required()
def set_daycheck():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get("date")
    done = data.get("done", False)
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO workout_day_checks (user_id, date, done, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
            done=excluded.done,
            updated_at=excluded.updated_at
        """,
        (user_id, date, 1 if done else 0, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "완료 체크가 저장되었습니다.", "date": date, "done": bool(done)})
