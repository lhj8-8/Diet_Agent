# app.py
from flask import Flask, jsonify
from flask_cors import CORS
from config import SECRET_KEY
from db.database import init_db
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()

# Blueprint imports
from routes.user_routes import user_bp
from routes.schedule_routes import schedule_bp
from routes.recommendation_routes import recommendation_bp
from routes.activity_routes import activity_bp
from routes.calendar_routes import calendar_bp
from routes.chatbot_routes import chatbot_bp
from routes.community_routes import community_bp, init_community_tables
from routes.memo_routes import memo_bp
from routes.diet_routes import diet_bp
from routes.preference_routes import pref_bp
from routes.plan_routes import plan_bp
from routes.calorie_routes import calorie_bp
from routes.weeklytrend_routes import stats_bp
from routes.workout_routes import workout_bp

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY

app.config["JWT_SECRET_KEY"] = SECRET_KEY
# flask_jwt_extended 만 사용합니다. (PyJWT 의존성 제거)
JWTManager(app)

# CORS (React 연동)
# CORS(app, origins=["http://localhost:5173"], supports_credentials=True) - 기존 CORS 코드

# 개발 환경(3000)과 배포 환경(80 또는 도메인) 모두 허용 - 배포 위해 수정
CORS(app, resources={r"/api/*": {"origins": ["http://localhost", "http://localhost:5173", "http://localhost:80"]}}, supports_credentials=True)

# DB 초기화
init_db()
init_community_tables()

# Blueprint 등록 (React API 기준)
app.register_blueprint(user_bp, url_prefix="/api/user")
app.register_blueprint(schedule_bp, url_prefix="/api/schedule")
app.register_blueprint(recommendation_bp, url_prefix="/api/recommendation")
app.register_blueprint(activity_bp, url_prefix="/api/activity")
app.register_blueprint(calendar_bp, url_prefix="/api/calendar")
app.register_blueprint(chatbot_bp, url_prefix="/api/ai")
app.register_blueprint(community_bp, url_prefix="/api/community")
app.register_blueprint(memo_bp, url_prefix="/api/memo")
app.register_blueprint(diet_bp, url_prefix="/api/diet")
app.register_blueprint(pref_bp, url_prefix="/api/preferences")
app.register_blueprint(plan_bp, url_prefix="/api/plan")
app.register_blueprint(calorie_bp, url_prefix="/api/summary")
app.register_blueprint(stats_bp, url_prefix="/api/stats")
app.register_blueprint(workout_bp, url_prefix="/api")

# Health Check
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  # 0.0.0.0 = 모든 인터페이스에서 접근 허용
