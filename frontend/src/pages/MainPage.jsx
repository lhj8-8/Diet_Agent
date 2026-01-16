import React, { useEffect, useMemo, useState } from "react";
import "./MainPage.css";
import {
  FiHeart, FiBarChart2, FiTarget, FiCalendar, FiUser,
  FiUserCheck, FiActivity, FiClock, FiCheckCircle
} from "react-icons/fi";
import api from "../api/Axios";
import WeeklyTrendCard from "../components/WeeklyTrendCard";

const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

const last7Days = getLast7Days();

const DUMMY_WEEKLY = {
  exercise_calories: last7Days.map((d, i) => ({
    date: d,
    value: [30, 45, 20, 50, 40, 60, 25][i],
  })),
  weight: last7Days.map((d, i) => ({
    date: d,
    value: [72.4, 72.1, 71.9, 71.8, 71.6, 71.5, 71.3][i],
  })),
  calories: last7Days.map((d, i) => ({
    date: d,
    value: [2100, 1950, 1800, 2000, 1900, 2200, 1850][i],
  })),
};

// 모달 컴포넌트
function Modal({ title, content, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div>{content}</div>
        <button className="close-btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

function toKoreanWeekday(d) {
  const map = ["일", "월", "화", "수", "목", "금", "토"];
  return map[d.getDay()];
}

function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MainPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateYMD(today), [today]);
  const dayName = useMemo(() => toKoreanWeekday(today), [today]);

  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);

  const [profile, setProfile] = useState(null);
  const [calorieSummary, setCalorieSummary] = useState(null);

  const [openModal, setOpenModal] = useState(null);
  const [todayExerciseKcal, setTodayExerciseKcal] = useState(0); // 오늘 운동으로 소모된 칼로리

  // ✅ 2. state
  const [weeklyStats, setWeeklyStats] = useState({
    weight: [],
    activity: [],
    calories: [],
  });

  // ✅ 3. 비교
  const [isDummy, setIsDummy] = useState({
    weight: false,
    exercise_calories: false, // 'activity' 대신 'exercise_calories'
    calories: false,
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const mapToWeekly = (rows) =>
    (rows || []).map((r) => {
      const d = new Date(r.date);
      return {
        date: toKoreanWeekday(d),
        value: Number(r.value),
      };
    });

  useEffect(() => {
    // 로그인 안 한 상태면: 데모 데이터는 보여주지 않고 안내만
    if (!token) {
      setNotAuthed(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        // 1) 내 정보
        const me = await api.get("/api/user/me");
        setProfile(me.data || null);

        // 2) 오늘 요약(칼로리/운동/적자 등) - 없으면 summary: null
        const sum = await api.get(`/api/diet/today/summary?date=${todayStr}`);
        setCalorieSummary(sum.data || null);

        // ✅ 2.1) 오늘 운동 기록 로드 및 소모 칼로리 계산
        const MINUTES_TO_KCAL_RATE = 5; // 1분당 5kcal 소모 가정
        const workoutRes = await api.get("/api/schedule/items", {
          params: { kind: "운동" }
        });
        const todayWorkouts = (workoutRes.data.items || []).filter(item => item.date === todayStr);
        const totalWorkoutMinutesToday = todayWorkouts.reduce((acc, item) => {
          const minutesMatch = item.memo ? item.memo.match(/(\d+)분/) : null;
          return acc + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
        }, 0);
        setTodayExerciseKcal(totalWorkoutMinutesToday * MINUTES_TO_KCAL_RATE);


        // 3) 주간 추세 데이터 (체중 / 활동량 / 칼로리)
        // 3) 주간 추세 데이터 (체중 / 소모 칼로리 / 섭취 칼로리)
        const [weightRes, calorieRes] = await Promise.all([ // activityRes 제거
          api.get("/api/stats/weekly/weight"),
          api.get("/api/stats/weekly/calories"),
        ]);

        const hasWeight = weightRes.data?.some(item => Number(item.value) > 0);
        const hasCalories = calorieRes.data?.some(item => Number(item.value) > 0);

        // 주간 운동 기록 가져오기 및 소모 칼로리 계산
        const MINUTES_TO_KCAL_RATE_WEEKLY = 5; // 주간 계산에도 1분당 5kcal 가정
        const weeklyWorkoutRes = await api.get("/api/schedule/items", {
          params: { kind: "운동" }
        });
        const allWorkouts = weeklyWorkoutRes.data.items || [];

        // 날짜별로 운동 시간을 합산하여 칼로리로 변환 - 요일에서 날짜 기준으로 변경
        const weeklyExerciseCalories = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);

          const dateStr = formatDateYMD(d); // YYYY-MM-DD

          const workoutsOnDay = allWorkouts.filter(
            (item) => item.date === dateStr
          );

          const totalMinutes = workoutsOnDay.reduce((acc, item) => {
            const match = item.memo?.match(/(\d+)분/);
            return acc + (match ? parseInt(match[1]) : 0);
          }, 0);

          weeklyExerciseCalories.push({
            date: dateStr,
            value: totalMinutes * MINUTES_TO_KCAL_RATE_WEEKLY,
          });
        }

        const hasExerciseCalories = weeklyExerciseCalories.some(item => item.value > 0);

        setWeeklyStats({
          weight: hasWeight ? weightRes.data : DUMMY_WEEKLY.weight,
          exercise_calories: hasExerciseCalories ? weeklyExerciseCalories : DUMMY_WEEKLY.exercise_calories, // 'activity' 대신 'exercise_calories'
          calories: hasCalories ? calorieRes.data : DUMMY_WEEKLY.calories,
        });

        setIsDummy({
          weight: !hasWeight,
          exercise_calories: !hasExerciseCalories, // 'activity' 대신 'exercise_calories'
          calories: !hasCalories,
        });

        setNotAuthed(false);
      } catch (e) {
        // 토큰 만료/불일치 -> 401
        const status = e?.response?.status;
        if (status === 401) {
          setNotAuthed(true);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, todayStr]);

  // --------- 표시용 계산 ---------

  const [goalData, setGoalData] = useState({
  calories: 0,
  protein: 0,
  activityKcal: 0,
  startWeight: 0,
  targetWeight: 0,
  type: "loss",
  startDate: "",
  endDate: "",
  updatedAt: null
});

  const intakeKcal = calorieSummary?.total_calories ?? 0;

  // 🔥 목표는 tdee ❌ → goalData.calories ✅
  const targetKcal = goalData?.calories ?? 0;

  // 남은 칼로리
  const remainingKcal = Math.max(0, targetKcal - intakeKcal);

  // 달성률
  const percentKcal =
    targetKcal > 0
      ? Math.min(100, Math.round((intakeKcal / targetKcal) * 100))
      : 0;


  const remainingExerciseKcal = useMemo(() => {
    if (!token) return 0;

    const goal = Number(goalData.activityKcal) || 0;
    const used = Number(todayExerciseKcal) || 0;

    return Math.max(goal - used, 0);
  }, [token, goalData.activityKcal, todayExerciseKcal]);


  const percentExerciseKcal = useMemo(() => {
    if (!token) return 0;

    const goal = Number(goalData.activityKcal) || 0;
    if (goal === 0) return 0;

    const used = Number(todayExerciseKcal) || 0;

    return Math.min(Math.round((used / goal) * 100), 100);
  }, [token, goalData.activityKcal, todayExerciseKcal]);


  const proteinSum = calorieSummary?.total_protein ?? 0;
  const targetProtein = 120;
  const proteinPercent = targetProtein > 0 ? Math.min(100, Math.round((proteinSum / targetProtein) * 100)) : 0;

  const exerciseKcal = todayExerciseKcal; // 오늘 운동 기록에서 계산된 칼로리 사용

  

  const currentWeight = (profile && profile.weight != null) ? Number(profile.weight) : null;

  // 안내 문구(데모 제거)
  const dietCoachMessage = useMemo(() => {
    if (!token) {
      return "로그인 후 식단 기록 기반 코칭을 받을 수 있어요.";
    }
    if (!calorieSummary) {
      return "오늘 식단을 기록하면 영양소 기반 코칭이 제공돼요 🙂";
    }
    if (proteinSum >= 80) {
      return "오늘 단백질 섭취는 좋은 편이에요:) 채소와 수분도 함께 챙겨볼까요?";
    }
    if (proteinSum >= 50) {
      return "단백질이 조금 부족해요. 한 끼에 단백질 반찬을 추가해보세요!";
    }
    return "오늘은 단백질 섭취가 많이 부족해요😢 닭가슴살·두부·계란을 추천해요!";
  }, [token, calorieSummary, proteinSum]);


  const calorieCoachMessage = useMemo(() => {
    if (!token) {
      return "로그인 후 칼로리 기반 코칭을 받을 수 있어요.";
    }
    if (!calorieSummary) {
      return "오늘 섭취한 식단을 기록하면 칼로리 코칭이 제공돼요 🙂";
    }
    if (intakeKcal >= targetKcal) {
      return "오늘 목표 칼로리를 넘겼어요🔥 자기 전 30분 가벼운 산책이나 스트레칭을 추천드려요!";
    }
    if (percentKcal >= 80) {
      return "오늘 칼로리 섭취는 목표에 잘 맞고 있어요:)";
    }
    return "아직 칼로리에 여유가 있어요! 균형 잡힌 간식 정도는 괜찮아요🙂";
  }, [token, calorieSummary, intakeKcal, targetKcal, percentKcal]);

  const showEmpty = !loading && token && !calorieSummary;

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        // 1) diet_goals 먼저 조회
        const res = await api.get("/api/diet/goal");
        console.log("diet_goals:", res.data);

        // calories, protein, activityKcal 중 하나라도 0이면 fallback
        const hasValidDietGoal = res?.data && 
          (res.data.calories > 0 || res.data.protein > 0 || res.data.activityKcal > 0);

        if (hasValidDietGoal) {
          setGoalData(res.data);
          return;
        }
        console.log("diet_goals 값이 0이거나 없음, nutrition_goal 조회");

      } catch (err) {
        console.log("diet_goal 조회 실패, nutrition_goal 조회");
      }

      try {
        // 2) user_nutrition_goal 조회
        const res2 = await api.get("/api/user/nutrition_goal");
        if (res2?.data) {
          setGoalData({
            calories: res2.data.calories ?? 0,
            protein: res2.data.protein ?? 0,
            activityKcal: res2.data.activity_kcal ?? 0,
            type: "loss",
            startWeight: null,
            targetWeight: null,
            startDate: null,
            endDate: null,
            updatedAt: null
          });
        }
      } catch (err) {
        console.log("nutrition_goal 없음");
      }
    };
    fetchGoal();
  }, []);

  return (
    <div className="diet-app">
      <main className="diet-main">
        <div className="diet-header-area">
          <div className="diet-section-title">
            <span className="main-page-date">{todayStr} ({dayName})</span>
          </div>
        </div>
        <section className="diet-column diet-left">


          {notAuthed && (
            <div style={{ marginBottom: 12, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.85)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>로그인이 필요해요</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                지금 화면은 데모가 아니라 <b>실제 DB 기록</b>을 기반으로 보여줍니다.
                로그인 후 이용해주세요.
              </div>
            </div>
          )}

          <div className="diet-cards-grid">
            {/* 칼로리 */}
            <div className={`diet-card highlight ${showEmpty ? "is-empty" : ""}`}>
              <div className="diet-card-label">오늘 섭취 칼로리</div>
              <div className="diet-card-value">
                {token ? intakeKcal.toLocaleString() : "-"}<span className="diet-card-unit">kcal</span>
              </div>
              <div className="diet-card-sub">
                목표 {token ? goalData.calories.toLocaleString() : "-"} kcal · 남은 {token ? remainingKcal.toLocaleString() : "-"} kcal
              </div>
              <div className="diet-progress">
                <div className="diet-progress-bar" style={{ width: token ? `${percentKcal}%` : "0%" }} />
              </div>
              <div className="diet-progress-sub">{token ? `${percentKcal}% 달성` : "로그인 필요"}</div>
            </div>

            {/* 단백질 */}
            <div className={`diet-card ${showEmpty ? "is-empty" : ""}`}>
              <div className="diet-card-label">단백질</div>
              <div className="diet-card-value">
                {token ? proteinSum.toLocaleString() : "-"}<span className="diet-card-unit">g</span>
              </div>
              <div className="diet-card-sub">목표 {token ? goalData.protein : "-"} g</div>
              <div className="diet-pill">{token ? (proteinPercent >= 70 ? "근손실 방지 🔥" : "단백질 보충 추천") : "로그인 필요"}</div>
            </div>

            {/* 소모 칼로리 */}
            <div className={`diet-card highlight ${showEmpty ? "is-empty" : ""}`}>
              <div className="diet-card-label">오늘 소모 칼로리</div>
              <div className="diet-card-value">
                {token ? exerciseKcal.toLocaleString() : "-"}<span className="diet-card-unit">kcal</span>
              </div>
              <div className="diet-card-sub">
                목표 {token ? goalData.activityKcal.toLocaleString() : "-"} kcal · 남은 {token ? remainingExerciseKcal.toLocaleString() : "-"} kcal
              </div>
              <div className="diet-progress">
                <div className="diet-progress-bar" style={{ width: token ? `${percentExerciseKcal}%` : "0%" }} />
              </div>
              <div className="diet-progress-sub">{token ? `${percentExerciseKcal}% 달성` : "로그인 필요"}</div>
            </div>

            {/* 체중 */}
            <div className={`diet-card ${showEmpty ? "is-empty" : ""}`}>
              <div className="diet-card-label">체중</div>
              <div className="diet-card-value">
                {token ? (currentWeight != null ? currentWeight.toFixed(1) : "-") : "-"}<span className="diet-card-unit">kg</span>
              </div>
              <div className="diet-card-sub">
                {token ? "주간 추세에서 확인" : "로그인 필요"}
              </div>
              <div className="diet-pill success">{token ? "기록 기반 표시" : "로그인 필요"}</div>
            </div>
          </div>
        </section>

        {/* 우측 컬럼 */}
        <section className="diet-column diet-right">

          {/* AI 코칭 비서 */}
          <div className="diet-coach-card">
            <div className="diet-coach-head">
              <div className="diet-coach-title"><b>오늘의 코칭 추천</b></div>
            </div>

            <div className="diet-coach-body">
              <div className="diet-coach-bubble">
                <div className="diet-coach-badge">오늘의 식단 코칭</div>
                <div className="diet-coach-text">{dietCoachMessage}</div>
              </div>
              <div className="diet-coach-bubble">
                <div className="diet-coach-badge">오늘의 칼로리 코칭</div>
                <div className="diet-coach-text">{calorieCoachMessage}</div>
              </div>
            </div>
          </div>
        </section>
        <section className="diet-weekly-section">
          <WeeklyTrendCard data={weeklyStats} isDummy={isDummy} />
        </section>
      </main>

      {/* 모달 */}
      {openModal && (
        <Modal
          title={openModal.title}
          content={openModal.content}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  );
}
