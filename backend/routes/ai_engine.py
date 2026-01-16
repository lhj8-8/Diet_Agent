import os, re
from openai import OpenAI
from routes.ai_tools import (
    tool_get_user_profile,
    tool_update_user_profile,
    tool_get_effective_nutrition_goal,
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
너는 헬스·식단 전문 AI 코치다.

절대 규칙:
1. 사용자가 이미 말한 정보는 다시 묻지 마라.
2. 정보가 충분하면 즉시 식단 + 운동 계획을 제시하라.
3. 목표가 '체지방 감량 + 근육 증가'이면 '리컴포지션'으로 처리하라.
4. 같은 질문을 반복하지 마라.
5. 항상 한국어로, 구체적인 수치(칼로리/단백질)를 포함해 답하라.

출력은 반드시 아래 형식을 지켜라:
1) 목표 요약 (3줄 이내)
2) 하루 섭취 목표 (칼로리/단백질 숫자 고정)
3) 하루 식단 (끼니별, 각 끼니마다 kcal/단백질 포함)
4) 운영 규칙 3~4개
불필요한 설명은 하지 마라.

출력은 반드시 Markdown으로 한다.
- 섹션 제목은 ### 사용
- 섹션 사이에 --- 사용
- 핵심은 리스트로 짧게
- 길게 설명하지 말 것
"""

DIET_SYSTEM_PROMPT = """
너는 식단 설계 전문가다.
아래 규칙을 반드시 지켜라.

[절대 규칙]
- 운동 내용 절대 포함 금지
- 하루 총 칼로리와 단백질 목표에 최대한 근접
- 표 형식 유지 필수, 끼니별로 작성
- 총합 표시 제거
- 하루 물 섭취 1.5~2L 안내 포함
- 설명은 최소화

[출력 형식 — Markdown, 하루 식단 기준]

### 목표 요약
- 목표 유형: {display_goal}
- 하루 총 kcal/단백질 목표: {calories} kcal / {protein} g

### 하루 섭취 목표
- 칼로리: {calories} kcal
- 단백질: {protein} g

### 하루 식단 예시
| 식사 | 음식 | kcal | 단백질(g) |
|------|------|------|------------|
| 아침 | -    | -    | -          |
| 간식 | -    | -    | -          |
| 점심 | -    | -    | -          |
| 간식 | -    | -    | -          |
| 저녁 | -    | -    | -          |

### 추가 안내
- 하루 물 섭취: 1.5~2L
- 부족한 단백질/칼로리: 닭가슴살, 견과류, 저지방 요거트 등으로 보충
"""

EXERCISE_SYSTEM_PROMPT = """
너는 퍼스널 트레이너다.
아래 규칙을 반드시 지켜라.

[절대 규칙]
- 식단, 음식, 칼로리, 단백질, 탄수화물, 지방 절대 언급 금지
- 운동 루틴만 표로 표시
- 목표와 핵심 원칙은 표 밖
- 문단 설명 금지

[출력 형식 — Markdown, 하루 운동 기준]

### 목표 요약
- 목표 유형: {display_goal}
- 하루 목표 활동 소모: {activity_kcal} kcal

### 오늘 운동 루틴
| 운동 유형 | 세부 내용 | 세트/시간 | 예상 소모 kcal |
|----------|-----------|-----------|----------------|
| 워밍업   | -         | -         | -              |
| 근력     | -         | -         | -              |
| 유산소   | -         | -         | -              |
| 마무리   | -         | -         | -              |

### 하루 운동 소모 목표
- 하루 총 활동 소모: {activity_kcal} kcal

### 핵심 원칙
- 정확한 자세 우선
- 강도는 체력에 맞춰 조절
- 꾸준함 유지
- 충분한 휴식과 회복
"""

COMBINED_SYSTEM_PROMPT = """
너는 헬스 코치다.
식단과 운동을 모두 추천한다.

[출력 형식]
1) 목표 요약
2) 하루 섭취 목표
3) 하루 식단 예시 (표 형식)
4) 하루 운동 루틴
5) 핵심 원칙
"""


# ✅ In-memory chat state (DB가 고장나도 대화 중 기억 유지)
# 주의: 서버 재시작하면 초기화됨 (그게 싫으면 DB/Redis로)
USER_STATE = {}  # { user_id: {"height":173, "weight":80, "goal":"recomposition", "meals_per_day":3, ...} }

# ✅ DB에 저장 가능한 필드만 (meals_per_day는 DB에 안 넣음: 툴/DB 스키마 불명확)
PROFILE_DB_KEYS = {"height", "weight", "goal", "environment", "equipment"}


def _normalize_goal(msg: str):
    if ("체지방" in msg and "근육" in msg) or ("감량" in msg and "근육" in msg) or ("리컴" in msg):
        return "recomposition"
    if ("감량" in msg) or ("체지방" in msg) or ("다이어트" in msg):
        return "fat_loss"
    if ("근육" in msg) or ("근대비" in msg) or ("증량" in msg) or ("벌크" in msg):
        return "muscle_gain"
    return None


def extract_from_message(message: str):
    """
    Extracts info from user message.
    Returns dict with possible keys:
      height (int), weight (int), meals_per_day (int),
      goal (str), environment (str), equipment (str)
    """
    msg = (message or "").strip()
    data = {}

    # height/weight: "173cm 80kg" (also works with trailing garbage like "]")
    m_h = re.search(r"(\d{3})\s*cm", msg, re.IGNORECASE)
    m_w = re.search(r"(\d{2,3})\s*kg", msg, re.IGNORECASE)
    if m_h:
        data["height"] = int(m_h.group(1))
    if m_w:
        data["weight"] = int(m_w.group(1))

    # meals: "3끼", "하루 3끼", or just "3"
    m_meals = re.search(r"(\d)\s*끼", msg)
    if m_meals:
        data["meals_per_day"] = int(m_meals.group(1))
    else:
        if re.fullmatch(r"\s*\d\s*", msg):
            data["meals_per_day"] = int(msg.strip())

    # environment/equipment hints
    if ("헬스장" in msg) or ("헬스" in msg) or ("짐" in msg):
        data["environment"] = "gym"
        data["equipment"] = "full gym equipment"
    if "5일" in msg:
        data["environment"] = "gym 5x/week"

    goal = _normalize_goal(msg)
    if goal:
        data["goal"] = goal

    return data


def _get_state(user_id: int):
    # 1. 항상 DB부터 읽는다
    db_response = tool_get_user_profile(user_id=user_id)

    if db_response and db_response.get("ok") and "profile" in db_response:
        db_profile = db_response["profile"]
        state = {}

        for k in PROFILE_DB_KEYS:
            if db_profile.get(k) not in (None, "", 0):
                state[k] = db_profile[k]

        if db_profile.get("name"):
            state["name"] = db_profile["name"]

        # 2. 메모리 캐시는 DB 결과로 덮어씀
        USER_STATE[user_id] = state
        return state

    # 3. DB에 진짜 아무것도 없을 때만 빈 dict
    return {}


def _save_to_db_best_effort(user_id: int, state: dict):
    # DB에 넣을 수 있는 값만 넣기 (meals_per_day 제외)
    payload = {k: state.get(k) for k in PROFILE_DB_KEYS if state.get(k) not in (None, "", 0)}
    if not payload:
        return
    try:
        tool_update_user_profile(user_id=user_id, **payload)
        # ✅ DB 저장 후 메모리 캐시도 최신화
        if user_id in USER_STATE:
            USER_STATE[user_id].update(payload)
        else:
            USER_STATE[user_id] = payload
    except Exception:
        # DB 저장 실패해도 대화 상태는 메모리에 남는다
        pass

# 사용자의 대화 의도 판단 함수
# ai_engine.py
def detect_intent(message: str) -> str:
    text = message.lower().strip()

    # ✅ 내 정보 질문 (최우선)
    if any(k in text for k in [
        "내 키", "키는", "신장은",
        "내 몸무게", "몸무게는", "체중은",
        "내 이름", "이름은",
        "내 목표", "목표는",
        "내 칼로리", "섭취 칼로리", "섭취칼로리",
        "단백질은", "단백질 목표",
        "활동 소모", "운동 소모", "소모 칼로리"
    ]):
        return "info_request"

    # 음식 영양 정보
    if any(k in text for k in ["칼로리", "단백질"]) and "식단" not in text:
        return "food_nutrition"

    if any(k in text for k in ["포함", "넣어서", "같이", "먹을건데"]) and "식단" in text:
        return "diet_with_food"

    if any(k in text for k in ["대신", "말고", "다른"]):
        return "diet_food_specific"

    if "식단" in text:
        return "diet"

    if any(k in text for k in ["운동", "루틴"]):
        return "exercise"

    return "unknown"

# 사용자 질문에 대한 답변(왜 저장이 안되나? 등)
META_INTENTS = {
    "WHY_NOT_WORK": ["왜 안돼", "왜 안됨", "안돼?", "왜 그래"],
    "CONFIRM_MEMORY": ["저장", "기억", "기억해", "남아있어"],
    "CONFUSED": ["뭐야 이게", "뭔데 이거", "이상해", "왜 이래", "말이 안돼"],
    "FOLLOW_UP": ["그럼", "그래서", "그러면"]
}

def detect_meta_intent(message: str):
    text = message.lower().strip()

    # 저장/기억은 명시적일 때만
    if any(k in text for k in ["저장해", "기억해줘", "남겨줘"]):
        return "CONFIRM_MEMORY"

    if len(text) > 20:
        return None

    for intent, keywords in META_INTENTS.items():
        if any(k in text for k in keywords):
            return intent

    return None


def is_greeting(message: str) -> bool:
    text = message.lower().strip()
    greetings = [
        "안녕", "안녕하세요", "ㅎㅇ", "하이", "hello",
        "좋은 아침", "굿모닝", "굿이브닝", "반가워"
    ]
    return any(g in text for g in greetings)

# 식단 부분 변경 처리 코드
def replace_food_in_diet(diet_list, old_food, new_food, new_kcal, new_protein):
    """
    diet_list: [{'food':'현미밥 150g', 'kcal':210, 'protein':4}, ...]
    old_food: 교체할 음식 이름
    new_food: 새 음식 이름
    new_kcal, new_protein: 새 음식 정보
    """
    for item in diet_list:
        if old_food in item['food']:
            item['food'] = new_food
            item['kcal'] = new_kcal
            item['protein'] = new_protein
            break
    return diet_list

# 목표 유형
def goal_type_to_display(goal_type: str) -> str:
    """
    diet_goals.type 값을 한국어로 변환
    """
    mapping = {
        "loss": "감량 + 근육 증가",
        "gain": "증량",
        "keep": "유지"
    }
    return mapping.get(goal_type, "유지")  # 기본은 유지

def extract_food_name(message: str) -> str:
    msg = message.lower()
    msg = re.sub(r"(칼로리|단백질|알려줘|몇|이야|은|는|\?|!)", "", msg)
    msg = re.sub(r"\d+.*", "", msg)  # 숫자 이후 제거
    return msg.strip()

# ai_engine.py
def generate_reply(user_id: int, message: str) -> str:
    # ✅ 인사 처리 (최우선)
    # ✅ 인사 처리 (최우선)
    if is_greeting(message):
        # 사용자 상태 조회
        state = _get_state(user_id)
        name = state.get("name")

        if name:
            return f"안녕하세요, {name}님! 😊 오늘도 활기차게 하루를 시작해볼까요?"
        else:
            return (
                "안녕하세요! 😊\n"
                "맞춤 추천을 위해 이름과 정보를 [내 정보 페이지]에 입력해 주시면 좋아요."
            )

    intent = detect_intent(message)

    meta_intent = detect_meta_intent(message)

    # ✅ META_INTENT 처리 (intent보다 우선)
    if meta_intent == "CONFIRM_MEMORY":
        return (
            "현재는 정보를 불러오는 기능만 제공하고 있고,\n"
            "대화 내용을 자동으로 저장하는 기능은 아직 준비 중이에요."
        )

    if meta_intent == "WHY_NOT_WORK":
        return (
            "아직 해당 기능이 구현되지 않았거나,\n"
            "필요한 정보가 충분하지 않을 수 있어요."
        )

    if meta_intent == "CONFUSED":
        return (
            "헷갈리셨다면 이렇게 요청해 주세요 🙂\n\n"
            "• 식단 추천\n"
            "• 운동 추천\n"
            "• 식단과 운동 추천"
        )

    if meta_intent == "FOLLOW_UP":
        return "조금 더 구체적으로 말씀해 주시면 이어서 도와드릴게요!"

    # ✅ GENERAL_QUESTION 처리 (unknown fallback)
    if intent == "unknown":
        resp = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=[
                {
                    "role": "system",
                    "content": "너는 헬스·식단 앱의 AI 비서다. 친절하고 간결하게 한국어로 답해라."
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )
        return getattr(resp, "output_text", "").strip() or "답변을 생성하지 못했어요."
    
    # ✅ info_request 처리
    # info_request 처리 개선
    if intent == "info_request":
        state = _get_state(user_id)
        name = state.get("name", None)
        height = state.get("height")
        weight = state.get("weight")
        goal = state.get("goal", None)

        # DB에서 칼로리/단백질/활동 소모 조회
        goal_data = tool_get_effective_nutrition_goal(user_id).get("goal", {})
        calories = goal_data.get("calories")
        protein = goal_data.get("protein")
        activity_kcal = goal_data.get("activity_kcal")
        goal_type = goal_data.get("type")  # loss / gain / keep
        display_goal = goal_type_to_display(goal_type)

        response_parts = []

        # 이름
        if "이름" in message:
            if name:
                response_parts.append(f"당신의 이름은 {name}입니다.")
            else:
                response_parts.append("이름이 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        # 키
        if "키" in message or "신장" in message:
            if height:
                response_parts.append(f"당신의 키는 {height}cm입니다.")
            else:
                response_parts.append("키 정보가 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        # 몸무게
        if "몸무게" in message or "체중" in message:
            if weight:
                response_parts.append(f"당신의 몸무게는 {weight}kg입니다.")
            else:
                response_parts.append("몸무게 정보가 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        # 목표
        if "목표" in message or "목적" in message:
            if goal_type:  # goal_type 사용
                response_parts.append(f"현재 목표는 '{display_goal}'입니다.")
            else:
                response_parts.append("목표 정보가 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        # 섭취 칼로리 / 단백질 / 활동 소모
        if any(k in message for k in ["칼로리", "섭취", "단백질", "단백"]):
            if calories is not None and protein is not None:
                response_parts.append(f"하루 칼로리 목표: {calories} kcal, 단백질 목표: {protein} g")
            else:
                response_parts.append("칼로리/단백질 목표가 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        if any(k in message for k in ["활동", "소모", "운동", "burn"]):
            if activity_kcal is not None:
                response_parts.append(f"하루 활동 소모 목표: {activity_kcal} kcal")
            else:
                response_parts.append("활동 소모 목표가 아직 등록되지 않았습니다. [내 정보 페이지]에서 입력해주세요.")

        return "\n".join(response_parts) if response_parts else "죄송하지만, 어떤 정보를 원하시는지 정확히 알려주세요."

    # 사용자 상태
    state = _get_state(user_id)
    height = state.get("height")
    weight = state.get("weight")
    goal = state.get("goal") or "recomposition"
    meals = state.get("meals_per_day")

    if not height or not weight:
        return (
            "아직 기본 정보가 등록되지 않았어요 📝\n\n"
            "맞춤 추천을 위해\n"
            "👉 [내 정보 페이지]에서 키, 몸무게, 목표를 입력해 주세요.\n\n"
            "정보 저장 후 다시 요청해 주시면 바로 추천해드릴게요!"
        )

    # DB에서 목표 조회
    goal_data = tool_get_effective_nutrition_goal(user_id).get("goal", {})
    calories = goal_data.get("calories")
    protein = goal_data.get("protein")
    activity_kcal = goal_data.get("activity_kcal")
    goal_type = goal_data.get("type")  # loss / gain / keep
    display_goal = goal_type_to_display(goal_type)  # ← 여기에 미리 정의
    

    # 프롬프트 선택
    # -------------------------------
    # 1) 특정 음식 대체 추천
    if intent == "diet_food_specific":
        food_to_replace = message  # 예: "그릭 요거트"
        system_prompt = """
        너는 헬스·식단 전문가다.
        사용자가 말한 음식을 대신할 건강한 간식을 한 가지 추천해줘.
        추천 이유나 칼로리/단백질도 함께 알려줘.
        출력은 Markdown이나 표 필요 없고, 간단히 한 문장으로.
        """
        user_prompt = f"'{food_to_replace}' 대신 먹을 간식 추천해줘."

    # -------------------------------
    # 2) 특정 음식 칼로리/단백질 확인
    elif intent == "food_nutrition":
        food_to_check = extract_food_name(message)
        system_prompt = """
        너는 헬스·영양 전문가다.
        사용자가 말한 음식의 일반적인 1인분 기준
        칼로리(kcal)와 단백질(g)을 알려줘.
        목표 칼로리와는 절대 연결하지 마라.
        출력은 한 문장.
        """
        user_prompt = f"{food_to_check}의 칼로리와 단백질을 알려줘."

    # -------------------------------
    # 3) 기존 식단 추천
    elif intent == "diet":
        system_prompt = DIET_SYSTEM_PROMPT
        user_request = "한국식 기준의 하루 식단을 표 형식으로 추천해줘."
        user_prompt = f"""
        [사용자 정보]
        - 키: {height}cm
        - 몸무게: {weight}kg
        - 목표: {display_goal}
        - 하루 칼로리 목표: {calories}
        - 단백질 목표: {protein}
        - 하루 식사 횟수: {meals}

        요청:
        {user_request}
        - 출력 형식: Markdown 표 형식 (식사, 음식, kcal, 단백질)
        - 하루 물 섭취 안내 포함
        """

    # -------------------------------
    # 4) 기존 운동 추천
    elif intent == "exercise":
        system_prompt = EXERCISE_SYSTEM_PROMPT
        user_prompt = f"""
        [사용자 정보]
        - 목표: {display_goal}
        - 하루 활동 소모 목표: {activity_kcal} kcal

        요청:
        오늘 하루 운동 루틴을 표 형식으로 추천해줘.
        """

    elif intent == "diet_with_food":
        system_prompt = DIET_SYSTEM_PROMPT

        user_prompt = f"""
    [사용자 정보]
    - 키: {height}cm
    - 몸무게: {weight}kg
    - 목표: {display_goal}
    - 하루 칼로리 목표: {calories}
    - 단백질 목표: {protein}
    - 하루 식사 횟수: {meals}

    요청:
    사용자가 말한 음식을 반드시 하루 식단에 포함해서,
    총 칼로리와 단백질 목표를 최대한 맞춘 하루 식단을 추천해줘.

    사용자 입력 음식:
    "{message}"

    출력 형식:
    Markdown 표 형식 (식사, 음식, kcal, 단백질)
    """

    # -------------------------------
    # 5) 식단 + 운동
    else:
        system_prompt = COMBINED_SYSTEM_PROMPT
        user_prompt = f"""
        [사용자 정보]
        - 키: {height}cm
        - 몸무게: {weight}kg
        - 목표: {display_goal}
        - 하루 칼로리 목표: {calories}
        - 단백질 목표: {protein}
        - 하루 활동 소모 목표: {activity_kcal}
        - 하루 식사 횟수: {meals}

        요청:
        식단과 운동을 모두 표 형식으로 추천해줘.
        """

    resp = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )

    return getattr(resp, "output_text", "").strip() or "⚠️ 응답 생성 실패"

