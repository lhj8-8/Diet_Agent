from flask import Blueprint, request, jsonify
from services.workout_service import get_all_workouts

workout_bp = Blueprint("workouts", __name__)

@workout_bp.route("/workouts", methods=["GET"])
def get_workouts():
    level = request.args.get("level") # 'beginner', 'intermediate', 'advanced'
    all_workouts = get_all_workouts() # This will come from a service/data source

    if level:
        filtered_workouts = [w for w in all_workouts if w['level'].lower() == level.lower()]
    else:
        filtered_workouts = all_workouts

    formatted_workouts = []
    for w in filtered_workouts:
        formatted_workouts.append({
            "id": w['id'],
            "level": w['level'],
            "title": w['title'],
            "duration": w['duration'],
            "part": w['part'],
            "exercises": w['exercises'], # Assuming this is already a list of strings
            "videoUrl": w['videoUrl'], # Assuming this is the full YouTube URL
            "description": w['description']
        })

    return jsonify(formatted_workouts)