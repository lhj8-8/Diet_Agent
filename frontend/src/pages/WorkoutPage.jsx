import { useEffect, useMemo, useState } from "react";
import "./WorkoutPage.css";
import api from "../api/Axios";
import WorkoutRecommend from "../components/WorkoutRecommend"; // Import the new WorkoutRecommend component

const todayStr = () => new Date().toISOString().substring(0, 10);





function parseDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export default function WorkoutPage() {
  // ✅ 기존 코드 호환용(userId localStorage) + JWT 기반 id 확보
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

  // 운동 기록
  const [logForm, setLogForm] = useState({
    date: todayStr(),
    name: "",
    minutes: "",
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // 1) /me로 userId 확보(없으면 기존 localStorage 사용)
    (async () => {
      try {
        const me = await api.get("/api/user/me");
        if (me?.data?.id) {
          const idStr = String(me.data.id);
          setUserId(idStr);
          localStorage.setItem("userId", idStr);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchWorkoutLogs = async () => {
      try {
        const response = await api.get("/api/schedule/items", {
          params: { kind: "운동" } // Fetch only workout type schedules
        });
        // Transform schedule items to workout log format
        const fetchedLogs = (response.data.items || []).map(item => ({
          id: item.id,
          date: item.date,
          name: item.title,
          minutes: parseInt(item.memo) || 0, // Assuming memo contains minutes as a number string
        }));
        setLogs(fetchedLogs);
      } catch (e) {
        console.error("Failed to fetch workout logs from backend:", e);
        setLogs([]); // Clear logs on error
      }
    };

    fetchWorkoutLogs();

  }, [userId]); // Depend on userId



  const handleLogChange = (field, value) => {
    setLogForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logForm.name.trim()) return;

    // Use a temporary ID for local state until backend ID is known (if needed, but for this approach, we wait for backend)
    // No direct newLog creation with Date.now() here, as we rely on backend for ID.

    try {
      // ✅ 캘린더 스케줄에도 추가 (운동명 = 제목, 운동 시간 = 내용)
      const scheduleRes = await api.post("/api/schedule/items", {
        date: logForm.date,
        title: logForm.name,
        memo: `${logForm.minutes || 0}분`,
        kind: "운동", // '운동' 종류로 고정
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }), // 현재 시간
      });

      const backendScheduleItem = scheduleRes.data.item; // Get the full item from backend
      if (!backendScheduleItem || !backendScheduleItem.id) {
        console.warn("handleAddLog: Backend did not return a valid schedule item. Log not added to frontend state correctly.");
        return; // Exit if no ID is returned, to prevent bad data in state
      }

      // Transform schedule item to workout log format for local state
      const newWorkoutLog = {
        id: backendScheduleItem.id,
        date: backendScheduleItem.date,
        name: backendScheduleItem.title,
        minutes: parseInt(backendScheduleItem.memo) || 0, // Extract minutes from memo
      };

      setLogs((prev) => {
        const next = [newWorkoutLog, ...prev]; // Prepend the new workout log
        // No localStorage.setItem here anymore as localStorage is no longer the source of truth
        // Instead, the fetchWorkoutLogs on mount will handle refreshing localStorage.
        return next;
      });

      // ✅ 스케줄 페이지에 캘린더 업데이트 이벤트 전파
      window.dispatchEvent(new CustomEvent("schedule-updated"));

    } catch (e) {
      console.error("save workout log to calendar schedule error", e);
    }

    setLogForm((prev) => ({
      ...prev,
      name: "",
            minutes: "",
    }));
  };
  const handleDeleteLog = async (id) => {
    try {
      await api.delete(`/api/schedule/items/${id}`); // Change to schedule items API

      setLogs((prev) => {
        const next = prev.filter((log) => log.id !== id);
        // No localStorage.setItem here anymore as localStorage is no longer the source of truth
        return next;
      });

      // ✅ 스케줄 페이지에 캘린더 업데이트 이벤트 전파
      window.dispatchEvent(new CustomEvent("schedule-updated"));

    } catch (e) {
      console.error("delete workout log error", e);
      // Optionally show a message to the user that deletion failed
    }
  };
  const recentWeekTotalMinutes = useMemo(() => {
    if (!logs.length) return 0;
    const today = new Date(todayStr());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    return logs.reduce((sum, log) => {
      const d = parseDate(log.date);
      if (!d || !log.minutes) return sum;
      if (d >= sevenDaysAgo && d <= today) {
        return sum + Number(log.minutes || 0);
      }
      return sum;
    }, 0);
  }, [logs]);

  const groupedByDate = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const filteredSortedDates = useMemo(() => {
    const today = new Date(); // Get fresh current date
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    return sortedDates.filter(dateStr => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0); // Normalize to start of day
      return d >= sevenDaysAgo && d <= today;
    });
  }, [sortedDates]); // Only depend on sortedDates, as 'today' is generated freshly

  

  return (
    <div className="workout-page">
      <div className="workout-container">
        
                {/* 추천 운동 루틴 */}
                <WorkoutRecommend />
        


        {/* 운동 기록 */}
        <section className="workout-section">

          <div className="workout-log-grid">
            <div className="workout-card">
              <div className="workout-card-header">
                <h3>운동 기록하기</h3>
              </div>
              <form className="workout-card-body" onSubmit={handleAddLog}>
                <div className="form-group">
                  <label>날짜</label>
                  <input
                    type="date"
                    className="date-input"
                    value={logForm.date}
                    onChange={(e) => handleLogChange("date", e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>운동명</label>
                  <input
                    type="text"
                    value={logForm.name}
                    onChange={(e) => handleLogChange("name", e.target.value)}
                    placeholder="예: 하체 루틴, 상체 근력운동 등"
                  />
                </div>

                <div className="form-group">
                  <label>운동 시간 (분)</label>
                  <input
                    type="number"
                    value={logForm.minutes}
                    onChange={(e) => handleLogChange("minutes", e.target.value)}
                    placeholder="예: 30"
                  />
                </div>

                <button type="submit" className="primary-btn">
                  기록 저장
                </button>
              </form>
            </div>

            <div className="workout-card">
              <div className="workout-card-header">
                <h3>운동 기록 요약</h3>
              </div>
              <div className="workout-card-body workout-log-list">
                <div className="week-total">
                  최근 7일 운동 총합:{" "}
                  <span className="highlight">
                    {recentWeekTotalMinutes ? `${recentWeekTotalMinutes}분` : "0분"}
                  </span>
                </div>

                {filteredSortedDates.length === 0 ? (
                  <p className="empty-text">아직 운동 기록이 없습니다.</p>
                ) : (
                  filteredSortedDates.map((d) => (
                    <div key={d} className="log-date-block">
                      <div className="log-date-header">
                        <span className="log-date-text">{d}</span>
                      </div>
                      <ul className="log-itemm">
                        {groupedByDate[d].map((log) => (
                          <li key={log.id} className="custom-log-item">
                            <div className="log-main">
                              <span className="log-name">{log.name}</span>
                            </div>

                            <div className="log-right">
                              <button
                                className="log-delete"
                                onClick={() => handleDeleteLog(log.id)}
                              >
                                삭제
                              </button>

                              {log.minutes != null && (
                                <span className="log-minutes">
                                  {log.minutes}분
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}