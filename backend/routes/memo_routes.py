from flask import Blueprint, request, jsonify
from models.memo_model import upsert_memo, get_memo, list_memos, delete_memo
from flask_jwt_extended import jwt_required, get_jwt_identity

memo_bp = Blueprint("memo", __name__)

# GET /api/memo/<user_id>?date=YYYY-MM-DD
@memo_bp.route("/me", methods=["GET"])
@jwt_required()
def memo_get():
    user_id = get_jwt_identity()
    date = request.args.get("date")
    limit = request.args.get("limit", type=int)
    if date:
        row = get_memo(user_id, date)
        return jsonify({
            "date": date,
            "content": (row["content"] if row else "") or "",
            "updated_at": row["created_at"] if row else None
        })
    # date 없으면 최근 목록
    rows = list_memos(user_id, limit=limit or 30)
    items = [{"id": r["id"], "date": r["date"], "content": r["content"] or "", "updated_at": r["created_at"]} for r in rows]
    return jsonify({"items": items})

# POST /api/memo/<user_id>  {date, content}
@memo_bp.route("/me", methods=["POST"])
@jwt_required()
def memo_upsert():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get("date")
    content = data.get("content") or ""
    if not date:
        return jsonify({"message": "date가 필요합니다."}), 400
    upsert_memo(user_id, date, content)
    return jsonify({"message": "메모가 저장되었습니다."})

# DELETE /api/memo/<user_id>/<memo_id>
@memo_bp.route("/<int:memo_id>", methods=["DELETE"])
@jwt_required()
def memo_delete(memo_id):
    user_id = get_jwt_identity()
    cnt = delete_memo(user_id, memo_id)
    if cnt <= 0:
        return jsonify({"message": "삭제할 항목이 없습니다."}), 404
    return jsonify({"message": "삭제되었습니다."})
