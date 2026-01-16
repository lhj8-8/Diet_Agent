from flask import Blueprint, request, jsonify
from db.database import get_connection
from flask_jwt_extended import jwt_required, get_jwt_identity

calendar_bp = Blueprint("calendar", __name__)

# 캘린더 조회
@calendar_bp.route("", methods=["GET"])
@jwt_required()
def get_calendar():
    user_id = get_jwt_identity()
    month = request.args.get("month")

    if not month:
        return jsonify({"message": "month가 필요합니다."}), 400

    conn = get_connection()
    cur = conn.cursor()

    # 식단
    cur.execute(
        """
        SELECT date, menu, calories
        FROM diet_recommendations
        WHERE user_id = ? AND date LIKE ?
        """,
        (user_id, f"{month}%")
    )
    diets = cur.fetchall()

    # 운동
    cur.execute(
        """
        SELECT date, workout, calories
        FROM workout_recommendations
        WHERE user_id = ? AND date LIKE ?
        """,
        (user_id, f"{month}%")
    )
    workouts = cur.fetchall()

    conn.close()

    return jsonify({
        "diets": [dict(row) for row in diets],
        "workouts": [dict(row) for row in workouts]
    })
