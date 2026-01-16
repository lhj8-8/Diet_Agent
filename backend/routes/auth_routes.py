# 관리자 라우트

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from db.database import get_connection
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

def admin_required(fn):
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "관리자 권한이 필요합니다."}), 403
        return fn(*args, **kwargs)
    return wrapper


# 예: 문의 답변 등록
@admin_bp.route('/community/inquiries/<int:inquiry_id>/answer', methods=['POST'])
@admin_required
def answer_inquiry(inquiry_id):
    data = request.get_json() or {}
    answer = (data.get("answer") or "").strip()

    if not answer:
        return jsonify({"message": "답변 내용을 입력해주세요."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE inquiries
        SET answer = ?, status = '답변완료', answered_at = ?
        WHERE id = ?
        """,
        (answer, datetime.now().isoformat(timespec="seconds"), inquiry_id)
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "답변이 등록되었습니다."})



