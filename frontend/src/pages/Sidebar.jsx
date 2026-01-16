import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import {
  FiHome,
  FiActivity,
  FiBookOpen,
  FiTarget,
  FiSettings,
  FiLogOut,
  FiBarChart2
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ open, setOpen, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 선택된 메뉴 상태
  const [activeMenu, setActiveMenu] = useState("홈");

  // 페이지 처음 렌더링 시 URL에 맞게 초기값 설정
  useEffect(() => {
    switch (location.pathname) {
      case "/home":
        setActiveMenu("홈");
        break;
      case "/main":
        setActiveMenu("내 현황");
        break;
      case "/myinfo":
        setActiveMenu("내 정보");
        break;
      case "/diet":
        setActiveMenu("다이어트 관리");
        break;
      case "/schedule":
        setActiveMenu("스케줄");
        break;
      case "/settings":
        setActiveMenu("설정");
        break;
      default:
        setActiveMenu(""); // 없는 페이지면 선택 해제
    }
  }, []); // 빈 배열 -> 처음 렌더링 시 한 번만 실행

  // 메뉴 클릭 시 상태 업데이트 + 페이지 이동
  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    if (path) navigate(path);
  };

  return (
    <div className={`sidebar-large ${open ? "open" : "closed"}`}>
      {/* 🔹 상단 로고 */}
      <div className="sidebar-top">
        <div className="sidebar-logo" onClick={() => setOpen(!open)}>
          <img src="/img/logo_2.png" alt="Diet Agent" className="logo-img" />
          {open && (
            <div className="logo-text-box">
              <span className="logo-text">Diet Agent</span>
            </div>
          )}
        </div>
      </div>

      {/* 🔹 메뉴 */}
      <div className="sidebar-menu">
        <div
          className={`menu-item ${activeMenu === "홈" ? "active" : ""}`}
          onClick={() => handleMenuClick("홈", "/home")}
        >
          <FiHome />
          {open && <span>홈</span>}
        </div>

        <div
          className={`menu-item ${activeMenu === "내 정보" ? "active" : ""}`}
          onClick={() => handleMenuClick("내 정보", "/myinfo")}
        >
          <FiActivity />
          {open && <span>내 정보</span>}
        </div>

        <div
          className={`menu-item ${activeMenu === "내 현황" ? "active" : ""}`}
          onClick={() => handleMenuClick("내 현황", "/main")}
        >
          <FiBarChart2 />
          {open && <span>내 현황</span>}
        </div>

        <div
          className={`menu-item ${activeMenu === "다이어트 관리" ? "active" : ""}`}
          onClick={() => handleMenuClick("다이어트 관리", "/diet")}
        >
          <FiBookOpen />
          {open && <span>다이어트 관리</span>}
        </div>

        <div
          className={`menu-item ${activeMenu === "스케줄" ? "active" : ""}`}
          onClick={() => handleMenuClick("스케줄", "/schedule")}
        >
          <FiTarget />
          {open && <span>스케줄</span>}
        </div>
      </div>

      {/* 🔹 하단 */}
      <div className="sidebar-footer">
        <div
          className={`menu-item ${activeMenu === "설정" ? "active" : ""}`}
          onClick={() => handleMenuClick("설정", "/settings")}
        >
          <FiSettings />
          {open && <span>설정</span>}
        </div>

        <div
          className="menu-item logout"
          onClick={() => {
            onLogout();
            handleMenuClick("로그아웃", "/login");
          }}
        >
          <FiLogOut />
          {open && <span>로그아웃</span>}
        </div>
      </div>
    </div>
  );
}
