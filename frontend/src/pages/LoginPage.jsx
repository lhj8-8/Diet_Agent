import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/Axios';
import "./LoginPage.css"

export default function LoginPage({ onLoginSuccess }) {
  // const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();


    const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/api/user/login", {
        email,
        password,
      });

      // role 저장(관리자 기능 노출용)
      const role = response?.data?.role;
      if (role) localStorage.setItem("role", role);

      // 로그인 성공 처리
      const accessToken = response?.data?.accessToken;
      if (!accessToken) {
        setMessage("로그인 응답에 토큰이 없습니다. (accessToken)");
        return;
      }

      // 부모(App)에서 토큰 저장 + /main 이동 처리
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(accessToken);
      } else {
        localStorage.setItem("accessToken", accessToken);
        navigate("/main", { replace: true });
      }

      setMessage(response.data.message || "로그인 성공!");
    } catch (err) {
      setMessage("이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* 로고 */}
        <div className="login-logo">
          <h2 className="login-title">
            <img src="/img/logo_2.png" alt="Diet Agent" />
            Diet Agent
          </h2>
          <span className="login-tagline">
            오늘도 당신의 변화를 함께할게요 ❤️
          </span>
        </div>

        {/* 로그인 폼 */}
        <div className="login-actions">
          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="login-submit">
              로그인
            </button>
          </form>

          <div className="signup-row">
            <span>아직 계정이 없으신가요?</span>
            <button
              type="button"
              className="signup-btn"
              onClick={() => navigate("/signup")}
            >
              회원가입
            </button>
          </div>
        </div>

        {message && <div className="login-message">{message}</div>}
      </div>
    </div>
  );
}
