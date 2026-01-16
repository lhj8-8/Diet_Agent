import React, { useEffect, useRef, useState } from "react";
import "./ChatPage.css";
import MarkdownMessage from "../components/chat/MarkdownMessage";

function makeSessionId() {
  const key = "chat_session_id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, v);
  }
  return v;
}

export default function ChatPage() {
  const [sessionId] = useState(() => makeSessionId());
  const accessToken = localStorage.getItem("accessToken");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const endRef = useRef(null);
  const canSend = input.trim().length > 0 && !loading;

  // 🟢 초기 메시지 + 사용자 정보 불러오기
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!accessToken) {
        setMessages([
          {
            role: "assistant",
            content:
              "안녕하세요! 당신의 하루를 함께 설계하는\nAI 다이어트 스케줄 비서 에이전트입니다 🙂\n무엇을 도와드릴까요?",
          },
        ]);
        return;
      }

      try {
        const res = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("사용자 정보 불러오기 실패");

        const data = await res.json();
        setUserInfo(data);

        setMessages([
          {
            role: "assistant",
            content:
              "안녕하세요! 당신의 하루를 함께 설계하는\nAI 다이어트 스케줄 비서 에이전트입니다 🙂\n무엇을 도와드릴까요?",
          },
        ]);
      } catch (e) {
        setMessages([
          {
            role: "assistant",
            content:
              "안녕하세요! 당신의 하루를 함께 설계하는\nAI 다이어트 스케줄 비서 에이전트입니다 🙂\n무엇을 도와드릴까요?",
          },
        ]);
      }
    };

    loadUserInfo();
  }, [accessToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ✅ 로그 불러오기
  useEffect(() => {
    const loadLogs = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch(`/api/ai/logs?limit=30`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.items) && data.items.length > 0) {
          const mapped = data.items.map((it) => ({
            role: it.role === "assistant" ? "assistant" : "user",
            content: it.message,
          }));
          setMessages((prev) => [...prev, ...mapped]);
        }
      } catch (e) {}
    };
    loadLogs();
  }, [accessToken]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    if (!accessToken) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "로그인 후 사용 가능합니다. (오른쪽 상단 로그인)" },
      ]);
      setInput("");
      return;
    }

    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.reply || data?.error || `HTTP ${res.status}`);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "(응답 없음)" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ 서버 연결/응답 오류.\n\n" +
            "체크:\n1) Flask가 켜져있나? (127.0.0.1:5000)\n2) Vite proxy 적용됐나? (/api → Flask)\n" +
            `\n에러: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chatpage">
      <div className="chat-card">
        <div className="chat-header">
          <div className="chat-title">AI 비서와의 맞춤 코칭</div>
        </div>

        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role === "user" ? "right" : "left"}`}>
              <div className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
                <MarkdownMessage text={m.content} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="msg-row left">
              <div className="bubble assistant">…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="chat-inputbar">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력하세요 (Enter 전송 / Shift+Enter 줄바꿈)"
            rows={1}
          />
          <button className="chat-send" onClick={send} disabled={!canSend}>
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
