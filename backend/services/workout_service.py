# This would typically fetch from a database, but for now we'll use dummy data
def get_all_workouts():
    return [
        {
            "id": "b1", "level": "beginner", "title": "초급 전신 유산소", "duration": 30, "part": "전신",
            "exercises": [{"name": "가벼운 조깅", "duration": 5}, {"name": "점핑잭", "duration": 5}, {"name": "맨몸 스쿼트", "duration": 10}, {"name": "플랭크", "duration": 10}],
            "description": "초보자를 위한 가벼운 전신 유산소 운동 루틴입니다. 기초 체력 향상에 좋습니다.",
            "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", # Dummy URL
        },
        {
            "id": "b2", "level": "beginner", "title": "초급 코어 강화", "duration": 20, "part": "코어",
            "exercises": [{"name": "크런치", "duration": 7}, {"name": "레그레이즈", "duration": 7}, {"name": "러시안 트위스트", "duration": 6}],
            "description": "코어 근육을 강화하는 초보자용 루틴입니다. 튼튼한 복근을 만드는 데 도움이 됩니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "b3", "level": "beginner", "title": "초급 스트레칭", "duration": 15, "part": "유연성",
            "exercises": [{"name": "목 스트레칭", "duration": 4}, {"name": "어깨 스트레칭", "duration": 4}, {"name": "허리 스트레칭", "duration": 4}, {"name": "다리 스트레칭", "duration": 3}],
            "description": "운동 전후 몸을 유연하게 풀어주는 초보자용 스트레칭 루틴입니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "b4", "level": "beginner", "title": "초급 걷기 운동", "duration": 40, "part": "하체",
            "exercises": [{"name": "빠르게 걷기", "duration": 20}, {"name": "언덕 걷기", "duration": 20}],
            "description": "실외에서 할 수 있는 유산소 운동으로, 심폐 기능 향상에 좋습니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "i1", "level": "intermediate", "title": "중급 상체 근력", "duration": 45, "part": "상체",
            "exercises": [{"name": "푸쉬업", "duration": 10}, {"name": "덤벨 로우", "duration": 15}, {"name": "숄더 프레스", "duration": 10}, {"name": "이두 컬", "duration": 10}],
            "description": "중급자를 위한 상체 근력 루틴입니다. 균형 잡힌 상체 발달에 좋습니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "i2", "level": "intermediate", "title": "중급 하체 유산소", "duration": 40, "part": "하체",
            "exercises": [{"name": "런지", "duration": 15}, {"name": "스쿼트 (점프)", "duration": 15}, {"name": "버피 테스트", "duration": 10}],
            "description": "하체 근력과 유산소 능력을 동시에 향상시키는 루틴입니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "i3", "level": "intermediate", "title": "중급 전신 서킷", "duration": 35, "part": "전신",
            "exercises": [{"name": "마운틴 클라이머", "duration": 10}, {"name": "사이드 플랭크", "duration": 10}],
            "description": "짧은 시간 안에 전신을 자극하는 중급 서킷 트레이닝입니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "i4", "level": "intermediate", "title": "중급 코어 안정화", "duration": 25, "part": "코어",
            "exercises": [{"name": "바이시클 크런치", "duration": 10}],
            "description": "코어 근육의 안정성을 높이는 중급 루틴입니다. 허리 통증 예방에 도움을 줍니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "a1", "level": "advanced", "title": "고급 전신 HIIT", "duration": 30, "part": "전신",
            "exercises": [{"name": "버피 테스트 (점프)", "duration": 8}, {"name": "박스 점프", "duration": 7}, {"name": "플랭크 (변형)", "duration": 7}],
            "description": "고급자를 위한 고강도 인터벌 트레이닝(HIIT) 루틴입니다. 짧은 시간에 높은 운동 효과를 낼 수 있습니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "a2", "level": "advanced", "title": "고급 파워 트레이닝", "duration": 60, "part": "전신",
            "exercises": [{"name": "데드리프트", "duration": 20}, {"name": "벤치프레스", "duration": 20}, {"name": "스쿼트 (바벨)", "duration": 20}],
            "description": "파워 향상을 위한 고급 근력 운동 루틴입니다. 부상에 주의하며 정확한 자세로 수행하세요.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "a3", "level": "advanced", "title": "고급 플라이오메트릭", "duration": 25, "part": "하체",
            "exercises": [{"name": "박스 점프", "duration": 10}, {"name": "점프 스쿼트", "duration": 10}, {"name": "버피 풀업", "duration": 5}],
            "description": "폭발적인 힘을 기르는 고급 플라이오메트릭 훈련입니다. 근육의 순간적인 힘을 증가시킵니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
        {
            "id": "a4", "level": "advanced", "title": "고급 인터벌 러닝", "duration": 45, "part": "유산소",
            "exercises": [{"name": "전력 질주", "duration": 10}, {"name": "조깅", "duration": 10}, {"name": "전력 질주", "duration": 10}, {"name": "조깅", "duration": 15}],
            "description": "유산소 능력과 지구력을 극대화하는 고급 인터벌 러닝 루틴입니다.",
            "videoUrl": "https://www.youtube.com/watch=dQw4w9WgXcQ",
        },
    ]