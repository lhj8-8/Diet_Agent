-- Indexes (성능 개선)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_diets_user_date
ON diets(user_id, date);

CREATE INDEX IF NOT EXISTS idx_schedules_user_date
ON schedules(user_id, date);

CREATE INDEX IF NOT EXISTS idx_activities_user_date
ON activities(user_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user_time
ON chatbot_logs(user_id, created_at);


-- Calendar Unified View
CREATE VIEW IF NOT EXISTS calendar_view AS
SELECT
    s.user_id,
    s.date,
    s.start_time,
    s.end_time,
    s.title AS schedule_title,
    d.content AS diet_content,
    d.calories AS diet_calories,
    a.workout,
    a.calories AS workout_calories
FROM schedules s
LEFT JOIN diets d
    ON s.user_id = d.user_id AND s.date = d.date
LEFT JOIN activities a
    ON s.user_id = a.user_id AND s.date = DATE(a.completed_at);


-- Trigger: Activity Log
CREATE TRIGGER IF NOT EXISTS trg_activity_log
AFTER INSERT ON activities
BEGIN
    INSERT INTO chatbot_logs (user_id, role, message, created_at)
    VALUES (
        NEW.user_id,
        'system',
        '운동 완료: ' || NEW.workout || ' (' || NEW.calories || ' kcal)',
        DATETIME('now')
    );
END;


-- Progress View
CREATE VIEW IF NOT EXISTS progress_view AS
SELECT
    u.id AS user_id,
    DATE(a.completed_at) AS date,
    SUM(a.calories) AS burned_calories,
    (
        SELECT SUM(wr.calories)
        FROM workout_recommendations wr
        WHERE wr.user_id = u.id
          AND wr.date = DATE(a.completed_at)
    ) AS recommended_calories
FROM users u
LEFT JOIN activities a ON u.id = a.user_id
GROUP BY u.id, DATE(a.completed_at);


-- Chatbot Context View
CREATE VIEW IF NOT EXISTS chatbot_context_view AS
SELECT
    user_id,
    GROUP_CONCAT(role || ': ' || message, '\n') AS context
FROM chatbot_logs
GROUP BY user_id;


