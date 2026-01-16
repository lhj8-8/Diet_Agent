import React from "react";
import "./IntroPage.css";
import ChatPage from "./ChatPage";
import { useNavigate } from "react-router-dom";
import "./ChatPage.css";

export default function IntroPage() {
  const navigate = useNavigate();

  return (
    <div className="intro-wrapper">
      <video autoPlay loop muted className="bg-video">
        <source src="/backvideo_6.mp4" type="video/mp4" />
      </video>
      <div className="robot-icon">
            🤖
      </div>
      {/* 상단 설명 영역 */}
      <div className="intro-card">
        <h1 className="intro-title">AGENT에 오신 것을 환영합니다</h1>

        <p className="intro-sub">
          당신의 하루를 함께 설계하는<br />
          <strong>AI 다이어트 스케줄 비서</strong>
        </p>

        <p className="intro-desc">
          가볍게 기록하고, 똑똑하게 관리하세요.<br />
          식단·운동·기분까지, AGENT가 한 번에 정리해드립니다.
        </p>

        {/* 버튼 영역 */}
        <div className="intro-btn-group">
          <button className="intro-btn" onClick={() => navigate("/main")}>
            바로 오늘 스케줄 작성하기
          </button>

          <button
            className="intro-btn intro-btn-outline"
            onClick={() => navigate("/self-check")}
          >
            자가진단 먼저 해보기
          </button>

          {/* 비회원 챗봇 버튼 */}
          <button
            className="intro-btn intro-btn-secondary"
            onClick={() => navigate("/guestchat")}
          >
            비회원 챗봇 체험하기
          </button>
        </div>
      </div>
    </div>
  );
}
