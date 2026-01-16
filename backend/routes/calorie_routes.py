from flask import Blueprint, request, jsonify
from services.calorie_service import compute_and_save_daily_calorie_summary
from models.calorie_model import get_daily_summary
from flask_jwt_extended import jwt_required, get_jwt_identity

calorie_bp = Blueprint("calorie", __name__)

# GET /api/summary/calories/<user_id>?date=YYYY-MM-DD&recalc=1
@calorie_bp.route("/calories", methods=["GET"])
@jwt_required()
def calories():
    user_id = get_jwt_identity()
    date = request.args.get("date")
    recalc = request.args.get("recalc")
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400

    if recalc in ("1", "true", "True", "yes"):
        row = compute_and_save_daily_calorie_summary(user_id, date)
    else:
        row = get_daily_summary(user_id, date)

    if not row:
        return jsonify({"date": date, "summary": None})

    return jsonify({
        "date": date,
        "summary": {
            "bmr": row["bmr"],
            "tdee": row["tdee"],
            "intake": row["intake"],
            "exercise": row["exercise"],
            "deficit": row["deficit"],
            "est_weight_change_kg": row["est_weight_change_kg"],
            "updated_at": row["updated_at"],
        }
    })
