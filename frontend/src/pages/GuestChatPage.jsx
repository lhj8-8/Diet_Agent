// src/pages/ChatPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GuestChatPage.css"

export default function ChatPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profile, setProfile] = useState({
    focus: null,
    daysPerWeek: null,
    level: null,
  });

  const [assistantName, setAssistantName] = useState(
    () => localStorage.getItem("assistantName") || "Diet Agent"
  );
  const [assistantInput, setAssistantInput] = useState(assistantName);
  const [editingAssistant, setEditingAssistant] = useState(false);


  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "안녕하세요! 저는 AGENT AI 코치입니다.\n" +
        "먼저, 요즘 가장 집중하고 싶은 건 뭐예요?",
      options: [
        { key: "Hypertrophy", label: "근비대 / 운동", value: "Hypertrophy" },
        { key: "Diet", label: "다이어트 / 식단", value: "Diet" },
        { key: "Health", label: "건강 / 컨디션", value: "Health" },
      ],
    },
  ]);

  const [input, setInput] = useState("");

  const onboardingDone = onboardingStep >= 3;

  const handleAssistantSave = () => {
    const name = assistantInput.trim() || "Diet Agent";
    setAssistantName(name);
    try {
      localStorage.setItem("assistantName", name);
    } catch (e) {
      console.error("save assistantName error", e);
    }
    setEditingAssistant(false);
  };

  const handleAssistantCancel = () => {
    setAssistantInput(assistantName);
    setEditingAssistant(false);
  };

  const handleQuickPrompt = (type) => {
    let text = "";
    if (type === "today-diet") {
      text = "오늘 제 식단을 전체적으로 평가해줘.";
    } else if (type === "today-workout") {
      text = "오늘 가능하면 좋은 운동 루틴을 추천해줘.";
    } else if (type === "next-week-plan") {
      text = "내 기록과 스케줄을 기반으로 다음주 다이어트/운동 계획을 짜줘.";
    } else if (type === "records-feedback") {
      text = "최근 기록을 기반으로 식단/운동 피드백을 자세히 알려줘.";
    }
    if (!text) return;
    // 인풋에 바로 채워주기
    setInput(text);
  };
  const sessionId = "temp-session-123";

  const handleOptionClick = (msgIndex, option) => {
    // 🔹 회원가입 버튼 클릭 시
    if (option.value === "signup") {
      navigate("/signup");
      return;
    }
    if (option.value === "later") {
      return;
    }

    if (onboardingStep === 0) {
      setMode(option.value);
      setProfile((prev) => ({ ...prev, focus: option.value }));

      const userText = `저는 ${option.label} 쪽이 더 중요해요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: "user", text: userText });
        next.push({
          from: "bot",
          text:
            "좋아요! 그럼 현실적으로 일주일에 몇 번 정도 운동이나 자기 관리를 할 수 있을 것 같아요?",
          options: [
            { key: "2", label: "주 2회", value: 2 },
            { key: "3", label: "주 3회", value: 3 },
            { key: "4", label: "주 4회 이상", value: 4 },
          ],
        });
        return next;
      });

      setOnboardingStep(1);
      return;
    }

    if (onboardingStep === 1) {
      setProfile((prev) => ({ ...prev, daysPerWeek: option.value }));

      const userText = `일주일에 ${option.label} 정도는 할 수 있을 것 같아요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: "user", text: userText });
        next.push({
          from: "bot",
          text: "알겠습니다! 마지막으로, 본인을 어느 정도 수준이라고 생각하세요?",
          options: [
            { key: "beginner", label: "완전 초보", value: "beginner" },
            { key: "intermediate", label: "중간 정도", value: "intermediate" },
            { key: "advanced", label: "상급 / 오래 해봄", value: "advanced" },
          ],
        });
        return next;
      });

      setOnboardingStep(2);
      return;
    }

    if (onboardingStep === 2) {
      setProfile((prev) => ({ ...prev, level: option.value }));

      const userText = `제 수준은 ${option.label} 쯤인 것 같아요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: "user", text: userText });

        const planText = `
- 목표: ${profile.focus}
- 주당 운동 횟수: ${profile.daysPerWeek}회
- 현재 수준: ${option.label}
        `;

        next.push({
          from: "bot",
          text:
            "좋아요! 지금까지 정보를 바탕으로 추천 계획을 만들어봤어요:\n\n" +
            planText +
            "\n더 궁금한 점 있으시면 언제든 질문해 주세요 🙂",
        });

        // 🔹 회원가입 유도 메시지
        next.push({
          from: "bot",
          text: "회원가입하시면 더 다양한 맞춤 계획을 받아볼 수 있어요. 지금 회원가입하시겠어요?",
          options: [
            { key: "signup", label: "회원가입", value: "signup" },
            { key: "later", label: "나중에", value: "later" },
          ],
        });

        return next;
      });

      setOnboardingStep(3);
      return;
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    const userInput = input;
    setInput("");

    if (!onboardingDone) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "먼저 위의 선택지로 정보를 알려주세요!",
        },
      ]);
      return;
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          mode: mode || "Hypertrophy",
          message: userInput,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { from: "bot", text: data.reply || "AI 응답 오류" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "현재 데모 모드입니다." },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div className="chat-title">
            <span className="logo">{assistantName}</span>
            <span className="subtitle">AI 코칭 비서</span>
          </div>
          <div className="chat-assistant-info">
            <span className="assistant-label">AI 비서 이름:</span>
            {!editingAssistant ? (
              <>
                <span className="assistant-name">"{assistantName}"</span>
                <button
                  type="button"
                  className="assistant-edit-btn"
                  onClick={() => {
                    setAssistantInput(assistantName);
                    setEditingAssistant(true);
                  }}
                >
                  이름 변경하기
                </button>
              </>
            ) : (
              <div className="assistant-edit-row">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="AI 비서 이름을 입력하세요"
                />
                <button
                  type="button"
                  className="assistant-save-btn"
                  onClick={handleAssistantSave}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="assistant-cancel-btn"
                  onClick={handleAssistantCancel}
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="chat-suggested-row">
          <span className="chat-suggested-label">빠른 질문</span>
          <div className="chat-suggested-buttons">
            <button
              type="button"
              className="suggested-btn"
              onClick={() => handleQuickPrompt("today-diet")}
            >
              오늘 식단 평가
            </button>
            <button
              type="button"
              className="suggested-btn"
              onClick={() => handleQuickPrompt("today-workout")}
            >
              운동 추천
            </button>
            <button
              type="button"
              className="suggested-btn"
              onClick={() => handleQuickPrompt("next-week-plan")}
            >
              다음주 계획 생성
            </button>
            <button
              type="button"
              className="suggested-btn"
              onClick={() => handleQuickPrompt("records-feedback")}
            >
              나의 기록 피드백
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble ${msg.from}`}>
              <p>{msg.text}</p>

              {msg.options && (
                <div className="option-row">
                  {msg.options.map((op) => (
                    <button
                      key={op.key}
                      className="option-btn"
                      onClick={() => handleOptionClick(index, op)}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="chat-input-bar">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
          />
          <button className="send-btn" onClick={sendMessage}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
