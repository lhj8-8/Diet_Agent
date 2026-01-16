import React, { useEffect, useState } from "react";
import api from "../api/Axios";
import "./CommunityPage.css";

export default function CommunityPage() {
  const [tab, setTab] = useState("notice"); // notice | ask | my | admin
  const [error, setError] = useState("");

  // notices
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // inquiry 작성
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionContent, setQuestionContent] = useState("");

  // my inquiries
  const [myInquiries, setMyInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // admin
  const isAdmin = (localStorage.getItem("role") === "admin");
  const [adminNoticeTitle, setAdminNoticeTitle] = useState("");
  const [adminNoticeContent, setAdminNoticeContent] = useState("");
  const [adminInquiries, setAdminInquiries] = useState([]);
  const [selectedAdminInquiry, setSelectedAdminInquiry] = useState(null);
  const [adminAnswer, setAdminAnswer] = useState("");

  const normalizeNotice = (n) => {
    if (!n) return null;
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      created_at: n.created_at || n.createdAt || "",
      view_count: n.view_count ?? n.viewCount ?? 0,
    };
  };

  const normalizeInquiry = (q) => {
    if (!q) return null;
    return {
      id: q.id,
      title: q.title,
      content: q.content,
      status: q.status,
      answer: q.answer,
      created_at: q.created_at || q.createdAt || "",
      answered_at: q.answered_at || q.answeredAt || "",
      user_email: q.user_email || q.userEmail || "",
      user_id: q.user_id || q.userId,
    };
  };

  const requireLoginMessage =
    "로그인이 필요합니다. 로그인 후 다시 시도해주세요.";

  const loadNotices = async () => {
    setError("");
    try {
      const res = await api.get("/api/community/notices");
      const raw = res.data?.notices || res.data?.items || [];
      setNotices(raw.map(normalizeNotice));
    } catch (e) {
      setError("공지사항을 불러오지 못했습니다.");
    }
  };

  const openNotice = async (id) => {
    setError("");
    try {
      const res = await api.get(`/api/community/notices/${id}`);
      setSelectedNotice(normalizeNotice(res.data?.notice || res.data));
    } catch (e) {
      setError("공지사항 상세를 불러오지 못했습니다.");
    }
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    setError("");

    if (!questionTitle.trim() || !questionContent.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await api.post("/api/community/inquiries", {
        title: questionTitle.trim(),
        content: questionContent.trim(),
      });
      setQuestionTitle("");
      setQuestionContent("");
      setTab("my");
      await loadMyInquiries();
    } catch (e) {
      if (e?.response?.status === 401) {
        setError(requireLoginMessage);
      } else {
        setError("문의 등록에 실패했습니다.");
      }
    }
  };

  const loadMyInquiries = async () => {
    setError("");
    try {
      const res = await api.get("/api/community/inquiries/my");
      setMyInquiries((res.data?.items || []).map(normalizeInquiry));
    } catch (e) {
      if (e?.response?.status === 401) setError(requireLoginMessage);
      else setError("내 문의 리스트를 불러오지 못했습니다.");
    }
  };

  const openInquiry = async (id) => {
    setError("");
    try {
      const res = await api.get(`/api/community/inquiries/${id}`);
      setSelectedInquiry(normalizeInquiry(res.data?.inquiry || res.data));
    } catch (e) {
      if (e?.response?.status === 401) setError(requireLoginMessage);
      else setError("문의 상세를 불러오지 못했습니다.");
    }
  };

  const adminCreateNotice = async (e) => {
    e.preventDefault();
    setError("");
    if (!adminNoticeTitle.trim() || !adminNoticeContent.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      await api.post("/api/community/notices", {
        title: adminNoticeTitle.trim(),
        content: adminNoticeContent.trim(),
      });
      setAdminNoticeTitle("");
      setAdminNoticeContent("");
      await loadNotices();
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("공지사항 등록에 실패했습니다.");
    }
  };

  const adminDeleteNotice = async (id) => {
    setError("");
    try {
      await api.delete(`/api/community/notices/${id}`);
      if (selectedNotice?.id === id) setSelectedNotice(null);
      await loadNotices();
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("공지사항 삭제에 실패했습니다.");
    }
  };

  const loadAdminInquiries = async () => {
    setError("");
    try {
      const res = await api.get("/api/community/admin/inquiries");
      setAdminInquiries((res.data?.items || []).map(normalizeInquiry));
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("전체 문의를 불러오지 못했습니다.");
    }
  };

  const openAdminInquiry = async (id) => {
    setError("");
    try {
      const res = await api.get(`/api/community/admin/inquiries/${id}`);
      const q = normalizeInquiry(res.data?.inquiry || res.data);
      setSelectedAdminInquiry(q);
      setAdminAnswer(q?.answer || "");
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("문의 상세를 불러오지 못했습니다.");
    }
  };

  const adminSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!selectedAdminInquiry) return;
    setError("");
    if (!adminAnswer.trim()) {
      setError("답변 내용을 입력해주세요.");
      return;
    }
    try {
      await api.post(`/api/community/admin/inquiries/${selectedAdminInquiry.id}/answer`, {
        answer: adminAnswer.trim(),
      });
      await loadAdminInquiries();
      await openAdminInquiry(selectedAdminInquiry.id);
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("답변 등록에 실패했습니다.");
    }
  };

  const adminDeleteInquiry = async (id) => {
    setError("");
    try {
      await api.delete(`/api/community/admin/inquiries/${id}`);
      if (selectedAdminInquiry?.id === id) setSelectedAdminInquiry(null);
      await loadAdminInquiries();
    } catch (e2) {
      if (e2?.response?.status === 403) setError("관리자 권한이 필요합니다.");
      else setError("문의 삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    // 탭 전환 시 필요한 데이터 로드
    if (tab === "notice") {
      loadNotices();
    } else if (tab === "my") {
      loadMyInquiries();
    } else if (tab === "admin") {
      loadNotices();
      loadAdminInquiries();
    }
  }, [tab]);

  return (
    <div className="community-container">
      <h1 className="community-title">커뮤니티</h1>

      <div className="community-tabs">
        <button
          className={tab === "notice" ? "active" : ""}
          onClick={() => {
            setSelectedNotice(null);
            setTab("notice");
          }}
        >
          공지사항
        </button>
        <button
          className={tab === "ask" ? "active" : ""}
          onClick={() => {
            setSelectedInquiry(null);
            setTab("ask");
          }}
        >
          문의하기
        </button>
        <button
          className={tab === "my" ? "active" : ""}
          onClick={() => {
            setSelectedInquiry(null);
            setTab("my");
          }}
        >
          내 문의
        </button>

        {isAdmin && (
          <button
            className={tab === "admin" ? "active" : ""}
            onClick={() => {
              setSelectedAdminInquiry(null);
              setTab("admin");
            }}
          >
            관리자
          </button>
        )}
      </div>

      {error && <div className="community-error">{error}</div>}

      {/* 공지사항 */}
      {tab === "notice" && (
        <div className="community-content">
          {!selectedNotice ? (
            <ul className="notice-list">
              {notices.map((n) => (
                <li
                  key={n.id}
                  className="notice-item"
                  onClick={() => openNotice(n.id)}
                >
                  <div className="notice-item-title">{n.title}</div>
                  <div className="notice-item-meta">
                    <span>{n.created_at}</span>
                    <span>조회수 {n.view_count}</span>
                  </div>
                </li>
              ))}
              {notices.length === 0 && (
                <li className="empty-state" role="listitem">공지사항이 없습니다.</li>
              )}
            </ul>
          ) : (
            <div className="notice-detail">
              <button
                className="back-btn"
                onClick={() => setSelectedNotice(null)}
              >
                ← 목록으로
              </button>
              <h2>{selectedNotice.title}</h2>
              <div className="notice-meta">
                <span>{selectedNotice.created_at}</span>
                <span>조회수 {selectedNotice.view_count}</span>
              </div>
              <p className="notice-body">{selectedNotice.content}</p>
            </div>
          )}
        </div>
      )}

      {/* 문의 작성 */}
      {tab === "ask" && (
        <div className="community-content">
          <form className="question-form" onSubmit={submitInquiry}>
            <input
              type="text"
              placeholder="제목"
              value={questionTitle}
              onChange={(e) => setQuestionTitle(e.target.value)}
            />
            <textarea
              placeholder="내용"
              value={questionContent}
              onChange={(e) => setQuestionContent(e.target.value)}
            />
            <button type="submit">문의하기</button>
          </form>
        </div>
      )}

      {/* 내 문의 */}
      {tab === "my" && (
        <div className="community-content">
          {!selectedInquiry ? (
            <ul className="inquiry-list">
              {myInquiries.map((q) => (
                <li
                  key={q.id}
                  className="inquiry-item"
                  onClick={() => openInquiry(q.id)}
                >
                  <div className="inquiry-title">{q.title}</div>
                  <div className="inquiry-meta">
                    <span className={`status ${q.status}`}>{q.status}</span>
                    <span>{q.created_at}</span>
                  </div>
                </li>
              ))}
              {myInquiries.length === 0 && (
                <li className="empty-state" role="listitem">문의 내역이 없습니다.</li>
              )}
            </ul>
          ) : (
            <div className="inquiry-detail">
              <button className="back-btn" onClick={() => setSelectedInquiry(null)}>
                ← 목록으로
              </button>
              <h2>{selectedInquiry.title}</h2>
              <div className="inquiry-meta">
                <span className={`status ${selectedInquiry.status}`}>
                  {selectedInquiry.status}
                </span>
                <span>{selectedInquiry.created_at}</span>
              </div>

              <div className="inquiry-body">
                <h3>내 문의</h3>
                <p>{selectedInquiry.content}</p>

                <h3>관리자 답변</h3>
                {selectedInquiry.answer ? (
                  <p>{selectedInquiry.answer}</p>
                ) : (
                  <p className="empty-answer">아직 답변이 등록되지 않았습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 관리자 */}
      {tab === "admin" && (
        <div className="community-content">
          <div className="admin-grid">
            <div className="admin-card">
              <h2 className="admin-title">공지사항 관리</h2>

              <form className="admin-form" onSubmit={adminCreateNotice}>
                <input
                  type="text"
                  placeholder="공지 제목"
                  value={adminNoticeTitle}
                  onChange={(e) => setAdminNoticeTitle(e.target.value)}
                />
                <textarea
                  placeholder="공지 내용"
                  value={adminNoticeContent}
                  onChange={(e) => setAdminNoticeContent(e.target.value)}
                />
                <button type="submit">공지 등록</button>
              </form>

              <ul className="notice-list admin">
                {notices.map((n) => (
                  <li key={n.id} className="notice-item">
                    <div className="notice-item-title">{n.title}</div>
                    <div className="notice-item-meta">
                      <span>{n.created_at}</span>
                      <span>조회수 {n.view_count}</span>
                    </div>
                    <div className="admin-actions">
                      <button type="button" onClick={() => openNotice(n.id)}>
                        보기
                      </button>
                      <button type="button" onClick={() => adminDeleteNotice(n.id)}>
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
                {notices.length === 0 && (
                  <li className="empty-state" role="listitem">공지사항이 없습니다.</li>
                )}
              </ul>
            </div>

            <div className="admin-card">
              <h2 className="admin-title">문의 관리</h2>

              {!selectedAdminInquiry ? (
                <ul className="inquiry-list admin">
                  {adminInquiries.map((q) => (
                    <li
                      key={q.id}
                      className="inquiry-item"
                      onClick={() => openAdminInquiry(q.id)}
                    >
                      <div className="inquiry-title">{q.title}</div>
                      <div className="inquiry-meta">
                        <span className={`status ${q.status}`}>{q.status}</span>
                        <span>{q.user_email || `userId:${q.user_id}`}</span>
                        <span>{q.created_at}</span>
                      </div>
                    </li>
                  ))}
                  {adminInquiries.length === 0 && (
                    <li className="empty-state" role="listitem">문의가 없습니다.</li>
                  )}
                </ul>
              ) : (
                <div className="inquiry-detail admin">
                  <button className="back-btn" onClick={() => setSelectedAdminInquiry(null)}>
                    ← 목록으로
                  </button>
                  <h2>{selectedAdminInquiry.title}</h2>
                  <div className="inquiry-meta">
                    <span className={`status ${selectedAdminInquiry.status}`}>
                      {selectedAdminInquiry.status}
                    </span>
                    <span>{selectedAdminInquiry.user_email || `userId:${selectedAdminInquiry.user_id}`}</span>
                    <span>{selectedAdminInquiry.created_at}</span>
                  </div>

                  <div className="inquiry-body">
                    <h3>문의 내용</h3>
                    <p>{selectedAdminInquiry.content}</p>

                    <h3>관리자 답변</h3>
                    <form className="admin-form" onSubmit={adminSubmitAnswer}>
                      <textarea
                        placeholder="답변을 입력하세요"
                        value={adminAnswer}
                        onChange={(e) => setAdminAnswer(e.target.value)}
                      />
                      <div className="admin-actions">
                        <button type="submit">답변 등록/수정</button>
                        <button type="button" onClick={() => adminDeleteInquiry(selectedAdminInquiry.id)}>
                          문의 삭제
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
