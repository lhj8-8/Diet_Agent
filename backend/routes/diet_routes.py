from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, date
from db.database import get_connection
from services.calorie_service import compute_and_save_daily_calorie_summary
from flask_jwt_extended import jwt_required, get_jwt_identity
from routes.user_routes import calculate_nutrition_goal


diet_bp = Blueprint("diet", __name__)


# =========================
# 다이어트 목표 / 제외 식재료 (DB 영속화)
# GET  /api/diet/goal
# PUT  /api/diet/goal {type, startWeight, targetWeight, startDate, endDate}
# GET  /api/diet/excluded
# PUT  /api/diet/excluded {items}
# =========================

def _calc_time_progress(start_date: str, end_date: str) -> int:
    try:
        s = datetime.fromisoformat(start_date)
        e = datetime.fromisoformat(end_date)
    except Exception:
        return 0
    if s >= e:
        return 0
    now = datetime.utcnow()
    total = (e - s).total_seconds()
    passed = min(max((now - s).total_seconds(), 0.0), total)
    return int(round((passed / total) * 100)) if total else 0

def _calc_weight_progress(goal_type: str, start_w, target_w, current_w) -> int:
    try:
        s = float(start_w)
        t = float(target_w)
        c = float(current_w)
    except Exception:
        return 0

    if goal_type == "loss":
        if s <= t:
            return 0
        denom = s - t
        numer = s - c
        return max(0, min(100, int(round((numer / denom) * 100))))

    if goal_type == "gain":
        if t <= s:
            return 0
        denom = t - s
        numer = c - s
        return max(0, min(100, int(round((numer / denom) * 100))))

    # keep: 목표 체중과 가까울수록 100
    diff = abs(c - t)
    score = max(0, 100 - int(round(diff * 20)))
    return min(100, score)


def _calc_overall_progress(weight_progress: int, time_progress: int) -> int:
    """체중 달성률 + 기간 경과율을 함께 고려한 전체 진행률.

    사용자가 '목표 기간, 목표/현재/시작 체중'을 모두 고려한 진행률을 원해서
    두 값을 50:50으로 평균합니다.
    """
    try:
        wp = int(weight_progress or 0)
        tp = int(time_progress or 0)
    except Exception:
        return 0
    return max(0, min(100, int(round((wp + tp) / 2))))

@diet_bp.route("/goal", methods=["GET"])
@jwt_required()
def get_diet_goal():
    user_id = get_jwt_identity()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT weight, height, age, sex, activity_level, goal FROM users WHERE id=?", (user_id,))
    user_row = cur.fetchone()
    current_weight = user_row["weight"] if user_row else None

    cur.execute(
        """
        SELECT type, start_weight, target_weight, start_date, end_date,
               target_calories, target_protein, target_activity_kcal, updated_at
        FROM diet_goals
        WHERE user_id=?
        """,
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()

    # -----------------------------
    # 기본값: 현재체중 기반 & 계산된 영양 목표
    # -----------------------------
    calories, protein, activity_kcal = calculate_nutrition_goal(user_row)

    if not row:
        cw = float(current_weight) if current_weight is not None else None
        default_target = (cw - 5) if cw is not None else None
        start_date = datetime.utcnow().date().isoformat()
        end_date = (datetime.utcnow().date() + timedelta(days=30)).isoformat()
        goal_type = "loss"
        start_weight = cw
        target_weight = default_target
        progress = _calc_weight_progress(goal_type, start_weight or 0, target_weight or 0, cw or 0) if cw is not None and target_weight is not None else 0
        time_progress = _calc_time_progress(start_date, end_date)
        overall = _calc_overall_progress(progress, time_progress)

        return jsonify({
            "type": goal_type,
            "startWeight": start_weight,
            "targetWeight": target_weight,
            "startDate": start_date,
            "endDate": end_date,
            "currentWeight": current_weight,
            "progress": progress,
            "timeProgress": time_progress,
            "overallProgress": overall,
            "calories": calories,
            "protein": protein,
            "activityKcal": activity_kcal,
            "updatedAt": None,
        })

    # -----------------------------
    # DB 값 불러오기 + 기본값 보정
    # -----------------------------
    goal_type = row["type"] or "loss"
    start_weight = row["start_weight"]
    target_weight = row["target_weight"]
    start_date = row["start_date"] or datetime.utcnow().date().isoformat()
    end_date = row["end_date"] or (datetime.utcnow().date() + timedelta(days=30)).isoformat()

    target_calories = row["target_calories"] if row["target_calories"] is not None else calories
    target_protein = row["target_protein"] if row["target_protein"] is not None else protein
    target_activity_kcal = row["target_activity_kcal"] if row["target_activity_kcal"] is not None else activity_kcal

    progress = 0
    if current_weight is not None and start_weight is not None and target_weight is not None:
        progress = _calc_weight_progress(goal_type, start_weight, target_weight, current_weight)
    time_progress = _calc_time_progress(start_date, end_date)
    overall = _calc_overall_progress(progress, time_progress)

    return jsonify({
        "type": goal_type,
        "startWeight": start_weight,
        "targetWeight": target_weight,
        "startDate": start_date,
        "endDate": end_date,
        "currentWeight": current_weight,
        "progress": progress,
        "timeProgress": time_progress,
        "overallProgress": overall,
        "calories": target_calories,
        "protein": target_protein,
        "activityKcal": target_activity_kcal,
        "updatedAt": row["updated_at"] if row else None,
    })


@diet_bp.route("/goal", methods=["PUT"])
@jwt_required()
def upsert_diet_goal():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    # -----------------------------
    # 1️⃣ 기본 목표 정보
    # -----------------------------
    goal_type = (data.get("type") or "loss").strip()
    start_weight = data.get("startWeight")
    target_weight = data.get("targetWeight")
    start_date = data.get("startDate") or datetime.utcnow().date().isoformat()
    end_date = data.get("endDate") or (datetime.utcnow().date() + timedelta(days=30)).isoformat()
    incoming_current = data.get("currentWeight")  # 현재 체중 입력 가능

    # 문자열 숫자 처리
    try:
        start_weight = float(start_weight) if start_weight not in (None, "",) else None
    except Exception:
        start_weight = None
    try:
        target_weight = float(target_weight) if target_weight not in (None, "",) else None
    except Exception:
        target_weight = None

    # -----------------------------
    # 2️⃣ DB 연결 및 현재 체중 업데이트
    # -----------------------------
    conn = get_connection()
    cur = conn.cursor()

    if incoming_current not in (None, ""):
        try:
            cw_val = float(incoming_current)
            cur.execute("UPDATE users SET weight=? WHERE id=?", (cw_val, user_id))
            conn.commit()
        except Exception:
            pass

    cur.execute("SELECT weight, height, age, sex, activity_level, goal FROM users WHERE id=?", (user_id,))
    user_row = cur.fetchone()
    current_weight = user_row["weight"] if user_row else None

    # -----------------------------
    # 3️⃣ 계산된 기본 값
    # -----------------------------
    calories, protein, activity_kcal = calculate_nutrition_goal(user_row)

    # 사용자가 지정한 목표값이 있으면 덮어쓰기
    target_calories = data.get("targetCalories")
    target_protein = data.get("targetProtein")
    target_activity_kcal = data.get("targetActivityKcal")

    target_calories = int(target_calories) if target_calories not in (None, "") else calories
    target_protein = int(target_protein) if target_protein not in (None, "") else protein
    target_activity_kcal = int(target_activity_kcal) if target_activity_kcal not in (None, "") else activity_kcal

    # -----------------------------
    # 4️⃣ DB 저장 (업서트)
    # -----------------------------
    cur.execute(
        """
        INSERT INTO diet_goals
        (user_id, type, start_weight, target_weight, start_date, end_date,
         target_calories, target_protein, target_activity_kcal, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            type=excluded.type,
            start_weight=excluded.start_weight,
            target_weight=excluded.target_weight,
            start_date=excluded.start_date,
            end_date=excluded.end_date,
            target_calories=excluded.target_calories,
            target_protein=excluded.target_protein,
            target_activity_kcal=excluded.target_activity_kcal,
            updated_at=excluded.updated_at
        """,
        (
            user_id,
            goal_type,
            start_weight,
            target_weight,
            start_date,
            end_date,
            target_calories,
            target_protein,
            target_activity_kcal,
            datetime.utcnow().isoformat()
        ),
    )
    conn.commit()
    conn.close()

    # -----------------------------
    # 5️⃣ 진행률 계산
    # -----------------------------
    progress = 0
    if current_weight is not None and start_weight is not None and target_weight is not None:
        progress = _calc_weight_progress(goal_type, start_weight, target_weight, current_weight)
    time_progress = _calc_time_progress(start_date, end_date)
    overall = _calc_overall_progress(progress, time_progress)

    # -----------------------------
    # 6️⃣ 결과 반환
    # -----------------------------
    return jsonify({
        "message": "다이어트 목표가 저장되었습니다.",
        "goal": {
            "type": goal_type,
            "startWeight": start_weight,
            "targetWeight": target_weight,
            "startDate": start_date,
            "endDate": end_date,
            "currentWeight": current_weight,
            "progress": progress,
            "timeProgress": time_progress,
            "overallProgress": overall,
            "calories": target_calories,
            "protein": target_protein,
            "activityKcal": target_activity_kcal,
        }
    })



@diet_bp.route("/excluded", methods=["GET"])
@jwt_required()
def get_diet_excluded():
    user_id = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT items, updated_at FROM diet_exclusions WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return jsonify({
        "items": (row["items"] if row else "") or "",
        "updatedAt": (row["updated_at"] if row else None),
    })

@diet_bp.route("/excluded", methods=["PUT"])
@jwt_required()
def upsert_diet_excluded():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    items = (data.get("items") or "").strip()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO diet_exclusions (user_id, items, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            items=excluded.items,
            updated_at=excluded.updated_at
        """,
        (user_id, items, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "제외 식재료가 저장되었습니다.", "items": items})


# =========================
# 식단 로그
# GET  /api/diet/logs/<user_id>?date=YYYY-MM-DD
# POST /api/diet/logs/<user_id>  {date, mealType, foodName, calories, photoName?}
# DELETE /api/diet/logs/<user_id>/<log_id>
# 26.01.05 -> created_at INSERT 수정
# =========================

# 26.01.05 추가 - now = datetime.now().strftime("%Y-%m-%d %H:%M:%S") 

@diet_bp.route("/logs", methods=["GET"])
@jwt_required()
def list_diet_logs():
    """
    - date=YYYY-MM-DD 로 특정 날짜 조회
    - from=YYYY-MM-DD&to=YYYY-MM-DD 로 기간 조회(주간/월간 뷰용)
    """
    user_id = get_jwt_identity()
    date = request.args.get("date")
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    conn = get_connection()
    cur = conn.cursor()

    if date:
        cur.execute(
            """
            SELECT id, date, meal_type, food_name, calories, photo_name, created_at, source
            FROM diets
            WHERE user_id=? AND date=? AND (food_name IS NOT NULL OR meal_type IS NOT NULL)
            ORDER BY id DESC
            """,
            (user_id, date),
        )
    elif date_from and date_to:
        cur.execute(
            """
            SELECT id, date, meal_type, food_name, calories, photo_name, created_at, source
            FROM diets
            WHERE user_id=? AND date BETWEEN ? AND ? AND (food_name IS NOT NULL OR meal_type IS NOT NULL)
            ORDER BY date DESC, id DESC
            """,
            (user_id, date_from, date_to),
        )
    else:
        conn.close()
        return jsonify({"message": "date 또는 (from, to)가 필요합니다."}), 400

    rows = cur.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "date": r["date"],
            "mealType": r["meal_type"] or "",
            "foodName": r["food_name"] or (r["content"] or ""),
            "calories": r["calories"] or 0,
            "photoName": r["photo_name"] or "",
            "createdAt": r["created_at"],
            "source": r["source"] or "user",
        }
        for r in rows
    ]
    return jsonify({"items": items})

@diet_bp.route("/logs", methods=["POST"])
@jwt_required()
def add_diet_log():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get("date")
    meal_type = data.get("mealType") or data.get("meal_type")
    food_name = (data.get("foodName") or data.get("food_name") or "").strip()
    calories = int(data.get("calories") or 0)
    photo_name = (data.get("photoName") or data.get("photo_name") or "").strip()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400
    if not food_name:
        return jsonify({"message": "foodName이 필요합니다."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO diets (user_id, date, content, calories, created_at, meal_type, food_name, photo_name, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
        """,
        (user_id, date, food_name, calories, now, meal_type, food_name, photo_name),
    )
    conn.commit()
    conn.close()

    # 요약 갱신
    try:
        compute_and_save_daily_calorie_summary(user_id, date)
    except Exception:
        pass

    return jsonify({"message": "식단 로그가 저장되었습니다."})


@diet_bp.route("/logs/<int:log_id>", methods=["DELETE"])
@jwt_required()
def delete_diet_log(log_id):
    user_id = get_jwt_identity()
    # date를 얻어서 요약 갱신
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT date FROM diets WHERE id=? AND user_id=?", (log_id, user_id))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"message": "대상을 찾을 수 없습니다."}), 404
    date = row["date"]

    cur.execute("DELETE FROM diets WHERE id=? AND user_id=?", (log_id, user_id))
    conn.commit()
    conn.close()

    try:
        compute_and_save_daily_calorie_summary(user_id, date)
    except Exception:
        pass

    return jsonify({"message": "삭제되었습니다."})

# 오늘의 식단 조회 - 2025.12.31 추가 라우트
@diet_bp.route("/today", methods=["GET"])
@jwt_required()
def get_today_meal():
    user_id = get_jwt_identity()
    today = request.args.get("date") or date.today().isoformat()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM today_meals WHERE user_id=? AND date=?",
        (user_id, today),
    )
    meal = cur.fetchone()

    if not meal:
        cur.execute(
            """
            INSERT INTO today_meals (user_id, date, created_at)
            VALUES (?, ?)
            """,
            (user_id, today, now),
        )
        conn.commit()

        cur.execute(
            "SELECT * FROM today_meals WHERE user_id=? AND date=?",
            (user_id, today),
        )
        meal = cur.fetchone()

    cur.execute(
        """
        SELECT * FROM today_meal_items
        WHERE today_meal_id=?
        """,
        (meal["id"],),
    )
    items = cur.fetchall()

    conn.close()

    return jsonify({
        "meal": dict(meal),
        "items": [dict(i) for i in items],
    })

# 오늘의 식단에 음식 추가
@diet_bp.route("/today/items", methods=["POST"])
@jwt_required()
def add_today_meal_item():
    user_id = get_jwt_identity()
    data = request.json
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
    "SELECT id FROM today_meals WHERE user_id=? AND date=?",
    (user_id, data["date"]),
    )
    meal = cur.fetchone()

    if not meal:
        cur.execute(
            "INSERT INTO today_meals (user_id, date) VALUES (?, ?)",
            (user_id, data["date"]),
        )
        today_meal_id = cur.lastrowid
    else:
        today_meal_id = meal["id"]

    cur.execute(
        """
        INSERT INTO today_meal_items
        (today_meal_id, meal_type, food_name, calories, protein, source, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            meal["id"],
            data["meal_type"],
            data["food_name"],
            data.get("calories", 0),
            data.get("protein", 0),
            data.get("source", "manual"),
            data["date"],
            now,
        ),
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "added"})

# 오늘의 식단 아이템 조회
@diet_bp.route("/today/items", methods=["GET"])
@jwt_required()
def get_today_meal_items():
    user_id = get_jwt_identity()
    today = request.args.get("date") or date.today().isoformat()

    conn = get_connection()
    cur = conn.cursor()

    # 오늘의 today_meals 가져오기
    cur.execute(
        "SELECT id FROM today_meals WHERE user_id=? AND date=?",
        (user_id, today),
    )
    meal = cur.fetchone()

    if not meal:
        # 오늘 식단이 없으면 자동 생성
        cur.execute(
            "INSERT INTO today_meals (user_id, date) VALUES (?, ?)",
            (user_id, today),
        )
        conn.commit()
        cur.execute(
            "SELECT id FROM today_meals WHERE user_id=? AND date=?",
            (user_id, today),
        )
        meal = cur.fetchone()

    # 오늘 식단 아이템 가져오기
    cur.execute(
        "SELECT * FROM today_meal_items WHERE today_meal_id=?",
        (meal["id"],),
    )
    items = cur.fetchall()
    conn.close()

    return jsonify({
        "meals": [dict(i) for i in items]
    })

# 오늘의 식단 음식 삭제 - 26.01.15 추가
@diet_bp.route("/today/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_today_meal_item(item_id):
    user_id = get_jwt_identity()

    conn = get_connection()
    cur = conn.cursor()

    # 본인 데이터인지 검증
    cur.execute("""
        SELECT tmi.id
        FROM today_meal_items tmi
        JOIN today_meals tm ON tmi.today_meal_id = tm.id
        WHERE tmi.id = ? AND tm.user_id = ?
    """, (item_id, user_id))

    item = cur.fetchone()

    if not item:
        conn.close()
        return jsonify({"error": "item not found"}), 404

    cur.execute(
        "DELETE FROM today_meal_items WHERE id = ?",
        (item_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "deleted"})

# AI 추천 생성
@diet_bp.route("/ai/recommend", methods=["POST"])
@jwt_required()
def create_ai_recommendation():
    user_id = get_jwt_identity()

    # 여기서:
    # - user 정보 조회
    # - AI 호출
    # - ai_recommended_meals + items 저장

    return jsonify({"message": "ai recommendation created"})

# AI 추천 - 오늘의 식단 적용
@diet_bp.route("/ai/apply", methods=["POST"])
@jwt_required()
def apply_ai_meal():
    user_id = get_jwt_identity()
    data = request.json  # ai_meal_id, date, mode
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cur = conn.cursor()

    # 오늘 식단 가져오기
    cur.execute(
        "SELECT id FROM today_meals WHERE user_id=? AND date=?",
        (user_id, data["date"]),
    )
    today_meal = cur.fetchone()

    if not today_meal:
        return jsonify({"error": "today_meal not found"}), 404

    # 기존 삭제 (덮어쓰기 모드)
    if data.get("mode") == "overwrite":
        cur.execute(
            "DELETE FROM today_meal_items WHERE today_meal_id=?",
            (today_meal["id"],),
        )

    # AI 아이템 복사
    cur.execute(
        """
        INSERT INTO today_meal_items
        (today_meal_id, meal_type, food_name, calories, protein, source, date, created_at)
        SELECT ?, meal_type, food_name, calories, protein, 'ai', ?, ?
        FROM ai_recommended_meal_items
        WHERE ai_meal_id=?
        """,
        (today_meal["id"], data["date"], now, data["ai_meal_id"],),
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "applied"})

# 식단 메모
@diet_bp.route("/today/memo", methods=["PUT"])
@jwt_required()
def update_today_meal_memo():
    user_id = get_jwt_identity()
    memo = request.json.get("memo", "")
    today = date.today().isoformat()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE today_meals
        SET memo = ?, updated_at = ?
        WHERE user_id = ? AND date = ?
        """,
        (memo, now, user_id, today),
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "saved"})

# 오늘 총 칼로리 / 단백질 - 26.01.05 추가 -> 메인페이지의 오늘의 요약에서 사용
@diet_bp.route("/today/summary", methods=["GET"])
@jwt_required()
def today_summary():
    user_id = get_jwt_identity()
    date = request.args.get("date")  # YYYY-MM-DD

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            COALESCE(SUM(tmi.calories), 0) AS total_calories,
            COALESCE(SUM(tmi.protein), 0) AS total_protein
        FROM today_meals tm
        LEFT JOIN today_meal_items tmi
            ON tm.id = tmi.today_meal_id
        WHERE tm.user_id = ? AND tm.date = ?
    """, (user_id, date))

    summary = cur.fetchone()
    conn.close()

    return jsonify(dict(summary))


# 날짜별 식단 아이템 조회 (READ ONLY) - 26.01.07 추가 / 식단탭페이지의 사용자 식단 기록 불러오기 위한 라우트
@diet_bp.route("/items", methods=["GET"])
@jwt_required()
def get_meal_items_by_date():
    user_id = get_jwt_identity()
    target_date = request.args.get("date")

    if not target_date:
        return jsonify({"error": "date query param required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    # 해당 날짜의 today_meals 찾기
    cur.execute(
        "SELECT id FROM today_meals WHERE user_id=? AND date=?",
        (user_id, target_date),
    )
    meal = cur.fetchone()

    if not meal:
        conn.close()
        return jsonify({
            "date": target_date,
            "items": []
        })

    # 해당 날짜의 식단 아이템 조회
    cur.execute(
        """
        SELECT
            id,
            meal_type,
            food_name,
            calories,
            protein
        FROM today_meal_items
        WHERE today_meal_id=?
        ORDER BY meal_type
        """,
        (meal["id"],),
    )
    items = cur.fetchall()
    conn.close()

    return jsonify({
        "date": target_date,
        "items": [dict(i) for i in items]
    })