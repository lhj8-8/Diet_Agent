from flask import Blueprint, request, jsonify
from db.database import get_connection
from models.chatbot_model import log_message, list_logs, clear_logs
from flask_jwt_extended import jwt_required, get_jwt_identity
from routes.ai_engine import generate_reply

chatbot_bp = Blueprint("chatbot", __name__)

# ===============================
# 챗봇 대화
# POST /api/ai/chat
# ===============================
@chatbot_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"reply": "메시지를 입력해주세요."}), 400

    # 1) 유저 메시지 저장
    try:
        log_message(int(user_id), "user", message)
    except Exception:
        # 저장 실패해도 챗봇 응답은 계속
        pass

    # 2) AI 응답 생성 (🔥 핵심 변경)
    try:
        reply = generate_reply(user_id, message)
    except Exception as e:
        reply = f"⚠️ AI 처리 중 오류가 발생했습니다.\n{str(e)}"

    # 3) 어시스턴트 메시지 저장
    try:
        log_message(user_id, "assistant", reply)
    except Exception:
        pass

    return jsonify({"reply": reply})

# ===============================
# 챗봇 로그 조회
# GET /api/ai/logs/<user_id>?limit=50&date=YYYY-MM-DD
# ===============================
@chatbot_bp.route("/logs", methods=["GET"])
@jwt_required()
def get_logs():
    user_id = get_jwt_identity()
    limit = request.args.get("limit", default=50, type=int)
    date = request.args.get("date")
    rows = list_logs(user_id, limit=limit, date=date)
    items = [
        {
            "id": r["id"],
            "role": r["role"],
            "message": r["message"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]
    return jsonify({"items": items})

# ===============================
# 챗봇 로그 전체 삭제
# DELETE /api/ai/logs/<user_id>
# ===============================
@chatbot_bp.route("/logs", methods=["DELETE"])
@jwt_required()
def delete_logs():
    user_id = get_jwt_identity()
    cnt = clear_logs(user_id)
    return jsonify({"message": "삭제되었습니다.", "deleted": cnt})

@chatbot_bp.route("/diet/save", methods=["POST"])
@jwt_required()
def save_diet():
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    date = data.get("date")
    meal_count = data.get("meal_count")
    diet_content = data.get("diet_content")
    calories = data.get("calories")
    protein = data.get("protein")

    if not all([date, meal_count, diet_content, calories, protein]):
        return jsonify({"ok": False, "error": "필수 데이터 누락"}), 400

    try:
        tool_save_nutrition_goal(user_id, calories, protein)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO diet(user_id, date, meal_count, content, calories, protein)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET
                meal_count=excluded.meal_count,
                content=excluded.content,
                calories=excluded.calories,
                protein=excluded.protein
            """,
            (user_id, date, meal_count, diet_content, calories, protein)
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": "식단 저장 완료"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500