from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from db.database import get_connection
from flask_jwt_extended import (jwt_required, get_jwt_identity, create_access_token, create_refresh_token)
from datetime import timedelta

user_bp = Blueprint('user', __name__)


# refresh 토큰 라우트
@user_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    # ⚠️ PyJWT / flask_jwt_extended 조합에서 sub(subject) 클레임은 문자열이어야
    # 422(Subject must be a string) 같은 오류가 나지 않습니다.
    # 따라서 identity는 항상 문자열로 발급/사용합니다.
    user_id = get_jwt_identity()  # str

    new_access_token = create_access_token(
        identity=str(user_id),
        expires_delta=timedelta(hours=1)
    )

    return jsonify({
        'accessToken': new_access_token
    }), 200

# 회원가입
@user_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'message': '이메일과 비밀번호를 입력해주세요.'}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cur.fetchone():
        conn.close()
        return jsonify({'message': '이미 가입된 이메일입니다.'}), 400

    # 로컬 프로젝트용 관리자 계정(간단)
    # 아래 이메일로 가입 시 role=admin으로 생성
    role = 'admin' if email.lower() in {'admin@dietagent.com', 'admin@admin.com'} else 'user'

    password_hash = generate_password_hash(password)
    cur.execute(
        "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        (email, password_hash, role, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    return jsonify({
        'message': '회원가입 성공! 로그인 해주세요.',
    }), 201


# 로그인
@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'message': '이메일과 비밀번호를 입력해주세요.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash, role FROM users WHERE email = ?",
        (email,)
    )
    row = cur.fetchone()
    conn.close()

    if not row or not check_password_hash(row['password_hash'], password):
        return jsonify({'message': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
    
    # jwt 발급 (identity = user_id) -> Access + Refresh
    user_id = row['id']
    role = row['role']
    access_token = create_access_token(
        identity=str(user_id),
        expires_delta=timedelta(hours=1),
        additional_claims={"role": role}
    )
    refresh_token = create_refresh_token(
        identity=str(user_id),
        additional_claims={"role": role}
    )

    return jsonify({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "role": role
    }), 200


# 내 정보 조회
@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_info():
    # identity는 문자열로 저장되어 있으므로 DB 조회 전 int로 변환
    try:
        user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({'message': '토큰 정보가 올바르지 않습니다.'}), 401

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, email, name, height, weight, age, sex, activity_level, muscle_mass, body_fat, goal FROM users WHERE id = ?",
        (user_id,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({'message': '사용자를 찾을 수 없습니다.'}), 404

    return jsonify({
        'id': row['id'],
        'email': row['email'],
        'name': row['name'] or '',
        'height': row['height'],
        'weight': row['weight'],
        'age' : row['age'],
        'sex' : row['sex'],
                'activity_level': row['activity_level'],
                'muscle_mass': row['muscle_mass'],
        'body_fat' : row['body_fat'],
        'goal': row['goal'] or ''
    })

# user_nutrition_goal 테이블 계산을 위한 계산 함수 - 26.01.09 수정
def calculate_nutrition_goal(user):
    user = dict(user)
    weight = user.get("weight")
    height = user.get("height")
    age = user.get("age")          # 없을 수 있음
    sex = user.get("sex", "male")
    activity_level = user.get("activity_level", "low")
    goal = user.get("goal", "maintain")

    if not weight or not height:
        raise ValueError("weight와 height는 필수입니다.")

    # -------------------------
    # BMR 계산
    # -------------------------
    # age 없을 경우 기본값 적용 (서비스 안정성용)
    if not age:
        age = 30

    if sex in ("male", "M", "남"):
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    # -------------------------
    # 활동 계수
    # -------------------------
    activity_factor = {
        "low": 1.2,
        "medium": 1.55,
        "high": 1.75
    }.get(activity_level, 1.2)

    tdee = bmr * activity_factor

    # -------------------------
    # 목표별 분기
    # -------------------------
    if goal in ("감량", "loss"):
        calories = int(tdee - 400)
        protein = int(weight * 2.0)
        activity_kcal = 500

    elif goal in ("증량", "gain"):
        calories = int(tdee + 300)
        protein = int(weight * 2.0)
        activity_kcal = 300

    else:  # 유지 / maintain
        calories = int(tdee)
        protein = int(weight * 1.6)
        activity_kcal = 400

    return calories, protein, activity_kcal


# 내 정보 수정 - diet_goals 반영 및 섭취 칼로리/단백질 계산 자동 업데이트
@user_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_my_info():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    conn = get_connection()
    cur = conn.cursor()

    # 1️⃣ users 업데이트
    cur.execute(
        """
        UPDATE users
        SET name=?, height=?, weight=?, age=?, sex=?, activity_level=?,
            assistant_name=?, muscle_mass=?, body_fat=?, goal=?
        WHERE id=?
        """,
        (
            data.get('name'),
            data.get('height'),
            data.get('weight'),
            data.get('age'),
            data.get('sex'),
            data.get('activity_level'),
            data.get('assistant_name'),
            data.get('muscle_mass'),
            data.get('body_fat'),
            data.get('goal'),  # 프론트에서 입력 없으면 None
            user_id
        )
    )

    # 2️⃣ 최신 user 정보 조회
    cur.execute("""
        SELECT height, weight, age, sex, activity_level, goal
        FROM users WHERE id=?
    """, (user_id,))
    row = cur.fetchone()

    if row:
        row = dict(row)  # sqlite Row → dict
        goal = row.get("goal")

        # 2-1️⃣ user.goal이 null이면 diet_goals.type에서 가져오기
        if not goal:
            cur.execute("""
                SELECT type FROM diet_goals
                WHERE user_id=?
                ORDER BY updated_at DESC
                LIMIT 1
            """, (user_id,))
            dg = cur.fetchone()
            if dg:
                goal = dg["type"]

        row["goal"] = goal  # calculate_nutrition_goal용으로 업데이트

        # 3️⃣ user_nutrition_goal 계산 및 UPSERT
        if row.get("weight"):
            calories, protein, activity_kcal = calculate_nutrition_goal(row)
            cur.execute(
                """
                INSERT INTO user_nutrition_goal
                (user_id, calories, protein, activity_kcal, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id)
                DO UPDATE SET
                    calories=excluded.calories,
                    protein=excluded.protein,
                    activity_kcal=excluded.activity_kcal,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (user_id, calories, protein, activity_kcal)
            )

    # 4️⃣ 체중 히스토리 (기존 코드 유지)
    if data.get("weight") is not None:
        today = datetime.now().strftime("%Y-%m-%d")
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            """
            INSERT INTO weights (user_id, weight, recorded_at, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, recorded_at)
            DO UPDATE SET weight=excluded.weight
            """,
            (user_id, data["weight"], today, now)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "내 정보 및 권장량이 저장되었습니다."})



# 사용자 영양 목표 조회
@user_bp.route('/nutrition_goal', methods=['GET'])
@jwt_required()
def get_nutrition_goal():
    user_id = int(get_jwt_identity())
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT calories, protein, activity_kcal FROM user_nutrition_goal WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({'message': '영양 목표가 설정되지 않았습니다.'}), 404
    return jsonify({
        'calories': row['calories'],
        'protein': row['protein'],
        'activity_kcal': row['activity_kcal']
    })




"""식단 메모(텍스트) API

⚠️ 기존 코드에서 URL 파라미터(user_id) 없이 함수 시그니처에 user_id를 받아
TypeError가 나는 버그가 있었습니다.

프론트는 JWT 기반(/api/user/me)으로 동작하므로, 식단 메모도 JWT 기반으로 제공하고
하위 호환을 위해 /diet/<user_id> POST도 남겨둡니다.
"""

# 식단 일지 조회 (JWT)
@user_bp.route('/diet', methods=['GET'])
@jwt_required()
def get_diet():
    user_id = get_jwt_identity()
    date = request.args.get('date')
    if not date:
        return jsonify({'message': '날짜가 필요합니다.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, date, content
        FROM diets
        WHERE user_id = ? AND date = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (user_id, date)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({'date': date, 'content': ''})

    return jsonify({
        'id': row['id'],
        'date': row['date'],
        'content': row['content'] or ''
    })


# 식단 일지 저장 (JWT)
@user_bp.route('/diet', methods=['POST'])
@jwt_required()
def save_diet():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get('date')
    content = data.get('content') or ''

    if not date:
        return jsonify({'message': '날짜가 필요합니다.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO diets (user_id, date, content, created_at) VALUES (?, ?, ?, ?)",
        (user_id, date, content, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    return jsonify({'message': '식단 기록이 저장되었습니다.'})


# 식단 일지 저장 (하위 호환: user_id를 받는 버전)
@user_bp.route('/diet/<int:user_id>', methods=['POST'])
def save_diet_by_user_id(user_id):
    data = request.get_json() or {}
    date = data.get('date')
    content = data.get('content') or ''

    if not date:
        return jsonify({'message': '날짜가 필요합니다.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO diets (user_id, date, content, created_at) VALUES (?, ?, ?, ?)",
        (user_id, date, content, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    return jsonify({'message': '식단 기록이 저장되었습니다.'})


# 설정 조회
@user_bp.route('/settings/<int:user_id>', methods=['GET'])
def get_settings(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT user_id, notifications_enabled, theme FROM settings WHERE user_id = ?",
        (user_id,)
    )
    row = cur.fetchone()

    # 없으면 기본값 생성
    if not row:
        cur.execute(
            "INSERT INTO settings (user_id, notifications_enabled, theme) VALUES (?, ?, ?)",
            (user_id, 1, 'light')
        )
        conn.commit()
        cur.execute(
            "SELECT user_id, notifications_enabled, theme FROM settings WHERE user_id = ?",
            (user_id,)
        )
        row = cur.fetchone()

    conn.close()

    return jsonify({
        'userId': row['user_id'],
        'notifications_enabled': bool(row['notifications_enabled']),
        'theme': row['theme']
    })


# 설정 저장
@user_bp.route('/settings/<int:user_id>', methods=['PUT'])
def update_settings(user_id):
    data = request.get_json() or {}
    notifications_enabled = data.get('notifications_enabled', True)
    theme = data.get('theme', 'light')

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO settings (user_id, notifications_enabled, theme)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            notifications_enabled = excluded.notifications_enabled,
            theme = excluded.theme
        """,
        (user_id, 1 if notifications_enabled else 0, theme)
    )
    conn.commit()
    conn.close()

    return jsonify({'message': '설정이 저장되었습니다.'})
