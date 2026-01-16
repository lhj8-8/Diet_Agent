import os
import sqlite3
import csv
from datetime import datetime
from werkzeug.security import generate_password_hash
import random

DB_PATH = os.path.join(os.path.dirname(__file__), "agent.db")


def get_connection():
    """
    SQLite 연결 (RowFactory: dict-like)
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_columns(cur: sqlite3.Cursor, table: str, columns: dict):
    """
    columns = { "컬럼명": "컬럼 타입" }
    컬럼이 없으면 자동 ALTER TABLE ADD COLUMN
    """
    cur.execute(f"PRAGMA table_info({table})")
    existing_cols = [row["name"] for row in cur.fetchall()]
    for col_name, col_type in columns.items():
        if col_name not in existing_cols:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
            print(f"[DB] {table}.{col_name} 컬럼 자동 추가")


def apply_schema_extra(cur: sqlite3.Cursor):
    path = os.path.join(os.path.dirname(__file__), "schema_extra.sql")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        cur.executescript(f.read())
    print("[DB] schema_extra.sql 적용 완료")


def _seed_foods_workouts(cur: sqlite3.Cursor):
    """
    foods / workouts 추천용 데이터 seed (CSV 기반)
    - food.csv : 음식 기본 정보 (id, name, calories, protein, carbs, fat, allergy)
    - food_meal_type.csv : meal_type 정보 (food_id, meal_type)
    """
    import os, csv

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

    # -----------------------------
    # 1️⃣ foods 테이블 초기화
    # -----------------------------
    cur.execute("DELETE FROM foods")

    food_csv_path = os.path.join(base_dir, "food.csv")
    inserted = 0

    try:
        with open(food_csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row or not row.get("name"):
                    continue
                cur.execute(
                    "INSERT INTO foods VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        int(row.get("id") or 0) or None,
                        row["name"],
                        "default_meal",  # meal_type 기본값, 나중에 CSV로 업데이트
                        int(row.get("calories") or 0),
                        int(row.get("protein") or 0),
                        int(row.get("carbs") or 0),
                        int(row.get("fat") or 0),
                        row.get("allergy") or None,
                    ),
                )
                inserted += 1
        print(f"[DB] foods 재생성 완료 ({inserted} rows from food.csv)")

    except Exception as e:
        print("[DB] foods seed 실패(파일 읽기):", e)
        # CSV 없거나 깨졌을 때 기본값으로 채우기
        defaults = [
            # id, name, meal_type, calories, protein, carbs, fat, allergy
            (1,  "오트밀+바나나",            "breakfast", 380, 18, 60, 8,  None),
            (2,  "그릭요거트+베리",          "breakfast", 320, 20, 30, 10, "우유"),
            (3,  "계란토스트",               "breakfast", 420, 22, 40, 14, "밀"),
            (4,  "두부샐러드",               "breakfast", 300, 20, 18, 12, None),
            (5,  "현미 닭가슴살 도시락",     "lunch",     520, 40, 55, 12, None),
            (6,  "연어 샐러드",              "lunch",     480, 32, 20, 26, "생선"),
            (7,  "불고기 쌈",                "lunch",     600, 35, 55, 20, None),
            (8,  "닭가슴살 비빔밥",          "lunch",     560, 38, 70, 10, None),
            (9,  "콩나물국+두부+김",          "lunch",     450, 25, 45, 12, None),
            (10, "닭가슴살 샐러드",          "dinner",    450, 35, 18, 20, None),
        ]
        for row in defaults:
            cur.execute("INSERT OR IGNORE INTO foods VALUES (?, ?, ?, ?, ?, ?, ?, ?)", row)
        print("[DB] foods 기본값 seed 완료")

    # -----------------------------
    # 2️⃣ food_meal_type.csv 적용
    # -----------------------------
    food_meal_csv_path = os.path.join(base_dir, "food_meal_type.csv")
    try:
        with open(food_meal_csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                food_id = int(row.get("food_id") or 0)
                meal_type = row.get("meal_type")
                if not meal_type:
                    continue
                cur.execute(
                    "UPDATE foods SET meal_type=? WHERE id=?",
                    (meal_type, food_id)
                )
        print("[DB] foods meal_type 업데이트 완료 (food_meal_type.csv)")
    except Exception as e:
        print("[DB] food_meal_type seed 실패(파일 읽기):", e)

    # -----------------------------
    # 3️⃣ workouts 테이블 처리
    # -----------------------------
    cur.execute("SELECT COUNT(*) AS c FROM workouts")
    if (cur.fetchone()["c"] or 0) == 0:
        workout_csv_path = os.path.join(base_dir, "workout.csv")
        try:
            with open(workout_csv_path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cur.execute(
                        "INSERT OR IGNORE INTO workouts VALUES (?, ?, ?, ?, ?, ?)",
                        (
                            int(row.get("id") or 0),
                            row.get("name"),
                            row.get("type") or row.get("workout_type") or "general",
                            int(row.get("duration") or 0),
                            int(row.get("calories") or 0),
                            row.get("intensity") or "medium",
                        )
                    )
            print("[DB] workouts seed 완료 (CSV)")
        except Exception:
            # CSV 없으면 기본값
            defaults = [
                (1, "걷기", "cardio", 30, 120, "low"),
                (2, "가벼운 스트레칭", "mobility", 15, 40, "low"),
                (3, "런닝", "cardio", 30, 250, "medium"),
                (4, "전신 근력(맨몸)", "strength", 30, 200, "medium"),
                (5, "HIIT", "cardio", 20, 300, "high"),
            ]
            for row in defaults:
                cur.execute("INSERT OR IGNORE INTO workouts VALUES (?, ?, ?, ?, ?, ?)", row)
            print("[DB] workouts 기본값 seed 완료")


# AI 추천 식단 3끼 조합 함수
# 기존 DB_PATH 사용
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")  # food.csv / food_meal_type.csv 위치

def _seed_diet_recommendations(cur):
    """
    diet_recommendations 테이블 초기화 + food.csv + food_meal_type.csv 기반 하루 3끼 랜덤 추천
    """
    # 1️⃣ 테이블 초기화
    cur.execute("DELETE FROM diet_recommendations")
    print("[DB] diet_recommendations 초기화 완료")

    # 2️⃣ food.csv 읽기
    food_path = os.path.join(DATA_DIR, "food.csv")
    foods = {}
    try:
        with open(food_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                foods[int(row["id"])] = {
                    "id": int(row["id"]),
                    "name": row["name"],
                    "calories": int(row.get("calories") or 0),
                    "protein": int(row.get("protein") or 0),
                    "carbs": int(row.get("carbs") or 0),
                    "fat": int(row.get("fat") or 0),
                    "allergy": row.get("allergy") or None,
                    "meal_types": [],
                }
    except Exception as e:
        print("[DB] food.csv 읽기 실패:", e)
        return

    # 3️⃣ food_meal_type.csv 읽기
    meal_path = os.path.join(DATA_DIR, "food_meal_type.csv")
    try:
        with open(meal_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                fid = int(row["food_id"])
                meal_type = row["meal_type"]
                if fid in foods:
                    foods[fid]["meal_types"].append(meal_type)
    except Exception as e:
        print("[DB] food_meal_type.csv 읽기 실패:", e)
        return

    # 4️⃣ meal_type별 후보군 만들기
    meal_candidates = {"breakfast": [], "lunch": [], "dinner": []}
    for f in foods.values():
        for mt in f["meal_types"]:
            if mt in meal_candidates:
                meal_candidates[mt].append(f)

    # 5️⃣ 하루 3끼 랜덤 조합
    user_id = 1  # 초기 seed용
    date = datetime.utcnow().date().isoformat()
    rng = random.Random(f"{date}-{user_id}")

    for meal_type in ["breakfast", "lunch", "dinner"]:
        candidates = meal_candidates.get(meal_type, [])
        if not candidates:
            continue
        food = rng.choice(candidates)
        cur.execute(
            """
            INSERT INTO diet_recommendations
            (user_id, date, meal_type, menu, calories, protein, created_at, confirmed)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """,
            (
                user_id,
                date,
                meal_type,
                food["name"],
                food["calories"],
                food["protein"],
                datetime.utcnow().isoformat(),
            ),
        )
    print("[DB] diet_recommendations seed 완료 (하루 3끼 랜덤)")


# diet_recommendations 테이블(AI 추천 식단 테이블) 삭제 생성 함수
def _reset_diet_recommendations(cur):
    cur.execute("DROP TABLE IF EXISTS diet_recommendations;")
    print("[DB] diet_recommendations 삭제 완료")

    cur.execute("""
        CREATE TABLE diet_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            meal_type TEXT,
            menu TEXT,
            calories INTEGER,
            protein INTEGER,
            created_at TEXT,
            confirmed INTEGER DEFAULT 0
        );
    """)
    print("[DB] diet_recommendations 생성 완료")


def init_db():
    """
    DB 초기화 + 마이그레이션(컬럼 자동 추가) + seed
    """
    conn = get_connection()
    cur: sqlite3.Cursor = conn.cursor()

    # users
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            height REAL,
            weight REAL,
            goal TEXT,
            age INTEGER,
            sex TEXT,
            activity_level TEXT,
            muscle_mass REAL,
            body_fat REAL,
            created_at TEXT,
            role TEXT DEFAULT 'user'
        )
        """
    )

    # memos
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            content TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # food preferences
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS food_preferences (
            user_id INTEGER PRIMARY KEY,
            likes TEXT,
            dislikes TEXT,
            allergies TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    
    # diet goals (DB 영속화) - 사용자 직접 지정 목표( + 섭취칼로리, 섭취단백질, 소모칼로리)
    cur.execute(
    """
    CREATE TABLE IF NOT EXISTS diet_goals (
        user_id INTEGER PRIMARY KEY,
        type TEXT,
        start_weight REAL,
        target_weight REAL,
        start_date TEXT,
        end_date TEXT,

        target_calories INTEGER,   -- 목표 섭취 칼로리
        target_protein INTEGER,    -- 목표 단백질
        target_activity_kcal INTEGER, -- 목표 소모 칼로리(활동량)

        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
    )

    # diet excluded ingredients (DB 영속화)
    cur.execute(
    """
    CREATE TABLE IF NOT EXISTS diet_exclusions (
        user_id INTEGER PRIMARY KEY,
        items TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
    )

    # foods / workouts master
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY,
            name TEXT,
            meal_type TEXT,
            calories INTEGER,
            protein INTEGER,
            carbs INTEGER,
            fat INTEGER,
            allergy TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY,
            name TEXT,
            type TEXT,
            duration INTEGER,
            calories INTEGER,
            intensity TEXT
        )
        """
    )

    # diets (식단 "메모" + "로그" 공용)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS diets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            content TEXT,
            calories INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # schedules
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            title TEXT NOT NULL,
            memo TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # recommendations (confirmed: 0=미확정, 1=기록 반영됨)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS diet_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            meal_type TEXT,
            menu TEXT,
            calories INTEGER,
            protein INTEGER,
            created_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS workout_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            workout TEXT,
            duration INTEGER,
            calories INTEGER,
            created_at TEXT
        )
        """
    )

    # 다이어트관리페이지 - 식단 탭 테이블 추가(2025.12.31) 총 6개
    # 오늘 하루 식단 - 계획
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS today_meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,                -- YYYY-MM-DD
        memo TEXT,                         -- 하루 식단 메모
        total_calories INTEGER DEFAULT 0,
        total_protein INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',      -- manual | ai
        created_at TEXT,
        updated_at TEXT,

        UNIQUE(user_id, date),
        FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    # 오늘 먹은 음식들 - 계획된 음식 목록
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS today_meal_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        today_meal_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,                -- YYYY-MM-DD / 비즈니스 기준 날짜 : 데이터 하루 단위로 조회
        meal_type TEXT,                    -- breakfast / lunch / dinner / snack
        food_name TEXT NOT NULL,
        calories INTEGER DEFAULT 0,
        protein INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',      -- manual | ai
        created_at TEXT,

        FOREIGN KEY(today_meal_id) REFERENCES today_meals(id)
        );
        """
    )
    # 실제 먹은 음식
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS diet_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        total_calories INTEGER DEFAULT 0,
        total_protein INTEGER DEFAULT 0,
        created_at TEXT,
        UNIQUE(user_id, date)
    );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS diet_log_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        diet_log_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        food_id INTEGER,            -- foods.id (있으면)
        food_name TEXT NOT NULL,    -- 직접 입력 음식 대비
        meal_type TEXT,
        calories INTEGER,
        protein INTEGER,
        carbs INTEGER,
        fat INTEGER,
        source TEXT DEFAULT 'manual', -- manual | plan | ai
        created_at TEXT
    );
        """
    )

    # AI 추천 식단 전용
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_recommended_meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        height REAL,
        weight REAL,
        goal TEXT,
        activity_level TEXT,
        total_calories INTEGER,
        total_protein INTEGER,
        created_at TEXT,

        FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_recommended_meal_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ai_meal_id INTEGER NOT NULL,
        meal_type TEXT,
        food_name TEXT,
        calories INTEGER,
        protein INTEGER,

        FOREIGN KEY(ai_meal_id) REFERENCES ai_recommended_meals(id)
        );
        """
    )

    # activities (운동 기록)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            workout TEXT,
            duration INTEGER,
            calories INTEGER,
            completed_at TEXT
        )
        """
    )

    # weight 기록
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        recorded_at TEXT NOT NULL,     -- YYYY-MM-DD
        created_at TEXT NOT NULL,

        UNIQUE(user_id, recorded_at),
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
        """
    )

    # chatbot logs
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS chatbot_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT,
            message TEXT,
            created_at TEXT
        )
        """
    )

    # 하루 섭취 목표(권장량) 
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_nutrition_goal (
            user_id INTEGER PRIMARY KEY,
            calories INTEGER,
            protein INTEGER,
            activity_kcal INTEGER,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES user_profile(id)
        );
        """
    )

    # calorie summaries
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS calorie_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            bmr REAL DEFAULT 0,
            tdee REAL DEFAULT 0,
            intake REAL DEFAULT 0,
            exercise REAL DEFAULT 0,
            deficit REAL DEFAULT 0,
            est_weight_change_kg REAL DEFAULT 0,
            updated_at TEXT,
            UNIQUE(user_id, date)
        )
        """
    )

    # workout plan / day checks (localStorage 제거용)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS workout_plans (
            user_id INTEGER PRIMARY KEY,
            days TEXT,
            time TEXT,
            difficulty TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS workout_day_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            done INTEGER DEFAULT 0,
            updated_at TEXT,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # settings
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            notifications_enabled INTEGER DEFAULT 1,
            theme TEXT DEFAULT 'light',
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # --- migrations (columns) ---
    ensure_columns(
        cur,
        "users",
        {
            "name": "TEXT",
            "height": "REAL",
            "weight": "REAL",
            "goal": "TEXT",
            "created_at": "TEXT",
            "age": "INTEGER",
            "sex": "TEXT",
            "activity_level": "TEXT",
        },
    )

    ensure_columns(
        cur,
        "diets",
        {
            "content": "TEXT",
            "calories": "INTEGER DEFAULT 0",
            "created_at": "TEXT",
            "meal_type": "TEXT",
            "food_name": "TEXT",
            "photo_name": "TEXT",
            "source": "TEXT",  # manual/recommendation
        },
    )

    ensure_columns(
        cur,
        "activities",
        {
            "duration": "INTEGER",
            "calories": "INTEGER",
            "completed_at": "TEXT",
            "date": "TEXT",  # 별도 날짜 저장 (optional)
            "intensity": "TEXT",
            "source": "TEXT",
        },
    )

    ensure_columns(
        cur,
        "schedules",
        {
            "start_time": "TEXT",
            "end_time": "TEXT",
            "memo": "TEXT",
            "created_at": "TEXT",
            "kind": "TEXT",  # 일반/식사/운동
            "repeat_rule": "TEXT",  # none/daily/weekly/weekday
        },
    )

    ensure_columns(
        cur,
        "diet_recommendations",
        {
            "confirmed": "INTEGER DEFAULT 0",
        },
    )
    ensure_columns(
        cur,
        "workout_recommendations",
        {
            "confirmed": "INTEGER DEFAULT 0",
        },
    )

    ensure_columns(
        cur,
        "food_preferences",
        {
            "likes": "TEXT",
            "dislikes": "TEXT",
            "allergies": "TEXT",
            "updated_at": "TEXT",
        },
    ), 
    # 관리자 계정이 있으면 role만 admin으로 변경
    cur.execute(
        """
        INSERT OR IGNORE INTO users (email, password_hash, role, created_at)
        VALUES (?, ?, 'admin', ?)
        """,
        (
            "admin@test.com",                  # 이메일
            generate_password_hash("admin1234"),  # 비밀번호 해시
            datetime.utcnow().isoformat(),     # 생성 시간
        ),
    )

    # seed foods/workouts if empty
    _reset_diet_recommendations(cur)   # 1️⃣ 구조 초기화(DROP+CREATE)
    _seed_diet_recommendations(cur)    # 2️⃣ 데이터 seed

    # extra schema (indexes/views/triggers)
    apply_schema_extra(cur)

    conn.commit()
    conn.close()
    print("[DB] 초기화 완료")
