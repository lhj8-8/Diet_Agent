import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import "./Chatbot.css";

export default function ChatbotWindow() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "안녕하세요! 무엇을 도와드릴까요? 😊" },
  ]);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const accessToken = localStorage.getItem("accessToken");

  /* =========================
     Scroll control refs
  ========================= */
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // Detect whether user scrolled up
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    // if user is near bottom, keep auto-scroll ON
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  // Scroll to bottom after messages update (when allowed)
  useLayoutEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  /* =========================
     Load recent logs (JWT)
  ========================= */
  useEffect(() => {
    const loadLogs = async () => {
      if (!accessToken) return;

      try {
        const res = await fetch(`/api/ai/logs?limit=20`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data?.items) && data.items.length > 0) {
          const mapped = data.items.map((it) => ({
            from: it.role === "assistant" ? "bot" : "user",
            text: it.message,
          }));

          // Force scroll to bottom once after loading logs
          shouldAutoScrollRef.current = true;
          setMessages(mapped);
        }
      } catch (e) {
        // ignore
      }
    };

    loadLogs();
  }, [accessToken]);

  /* =========================
     Send message
  ========================= */
  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!accessToken) {
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "로그인 후 사용 가능합니다. (오른쪽 상단 로그인)",
        },
      ]);
      return;
    }

    const text = input.trim();
    shouldAutoScrollRef.current = true;

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      shouldAutoScrollRef.current = true;
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: data.reply || "응답 오류" },
      ]);
    } catch (e) {
      shouldAutoScrollRef.current = true;
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "서버 연결 오류" },
      ]);
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <div className="chatbot-window">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
        </div>

        <button
          className="chatbot-detail-button"
          onClick={() => navigate("/chat")}
          title="챗 상세 화면"
        >
          🤖
        </button>
      </div>

      {/* Messages */}
      <div
        className="chatbot-messages"
        ref={listRef}
        onScroll={handleScroll}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.from}`}>
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chatbot-input-box">
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}
