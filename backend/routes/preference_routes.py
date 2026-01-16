from flask import Blueprint, request, jsonify
from models.food_model import save_food_preferences, get_food_preferences
from flask_jwt_extended import jwt_required, get_jwt_identity

pref_bp = Blueprint("preferences", __name__)

# GET /api/preferences/food/
@pref_bp.route("/food", methods=["GET"])
@jwt_required()
def get_food_pref():
    user_id = get_jwt_identity()
    row = get_food_preferences(user_id)
    if not row:
        return jsonify({"likes": "", "dislikes": "", "allergies": ""})
    return jsonify({
        "likes": row["likes"] or "",
        "dislikes": row["dislikes"] or "",
        "allergies": row["allergies"] or ""
    })

# PUT /api/preferences/food/
@pref_bp.route("/food", methods=["PUT"])
@jwt_required()
def put_food_pref():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    likes = data.get("likes") or ""
    dislikes = data.get("dislikes") or ""
    allergies = data.get("allergies") or ""
    save_food_preferences(user_id, likes, dislikes, allergies)
    return jsonify({"message": "음식 선호가 저장되었습니다."})
