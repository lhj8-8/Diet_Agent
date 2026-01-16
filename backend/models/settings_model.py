from db.database import get_connection

def get_settings(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT notifications_enabled, theme
        FROM settings WHERE user_id=?
    """, (user_id,))
    row = cur.fetchone()

    if not row:
        cur.execute("""
            INSERT INTO settings (user_id)
            VALUES (?)
        """, (user_id,))
        conn.commit()
        cur.execute("""
            SELECT notifications_enabled, theme
            FROM settings WHERE user_id=?
        """, (user_id,))
        row = cur.fetchone()

    conn.close()
    return row


def update_settings(user_id, notifications_enabled, theme):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO settings (user_id, notifications_enabled, theme)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            notifications_enabled=excluded.notifications_enabled,
            theme=excluded.theme
    """, (user_id, notifications_enabled, theme))
    conn.commit()
    conn.close()
