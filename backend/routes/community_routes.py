from flask import Blueprint, jsonify, request
from datetime import datetime
from db.database import get_connection
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt


def _jwt_user_id_int():
    """JWT identity를 int로 안전 변환 (문자열 '1' -> 1)"""
    uid = get_jwt_identity()
    try:
        return int(uid)
    except Exception:
        return None


def _is_admin(user_id: int) -> bool:
    """JWT 클레임(role) 우선, 없으면 DB role 확인"""
    try:
        claims = get_jwt() or {}
        if claims.get("role") == "admin":
            return True
    except Exception:
        pass

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT role FROM users WHERE id = ?", (int(user_id),))
        row = cur.fetchone()
        conn.close()
        return bool(row and (row["role"] == "admin"))
    except Exception:
        return False


def admin_required(fn):
    from functools import wraps

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid = _jwt_user_id_int()
        if uid is None or not _is_admin(uid):
            return jsonify({"message": "관리자 권한이 필요합니다."}), 403
        return fn(*args, **kwargs)

    return wrapper


community_bp = Blueprint("community", __name__)


def init_community_tables():
    """커뮤니티(공지, 문의)용 테이블 생성"""
    conn = get_connection()
    cur = conn.cursor()

    # 공지사항 테이블
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            view_count INTEGER DEFAULT 0
        )
        """
    )

    # 문의 테이블
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT '답변대기',
            answer TEXT,
            created_at TEXT NOT NULL,
            answered_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.commit()
    conn.close()


# 모듈 로드 시 테이블 초기화
init_community_tables()


# --------------------------
# 공지사항 API
# --------------------------

@community_bp.route("/notices", methods=["GET"])
def get_notices():
    """공지사항 리스트 조회"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, created_at, view_count
        FROM notices
        ORDER BY datetime(created_at) DESC
        """
    )
    rows = cur.fetchall()
    conn.close()

    notices = [
        {
            "id": row["id"],
            "title": row["title"],
            "createdAt": row["created_at"],
            "viewCount": row["view_count"],
        }
        for row in rows
    ]
    return jsonify({"notices": notices})


@community_bp.route("/notices/<int:notice_id>", methods=["GET"])
def get_notice_detail(notice_id):
    """공지사항 상세 조회 + 조회수 증가"""
    conn = get_connection()
    cur = conn.cursor()

    # 조회수 +1
    cur.execute(
        "UPDATE notices SET view_count = view_count + 1 WHERE id = ?",
        (notice_id,),
    )
    conn.commit()

    cur.execute(
        """
        SELECT id, title, content, created_at, view_count
        FROM notices
        WHERE id = ?
        """,
        (notice_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"message": "해당 공지사항을 찾을 수 없습니다."}), 404

    notice = {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "createdAt": row["created_at"],
        "viewCount": row["view_count"],
    }
    return jsonify({"notice": notice})


@community_bp.route("/notices", methods=["POST"])
@admin_required
def create_notice():
    """관리자용 공지 등록"""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not title or not content:
        return jsonify({"message": "제목과 내용을 모두 입력해주세요."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO notices (title, content, created_at)
        VALUES (?, ?, ?)
        """,
        (title, content, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    notice_id = cur.lastrowid
    conn.close()

    return jsonify({"message": "공지사항이 등록되었습니다.", "id": notice_id}), 201


@community_bp.route("/notices/<int:notice_id>", methods=["DELETE"])
@admin_required
def delete_notice(notice_id):
    """관리자용 공지 삭제"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM notices WHERE id = ?", (notice_id,))
    conn.commit()
    deleted = cur.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({"message": "해당 공지사항을 찾을 수 없습니다."}), 404
    return jsonify({"message": "공지사항이 삭제되었습니다."})


@community_bp.route("/notices/<int:notice_id>", methods=["PUT"])
@admin_required
def update_notice(notice_id):
    """관리자용 공지 수정"""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    if not title or not content:
        return jsonify({"message": "제목과 내용을 모두 입력해주세요."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notices SET title = ?, content = ? WHERE id = ?",
        (title, content, notice_id),
    )
    conn.commit()
    updated = cur.rowcount
    conn.close()
    if updated == 0:
        return jsonify({"message": "해당 공지사항을 찾을 수 없습니다."}), 404
    return jsonify({"message": "공지사항이 수정되었습니다."})


# --------------------------
# 문의 API
# --------------------------

@community_bp.route("/inquiries", methods=["POST"])
@jwt_required()
def create_inquiry():
    """문의 작성"""
    user_id = _jwt_user_id_int()
    if user_id is None:
        return jsonify({"message": "인증 정보를 확인할 수 없습니다."}), 401

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not title or not content:
        return jsonify({"message": "제목과 내용을 모두 입력해주세요."}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO inquiries (user_id, title, content, status, created_at)
        VALUES (?, ?, ?, '답변대기', ?)
        """,
        (user_id, title, content, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    inquiry_id = cur.lastrowid
    conn.close()

    return jsonify({"message": "문의가 등록되었습니다.", "id": inquiry_id}), 201


@community_bp.route("/inquiries/my", methods=["GET"])
@jwt_required()
def get_my_inquiries():
    """내 문의 리스트 조회"""
    user_id = _jwt_user_id_int()
    if user_id is None:
        return jsonify({"message": "인증 정보를 확인할 수 없습니다."}), 401

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, status, created_at
        FROM inquiries
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()

    inquiries = [
        {
            "id": row["id"],
            "title": row["title"],
            "status": row["status"],
            "created_at": row["created_at"],  # React에서 q.created_at 사용
        }
        for row in rows
    ]

    return jsonify({"items": inquiries})


@community_bp.route("/inquiries/<int:inquiry_id>", methods=["GET"])
@jwt_required()
def get_inquiry_detail(inquiry_id):
    """문의 상세 조회 (내가 작성한 내용 + 관리자 답변)"""
    user_id = _jwt_user_id_int()
    if user_id is None:
        return jsonify({"message": "인증 정보를 확인할 수 없습니다."}), 401

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, user_id, title, content, status, answer, created_at, answered_at
        FROM inquiries
        WHERE id = ?
        """,
        (inquiry_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"message": "해당 문의를 찾을 수 없습니다."}), 404

    # 본인 작성 문의만 조회 가능 (타입 불일치 방지)
    try:
        owner_id = int(row["user_id"]) if row["user_id"] is not None else None
    except Exception:
        owner_id = None

    if owner_id != user_id:
        return jsonify({"message": "권한이 없습니다."}), 403

    inquiry = {
        "id": row["id"],
        "userId": row["user_id"],
        "title": row["title"],
        "content": row["content"],
        "status": row["status"],
        "answer": row["answer"],
        "createdAt": row["created_at"],
        "answeredAt": row["answered_at"],
    }
    return jsonify({"inquiry": inquiry})


# --------------------------
# 관리자 전용: 문의 관리 API
# --------------------------

@community_bp.route("/admin/inquiries", methods=["GET"])
@admin_required
def admin_list_inquiries():
    """관리자: 전체 문의 리스트"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT i.id, i.user_id, u.email as user_email, i.title, i.status, i.created_at, i.answered_at
        FROM inquiries i
        LEFT JOIN users u ON u.id = i.user_id
        ORDER BY datetime(i.created_at) DESC
        """
    )
    rows = cur.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "user_email": r["user_email"],
            "title": r["title"],
            "status": r["status"],
            "created_at": r["created_at"],
            "answered_at": r["answered_at"],
        }
        for r in rows
    ]
    return jsonify({"items": items})


@community_bp.route("/admin/inquiries/<int:inquiry_id>", methods=["GET"])
@admin_required
def admin_get_inquiry_detail(inquiry_id):
    """관리자: 문의 상세"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT i.id, i.user_id, u.email as user_email, i.title, i.content, i.status, i.answer, i.created_at, i.answered_at
        FROM inquiries i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.id = ?
        """,
        (inquiry_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({"message": "해당 문의를 찾을 수 없습니다."}), 404

    return jsonify(
        {
            "inquiry": {
                "id": row["id"],
                "userId": row["user_id"],
                "userEmail": row["user_email"],
                "title": row["title"],
                "content": row["content"],
                "status": row["status"],
                "answer": row["answer"],
                "createdAt": row["created_at"],
                "answeredAt": row["answered_at"],
            }
        }
    )


@community_bp.route("/admin/inquiries/<int:inquiry_id>/answer", methods=["POST"])
@admin_required
def admin_answer_inquiry(inquiry_id):
    """관리자: 문의 답변"""
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
        (answer, datetime.now().isoformat(timespec="seconds"), inquiry_id),
    )
    conn.commit()
    updated = cur.rowcount
    conn.close()
    if updated == 0:
        return jsonify({"message": "해당 문의를 찾을 수 없습니다."}), 404
    return jsonify({"message": "답변이 등록되었습니다."})


@community_bp.route("/admin/inquiries/<int:inquiry_id>", methods=["DELETE"])
@admin_required
def admin_delete_inquiry(inquiry_id):
    """관리자: 문의 삭제"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM inquiries WHERE id = ?", (inquiry_id,))
    conn.commit()
    deleted = cur.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({"message": "해당 문의를 찾을 수 없습니다."}), 404
    return jsonify({"message": "문의가 삭제되었습니다."})
