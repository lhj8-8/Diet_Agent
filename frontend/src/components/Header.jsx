// Header.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

function Header({ loggedIn, onLogout, user }) {
  const navigate = useNavigate();

  return (
    <header className="auth-header">
      <div className="auth-header-inner">
        
        {/* 로고 */}
        <div className="auth-logo" onClick={() => navigate("/")}>
          <img src="/img/logo_2.png" alt="logo" className="logo-icon" />
          <span className="auth-logo-text">Diet Agent</span>
        </div>

        {/* 메뉴 */}
        <nav className="auth-nav">
          <button className="auth-nav-item" onClick={() => navigate("/programs")}>
            프로그램
          </button>
          <button className="auth-nav-item" onClick={() => navigate("/self-check")}>
            자가진단
          </button>
          <button className="auth-nav-item" onClick={() => navigate("/community")}>
            커뮤니티
          </button>
        </nav>



      </div>
    </header>
  );
}

export default Header;
