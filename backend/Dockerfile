# 1. 베이스 이미지
FROM python:3.13-slim

# 2. 작업 디렉토리
WORKDIR /app

# 3. 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 프로젝트 전체 복사
COPY db/agent.db ./db/agent.db
COPY . .

# 5. 포트 오픈
EXPOSE 5000

# 6. 앱 실행
CMD ["python", "app.py"]
