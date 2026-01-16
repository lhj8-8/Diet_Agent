from flask import Blueprint, request, jsonify
from datetime import datetime
from db.database import get_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
import csv
import os

recommendation_bp = Blueprint("recommendation", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOD_CSV_PATH = os.path.join(BASE_DIR, "data", "food.csv")
FOOD_MEAL_TYPES_PATH = os.path.join(BASE_DIR, "data", "food_meal_type.csv")

def load_food_csv():
    # food 정보
    food_map = {}
    with open(FOOD_CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_map[int(row["id"])] = {
                "name": row["name"],
                "calories": int(row["calories"]),
                "protein": int(row["protein"]),
                "carbs": int(row["carbs"]),
                "fat": int(row["fat"]),
                "allergy": row.get("allergy"),
                "meal_types": []  # 나중에 채워줄 곳
            }

    # meal_type 정보
    with open(FOOD_MEAL_TYPES_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_id = int(row["food_id"])
            meal_type = row["meal_type"]
            if food_id in food_map:
                food_map[food_id]["meal_types"].append(meal_type)

    return food_map

FOOD_MAP = load_food_csv()

# 식단 추천
@recommendation_bp.route("/diet", methods=["POST"])
@jwt_required()
def recommend_diet():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get("date")
    meals = data.get("meals", [])

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()

    for meal in meals:
        menu_name = meal.get("menu")

        food = next((f for f in FOOD_MAP.values() if f["name"] == menu_name), None)
        calories = food["calories"] if food else meal.get("calories", 0)
        protein = food["protein"] if food else 0

        # meal["type"]이 food의 meal_types 안에 있는지 체크
        if food and meal.get("type") not in food["meal_types"]:
            continue  # meal_type에 맞지 않으면 skip

        cur.execute("""
            INSERT INTO diet_recommendations
            (user_id, date, meal_type, menu, calories, protein, created_at, confirmed)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            user_id,
            date,
            meal.get("type"),
            menu_name,
            calories,
            protein,
            now
        ))

    conn.commit()
    conn.close()

    print("DEBUG FOOD:", menu_name, food)
    return jsonify({"message": "식단 추천 저장 완료"})


# 운동 추천
@recommendation_bp.route("/workout", methods=["POST"])
@jwt_required()
def recommend_workout():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    user_id = data.get("userId")
    date = data.get("date")
    workouts = data.get("workouts", [])

    if not user_id or not date:
        return jsonify({"message": "userId와 date가 필요합니다."}), 400

    conn = get_connection()
    cur = conn.cursor()

    for w in workouts:
        cur.execute(
            """
            INSERT INTO workout_recommendations
            (user_id, date, workout, duration, calories, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                date,
                w.get("name"),
                w.get("duration"),
                w.get("calories", 0),
                datetime.utcnow().isoformat()
            )
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "운동 추천이 저장되었습니다."})
