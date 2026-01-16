import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from  "../api/Axios"
import "./LoginPage.css";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const res = await api.post("/api/user/signup", {
        email,
        userId,
        password,
      });

      setMessage(res.data.message || "회원가입 성공!");
      navigate("/login");
    } catch (err) {
      setMessage("회원가입 실패");
      console.error(err);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* 공통 로고 */}
        <div className="login-logo">
          <h2 className="login-title">
            <img src="/img/logo_2.png" alt="Diet Agent" />
            Diet Agent
          </h2>
          <span className="login-tagline">
            회원가입을 통해 시작해보세요 ✨
          </span>
        </div>

        {/* 회원가입 폼 */}
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="signup-submit">
            회원가입
          </button>
        </form>

        <div className="signup-row">
          <span>이미 계정이 있으신가요?</span>
          <button
            type="button"
            className="signup-btn"
            onClick={() => navigate("/login")}
          >
            로그인
          </button>
        </div>

        {message && <div className="login-message">{message}</div>}
      </div>
    </div>
  );
}