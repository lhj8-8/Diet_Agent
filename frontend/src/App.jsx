// App.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "./api/Axios.jsx";

import Header from "./components/Header.jsx";
import Sidebar from "./pages/Sidebar.jsx";

import IntroPage from "./pages/IntroPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MainPage from "./pages/MainPage.jsx";
import Programs from "./pages/Programs.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import MyInfoPage from "./pages/MyInfoPage.jsx";
import WorkoutPage from "./pages/WorkoutPage.jsx";
import DietPage from "./pages/DietPage.jsx";
import DietTabPage from "./pages/DietTabPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import SelfCheckPage from "./pages/SelfCheckPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import FloatingActionBar from "./components/FloatingActionBar";
import ChatbotWindow from "./components/Chatbot.jsx";
import GuestChatPage from "./pages/GuestChatPage.jsx";
import NewsDetailPage from "./pages/NewsDetailPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import MemoPanel from "./components/MemoPanel"; 

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const isIntro = location.pathname === "/";
  const isLogin = location.pathname === "/login";
  const isSignUp = location.pathname === "/signup";
  // 커뮤니티에서도 사이드바/레이아웃이 유지되도록 처리(요청사항)
  const isCommunity = location.pathname.startsWith("/community");

  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [open, setOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoDate, setMemoDate] = useState(new Date().toISOString().substring(0, 10));


  const editorRef = useRef();
  const chatRef = useRef();
  const memoRef = useRef();
  const memoButtonRef = useRef(null);
  const floatingActionBarRef = useRef(null); // New ref for FloatingActionBar
  const chatToggleButtonRef = useRef(null); // New ref for chatbot toggle button

  const handleDrop = (e) => {
  e.preventDefault();
  };

  /* =========================
     🔐 앱 시작 시 토큰으로 로그인 복구
     ========================= */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setAuthChecked(true);
      return;
    }

    api
      // ✅ 일부 환경에서 interceptor 타이밍/헤더 누락으로 422가...
      .get("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data);
        setLoggedIn(true);
        // ✅ 기존 페이지들이 localStorage.userId를 참조하는 경우가 있어 호환용으로 저장
        if (res?.data?.id) localStorage.setItem("userId", String(res.data.id));
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        setUser(null);
        setLoggedIn(false);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  /* =========================
     로그인 / 로그아웃
     ========================= */
  const handleLoginSuccess = (accessToken) => {
    // 1) 토큰 저장
    localStorage.setItem("accessToken", accessToken);

    // 2) ✅ 바로 메인으로 이동(풀리로드 없이) - 유저가 체감상 "로그인 성공 후 안 넘어감" 방지
    //    /me 조회는 백그라운드에서 처리하고, 실패하면 다시 로그인으로 보냄
    setLoggedIn(true);
    navigate("/main", { replace: true });

    // 3) 유저 정보 로드(/me)
    api
      .get("/api/user/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        setUser(res.data);
        if (res?.data?.id) localStorage.setItem("userId", String(res.data.id));
      })
      .catch(() => {
        // 토큰이 있어도 /me 실패 시 안전하게 로그아웃 처리
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        setUser(null);
        setLoggedIn(false);
        navigate("/login", { replace: true });
      });
  };

const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    setUser(null);
    setLoggedIn(false);
    navigate("/login", { replace: true });
  };

  /* =========================
     바깥 클릭 감지
     ========================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (memoOpen && 
        memoRef.current && 
        !memoRef.current.contains(e.target)&&
        memoButtonRef.current &&
        !memoButtonRef.current.contains(e.target) &&
        floatingActionBarRef.current && // Check if FloatingActionBar ref exists
        !floatingActionBarRef.current.contains(e.target) // And if click is NOT inside FloatingActionBar
      ) {
        setMemoOpen(false);
      }
      if (chatOpen &&
        chatRef.current &&
        !chatRef.current.contains(e.target) &&
        chatToggleButtonRef.current && // Check if chat toggle button ref exists
        !chatToggleButtonRef.current.contains(e.target) // And if click is NOT on the chat toggle button
      ) {
        setChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [memoOpen, chatOpen, floatingActionBarRef, chatToggleButtonRef]); // Add chatToggleButtonRef to dependencies

    // 캘린더에서 날짜 클릭 시 메모장 자동 오픈을 위한 이벤트 리스너 추가
            useEffect(() => {
              const handleOpenMemo = (e) => {
                if (e.detail) {
                  setMemoDate(e.detail); // 이벤트에서 전달된 날짜로 상태 업데이트
                }
                setMemoOpen(true);     // 메모장 열기
              };
              window.addEventListener("open-memo-by-date", handleOpenMemo);
              return () => {
                window.removeEventListener("open-memo-by-date", handleOpenMemo);
              };
            }, []); // 앱이 시작될 때 단 한 번만 실행

            // MemoPanel에서 날짜 변경 시 App.jsx의 memoDate 업데이트를 위한 이벤트 리스너 추가
            useEffect(() => {
              const handleMemoDateChanged = (e) => {
                if (e.detail) {
                  setMemoDate(e.detail);
                }
              };
              window.addEventListener("memo-date-changed", handleMemoDateChanged);
              return () => {
                window.removeEventListener("memo-date-changed", handleMemoDateChanged);
              };
            }, []);

  if (!authChecked) return null;

  const showSidebar = !isIntro && loggedIn; // ✅ community 포함

  return (
    <div className="app-wrapper">
      {/* 🔵 인트로 페이지가 아닐 때만 Header 표시 */}
      {!isIntro && <Header loggedIn={loggedIn} user={user} onLogout={handleLogout} />}

      <div className="layout-row">
        {/* 🔵 로그인 되었고 인트로가 아닐 때만 사이드바 표시 */}
        {showSidebar && (
          <Sidebar open={open} setOpen={setOpen} onNavigate={(p) => navigate(p)} onLogout={handleLogout}/>
        )}

        <div
          className="main-content"
          style={{
            marginLeft: showSidebar ? (open ? 30 : -10) : 0,
            marginTop: !isIntro ? 70 : 0,
          }}
        >
          <Routes>
            <Route path="/" element={<IntroPage />} />
            <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/news-detail/:id" element={<NewsDetailPage />} />
            <Route path="/guestchat" element={<GuestChatPage />} />
            <Route path="/self-check" element={<SelfCheckPage />} />
            <Route path="/main" element={<RequireLogin><MainPage /></RequireLogin>} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/myinfo" element={<RequireLogin><MyInfoPage /></RequireLogin>} />
            <Route path="/diet" element={<RequireLogin><DietPage /></RequireLogin>} />
            <Route path="/diettab" element={<RequireLogin><DietTabPage /></RequireLogin>} />
            <Route path="/workout" element={<RequireLogin><WorkoutPage /></RequireLogin>} />
            <Route path="/schedule" element={<RequireLogin><SchedulePage /></RequireLogin>} />
            <Route path="/community" element={<RequireLogin><CommunityPage /></RequireLogin>} />
            <Route path="/settings" element={<RequireLogin><SettingsPage /></RequireLogin>} />
          </Routes>
        </div>
      </div>

      {/* ✔ 오른쪽 아래 Floating Action Buttons (챗봇 등) */}
      {!isIntro && !isLogin && !isSignUp && <FloatingActionBar ref={floatingActionBarRef} />}
      
      {/* ✔ 오른쪽 아래 Floating Action Buttons */}
      {!isIntro && !isLogin && !isSignUp &&(
        <>
          {chatOpen && 
          <div ref={chatRef}><ChatbotWindow /></div>}
          <div
            className="chatbot-toggle-btn"
            ref={chatToggleButtonRef}
            onClick={() => {
              setChatOpen(prev => !prev); // 이전 상태를 기반으로 토글
            }}
          >
            💬
          </div>
          <div
            className="note-floating-btn"
            ref={memoButtonRef}
            onClick={() => {
              setMemoDate(null); // 날짜를 null로 설정하여 '새 메모 작성' 모드로 열리게 함
              setMemoOpen(!memoOpen);
            }}>
            📝
          </div>
            {memoOpen && (
              <div ref={memoRef}>
                <MemoPanel
                  date={memoDate}
                  onClose={() => setMemoOpen(false)}
                  currentUserId={user?.id} // Pass the user ID here
                />
              </div>
            )}              
            </>
      )}
    </div>
  );
}


export default App;


// -----------------------------------------
// 로그인 체크용
// -----------------------------------------
function RequireLogin({ children }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("accessToken");
    if (!id) {
      navigate("/login", { replace: true });
    } else {
      setAuthed(true);
    }
    setChecked(true);
  }, [navigate]);

  if (!checked) return null;
  return authed ? children : null;
}
