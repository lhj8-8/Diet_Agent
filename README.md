# 🥗 Diet Agent  
AI 기반 개인 맞춤형 다이어트 관리 플랫폼
<br>- 문서 파일: [Diet_Agent_project.pdf](https://github.com/user-attachments/files/24659427/Diet_Agent_project.pdf)


>보안상의 이유로 KEY 있는 .env 파일을 제외하여 올렸습니다. 

---

## 📜 목차
- [프로젝트 개요](#-프로젝트-개요)
- [팀원 소개](#-팀원-소개)
- [핵심 목표](#-핵심-목표)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [서비스 흐름](#-서비스-흐름)
- [주요 기능](#-주요-기능)
- [주요 유틸 설명](#-주요-유틸-설명)
- [트러블 슈팅 경험](#-트러블-슈팅-경험)
- [배포 방법](#-배포-방법-docker)
- [프로젝트 소감](#-프로젝트-소감)

---

## 📌 프로젝트 개요
>[목차로 돌아가기](#-목차)

**Diet Agent**는  
사용자의 신체 정보, 목표 체중, 목표 기간, 일상 기록 등을 기반으로  
👉 **식단 · 운동 · 일정 · 진행률 · AI 챗봇 상담 등을 통합 제공하는 다이어트 관리 웹 서비스**입니다.

단순한 추천을 넘어 실제 데이터들을 **DB에 기록하고 시각적으로 관리**하는 것이 핵심 목표입니다.

---

## 👤 팀원 소개
>[목차로 돌아가기](#-목차)
<div align="center">

<table>
  <tr>
    <!-- PM / Developer -->
    <td align="center" width="230" style="vertical-align: top;">
      <b>김요원 (PM)</b>
      <div style="width:60%;margin:6px auto;border-bottom:1px solid #aaa;"></div>
      <sub><b>PM / Developer</b></sub><br>
      <sub>- 프로젝트 와이어프레임 설계 및 <br>화면 흐름 기획,
        <br>- DB 테이블·컬럼 공동 구현
        <br>- JWT 기반 인증 기능 구현 (React–Flask)
        <br>- 사용자 정보 관리 및 식단 기록 및 <br>저장 기능 구현
        <br>- AI 챗봇 응답 로직 공동 구현
        <br>- 대시보드 주간 추세 시각화
      </sub><br><br>
      <a href="https://github.com/kywww">
        <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white">
      </a>
    </td>
 <!-- Developer -->
    <td align="center" width="230" style="vertical-align: top;">
      <b>정두균</b>
      <div style="width:60%;margin:6px auto;border-bottom:1px solid #aaa;"></div>
      <sub><b>Developer</b></sub><br>
      <sub>- 프론트엔드 전반 UI/UX 설계 및 구현
        <br>- React 기반 카드형 콘텐츠, 캘린더, 
        <br>모달 중심의 인터페이스 구현 
        <br>- 디자인, 컴포넌트 구조 설계
        <br>- 사용자 친화적 화면플로우 및 UX 구성
        <br>- DB 테이블, 컬럼 공동 구현
        <br>- AI 챗봇 응답 로직 공동 구현
      </sub><br><br>
      <a href="https://github.com/dooposip">
        <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white">
      </a>
    </td>
    <!-- Developer -->
    <td align="center" width="230" style="vertical-align: top;">
      <b>이혜지</b>
      <div style="width:60%;margin:6px auto;border-bottom:1px solid #aaa;"></div>
      <sub><b>Developer</b></sub><br>
      <sub>- 백엔드(Flask) 전체 디렉토리
        <br>구조 설계 및 파일 구현
        <br>- DB 관리 파일(schema_extra.sql, <br>database.py) 구현
        <br>- 시드데이터 csv 파일 생성
        <br>- React로 대시보드 초안 구현
        <br>- 오늘의 코칭 프로그래밍
        <br>- 문서작업 및 README 작성
      </sub><br><br>
      <a href="https://github.com/lhj8-8">
        <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white">
      </a>
    </td>
    <!-- Developer -->
    <td align="center" width="230" style="vertical-align: top;">
      <b>박종훈</b>
      <div style="width:60%;margin:6px auto;border-bottom:1px solid #aaa;"></div>
      <sub><b>Developer</b></sub><br>
      <sub>- 커뮤니티 개발 값 정규화, 
        <br>금지어, 이상 입력 차단
        <br>추천 시간 필터 보조
        <br>- 몇 파일에 뭉쳐있던 것들을 <br>fiexd 기능별 분리
        <br>- DB성능/ 초기데이터 추가
      </sub><br><br>
      <a href="https://github.com/dailyhune">
        <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white">
      </a>
    </td>
  </tr>
</table>

</div>


---

## 🎯 핵심 목표
>[목차로 돌아가기](#-목차)

- 서비스 수준의 **React + Flask 풀스택 구현**
- **JWT 인증 구조 설계**
- **DB 중심**의 사용자 상태 관리
- 사용자의 정보와 **챗봇**, 일정을 연결한 코칭
- **Docker** 기반 배포 환경 구축

---

## 🛠 기술 스택
>[목차로 돌아가기](#-목차)

### Frontend
- **React (Vite)**
- React Router DOM
- Axios
- CSS 기반 컴포넌트 스타일링

### Backend
- **Python Flask**
- Flask Blueprint 구조
- PyJWT (JWT 인증)

### Database
- **MySQL**
- `sqlite3.Row` 기반 딕셔너리 조회

### Authentication
- **JWT Access Token 방식**
- LocalStorage 기반 로그인 유지
- 보호된 라우트 처리 (RequireLogin)

### DevOps / Deployment
- **Docker**
- Dockerfile 기반 컨테이너화
- 환경 독립적 실행 구조

---

## 📂 프로젝트 구조
>[목차로 돌아가기](#-목차)

>Docker 외 주요 파일을 중심으로 구조를 잡고, 나머지는 요약 설명으로 작성했습니다.

### ※Frontend
```
frontend/                                   # React + Vite 프론트엔드
├── src/
│   ├── api/
│   │   └── Axios.jsx                       # Axios 공통 설정, Bearer Token 자동 첨부
│   │
│   ├── components/                         # 재사용 UI 컴포넌트
│   │   ├── cards/
│   │   │   ├── GoalStatusCard.jsx          # 목표카드 UI
│   │   │   ├── RecommendationCard.jsx      # 추천카드 UI
│   │   │   ├── TodayDietTable.jsx          # 식단카드 UI
│   │   │   ├── TodayScheduleCard.jsx       # 스케줄카드 UI
│   │   │   └── UserInfoCard.jsx            # 내정보카드 UI
│   │   │
│   │   ├── chat                            # 챗봇 답변 상세 설정
│   │   ├── news                            # 뉴스박스 UI
│   │   ├── BottomRightFab.jsx              # 우측 하단 버튼 UI
│   │   ├── Chatbot.jsx                     # 챗봇 페이지
│   │   ├── FloatingActionBar.jsx           # 우측 플로팅 버튼
│   │   ├── Header.jsx                      # 상단 헤더
│   │   ├── MemoPanel.jsx                   # 메모 UI
│   │   ├── WeeklyTrendCard.jsx             # 주간 체중 변화율 UI
│   │   └── WorkoutRecommend.jsx            # 운동 추천 UI
│   │
│   ├── data                                # 추천 운동 data
│   │  
│   ├── hooks                               # 챗봇, 프로필, 일정 등의 상태 및 로직 분리
│   │
│   ├── pages/                              # 페이지 단위 컴포넌트
│   │   ├── ChatPage.jsx                    # 챗봇 페이지
│   │   ├── CommunityPage.jsx               # 공지사항 / 문의
│   │   ├── DietPage.jsx                    # 다이어트 관리 메인 페이지
│   │   ├── DietTabPage.jsx                 # 다이어트 식단 관리 서브 페이지
│   │   ├── GuestChatPage.jsx               # 비회원 챗봇 체험 페이지
│   │   ├── HomePage.jsx                    # 홈 화면(뉴스카드) 페이지
│   │   ├── IntroPage.jsx                   # 인트로 화면 페이지
│   │   ├── LoginPage.jsx                   # 로그인 페이지
│   │   ├── MainPage.jsx                    # 메인 대시보드
│   │   ├── MyInfoPage.jsx                  # 내 정보 페이지
│   │   ├── Programs.jsx                    # 프로그램 소개 페이지
│   │   ├── SchedulePage.jsx                # 일정 관리 페이지
│   │   ├── SelfCheckPage.jsx               # 자가진단 페이지
│   │   ├── SettingsPage.jsx                # 설정 페이지(다크모드 변경)
│   │   ├── Sidebar.jsx                     # 좌측 사이드바 네비게이션
│   │   ├── SignupPage.jsx                  # 회원가입 페이지
│   │   └── WorkoutPage.jsx                 # 다이어트 운동 관리 서브 페이지
│   │
│   ├── styles                              # 대시보드css
│   │
│   ├── utils                               # 카드뉴스 정보
│   │ 
│   ├── App.jsx                             # 라우팅, 인증 흐름, 로그인 상태 관리
│   └── main.jsx                            # React 진입점
│
└── index.html                              # HTML 엔트리 파일
```

<br>

### ※Backend

```
backend/                               # Flask 기반 백엔드 서버
├── data/                              # csv data
│
├── db/
│   ├── agent.db                       # 데이터베이스 파일
│   ├── database.py                    # SQL 연결 및 RowFactory 설정
│   └── schema_extra.sql               # 추가 테이블/컬럼 정의용 SQL 스키마
│
├── models/                            # DB 접근 로직
│   ├── activity_model.py              # 사용자 활동 기록 모델
│   ├── calorie_model.py               # 칼로리 계산 및 저장 모델
│   ├── chatbot_model.py               # 챗봇 대화 로그 저장
│   ├── diet_model.py                  # 식단 기록 및 목표 체중 관련 DB 로직
│   ├── food_model.py                  # 음식 선호 정보 저장/조회
│   ├── memo_model.py                  # 메모 저장 모델
│   ├── recommendation_model.py        # 추천 결과 저장 및 조회
│   ├── schedule_model.py              # 일정 데이터 DB 처리
│   ├── settings_model.py              # 사용자 설정 모델(테마 변경)
│   ├── summary_model.py               # 대시보드 요약 데이터 집계
│   ├── user_model.py                  # 사용자 계정, 프로필 처리
│   └── workout_model.py               # 운동 기록 DB 처리
│
├── routes/                            # API 라우트(요청/응답)
│   ├── activity_routes.py             # 운동 기록 API
│   ├── ai_engine.py                   # AI 응답 생성 로직
│   ├── ai_tools.py                    # AI 프롬프트 보조
│   ├── auth_routes.py                 # 관리자 계정 jwt
│   ├── calendar_routes.py             # 캘린더 조회 전용 API
│   ├── calorie_routes.py              # 칼로리 계산 및 기록 API
│   ├── chatbot_routes.py              # AI 챗봇 대화 API
│   ├── community_routes.py            # 공지사항, 문의, 관리자 문의 답변 API
│   ├── diet_routes.py                 # 식단 기록, 체중 목표, 진행률 계산 API
│   ├── memo_routes.py                 # 메모 저장 및 조회 API
│   ├── plan_routes.py                 # 목표, 계획 생성 API
│   ├── preference_routes.py           # 음식 선호도 저장, 조회 API
│   ├── recommendation_routes.py       # AI 추천 결과 반환 API
│   ├── schedule_routes.py             # 일정 CRUD(생성, 조회, 수정, 삭제 동작) API
│   ├── user_routes.py                 # 내 정보 조회, 수 등 사용자 관련 API
│   ├── weeklytrend_routes.py          # 주간 체중/활동 트렌드 API
│   └── workout_routes.py              # 운동 기록 저장 및 조회 API
│
├── services/                          # 계산/추천/계획 로직
│   ├── calorie_service.py             # 칼로리 계산 비즈니스 로직
│   ├── planning_service.py            # 목표 기반 일정/계획 생성 로직
│   ├── progress_service.py            # 체중/기간 목표 진행률 계산 로직
│   ├── recommendation_service.py      # AI 추천 데이터 가공 서비스
│   ├── schedule_service.py            # 일정 비즈니스 로직
│   └── workout_service.py             # 운동 추천 및 처리 로직
│
├── utils/                             # 필터링 유틸              
│      
├── app.py                             # Flask 애플리케이션 엔트리 포인트, 라우트 및 확장 초기화
└── config.py                          # JWT, DB, 환경변수 등 전체 서버 설정 관리

```

---

## 🔄 서비스 흐름
>[목차로 돌아가기](#-목차)

1. 회원가입 및 로그인을 통해 인증을 진행함
2. 로그인 성공 시 JWT 토큰이 발급됨
3. 토큰은 LocalStorage에 저장되며, 앱 재실행 시 인증 상태를 복구함
4. 사용자는 목표 체중, 현재 체중, 목표 기간을 입력함
5. 체중 기록이 누적되며, 진행률이 자동 계산됨
6. 챗봇은 입력된 사용자 정보를 기반으로 맞춤형 답변을 제공
7. 이러한 이용 기록들은 DB에 저장됨

---

## ⭐ 주요 기능
>[목차로 돌아가기](#-목차)

<br>
<img width="1920" height="1080" alt="9" src="https://github.com/user-attachments/assets/b769441f-bb2e-4bba-bc47-61ed88d64e0a" />
<br>

### ✅ 회원가입 / 로그인
- 이메일 및 비밀번호 기반 회원가입
- 로그인 시 JWT Access Token 발급
- 토큰을 이용한 사용자 인증 유지
- /api/user/me API를 통해 로그인 상태 복구

<br><br>
<img width="1920" height="1080" alt="10" src="https://github.com/user-attachments/assets/ff5695c0-1923-4f73-b68a-89a76667e79e" />
<br>

### 🔐 JWT 인증 구조
- Access Token 기반 인증
- Authorization Header에 Bearer Token 사용
- 보호된 페이지 접근 시 토큰 검증

<br><br>
<img width="1920" height="1080" alt="11" src="https://github.com/user-attachments/assets/538b1659-bafd-464a-85b1-665a870fce32" />
<br>

### 📊 체중 기록 기반 실제 진행률 계산
- 현재 체중 및 목표 체중, 달성 기간 등을 입력하면 체중 기록 대비 진행률이 계산됨
- 시작, 목표, 현재 체중을 기반으로 감량/증량/유지 목표를 모두 지원하는 체중 변화 진행률 계산 로직

<br><br>
<img width="1920" height="1080" alt="12" src="https://github.com/user-attachments/assets/be0c8936-cd37-4a03-9e69-5dfcdf984bf0" />
<br>

### 🤖 AI 챗봇
- 최근 체중 변화, 식단/운동 선호 및 비선호, 일정 정보, 이전 대화 기록
  <br>등을 종합하여 상황에 맞는 답변을 제공

<br><br>
<img width="1920" height="1080" alt="13" src="https://github.com/user-attachments/assets/b4d76a36-694c-4d12-9c1b-6250b6b79874" />
<br>

### 🥗 식단 & 🏃 운동 추천
- 사용자의 선호 음식 및 알러지 정보 반영
- 강도별로 운동 추천 및 상세 설명과 제공(유튜브와도 연결)
- 칼로리 및 단백질 섭취의 하루 결과에 따른 코칭 멘트 자동화

<br><br>
<img width="1920" height="1080" alt="14" src="https://github.com/user-attachments/assets/662af477-c5ab-42e1-b122-e6495d5ea174" />
<br>

### 📅 캘린더 일정 연동
- 날짜별 식단 및 운동 일정 관리
- 운동과 소모 칼로리의 정밀한 기록을 위해 일정 메모와도 연동
- 일정 기반 챗봇 응답 가능

<br><br>
<img width="1920" height="1080" alt="15" src="https://github.com/user-attachments/assets/8f446ef7-0e9a-4561-84c2-35e831f8cdda" />
<br>

### 🧩 커뮤니티
- 관리자의 공지 게시 기능
- 사용자의 문의 사항 답변 기능(관리자)

---

## 📝 주요 유틸 설명
>[목차로 돌아가기](#-목차)

<br>
<img width="1920" height="1080" alt="16" src="https://github.com/user-attachments/assets/6c554a3f-e56c-4d19-855c-70166dfe5a16" />
<br>

### 입력값 안전 처리(실제 서비스 한경을 고려한 안정성 강화)
- 빈 값, 문자열, 숫자 입력에 대한 방어 처리(500 예방)
- SQL Injection 방어
- DB 조회 결과 None 처리

---

## 🛠 트러블 슈팅 경험
>[목차로 돌아가기](#-목차)

<br>
<img width="1920" height="1080" alt="17" src="https://github.com/user-attachments/assets/8ad1a534-7fa7-4f10-9635-6a5b3c289fb4" />
<br>

### ❌ 로그인 성공 후 화면 이동 실패 문제
- 원인: 인증 로직과 네비게이션이 여러 컴포넌트에 분산되어 있음
- 해결: App.jsx와 RequireLogin 역할 분리

<br><br>
<img width="1920" height="1080" alt="18" src="https://github.com/user-attachments/assets/90d24999-d975-450d-a5de-ab9d9339170e" />
<br>

### ❌ 챗봇 응답 Error 발생 및 부자연스러운 언어 처리
- 원인: 언어 처리 모델의 순서 및 구조 이상
- 해결: 로직 구성 재정렬 및 프롬프트 구체화

---

## 🚀 배포 방법 (Docker)
>[목차로 돌아가기](#-목차)

<br>
<img width="1920" height="1080" alt="19" src="https://github.com/user-attachments/assets/acc84940-01ae-4ef7-91c9-2f1f26650678" />
<br>

### 🐋 Docker
- 환경 의존성 문제 해결
- 배포 및 실행 단순화
- 실행시 .env 파일에 사용자의 KEY를 별도로 입력해야 함

---

## 📌 프로젝트 소감
>[목차로 돌아가기](#-목차)

<br>
<img width="1920" height="1080" alt="21" src="https://github.com/user-attachments/assets/f8a9852a-4617-428a-b1d3-752996989150" />
<br>

