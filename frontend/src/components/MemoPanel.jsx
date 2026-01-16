// src/components/MemoPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api/Axios"; // JWT 자동 포함된 Axios 인스턴스
import "./MemoPanel.css";

// 헬퍼 함수
const todayStr = () => new Date().toISOString().substring(0, 10);
const currentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function MemoPanel({ date, onClose, currentUserId }) {
  const [memoTitle, setMemoTitle] = useState("");
  const [internalMemoDate, setInternalMemoDate] = useState(todayStr());
  const [memoMode, setMemoMode] = useState("floating");
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);
  const [selectedEventsForDeletion, setSelectedEventsForDeletion] = useState(new Set());
  const [selectedEventForEditId, setSelectedEventForEditId] = useState(null);
  const [viewedEvent, setViewedEvent] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedMemo, setEditedMemo] = useState("");
  // 수정용 상태 변수 추가
  const [editedKind, setEditedKind] = useState("일반");
  const [editedTime, setEditedTime] = useState("09:00");
  const [editedEndDate, setEditedEndDate] = useState(todayStr());
  const [editedStartDate, setEditedStartDate] = useState(todayStr()); // editedStartDate 상태 추가 // editedEndDate 상태 추가




  const editorRef = useRef();
  const editableRef = useRef(null);

  const storageKey = currentUserId ? `scheduleLocal_${currentUserId}` : null;

  const fetchEventsFromBackend = async (targetDate) => {
    if (!currentUserId) {
      setEventsForSelectedDate([]);
      return;
    }
    try {
      const res = await api.get("/api/schedule/items", {
        params: { date: targetDate },
      });
      const fetchedEvents = res.data.items || [];
      setEventsForSelectedDate(fetchedEvents);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(fetchedEvents));
      }
    } catch (error) {
      console.error("Failed to fetch schedules from backend", error);
      setEventsForSelectedDate([]);
    }
  };

  useEffect(() => {
    if (date) {
      setIsEditing(false);
      setMemoMode("calendar");
      setInternalMemoDate(date);
      fetchEventsFromBackend(date);
      setViewedEvent(null);
      setSelectedEventsForDeletion(new Set());
    } else {
      setMemoMode("floating");
      setInternalMemoDate(todayStr());
      setMemoTitle("");
      if (editorRef.current) editorRef.current.innerText = "";
    }
  }, [date, currentUserId]);

  useEffect(() => {
    if (selectedEventForEditId && eventsForSelectedDate.length > 0) {
      const selected = eventsForSelectedDate.find(ev => ev.id === selectedEventForEditId);
      setViewedEvent(selected || null);
    } else {
      setViewedEvent(null);
    }
    setIsEditing(false);
  }, [selectedEventForEditId, eventsForSelectedDate]);

  const handleSaveMemo = async () => {
    if (!storageKey) {
      onClose();
      return;
    }
    const content = editorRef.current?.innerText || "";
    const currentTitle = memoMode === "floating" ? (memoTitle.trim() || "메모") : (viewedEvent?.title || "메모");
    const currentMemoDate = memoMode === "floating" ? internalMemoDate : date;

    if (!currentTitle.trim() || !currentMemoDate) {
      return;
    }

    try {
      await api.post("/api/schedule/items", {
        date: currentMemoDate,
        title: currentTitle,
        memo: content.trim(),
        // 플로팅 메모 저장 시 현재 시간, 기본 종류, 반복 없음으로 설정
        time: currentTimeStr(),
        kind: '일반',

      });

      window.dispatchEvent(new Event("schedule-updated"));
      if (memoMode === "floating") {
        onClose();
      } else {
        fetchEventsFromBackend(currentMemoDate);
        setMemoTitle("");
        if (editorRef.current) editorRef.current.innerText = "";
      }
    } catch (error) {
      console.error("Failed to save schedule", error);
    }
  };

  const handleEditButtonClick = async () => {
    if (!storageKey) return;

    if (isEditing) { // --- 저장 로직 ---
      if (!viewedEvent || !editedTitle.trim()) return;

      const currentEditedMemo = editedMemo || ""; // editedMemo 상태에서 직접 가져옴

      try {
                  await api.put(`/api/schedule/items/${viewedEvent.id}`, {
                    title: editedTitle,
                    memo: currentEditedMemo,
                    kind: editedKind,
                    time: editedTime,
                    end_date: editedEndDate,
                    date: editedStartDate, // 수정된 시작일 추가
                  });
        
                  window.dispatchEvent(new Event("schedule-updated"));
                  await fetchEventsFromBackend(viewedEvent.date);
                  
                  // Update viewedEvent with the new data locally to prevent flicker
                  const updatedEvent = {
                    ...viewedEvent,
                    title: editedTitle,
                    memo: currentEditedMemo,
                    kind: editedKind,
                    time: editedTime,
                    end_date: editedEndDate,
                    date: editedStartDate // 수정된 시작일 업데이트
                  };
        setViewedEvent(updatedEvent);

        setIsEditing(false);
      } catch (error) {
        console.error("Failed to update schedule", error);
      }
    } else { // --- 수정 모드 진입 로직 ---
      if (!selectedEventForEditId) return;
      
      const eventToEdit = eventsForSelectedDate.find(ev => ev.id === selectedEventForEditId);
      if (!eventToEdit) return;

      setViewedEvent(eventToEdit);
      setIsEditing(true);
      setEditedTitle(eventToEdit.title);
      setEditedMemo(eventToEdit.memo);
      
      // 수정 모드 진입 시 상태 초기화
      setEditedKind(eventToEdit.kind || '일반');
      setEditedTime(eventToEdit.time || '09:00');
      setEditedEndDate(eventToEdit.end_date || eventToEdit.date); // Initialize editedEndDate
      setEditedStartDate(eventToEdit.date); // Initialize editedStartDate

      if (editableRef.current) {
        editableRef.current.innerHTML = eventToEdit.memo || "";
      }
    }
  };

  const handleDeleteSelectedMemos = async () => {
    if (!storageKey || selectedEventsForDeletion.size === 0) return;

    try {
      await Promise.all(Array.from(selectedEventsForDeletion).map(id =>
        api.delete(`/api/schedule/items/${id}`)
      ));
      window.dispatchEvent(new Event("schedule-updated"));
      fetchEventsFromBackend(date);
      setSelectedEventsForDeletion(new Set());
      setViewedEvent(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to delete schedules", error);
    }
  };

  const handleCheckboxChange = (eventId) => {
    setSelectedEventsForDeletion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) newSet.delete(eventId);
      else newSet.add(eventId);

      if (newSet.size === 1) {
        setSelectedEventForEditId(newSet.values().next().value);
      } else {
        setSelectedEventForEditId(null);
      }
      return newSet;
    });
  };

  const repeatOptions = {
    "none": "반복 없음",
    "daily": "매일",
    "weekly": "매주",
    "weekday": "평일(월~금)"
  }

  return (
    <div className={`note-panel memo-mode-${memoMode}`}>
      <div className="note-header">
        <div className="header-left">
          <img src="/img/logo_2.png" className="logo-img" />
          <span className="logo-text">Today’s Wellness Log</span>
        </div>
        <div className="header-right">
          {memoMode === "floating" ? (
            <input type="date" className="date-picker" value={internalMemoDate} onChange={(e) => setInternalMemoDate(e.target.value)} />
          ) : (
            <input type="date" className="date-picker" value={internalMemoDate} onChange={(e) => {
              const newDate = e.target.value;
              setInternalMemoDate(newDate);
              window.dispatchEvent(new CustomEvent("memo-date-changed", { detail: newDate }));
            }} />
          )}
          <button className="note-close-btn" onClick={onClose}>✖</button>
        </div>
      </div>

      {memoMode === "floating" && (
        <>
          <input className="memo-title-input" placeholder="제목" value={memoTitle} onChange={(e) => setMemoTitle(e.target.value)} />
          <div className="note-area editor floating-content" contentEditable ref={editorRef} />
          <div className="note-footer">
            <button className="note-save-btn" onClick={handleSaveMemo}>저장</button>
          </div>
        </>
      )}

      {memoMode === "calendar" && (
        <div className="calendar-memo-view">
          <div className="event-list-container">
            <h4>{date} 일정 목록</h4>
            {eventsForSelectedDate.map((event) => (
              <div key={event.id} className={`event-item event-item-kind-${event.kind === '식사' ? 'diet' : event.kind === '운동' ? 'workout' : 'general'}`}>
                <input
                  type="checkbox"
                  checked={selectedEventsForDeletion.has(event.id)}
                  onChange={() => handleCheckboxChange(event.id)}
                />
                {isEditing && viewedEvent?.id === event.id ? (
                  <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                ) : (
                  <div className="event-item-title-text">
                    {event.title}
                    <div className="event-item-tags">
                      <span className="tag time-tag">{event.time}</span>
                      <span className="tag kind-tag">{event.kind}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="event-content-view">
            {(() => {
              if (!viewedEvent) return <p>내용을 보려면 일정을 선택하세요.</p>;
              
              if (isEditing) {
                return (
                  <div className="editing-form">
                    <div className="form-group-combined">
                      <label>기간</label>
                      <div className="input-pair">
                        <input type="date" value={editedStartDate} onChange={e => setEditedStartDate(e.target.value)} />
                        <span className="date-separator">~</span>
                        <input type="date" value={editedEndDate} onChange={e => setEditedEndDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group-combined">
                      <label>세부설정</label>
                      <div className="input-pair">
                        <input type="time" value={editedTime} onChange={e => setEditedTime(e.target.value)} />
                        <select value={editedKind} onChange={e => setEditedKind(e.target.value)}>
                          <option value="운동">운동</option>
                          <option value="식사">식사</option>
                          <option value="일반">일반</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      className="note-area editor calendar-content"
                      value={editedMemo}
                      onChange={(e) => setEditedMemo(e.target.value)}
                      rows={10}
                    />
                  </div>
                );
              } else {
                return (
                                    <div className="event-details">
                                      <p><strong>시작일:</strong> {viewedEvent.date}</p>
                                      <p><strong>종료일:</strong> {viewedEvent.end_date}</p>
                                      <p><strong>시간:</strong> {viewedEvent.time}</p>
                                      <p><strong>종류:</strong> {viewedEvent.kind}</p>
                                      <hr />
                                      <p className="memo-content-display">{viewedEvent.memo || ""}</p>
                                    </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {memoMode === "calendar" && (
        <div className="note-footer">
          <button className="note-edit-btn" onClick={handleEditButtonClick}>
            {isEditing ? "저장" : "수정"}
          </button>
          <button className="note-delete-btn" onClick={handleDeleteSelectedMemos}>
            삭제
          </button>
        </div>
      )}

      {memoMode === "calendar" && isEditing && (
                    <span className="edit-warning-text">
                      닫기버튼을 누를시 수정이 취소됩니다
                    </span>      )}
    </div>
  );
}