import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TABS = [
  { key: "weight", label: "체중", unit: "kg" },
  { key: "exercise_calories", label: "소모 칼로리", unit: "kcal" },
  { key: "calories", label: "섭취 칼로리", unit: "kcal" },
];

// 최근 7일 날짜의 틀
const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return days;
};

export default function WeeklyTrendCard({ data, isDummy }) {
  const [activeTab, setActiveTab] = useState("weight");

  const isCurrentDummy = isDummy?.[activeTab];

  /* ===== 그래프 설정 ===== */
  const [showSettings, setShowSettings] = useState(false);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [yMin, setYMin] = useState("");
  const [yMax, setYMax] = useState("");
  const [yTickCount, setYTickCount] = useState(5);
  const [showYAxisTicks, setShowYAxisTicks] = useState(true); // ✅ 추가

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data[activeTab])) return [];

    const raw = data[activeTab];
    const map = new Map(raw.map((d) => [d.date, d.value]));

    return getLast7Days().map((date) => ({
      date,
      // value가 0이면 null로 바꿔서 그래프 점 안 찍힘
      value: map.has(date) ? (map.get(date) !== 0 ? map.get(date) : null) : null,
    }));
  }, [data, activeTab]);

  const unit = TABS.find((t) => t.key === activeTab)?.unit ?? "";

  const delta = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;

    // 첫 유효값 찾기
    const firstValid = chartData.find(d => d.value !== null);
    // 마지막 유효값 찾기 (거꾸로)
    const lastValid = [...chartData].reverse().find(d => d.value !== null);

    if (!firstValid || !lastValid) return null;

    const diff = lastValid.value - firstValid.value;
    return { value: diff, isUp: diff > 0 };
  }, [chartData]);

  const yDomain = useMemo(() => {
    if (useCustomRange && yMin !== "" && yMax !== "") {
      return [Number(yMin), Number(yMax)];
    }
    return ["auto", "auto"];
  }, [useCustomRange, yMin, yMax]);

  // weeklyStats에서 모든 value 배열을 합쳐서 min/max 계산
  const getYAxisDomain = (data) => {
    if (!data || data.length === 0) return [0, 10]; // 안전 fallback

    const values = data.map(d => Number(d.value) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // 값이 모두 0이면 fallback
    if (min === 0 && max === 0) return [0, 10];

    const padding = (max - min) * 0.1; // 상하 10% 여유
    return [Math.max(0, min - padding), max + padding];
  };

  return (
    <div className="weekly-trend-card">
      {/* 헤더 */}
      <div className="weekly-card-header">
        <div className="weekly-card-title">📊 주간 추세</div>

        <div className="weekly-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`weekly-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="weekly-graph-setting">
        {isCurrentDummy && (
          <div className="weekly-dummy-badge">샘플 데이터로 표시중</div>
        )}

        {delta && (
          <div className={`weekly-delta-badge ${delta.isUp ? "up" : "down"}`}>
            {delta.isUp ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)} {unit}
          </div>
        )}

        <div className="weekly-setting-right">
        {/* 설정 버튼 */}
          <div style={{ marginTop: 10 }}>
            <button
              className="chart-option-btn"
              onClick={() => setShowSettings(true)}
            >
              ⚙ 그래프 설정
            </button>
          </div>
        </div>
      </div>

      {/* 그래프 */}
      <div className="weekly-card-body">
        {chartData.length === 0 ? (
          <div className="weekly-empty">최근 7일 기록이 없어요</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 30, right: 24, left: 10, bottom: 10 }}
            >
              <XAxis
                dataKey="date"
                padding={{ left: 20, right: 20}}
                tick={{ fontSize: 17, fill: "#374151", dy: 15 }}
                axisLine={{ stroke: "#4B5563", strokeWidth: 1 }} // 진하게
                // tickFormatter={(d) => toKoreanWeekday(new Date(d))}
              />

              <YAxis
                domain={getYAxisDomain(data[activeTab])}
                tickCount={yTickCount}
                tick={showYAxisTicks ? { fontSize: 15, fill: "#374151", dx: -15 } : false} // ✅ 적용
                 axisLine={{ stroke: "#555b64", strokeWidth: 1 }}
              />

              <Tooltip
                formatter={(v) => [`${v} ${unit}`, ""]}
                contentStyle={{
                  borderRadius: 10,
                  border: "none",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
                }}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#4338CA"
                strokeWidth={4}
                dot={{ r: 6, fill: "#fff", strokeWidth: 3 }}
                activeDot={{ r: 8 }}
                label={{
                    position: "top", // 점 위에 표시
                    offset: 15,
                    fontSize: 15,
                    fontWeight: 600,
                    fill: "#111827", // 글자 색
                    formatter: (value) => `${value}` // 숫자 포맷
                }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ===== 설정 모달 ===== */}
      {showSettings && (
        <div className="chart-modal-backdrop">
          <div className="chart-modal">
            <h3>그래프 설정</h3>

            <label>
              <input
                type="checkbox"
                checked={useCustomRange}
                onChange={(e) => setUseCustomRange(e.target.checked)}
              />
              Y축 범위 직접 설정
            </label>

            {useCustomRange && (
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="최소값 (예: 65)"
                  value={yMin}
                  onChange={(e) => setYMin(e.target.value)}
                />
                <span>~</span>
                <input
                  type="number"
                  placeholder="최대값 (예: 75)"
                  value={yMax}
                  onChange={(e) => setYMax(e.target.value)}
                />
              </div>
            )}

            <label>
              Y축 숫자 표시
              <input
                type="checkbox"
                checked={showYAxisTicks}
                onChange={(e) => setShowYAxisTicks(e.target.checked)}
              />
            </label>

            <label>
              Y축 눈금 개수
              <input
                type="number"
                min={3}
                max={10}
                value={yTickCount}
                onChange={(e) => setYTickCount(Number(e.target.value))}
              />
            </label>

            <div className="modal-actions">
              <button onClick={() => setShowSettings(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
