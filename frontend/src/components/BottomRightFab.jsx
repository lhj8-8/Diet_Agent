import React, { useState } from "react";
import "./BottomRightFab.css";
import ChatbotWindow from "../components/Chatbot.jsx";
import NoteWindow from "../components/NoteWindow.jsx"; 
// 메모장 새 파일이라고 가정

export default function BottomRightFab() {
  const [chatOpen, setChatOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <>
      {/* 오른쪽 아래 FAB 버튼 그룹 */}
      <div className="bottom-right-fab">

        {/* 📝 메모장 버튼 */}
        <button
          className="fab-btn note-btn"
          onClick={() => setNoteOpen(!noteOpen)}
        >
          📝
        </button>

        {/* 💬 챗봇 버튼 */}
        <button
          className="fab-btn chat-btn"
          onClick={() => setChatOpen(!chatOpen)}
        >
          💬
        </button>
      </div>

      {/* 팝업 창들 */}
      {chatOpen && <ChatbotWindow />}
      {noteOpen && <NoteWindow />}
    </>
  );
}