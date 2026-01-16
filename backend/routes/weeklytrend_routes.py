from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from db.database import get_connection

stats_bp = Blueprint("stats", __name__)

@stats_bp.route("/weekly/weight", methods=["GET"])
@jwt_required()
def get_weekly_weight():
    user_id = get_jwt_identity()

    start_date = (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT recorded_at, weight
        FROM weights
        WHERE user_id = ?
          AND recorded_at >= ?
        ORDER BY recorded_at ASC
    """, (user_id, start_date))

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "date": row["recorded_at"],
            "value": row["weight"]
        }
        for row in rows
    ])

@stats_bp.route("/weight/today", methods=["POST"])
@jwt_required()
def upsert_today_weight():
    print("🔥🔥🔥 WEIGHT ROUTE HIT 🔥🔥🔥")

    identity = get_jwt_identity()
    print("JWT IDENTITY:", identity, type(identity))

    data = request.get_json()
    print("REQUEST DATA:", data)
    
    user_id = get_jwt_identity()
    data = request.get_json()

    weight = data.get("weight")
    if weight is None:
        return jsonify({"msg": "weight is required"}), 400

    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cur = conn.cursor()

    # 오늘 기록 존재 여부 확인
    cur.execute("""
        SELECT id FROM weights
        WHERE user_id = ? AND recorded_at = ?
    """, (user_id, today))
    row = cur.fetchone()

    if row:
        # 이미 있으면 → UPDATE
        cur.execute("""
            UPDATE weights
            SET weight = ?
            WHERE user_id = ? AND recorded_at = ?
        """, (weight, user_id, today))
    else:
        # 없으면 → INSERT
        cur.execute("""
            INSERT INTO weights (user_id, weight, recorded_at, created_at)
            VALUES (?, ?, ?, ?)
        """, (user_id, weight, today, now))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "date": today,
        "weight": weight
    })

@stats_bp.route("/weekly/activity", methods=["GET"])
@jwt_required()
def get_weekly_activity():
    user_id = get_jwt_identity()

    start_date = (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT completed_at, SUM(duration) as total_minutes
        FROM activities
        WHERE user_id = ?
          AND completed_at >= ?
        GROUP BY completed_at
        ORDER BY completed_at ASC
    """, (user_id, start_date))

    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "date": row["completed_at"],
            "value": row["total_minutes"] or 0
        }
        for row in rows
    ])

@stats_bp.route("/weekly/calories", methods=["GET"])
@jwt_required()
def get_weekly_calories():
    user_id = get_jwt_identity()
    start_date = (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            tm.date,
            COALESCE(SUM(tmi.calories), 0) AS total_calories
        FROM today_meals tm
        LEFT JOIN today_meal_items tmi
            ON tm.id = tmi.today_meal_id
        WHERE tm.user_id = ?
          AND tm.date >= ?
        GROUP BY tm.date
        ORDER BY tm.date ASC
    """, (user_id, start_date))

    rows = {row["date"]: row["total_calories"] for row in cur.fetchall()}

    # 날짜 보정 (7일 꽉 채우기)
    result = []
    for i in range(7):
        d = (datetime.now() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        result.append({
            "date": d,
            "value": rows.get(d, 0)
        })

    conn.close()
    return jsonify(result)

