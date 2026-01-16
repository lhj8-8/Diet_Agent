import { useEffect, useMemo, useState } from "react";
import api from "../api/Axios"; // Use pre-configured api instance
import "./SchedulePage.css";

const todayStr = () => new Date().toISOString().substring(0, 10);

const currentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const buildMonthDays = (monthStr) => {
  // monthStr: "YYYY-MM"
  const [year, month] = monthStr.split("-").map((v) => parseInt(v, 10));
  if (!year || !month) return [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days = [];

  // Calendar starts on Sunday
  const startOffset = firstDay.getDay(); // 0 (Sun) ~ 6 (Sat)
  for (let i = 0; i < startOffset; i++) {
    days.push({ key: `prev-${i}`, date: null });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ key: dateStr, date: dateStr });
  }

  // Fill to multiple of 7
  while (days.length % 7 !== 0) {
    days.push({ key: `next-${days.length}`, date: null });
  }

  return days;
};

export default function SchedulePage() {
  const [date, setDate] = useState(todayStr());
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("일반"); // 운동 / 식사 / 일반
  const [timeStr, setTimeStr] = useState(currentTimeStr());
  const [endDate, setEndDate] = useState(todayStr()); // end_date 상태 추가
  const [month, setMonth] = useState(todayStr().substring(0, 7)); // YYYY-MM
  const [localEvents, setLocalEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedDates, setHighlightedDates] = useState(new Set());
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const userId = localStorage.getItem("userId");

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setHighlightedDates(new Set());
      setGlobalSearchResults([]);
      return;
    }

    setIsSearching(true);
    setGlobalSearchResults([]); // 이전 검색 결과 초기화
    try {
      const res = await api.get('/api/schedule/search', {
        params: { query: searchTerm },
      });
      const results = res.data.items || [];
      setGlobalSearchResults(results);

      const matchingDates = new Set();
      results.forEach(ev => {
        if (ev.end_date && ev.date !== ev.end_date) {
            let currentDate = new Date(ev.date);
            currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
            const lastDate = new Date(ev.end_date);
            lastDate.setMinutes(lastDate.getMinutes() + lastDate.getTimezoneOffset());

            while(currentDate <= lastDate) {
                matchingDates.add(currentDate.toISOString().substring(0, 10));
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            matchingDates.add(ev.date);
        }
      });
      setHighlightedDates(matchingDates);

    } catch (error) {
      console.error("Global search error", error);
      setGlobalSearchResults([]);
      setHighlightedDates(new Set());
    } finally {
      setIsSearching(false);
    }
  };

  // 월 단위 스케줄 로딩
  const fetchMonthSchedules = async (currentMonth) => {
    if (!userId || !currentMonth) {
      setLocalEvents([]);
      return;
    };
    try {
      const res = await api.get(`/api/schedule/month`, {
        params: { month: currentMonth },
      });
      setLocalEvents(res.data.items || []); // 월 전체 스케줄로 localEvents 업데이트
    } catch (error) {
      console.error("get month schedule error", error);
      setLocalEvents([]); // Clear events on error
    }
  };

  // 컴포넌트 마운트 또는 월이 변경될 때 월간 스케줄 로드
  useEffect(() => {
    fetchMonthSchedules(month);
  }, [userId, month]);

  useEffect(() => {
    // "메모장" 또는 다른 곳에서 일정 변경 시 화면 자동 새로고침
    const handleScheduleUpdated = () => {
      fetchMonthSchedules(month); // 현재 '월'의 스케줄을 다시 불러옴
    };
    window.addEventListener("schedule-updated", handleScheduleUpdated);
    return () => {
      window.removeEventListener("schedule-updated", handleScheduleUpdated);
    };
  }, [userId, month]); // month가 변경될 때마다 리스너가 재등록되도록

  const handleAdd = async () => {
    if (!userId) {
      setMessage("로그인 후 이용해주세요.");
      return;
    }
    if (!title.trim()) {
      setMessage("일정명을 입력해주세요.");
      return;
    }
    try {
      await api.post(`/api/schedule/items`, {
        date,
        end_date: endDate,
        title,
        memo,
        kind,
        time: timeStr, // Backend expects 'time' or 'start_time'
      });

      setTitle("");
      setMemo("");
      setKind("일반"); // Reset kind
      setTimeStr("09:00"); // Reset time
      setEndDate(todayStr()); // Reset end_date
      setMessage("일정이 저장되었습니다.");
      await fetchMonthSchedules(month); // 월 단위로 스케줄 다시 로드
    } catch (error) {
      console.error("save schedule error", error);
      setMessage("저장 중 오류가 발생했습니다.");
    }
  };


  const monthDays = useMemo(() => buildMonthDays(month), [month]);

  const eventsByDate = useMemo(() => {
    const map = {};
    localEvents.forEach((ev) => {
      if (!ev.date) return;
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    console.log("eventsByDate recalculated:", map); // Debug print
    return map;
  }, [localEvents]);

  const handleMonthChange = (e) => {
    setMonth(e.target.value || todayStr().substring(0, 7));
  };



  return (
    <div className="main-page">
      <div className="main-layout">
        <div className="main-left">
          <header className="main-header">
            <h1>스케줄 관리</h1>
            <p className="main-subtitle">
              월간 캘린더에서 식사 · 운동 · 중요한 일정을 한 눈에 확인해보세요.
            </p>
          </header>

          {/* Monthly Calendar */}
          <section className="calendar-section">
            <div className="calendar-header-row">
              <div>
                <h2 className="section-title">Monthly Calendar</h2>

              </div>
              <div className="month-picker">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> {/* New flex container for label and input */}
                  <label>날짜 선택</label>
                  <input
                    type="month"
                    value={month}
                    onChange={handleMonthChange}
                  />
                </div>
              </div>
            </div>

            <div className="calendar-grid">
              <div className="calendar-weekday">일</div>
              <div className="calendar-weekday">월</div>
              <div className="calendar-weekday">화</div>
              <div className="calendar-weekday">수</div>
              <div className="calendar-weekday">목</div>
              <div className="calendar-weekday">금</div>
              <div className="calendar-weekday">토</div>

              {monthDays.map((d) => {
                if (!d.date) {
                  return <div key={d.key} className="calendar-cell empty" />;
                }
                const day = parseInt(d.date.substring(8, 10), 10);
                const evts = eventsByDate[d.date] || [];

                const singleDayEvents = evts.filter(
                  (e) => !e.end_date || e.date === e.end_date
                );
                const singleDietEvents = singleDayEvents.filter(
                  (e) => e.kind === "식사"
                );
                const singleWorkoutEvents = singleDayEvents.filter(
                  (e) => e.kind === "운동"
                );
                const singleGeneralEvents = singleDayEvents.filter(
                  (e) => e.kind === "일반"
                );

                const periodEventsForCell = localEvents.filter(
                  (ev) =>
                    ev.date !== ev.end_date &&
                    d.date >= ev.date &&
                    d.date <= ev.end_date
                );
                const periodDietEvents = periodEventsForCell.filter(
                  (e) => e.kind === "식사"
                );
                const periodWorkoutEvents = periodEventsForCell.filter(
                  (e) => e.kind === "운동"
                );
                const periodGeneralEvents = periodEventsForCell.filter(
                  (e) => e.kind === "일반"
                );

                return (
                  <div
                    key={d.key}
                    className={[
                      "calendar-cell",
                      d.date === date ? "selected" : "",
                      highlightedDates.has(d.date) ? "search-highlight" : "",
                    ].join(" ")}
                    onClick={() => {
                      setDate(d.date); // 기존 날짜 선택 로직
                      // MemoPanel이 수신할 전역 이벤트 발생
                      window.dispatchEvent(
                        new CustomEvent("open-memo-by-date", { detail: d.date })
                      );
                    }}
                  >
                    <div className="calendar-day-number">{day}</div>
                    {/* Single-day events row */}
                    <div className="calendar-dots">
                      <div className="dot-placeholder">
                        {singleGeneralEvents.length > 0 && (
                          <span className="dot general-dot" title="일반 일정" />
                        )}
                      </div>
                      <div className="dot-placeholder">
                        {singleDietEvents.length > 0 && (
                          <span className="dot diet-dot" title="식사 스케줄" />
                        )}
                      </div>
                      <div className="dot-placeholder">
                        {singleWorkoutEvents.length > 0 && (
                          <span className="dot workout-dot" title="운동 일정" />
                        )}
                      </div>
                    </div>
                    {/* Period events row */}
                    <div className="calendar-dots period-dots">
                      <div className="dot-placeholder">
                        {periodGeneralEvents.length > 0 && (
                          <span className="dot general-dot" title="일반 기간 일정" />
                        )}
                      </div>
                      <div className="dot-placeholder">
                        {periodDietEvents.length > 0 && (
                          <span className="dot diet-dot" title="식사 기간 스케줄" />
                        )}
                      </div>
                      <div className="dot-placeholder">
                        {periodWorkoutEvents.length > 0 && (
                          <span className="dot workout-dot" title="운동 기간 일정" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="calendar-footer">
              <div className="calendar-legend">
                <span>
                  <span className="dot diet-dot" /> 식사
                </span>
                <span>
                  <span className="dot workout-dot" /> 운동
                </span>
                <span>
                  <span className="dot general-dot" /> 일반
                </span>
              </div>

              {/* Search Group Wrapper */}
              <div className="search-group">
                <div className="search-result-dropdown">
                  {isSearching ? (
                    <div className="form-group">
  
                      <select disabled><option>검색 중...</option></select>
                    </div>
                  ) : (
                    globalSearchResults.length > 0 && (
                      <div className="form-group">
    
                        <select
                          value={date} // Control component with current date
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            setDate(selectedDate);
                            setMonth(selectedDate.substring(0, 7));
                            window.dispatchEvent(
                              new CustomEvent("open-memo-by-date", { detail: selectedDate })
                            );
                          }}
                        >
                          {[...highlightedDates].sort().map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  )}
                </div>

                <div className="search-feature">
                                  <input
                                    type="text"
                                    placeholder="제목/내용 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSearch();
                                      }
                                    }}
                                  />                  <button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="main-right">
          <div className="note-card">
            <div className="note-header">
              <div className="note-subtitle">Today's Schedule</div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>시작일</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>종료일</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>종류</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="운동">운동</option>
                  <option value="식사">식사</option>
                  <option value="일반">일반</option>
                </select>
              </div>
              <div className="form-group">
                <label>시간</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}

              />
            </div>



            <div className="form-group">
              <label>메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="오늘의 식단, 운동, 목표 등을 자유롭게 기록해보세요..."
                rows={15}
              />
            </div>

            <button className="save-btn" onClick={handleAdd}>
              일정 추가
            </button>

          </div>


        </div>
      </div>
    </div>
  );
}