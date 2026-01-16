import { useEffect, useState } from "react";
import "./SettingPage.css";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState(false);

  // 최초 로드 시 로컬 설정 반영
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const noti = localStorage.getItem("notification");

    if (theme === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }

    if (noti === "true") {
      setNotification(true);
    }
  }, []);

  // 다크 모드 토글
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);

    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  // 알림 토글
  const toggleNotification = () => {
    const next = !notification;
    setNotification(next);
    localStorage.setItem("notification", next);
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h2 className="settings-title">시스템 설정</h2>
          <p className="settings-subtitle">서비스 환경을 사용자 취향에 맞게 최적화하세요.</p>
        </header>

        <div className="settings-main">
          {/* 섹션 1: 화면 설정 */}
          <section className="settings-section">
            <h3 className="section-label">화면 설정</h3>
            <div className="setting-item">
              <div className="item-info">
                <span className="item-name">다크 모드</span>
                <p className="item-desc">눈의 피로를 줄여주는 어두운 테마를 적용합니다.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={darkMode} onChange={toggleTheme} />
                <span className="slider"></span>
              </label>
            </div>
          </section>

          {/* 섹션 2: 알림 설정 */}
          <section className="settings-section">
            <h3 className="section-label">알림 설정</h3>
            <div className="setting-item">
              <div className="item-info">
                <span className="item-name">푸시 알림</span>
                <p className="item-desc">새로운 소식과 업데이트 정보를 실시간으로 받습니다.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={notification} onChange={toggleNotification} />
                <span className="slider"></span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
