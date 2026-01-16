import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Programs.css";
import { FiHeart, FiBarChart2, FiTarget, FiCalendar, FiUser } from "react-icons/fi";

export default function Programs() {
  const [text, setText] = useState("");
  const [selfCheckAnswers, setSelfCheckAnswers] = useState({
    diet: "",
    exercise: "",
    sleep: "",
  });
  const [selfCheckResult, setSelfCheckResult] = useState("");
  const navigate = useNavigate();


  const handleSelfCheckChange = (key, value) => {
    setSelfCheckAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelfCheckSubmit = () => {
    const goodCount = Object.values(selfCheckAnswers).filter((v) => v === "good").length;
    let resultText = "";
    if (goodCount >= 2) {
      resultText =
        "기본 생활 습관은 꽤 좋은 편이에요! 이제 구체적인 목표와 일정을 잡으면 금방 눈에 보이는 변화가 나올 거예요.";
    } else {
      resultText =
        "지금은 습관을 조금만 더 손보면 확 좋아질 수 있는 단계예요. 마이페이지에서 목표·식단·운동을 같이 관리해보세요.";
    }
    setSelfCheckResult(resultText);
  };

  return (
    <div className="main-page">

      {/* 메인 배너 */}
      <section className="main-banner">
        <div className="banner-content">
          <h1 className="banner-title">당신만의 맞춤 다이어트 & 일정관리 AI 코치</h1>
          <p className="banner-sub">
            식단 · 운동 · 일정 · 기록까지 한 번에 관리하고, AI 코치와 함께 꾸준한 변화를 만들어보세요.
          </p>
          <button
            type="button"
            className="banner-cta-btn"
            onClick={() => {
              const el = document.getElementById("selfcheck-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              navigate("/self-check");
            }}
          >
            자가진단 시작하기
          </button>
        </div>
      </section>

      {/* 핵심 기능 섹션 */}
      <section className="features-section" id="program-section">
        {/* <h2 className="section-title">핵심 기능</h2> */}
        <div className="features-grid">
          <div className="feature-card">
            <h3>AI 맞춤 추천 (식단/운동)</h3>
            <p>나의 목표와 상태를 기반으로 식단과 운동 플랜을 AI가 함께 설계해줘요.</p>
          </div>
          <div className="feature-card">
            <h3>개인 스케줄 기반 일정 관리</h3>
            <p>학교·일정·약속에 맞춰 운동·식단 시간을 자동으로 배치해 드려요.</p>
          </div>
          <div className="feature-card">
            <h3>식단 기록 기반 분석</h3>
            <p>하루하루 기록한 식단을 바탕으로 섭취 패턴과 개선 포인트를 분석해요.</p>
          </div>
          <div className="feature-card">
            <h3>커뮤니티 지원</h3>
            <p>공지와 질문을 통해 다른 사람들과 함께 정보도 나누고, 의지도 유지해요.</p>
          </div>
        </div>
      </section>

      {/* 메인 플로우 */}
      <div className="main-flow-grid">

        {/* 프로그램 설명 */}
        <section className="main-card program-card">
          <h3 className="main-card-title">프로그램 설명</h3>
          <p className="main-card-text">
            Diet Agent는 <strong>다이어트 기록·목표·일정·AI 코칭</strong>을 한 화면에서 관리할 수 있는
            통합 헬스 매니저예요.
          </p>
          <ul className="program-list">
            <li>✔ 자가진단 결과를 바탕으로 한 맞춤 가이드</li>
            <li>✔ 마이페이지에서 나의 정보 / 다이어트 / 스케줄을 한 번에 관리</li>
            <li>✔ AI 코칭 챗봇으로 식단·운동 고민 즉시 상담</li>
          </ul>
        </section>

        {/* 자가진단 */}
        <section className="main-card selfcheck-card" id="selfcheck-section">
          <h3 className="main-card-title">자가진단</h3>
          <p className="main-card-text">지금 나의 생활 패턴을 간단히 체크해 보고, 결과로 방향을 잡아보세요.</p>

          <div className="selfcheck-question">
            <p>1. 하루 식사 패턴은 어떤가요?</p>
            <div className="selfcheck-options">
              <button
                type="button"
                className={selfCheckAnswers.diet === "good" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("diet", "good")}
              >
                규칙적으로 먹는다
              </button>
              <button
                type="button"
                className={selfCheckAnswers.diet === "bad" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("diet", "bad")}
              >
                불규칙하다
              </button>
            </div>
          </div>

          <div className="selfcheck-question">
            <p>2. 주당 운동 빈도는 어떤가요?</p>
            <div className="selfcheck-options">
              <button
                type="button"
                className={selfCheckAnswers.exercise === "good" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("exercise", "good")}
              >
                3회 이상 한다
              </button>
              <button
                type="button"
                className={selfCheckAnswers.exercise === "bad" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("exercise", "bad")}
              >
                거의 하지 않는다
              </button>
            </div>
          </div>

          <div className="selfcheck-question">
            <p>3. 수면 습관은 어떤가요?</p>
            <div className="selfcheck-options">
              <button
                type="button"
                className={selfCheckAnswers.sleep === "good" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("sleep", "good")}
              >
                규칙적으로 잔다
              </button>
              <button
                type="button"
                className={selfCheckAnswers.sleep === "bad" ? "option-btn active" : "option-btn"}
                onClick={() => handleSelfCheckChange("sleep", "bad")}
              >
                불규칙하다
              </button>
            </div>
          </div>

          <button type="button" className="selfcheck-submit-btn" onClick={handleSelfCheckSubmit}>
            결과 보기
          </button>

          {selfCheckResult && <p className="selfcheck-result">{selfCheckResult}</p>}
        </section>

      </div>
    </div>
  );
}
