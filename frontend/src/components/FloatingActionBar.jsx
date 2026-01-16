import React, { useState, useEffect, useRef } from "react";
import "./FloatingActionBar.css";
import { FiUser, FiBarChart2, FiTarget, FiHeart } from "react-icons/fi";
import api from "../api/Axios"; // Backend API for fetching user data

export default function FloatingActionBar() {
  const [dietGoal, setDietGoal] = useState({
    calories: 0,
    protein: 0,
    activityKcal: 0
  });
  const [active, setActive] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  const [userProfile, setUserProfile] = useState({});

  // 🔧 추가: file input ref
  const fileInputRef = useRef(null);

  const toggle = (key) => {
    setActive(active === key ? null : key);
  };

  const [todayExerciseKcal, setTodayExerciseKcal] = useState(0); // 오늘 운동으로 소모된 칼로리
  const [weeklyWeightStats, setWeeklyWeightStats] = useState([]); // 주간 체중 통계
  const [dailyCalorieSummary, setDailyCalorieSummary] = useState(null); // 일일 칼로리 요약
  const [weeklyCalorieStats, setWeeklyCalorieStats] = useState([]); // 주간 섭취 칼로리 통계


  // =====================
  // 📊 계산용 값들
  // =====================

  // 섭취
  const intakeKcal = dailyCalorieSummary?.total_calories ?? 0;
  const intakeProtein = dailyCalorieSummary?.total_protein ?? 0;

  // 목표
  const targetKcal = dietGoal.calories || 0;
  const targetProtein = dietGoal.protein || 0;
  const targetExercise = dietGoal.activityKcal || 0;

  // 섭취 퍼센트
  const percentKcal =
    targetKcal > 0
      ? Math.min(100, Math.round((intakeKcal / targetKcal) * 100))
      : 0;

  const percentProtein =
    targetProtein > 0
      ? Math.min(100, Math.round((intakeProtein / targetProtein) * 100))
      : 0;

  // 소모 퍼센트
  const percentExercise =
    targetExercise > 0
      ? Math.min(100, Math.round((todayExerciseKcal / targetExercise) * 100))
      : 0;


  // ✅ 로그인 토큰 상태를 추적하기 위해 추가
  const token = localStorage.getItem("accessToken");

  /* ==========================================
        👤 USER PROFILE & EXERCISE CALORIES & WEEKLY WEIGHT & DAILY CALORIE SUMMARY & WEEKLY CALORIE FETCH
  ========================================== */
  useEffect(() => {
    // 토큰이 없으면 API 호출하지 않음
    if (!token) {
      setUserProfile({});
      setTodayExerciseKcal(0);
      setWeeklyWeightStats([]);
      setDailyCalorieSummary(null);
      setWeeklyCalorieStats([]);
      return;
    }

    const todayStr = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const currentTodayStr = todayStr();

    const fetchUserProfile = async () => {
      try {
        const res = await api.get("/api/user/me");
        setUserProfile(res.data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    const fetchTodayExerciseKcal = async () => {
      try {
        const MINUTES_TO_KCAL_RATE = 5; // 1분당 5kcal 소모 가정
        const workoutRes = await api.get("/api/schedule/items", {
          params: { date: currentTodayStr, kind: "운동" }
        });
        const todayWorkouts = (workoutRes.data.items || []).filter(item => item.date === currentTodayStr);
        const totalWorkoutMinutesToday = todayWorkouts.reduce((acc, item) => {
          const minutesMatch = item.memo ? item.memo.match(/(\d+)분/) : null;
          return acc + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
        }, 0);
        setTodayExerciseKcal(totalWorkoutMinutesToday * MINUTES_TO_KCAL_RATE);
      } catch (error) {
        console.error("Failed to fetch today's exercise calories:", error);
        setTodayExerciseKcal(0);
      }
    };

    const fetchWeeklyWeightStats = async () => {
      try {
        const res = await api.get("/api/stats/weekly/weight");
        setWeeklyWeightStats(res.data || []);
      } catch (error) {
        console.error("Failed to fetch weekly weight stats:", error);
        setWeeklyWeightStats([]);
      }
    };

    const fetchDailyCalorieSummary = async () => {
      try {
        const res = await api.get(`/api/diet/today/summary?date=${currentTodayStr}`);
        setDailyCalorieSummary(res.data || null);
        console.log("dailyCalorieSummary (FAB):", res.data); // Log the fetched data for debugging
      } catch (error) {
        console.error("Failed to fetch daily calorie summary:", error);
        setDailyCalorieSummary(null);
      }
    };

    const fetchWeeklyCalorieStats = async () => {
      try {
        const res = await api.get("/api/stats/weekly/calories");
        setWeeklyCalorieStats(res.data || []);
      } catch (error) {
        console.error("Failed to fetch weekly calorie stats:", error);
        setWeeklyCalorieStats([]);
      }
    };

    fetchUserProfile();
    fetchTodayExerciseKcal();
    fetchWeeklyWeightStats();
    fetchDailyCalorieSummary();
    fetchDietGoal();
    fetchWeeklyCalorieStats();

    const handleProfileUpdated = () => {
      fetchUserProfile();
      fetchTodayExerciseKcal();
      fetchWeeklyWeightStats();
      fetchDailyCalorieSummary();
      fetchWeeklyCalorieStats();
    };

          window.addEventListener("profile-updated", handleProfileUpdated);
          window.addEventListener("diet-data-updated", fetchDailyCalorieSummary); // diet-data-updated 이벤트 리스너 추가
          // ✅ workout-data-updated 이벤트 리스너 추가
          window.addEventListener("workout-data-updated", () => {
            fetchTodayExerciseKcal();
            fetchWeeklyWeightStats();
          });
          return () => {
            window.removeEventListener("profile-updated", handleProfileUpdated);
            window.removeEventListener("diet-data-updated", fetchDailyCalorieSummary); // 클린업
            window.removeEventListener("workout-data-updated", () => { // 클린업
              fetchTodayExerciseKcal();
              fetchWeeklyWeightStats();
            });
          };
        }, [token, userProfile?.id]); // token과 userProfile.id가 변경될 때마다 데이터를 다시 불러오도록 수정

  /* ==========================================
        🔄 PROFILE IMAGE (유저별 localStorage 복원)
  ========================================== */
  useEffect(() => {
    if (!userProfile?.id) return;

    const savedImg = localStorage.getItem(
      `profileImg_${userProfile.id}`
    );

    if (savedImg) {
      setProfileImg(savedImg);
    } else {
      setProfileImg(null);
    }
  }, [userProfile]);

  /* ==========================================
        MOTIVATION (Mindset Reset)
  ========================================== */
  const tips = [
    "체중은 대부분 수분 때문에 변합니다. 하루 변화는 의미 없어요!",
    "폭식 충동은 10분 안에 사라지는 경우가 많아요. 잠깐만 버텨봐요!",
    "완벽함보다 꾸준함이 체중 감량 성공률을 3배 올려요.",
    "지방 1kg은 7700kcal입니다. 하루 만에 살찌는 건 불가능해요!",
    "운동은 체중보다 ‘기분’을 먼저 바꿉니다.",
    "작은 습관 하나가 큰 결과를 만듭니다. 오늘도 한 걸음이면 충분합니다!",
    "매일 조금씩 나아지는 자신을 상상해보세요. 그 변화를 즐기세요!",
    "어제의 실수는 오늘의 교훈이 됩니다. 다시 시작할 용기를 가지세요.",
    "가장 강력한 동기 부여는 내면에서 나옵니다. 자신을 믿으세요!",
    "건강한 습관은 작은 선택들이 모여 만들어집니다. 오늘부터 하나씩!",
    "땀은 지방을 태우고, 만족감을 안겨줍니다. 오늘 흘린 땀을 자랑스럽게 여기세요.",
    "좌절할 때마다 자신이 얼마나 강한지 기억하세요. 당신은 해낼 수 있습니다.",
    "음식은 연료일 뿐, 감정의 해소가 아닙니다. 현명하게 선택하세요.",
    "꾸준함은 마법과 같습니다. 천천히, 그리고 꾸준히 나아가세요.",
    "몸은 당신의 성전입니다. 소중히 다루고 건강하게 채우세요.",
    "운동할 시간이 없다는 핑계는 이제 그만! 짧게라도 매일 움직이세요.",
    "당신이 먹는 것이 곧 당신입니다. 좋은 것을 먹고 좋은 사람이 되세요.",
    "변화는 두렵지만, 정체는 더 두렵습니다. 도전을 즐기세요.",
    "오늘의 노력은 내일의 당신을 만듭니다. 후회 없는 하루를 보내세요.",
    "힘들 때마다 당신의 목표를 다시 떠올리세요. 왜 시작했는지 잊지 마세요.",
    "운동은 몸의 스트레스를 풀어주고, 정신을 맑게 합니다.",
    "식단은 일시적인 유행이 아니라 평생의 습관입니다. 지속 가능한 방법을 찾으세요.",
    "작은 성공들이 모여 큰 성과를 이룹니다. 오늘 작은 성공을 축하하세요.",
    "당신의 몸은 당신의 가장 소중한 자산입니다. 투자하세요.",
    "건강한 삶은 선택입니다. 매 순간 현명한 선택을 하세요.",
    "어떤 날은 힘들겠지만, 포기하지 않으면 반드시 결과가 나옵니다.",
    "당신은 생각보다 강합니다. 한계를 뛰어넘으세요.",
    "운동 후의 상쾌함은 그 어떤 보상보다 값집니다. 느껴보세요!",
    "긍정적인 마음가짐이 건강한 몸을 만듭니다. 웃으세요!",
    "다른 사람과 비교하지 마세요. 당신만의 속도로 나아가면 됩니다."
  ];

  const [motivationTip, setMotivationTip] = useState(() => {
    return tips[Math.floor(Math.random() * tips.length)];
  });

  const getNewTip = () => {
    const newTip = tips[Math.floor(Math.random() * tips.length)];
    setMotivationTip(newTip);
  };

  

  const fetchDietGoal = async () => {
    try {
      const res = await api.get("/api/diet/goal");
      setDietGoal({
        calories: res.data.calories || 1800,
        protein: res.data.protein || 120,
        activityKcal: res.data.activityKcal || 2000
      });
      console.log("dietGoal (FAB):", res.data);
    } catch (error) {
      console.error("Failed to fetch diet goal:", error);
      setDietGoal({ calories: 1800, protein: 120, activityKcal: 2000 });
    }
  };

  return (
    <div className="fab-wrapper">
      {/* ==========================================
          PROFILE
      ========================================== */}
      <div className="fab-item">
        <button className="fab-btn" onClick={() => toggle("profile")}>
          <span className="fab-icon-wrap">
            <FiUser className="fab-icon" />
          </span>
        </button>

        {active === "profile" && (
          <div className="mini-popup profile-popup">
            <button
              className="close-btn"
              onClick={() => setActive(null)}
            >
              ✕
            </button>

            <div className="profile-img-box">
              {profileImg ? (
                <div className="profile-img-hover">
                  <img
                    src={profileImg}
                    alt="profile"
                    className="profile-img"
                  />
                  <div
                    className="profile-img-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setProfileImg(null);
                      localStorage.removeItem(`profileImg_${userProfile.id}`);

                      // 🔧 추가: 같은 파일 재선택 가능하게 초기화
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    삭제하기
                  </div>
                </div>
              ) : (
                <label htmlFor="profileUpload">
                  <div className="square-image-placeholder">
                    이미지
                  </div>
                </label>
              )}

              <input
                ref={fileInputRef}   // 🔧 추가
                id="profileUpload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file || !userProfile?.id) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    setProfileImg(reader.result);
                    localStorage.setItem(
                      `profileImg_${userProfile.id}`,
                      reader.result
                    );
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            <h4>프로필</h4>

            <div className="info-list">
              <div className="info-row">
                <p>이름</p>
                <h3>{userProfile.name || "-"}</h3>
              </div>
              <div className="info-row">
                <p>나이</p>
                <h3>{userProfile.age || "-"}세</h3>
              </div>
              <div className="info-row">
                <p>성별</p>
                <h3>
                  {userProfile.sex === "male"
                    ? "남성"
                    : userProfile.sex === "female"
                    ? "여성"
                    : "-"}
                </h3>
              </div>
              <div className="info-row">
                <p>키</p>
                <h3>{userProfile.height || "-"}cm</h3>
              </div>
              <div className="info-row">
                <p>몸무게</p>
                <h3>{userProfile.weight || "-"}kg</h3>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          GOALS
      ========================================== */}
      <div className="fab-item">
        <button className="fab-btn" onClick={() => toggle("goals")}>
          <span className="fab-icon-wrap">
            <FiTarget className="fab-icon" />
          </span>
        </button>

        {active === "goals" && (
          <div className="mini-popup goals-popup">
            <button
              className="close-btn"
              onClick={() => setActive(null)}
            >
              ✕
            </button>

            <div className="today-intake-section">
              <h4 className="goals-title">오늘 섭취량</h4>
              {!dailyCalorieSummary?.total_calories && !dailyCalorieSummary?.total_protein ? (
                <div className="calorie-section">
                  <p className="empty-message" style={{textAlign: "center", padding: "10px 0"}}>오늘 식단 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="calorie-section">
                  <div className="goal-row">
                    <span className="goal-label">🔥 칼로리</span>
                                      <span className="goal-value">
                                        {dailyCalorieSummary?.total_calories ?? 0} / {dietGoal.calories}&nbsp;kcal
                                        {/* Calculate percentage using a robust targetTdee */}
                                        {(() => {
                                            return <span className="percent">{percentKcal}%</span>;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="progress small">
                                      <div
                                        className="progress-fill"
                                        style={(() => {
                                            const targetTdee = dailyCalorieSummary?.tdee > 0 ? dailyCalorieSummary.tdee : 1800;
                                            const currentIntake = dailyCalorieSummary?.total_calories ?? 0;
                                            const percent = targetTdee > 0 ? Math.min(100, Math.round((currentIntake / targetTdee) * 100)) : 0;
                                            return { width: `${percent}%` };
                                        })()}
                                      />
                                    </div>
                  <div className="goal-row">
                    <span className="goal-label">💪 단백질</span>
                    <span className="goal-value">
                      {dailyCalorieSummary?.total_protein ?? 0} / {dietGoal.protein}&nbsp;g {/* targetProtein is 120g as per MainPage */}
                      <span className="percent">{percentProtein}%</span>
                    </span>
                  </div>
                  <div className="progress small">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, Math.round(((dailyCalorieSummary?.total_protein ?? 0) / 120) * 100)) || 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <h4 className="goals-title">주간 섭취 추세</h4> {/* New header */}
            <div className="calorie-section"> {/* Using calorie-section for consistent styling */}
                                <div className="goal-row">
                                  {/* <span className="goal-label">📈 주간 섭취 칼로리</span> */}
                                  <span className="goal-value">
                                    {weeklyCalorieStats.length > 0 ? weeklyCalorieStats[weeklyCalorieStats.length - 1].value.toLocaleString() : "-"}
                                    &nbsp;<span className="percent">kcal</span>
                                  </span>
                                </div>              <div className="stat-sub">
                {weeklyCalorieStats.length > 1 ? (
                  (() => {
                    const firstCalorie = weeklyCalorieStats[0].value;
                    const lastCalorie = weeklyCalorieStats[weeklyCalorieStats.length - 1].value;
                    const diff = lastCalorie - firstCalorie;
                    const trendIcon = diff > 0 ? "▲" : diff < 0 ? "▼" : "";
                    const trendClass = diff > 0 ? "up" : diff < 0 ? "down" : "";
                    return (
                      <>
                        주간 변화: <b className={trendClass}>{trendIcon} {Math.abs(diff).toLocaleString()}kcal</b>
                      </>
                    );
                  })()
                ) : "주간 데이터 부족"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          STATS
      ========================================== */}
      <div className="fab-item">
        <button className="fab-btn" onClick={() => toggle("stats")}>
          <span className="fab-icon-wrap">
            <FiBarChart2 className="fab-icon" />
          </span>
        </button>

        {active === "stats" && (
          <div className="mini-popup stats-popup">
            <button
              className="close-btn"
              onClick={() => setActive(null)}
            >
              ✕
            </button>

            <div className="stats-card">
              {/* 오늘 소모 칼로리 */}
              <div className="stat-section">
                <div className="stat-header">
                  <span className="stat-icon">🏃</span>
                  <h3>오늘 소모 칼로리</h3>
                </div>

                <div className="stat-value">
                  {todayExerciseKcal.toLocaleString()}
                  <span className="stat-unit">kcal</span>
                </div>
                <div className="stat-sub">
                  목표 {dietGoal.activityKcal} kcal · 남은 {Math.max(0, dietGoal.activityKcal - todayExerciseKcal)} kcal
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, Math.round((todayExerciseKcal / dietGoal.activityKcal) * 100))}%` }}
                  />
                </div>
                <div className="stat-progress-sub">
                  {percentExercise}% 달성
                </div>
              </div>

              {/* 현재 체중 (주간 추세 기반) */}
              <div className="stat-section">
                <div className="stat-header">
                  <span className="stat-icon">⚖️</span>
                  <h3>현재 체중</h3>
                </div>

                <div className="stat-value">
                  {weeklyWeightStats.length > 0
                    ? weeklyWeightStats[weeklyWeightStats.length - 1].value.toFixed(1)
                    : userProfile.weight != null
                    ? Number(userProfile.weight).toFixed(1) // userProfile.weight가 있으면 사용
                    : "-"}
                  <span className="stat-unit">kg</span>
                </div>
                <div className="stat-sub">
                  {weeklyWeightStats.length > 1 ? (
                    (() => {
                      const firstWeight = weeklyWeightStats[0].value;
                      const lastWeight = weeklyWeightStats[weeklyWeightStats.length - 1].value;
                      const diff = lastWeight - firstWeight;
                      const trendIcon = diff > 0 ? "▲" : diff < 0 ? "▼" : "";
                      const trendClass = diff > 0 ? "up" : diff < 0 ? "down" : "";
                      return (
                        <>
                          주간 변화: <b className={trendClass}>{trendIcon} {Math.abs(diff).toFixed(1)}kg</b>
                        </>
                      );
                    })()
                  ) : "주간 데이터 부족"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MOTIVATION
      ========================================== */}
      <div className="fab-item">
        <button
          className="fab-btn"
          onClick={() => toggle("motivation")}
        >
          <span className="fab-icon-wrap">
            <FiHeart className="fab-icon" />
          </span>
        </button>

        {active === "motivation" && (
          <div className="mini-popup motivation-popup">
            <button
              className="close-btn"
              onClick={() => setActive(null)}
            >
              ✕
            </button>

            <h4 className="motivation-title">
              오늘의 Motivation
            </h4>

            <p className="motivation-tip">
              {motivationTip}
            </p>

            <button
              className="new-tip-btn"
              onClick={getNewTip}
            >
              🔄 새 팁 받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}