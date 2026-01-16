from flask import Blueprint, jsonify, request
from datetime import datetime
from calendar import monthrange # Import monthrange
from db.database import get_connection
from services.planning_service import regenerate_daily_plan
from services.calorie_service import compute_and_save_daily_calorie_summary
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin

schedule_bp = Blueprint('schedule', __name__)

# 일정 생성
@schedule_bp.route('/items', methods=['POST'])
@jwt_required()
def create_schedule():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    date = data.get('date')
    title = (data.get('title') or '').strip()
    memo = data.get('memo') or ''

    # 확장: 종류/시간/반복 (프론트 저장용)
    kind = (data.get("kind") or "일반").strip()
    time_str = (data.get("time") or data.get("start_time") or "").strip() or "09:00"
    end_date = data.get('end_date') or date # Add end_date, defaulting to date if not provided

    if not date or not title:
        print(f"[create_schedule] Validation failed: date={date}, title={title}") # Debug print
        return jsonify({'message': '날짜와 제목은 필수입니다.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    print(f"[create_schedule] Attempting to insert: user_id={user_id}, date={date}, end_date={end_date}, title={title}, memo={memo}, kind={kind}, time_str={time_str}") # Debug print
    cur.execute(
        """
        INSERT INTO schedules (user_id, date, end_date, title, memo, created_at, kind, start_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, date, end_date, title, memo, datetime.utcnow().isoformat(), kind, time_str)
    )
    conn.commit()

    new_item_id = cur.lastrowid
    print(f"[create_schedule] Inserted with lastrowid: {new_item_id}") # Debug print
    cur.execute(
        """
        SELECT id, date, end_date, title, memo, kind, start_time
        FROM schedules
        WHERE id = ?
        """,
        (new_item_id,)
    )
    new_item_row = cur.fetchone()
    conn.close()

    if not new_item_row:
        print(f"[create_schedule] Failed to fetch new item with ID: {new_item_id}") # Debug print
        return jsonify({'message': '일정 저장 후 조회 실패.'}), 500

    new_item = {
        'id': new_item_row['id'],
        'date': new_item_row['date'],
        'end_date': new_item_row['end_date'], # Include end_date in response
        'title': new_item_row['title'],
        'memo': new_item_row['memo'] or '',
        'kind': new_item_row['kind'] or '일반',
        'time': new_item_row['start_time'] or '09:00',
    }

    # 일정 입력 즉시 일정 기반 추천 자동 생성 (실패해도 일정 저장은 유지)
    try:
        # regenerate_daily_plan(user_id, date) # Temporarily commented out
        compute_and_save_daily_calorie_summary(user_id, date) # Uncommented
    except Exception as e:
        print('[SCHEDULE] auto plan error:', e)

    print(f"[create_schedule] Successfully created item: {new_item}") # Debug print
    return jsonify({
        'message': '일정이 저장되었습니다.',
        'item': new_item # Return the new item
    }), 201

# 일정 수정
@schedule_bp.route('/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_schedule(item_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    memo = data.get('memo') or ''
    kind = (data.get('kind') or '일반').strip()
    time_str = (data.get('time') or data.get('start_time') or "").strip() or "09:00"
    end_date = data.get('end_date') # Accept end_date for update

    if not title:
        return jsonify({'message': '제목은 필수입니다.'}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE schedules
        SET title = ?, memo = ?, kind = ?, start_time = ?, end_date = ?
        WHERE id = ? AND user_id = ?
        """,
        (title, memo, kind, time_str, end_date, item_id, user_id)
    )
    conn.commit()

    if cur.rowcount == 0:
        conn.close()
        return jsonify({'message': '일정을 찾을 수 없거나 권한이 없습니다.'}), 404

    cur.execute(
        """
        SELECT id, date, end_date, title, memo, kind, start_time
        FROM schedules
        WHERE id = ?
        """,
        (item_id,)
    )
    updated_item_row = cur.fetchone()
    conn.close()

    if not updated_item_row:
        return jsonify({'message': '수정된 일정을 조회할 수 없습니다.'}), 500

    updated_item = {
        'id': updated_item_row['id'],
        'date': updated_item_row['date'],
        'end_date': updated_item_row['end_date'], # Include end_date in response
        'title': updated_item_row['title'],
        'memo': updated_item_row['memo'] or '',
        'kind': updated_item_row['kind'] or '일반',
        'time': updated_item_row['start_time'] or '09:00',
    }

    try:
        # regenerate_daily_plan(user_id, updated_item['date']) # Temporarily commented out
        compute_and_save_daily_calorie_summary(user_id, updated_item['date']) # Uncommented
    except Exception as e:
        print('[SCHEDULE] auto plan error during update:', e)

    return jsonify({
        'message': '일정이 수정되었습니다.',
        'item': updated_item
    }), 200


# 일정 삭제
@schedule_bp.route('/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(item_id):
    user_id = get_jwt_identity()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT date FROM schedules WHERE id = ? AND user_id = ?
        """,
        (item_id, user_id)
    )
    schedule_row = cur.fetchone()
    if not schedule_row:
        conn.close()
        return jsonify({'message': '일정을 찾을 수 없거나 권한이 없습니다.'}), 404
    
    schedule_date = schedule_row['date']

    cur.execute(
        """
        DELETE FROM schedules
        WHERE id = ? AND user_id = ?
        """,
        (item_id, user_id)
    )
    conn.commit()
    conn.close()

    if cur.rowcount == 0:
        return jsonify({'message': '일정 삭제 실패.'}), 500
    
    try:
        # regenerate_daily_plan(user_id, schedule_date) # Temporarily commented out
        compute_and_save_daily_calorie_summary(user_id, schedule_date) # Uncommented
    except Exception as e:
        print('[SCHEDULE] auto plan error during delete:', e)

    return jsonify({'message': '일정이 삭제되었습니다.'}), 200

# 일정 목록 조회 (특정 날짜 기준)
@schedule_bp.route('/items', methods=['GET'])
@jwt_required()
@cross_origin(origin="http://localhost:5173", supports_credentials=True)
def list_schedule():
    user_id = get_jwt_identity()
    date = request.args.get('date')
    kind_filter = request.args.get('kind') # New: Optional kind filter

    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT id, date, end_date, title, memo, kind, start_time
        FROM schedules
        WHERE user_id = ?
    """
    params = [user_id]

    if date:
        query += " AND date <= ? AND end_date >= ?"
        params.extend([date, date])
    
    if kind_filter:
        query += " AND kind = ?"
        params.append(kind_filter)

    query += " ORDER BY date DESC, start_time ASC, id ASC"
    
    # If no date and no kind_filter, limit to last 10 (original behavior)
    if not date and not kind_filter:
        query += " LIMIT 10"


    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    conn.close()

    items = [
        {
            'id': row['id'],
            'date': row['date'],
            'end_date': row['end_date'],
            'title': row['title'],
            'memo': row['memo'] or '',
            'kind': row['kind'] or '일반',
            'time': row['start_time'] or '09:00',
        }
        for row in rows
    ]

    return jsonify({'items': items})


# 월간 조회 (캘린더 표시용)
# GET /api/schedule/month/<user_id>?month=YYYY-MM
@schedule_bp.route('/month', methods=['GET'])
@jwt_required()
def list_month():
    user_id = get_jwt_identity()
    month = request.args.get("month")
    if not month:
        return jsonify({"message": "month가 필요합니다. (YYYY-MM)"}), 400

    year, mon = map(int, month.split('-'))
    last_day = monthrange(year, mon)[1]
    month_start_date = f"{month}-01"
    month_end_date = f"{month}-{last_day:02d}"

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, date, end_date, title, memo, kind, start_time
        FROM schedules
        WHERE user_id=? AND date <= ? AND end_date >= ?
        ORDER BY date ASC, start_time ASC, id ASC
        """,
        (user_id, month_end_date, month_start_date)
    )
    rows = cur.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "date": r["date"],
            "end_date": r["end_date"],
            "title": r["title"],
            "memo": r["memo"] or "",
            "kind": r["kind"] or "일반",
            "time": r["start_time"] or "09:00",
        }
        for r in rows
    ]
    return jsonify({'items': items})

# 전체 스케줄 검색
@schedule_bp.route('/search', methods=['GET'])
@jwt_required()
def search_all_schedules():
    user_id = get_jwt_identity()
    query = request.args.get('query', '').strip()

    if not query:
        return jsonify({'items': []})

    conn = get_connection()
    cur = conn.cursor()
    
    # Use LIKE for substring search
    search_pattern = f'%{query}%'
    
    cur.execute(
        """
        SELECT id, date, end_date, title, memo, kind, start_time
        FROM schedules
        WHERE user_id = ? AND (title LIKE ? OR memo LIKE ?)
        ORDER BY date ASC, start_time ASC, id ASC
        """,
        (user_id, search_pattern, search_pattern)
    )
    rows = cur.fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "date": r["date"],
            "end_date": r["end_date"],
            "title": r["title"],
            "memo": r["memo"] or "",
            "kind": r["kind"] or "일반",
            "time": r["start_time"] or "09:00",
        }
        for r in rows
    ]
    return jsonify({'items': items})