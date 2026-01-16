import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import api from "../api/Axios";
import { createPortal } from "react-dom";

import UserInfoCard from "../components/cards/UserInfoCard";
import GoalStatusCard from "../components/cards/GoalStatusCard";
import TodayScheduleCard from "../components/cards/TodayScheduleCard";
import TodayDietTable from "../components/cards/TodayDietTable";



// BMI 계산 함수
const bmi = (height, weight) => {
  if (!height || !weight) return "-";
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
};
  
export default function MyInfoPage() {
    const navigate = useNavigate();

  const [profile, setProfile] = useState({
      id: "",
      email: "",
      name: "",
      height: "",
      weight: "",
      age: "",
      sex: "",
      activity_level: "",
      muscle_mass: "",
      body_fat: "",
      goal: "",
    });
  const [message, setMessage] = useState("");
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [dietGoal, setDietGoal] = useState(null);

  const [nutritionGoal, setNutritionGoal] = useState(null); // ✅ 새로 추가

  // ✅ 오늘의 추천(플랜 추천) 상태
  const [recMeals, setRecMeals] = useState([]);
  const [recWorkout, setRecWorkout] = useState({});

  // ✅ 목표 변경 모달
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalEditForm, setGoalEditForm] = useState({
    type: "loss",
    startWeight: "",
    targetWeight: "",
    startDate: "",
    endDate: "",
  });

   const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // dietGoal 있으면 우선 사용, 없으면 nutritionGoal
  // ============================
  // 대시보드 오른쪽 컬럼 - 목표 카드
  // ============================
  const effectiveGoal = {
    calories: dietGoal?.calories && dietGoal.calories !== 0 ? dietGoal.calories : nutritionGoal?.calories ?? 0,
    protein: dietGoal?.protein && dietGoal.protein !== 0 ? dietGoal.protein : nutritionGoal?.protein ?? 0,
    activityKcal: dietGoal?.activityKcal && dietGoal.activityKcal !== 0 ? dietGoal.activityKcal : nutritionGoal?.activity_kcal ?? 0,
    startWeight: dietGoal?.startWeight && dietGoal.startWeight !== 0 ? dietGoal.startWeight : nutritionGoal?.startWeight ?? profile?.weight ?? 0,
    targetWeight: dietGoal?.targetWeight && dietGoal.targetWeight !== 0 ? dietGoal.targetWeight : nutritionGoal?.targetWeight ?? profile?.weight ?? 55,
    type: dietGoal?.type ?? nutritionGoal?.type ?? "loss",
    startDate: dietGoal?.startDate ?? nutritionGoal?.startDate ?? todayStr(),
    endDate: dietGoal?.endDate ?? nutritionGoal?.endDate ?? todayStr(),
  };
  
  // 정보 수정 모달 창 코드/
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // ✅ 오늘 식단 상태
  const [todayMeals, setTodayMeals] = useState([]);
  const [isDietLoading, setIsDietLoading] = useState(true);

  /* =============================
    데이터 로딩 (JWT 기준)
    ============================= */

  useEffect(() => {
    const fetchData = async () => {
    try {
      const meRes = await api.get("/api/user/me");
      const data = meRes.data;

      setProfile({
        id: data.id ?? "",
        email: data.email || "",
        name: data.name || "",
        height: data.height ?? "",
        weight: data.weight ?? "",
        age: data.age ?? "",
        sex: data.sex ?? "",
        activity_level: data.activity_level || "",
        muscle_mass: data.muscle_mass ?? "",
        body_fat: data.body_fat ?? "",
        assistant_name: data.assistant_name || "",
        goal: data.goal || "",
      });

      // ✅ 기존 페이지들이 localStorage.userId를 참조하는 경우가 있어 호환용으로 저장
      if (data?.id) localStorage.setItem("userId", String(data.id));
    } catch (error) {
      console.error("get myinfo error", error);
      setMessage("내 정보를 불러오지 못했습니다.");
    }

      try {
        const scheduleRes = await api.get('/api/schedule/items', {
          params: { date: todayStr() },
        });
        const apiItems = scheduleRes.data.items || [];
        const mapped = apiItems
            .map((item, idx) => ({
              id: item.id || idx + 1,
              time: item.time || "09:00",
              title: item.title || "일정",
              type: item.kind || "일반",
              done: false,
            }))
            .sort((a, b) => String(a.time).localeCompare(String(b.time)));
        setTodaySchedules(mapped);
      } catch (error) {
        console.error("get today schedule error", error);
      }
    };
    fetchData();
  }, []);

  
// ✅ 다이어트 목표(DB) 로드 → 대시보드 진행률/목표카드에 반영
useEffect(() => {
  const fetchGoal = async () => {
    try {
      const res = await api.get("/api/diet/goal");
      setDietGoal(res.data || null);
    } catch (e) {
      setDietGoal(null);
    }
  };
  fetchGoal(); // profile.id 의존 제거, 컴포넌트 마운트 시 1회 호출
}, []); // [] 의존성으로 변경


// ✅ user_nutrition_goal 불러오기 - 나의 목표 상태 카드
useEffect(() => {
  const fetchNutritionGoal = async () => {
    try {
      const res = await api.get("/api/user/nutrition_goal"); // 기존 라우트 사용
      setNutritionGoal(res.data || null);
    } catch (e) {
      setNutritionGoal(null);
    }
  };
  fetchNutritionGoal();
}, []); // 컴포넌트 마운트 시 1회 호출


// ✅ 오늘의 추천(플랜 추천) 로드 + "다시 추천" 버튼
useEffect(() => {
  const loadPlan = async (forceGenerate = false) => {
    const date = todayStr();
    try {
      let res;
      if (forceGenerate) {
        // (요청사항) '다시 추천'은 클릭할 때마다 새 조합이 나오도록 nonce를 함께 전달
        res = await api.post("/api/plan/generate", { date, nonce: Date.now() });
      } else {
        res = await api.get("/api/plan/me", { params: { date } });
        const diets = res?.data?.recommendations?.diets || [];
        const workouts = res?.data?.recommendations?.workouts || [];
        // 처음에 아무 추천도 없으면 1회 자동 생성 (UI에 뭐라도 보이게)
        if (diets.length === 0 && workouts.length === 0) {
          res = await api.post("/api/plan/generate", { date, nonce: Date.now() });
        }
      }

      const pack = res?.data?.recommendations || {};
      const diets = pack.diets || [];
      const workouts = pack.workouts || [];

      setRecMeals(
        diets.map((d) => ({
          meal_type: d.meal_type,
          name: d.menu,
          calories: d.calories,
        }))
      );

      const w = workouts[0];
      setRecWorkout(
        w
          ? {
              name: w.workout,
              minutes: w.duration,
              calories: w.calories,
            }
          : {}
      );
    } catch (e) {
      // 추천 로드 실패 시 기본 UI 유지
      setRecMeals([]);
      setRecWorkout({});
    }
  };

  if (profile?.id) loadPlan(false);

  // 핸들러로도 쓰기 위해 window에 임시 저장(코드 최소변경용)
  window.__loadTodayPlan = loadPlan;
}, [profile?.id]);

// ✅ 오늘 식단 로드
useEffect(() => {
  const fetchTodayMeals = async () => {
    try {
      setIsDietLoading(true);

      const res = await api.get("/api/diet/today/items", {
        params: { date: todayStr() },
      });

      const meals = res.data.meals || [];

      setTodayMeals(
        meals.map((m) => ({
          id: m.id,
          meal_type: m.meal_type || "-",
          food_name: m.food_name || "-",
          calories: m.calories || 0,
          protein: m.protein || 0,
        }))
      );
    } catch (e) {
      console.error("get today meals error", e);
      setTodayMeals([]);
    } finally {
      setIsDietLoading(false);
    }
  };

  if (profile?.id) fetchTodayMeals();
}, [profile?.id]);

const handleReRecommend = async () => {
  if (window.__loadTodayPlan) {
    await window.__loadTodayPlan(true);
  }
};

// ✅ 목표 변경 모달 열기
const openGoalModal = () => {
  setGoalEditForm({
    type: effectiveGoal.type,
    startWeight: effectiveGoal.startWeight,
    targetWeight: effectiveGoal.targetWeight,
    calories: effectiveGoal.calories,
    protein: effectiveGoal.protein,
    activityKcal: effectiveGoal.activityKcal,
    startDate: effectiveGoal.startDate,
    endDate: effectiveGoal.endDate,
  });
  setIsGoalModalOpen(true);
};

const saveGoalFromModal = async () => {
  try {
    const payload = {
      type: goalEditForm.type,
      startWeight: Number(goalEditForm.startWeight),
      targetWeight: Number(goalEditForm.targetWeight),
      targetCalories: Number(goalEditForm.calories),     
      targetProtein: Number(goalEditForm.protein),        
      targetActivityKcal: Number(goalEditForm.activityKcal),
      startDate: goalEditForm.startDate,
      endDate: goalEditForm.endDate,
    };
    const res = await api.put("/api/diet/goal", payload);
    // PUT 응답은 {goal:{...}}
    const g = res?.data?.goal || payload;
    setDietGoal({
      ...g,
      // GET /api/diet/goal 형태와 최대한 호환
      currentWeight: profile?.weight ?? g.currentWeight,
    });
    setIsGoalModalOpen(false);
    setMessage("목표가 저장되었습니다.");
  } catch (e) {
    setMessage("목표 저장 중 오류가 발생했습니다.");
  }
};



  /* =============================
    로그인 안 된 경우
    ============================= */
  if (!profile) {
    return (
      <div className="page-wrap">
        <div className="card">
          <h3>로그인이 필요합니다</h3>
          <p>내 정보를 확인하려면 로그인 해주세요.</p>
        </div>
      </div>
    );
  }

  /* =============================
    핸들러
    ============================= */
  const handleProfileFieldChange = (e) => {
  const { name, value } = e.target;
  setProfile((prev) => ({
    ...prev,
    [name]: ["height", "weight", "age", "muscle_mass", "body_fat"].includes(name)
      ? value === "" ? "" : Number(value) // 숫자로 변환
      : value,
  }));
};

  const parseNumberOrNull = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
};

  const parseStringOrNull = (val) => {
  if (!val || val.trim() === "") return null;
  return val.trim();
};

  const handleSaveProfile = async () => {
  try {
    const payload = {
      name: parseStringOrNull(profile.name),
      height: parseNumberOrNull(profile.height),
      weight: parseNumberOrNull(profile.weight),
      age: parseNumberOrNull(profile.age),
      sex: parseStringOrNull(profile.sex),
      activity_level: parseStringOrNull(profile.activity_level),
      muscle_mass: parseNumberOrNull(profile.muscle_mass),
      body_fat: parseNumberOrNull(profile.body_fat),
      goal: parseStringOrNull(profile.goal),
    };

    const res = await api.put("/api/user/me", payload);
    setProfile((prev) => ({ ...prev, ...res.data }));
    window.dispatchEvent(new Event("profile-updated")); // 프로필 업데이트 이벤트 발송

    setMessage("내 정보가 저장되었습니다.");
  } catch {
    setMessage("저장 중 오류가 발생했습니다.");
  }
};


  const handleQuickNavigate = (to) => {
    navigate(to);
  };

  // ✅ DietPage에서 저장한 목표를 /myinfo 대시보드에 반영
  const calcWeightProgress = (type, startW, targetW, currentW) => {
    const s = Number(startW);
    const t = Number(targetW);
    const c = Number(currentW);
    if ([s, t, c].some((x) => Number.isNaN(x))) return 0;
    if (type === "loss") {
      if (s <= t) return 0;
      return Math.max(0, Math.min(100, Math.round(((s - c) / (s - t)) * 100)));
    }
    if (type === "gain") {
      if (t <= s) return 0;
      return Math.max(0, Math.min(100, Math.round(((c - s) / (t - s)) * 100)));
    }
    // keep
    const diff = Math.abs(c - t);
    return Math.min(100, Math.max(0, 100 - Math.round(diff * 20)));
  };

  const goalTypeText =
    dietGoal?.type === "loss" ? "감량" : dietGoal?.type === "gain" ? "증량" : "유지";
  const goalTargetWeight = dietGoal?.targetWeight ?? nutritionGoal?.targetWeight ?? (profile.weight ? Math.max(Number(profile.weight) - 5, 0) : 55);
  const goalStartDate = dietGoal?.startDate ?? nutritionGoal?.startDate ?? todayStr();
  const goalEndDate = dietGoal?.endDate ?? nutritionGoal?.endDate ?? todayStr();

  const goalProgressNow = (dietGoal ?? nutritionGoal)
    ? calcWeightProgress(
        (dietGoal ?? nutritionGoal).type,
        (dietGoal ?? nutritionGoal).startWeight ?? profile.weight,
        (dietGoal ?? nutritionGoal).targetWeight,
        profile.weight
      )
    : 0;

  const goalCalories = dietGoal?.calories ?? nutritionGoal?.calories ?? 0;
  const goalProtein = dietGoal?.protein ?? nutritionGoal?.protein ?? 0;
  const goalActivityKcal = dietGoal?.activityKcal ?? nutritionGoal?.activity_kcal ?? 0;

  return (
  <>
    <div className="page-wrap">
      <header className="page-header mypage-header">
          <div className="profile-header">
            <div className="profile-avatar">
              {(profile.name && profile.name[0]) || "U"}
            </div>
            <div className="profile-texts">
              <div className="profile-greeting">
                {profile.name ? `${profile.name}님 안녕하세요!` : "안녕하세요!"}
              </div>
            </div>
          </div>
        </header>
      {/* ✅ 대시보드 고정 렌더 */}
      <main className="dashboard-grid">
        {/* 왼쪽 컬럼 */}
        <div className="left-column">
          <UserInfoCard
            height={profile.height || "-"}
            weight={profile.weight || "-"}
            bmi={bmi(profile.height, profile.weight)}
            age={profile.age || "-"}
            sex={profile.sex || "-"}
            activity_level={profile.activity_level || "-"}
            muscleMass={profile.muscle_mass ?? "- "}
            bodyFat={profile.body_fat ?? "- "}
            onEdit={() => setIsEditModalOpen(true)}
          />

          <TodayScheduleCard
            events={todaySchedules}
            onViewDetail={() => {
              navigate("/schedule");
            }}
            onToggleComplete={(id) => {
              setTodaySchedules((prev) =>
                prev.map((e) =>
                  e.id === id ? { ...e, done: !e.done } : e
                )
              );
            }}
          />
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="right-column">
        {(dietGoal || nutritionGoal) && (
          <GoalStatusCard
            goalType={goalTypeText}
            startDate={effectiveGoal.startDate}
            endDate={effectiveGoal.endDate}
            targetWeight={Number(effectiveGoal.targetWeight)}
            progress={calcWeightProgress(
              effectiveGoal.type,
              effectiveGoal.startWeight,
              effectiveGoal.targetWeight,
              profile.weight
            )}
            calories={effectiveGoal.calories}
            protein={effectiveGoal.protein}
            activityKcal={effectiveGoal.activityKcal}
            onChangeGoal={openGoalModal}
          />
        )}

          <TodayDietTable
            meals={todayMeals}
            loading={isDietLoading}
          />
        </div>
      </main>
    </div>

    {/* ✅ 모달 유지 */}
    {isEditModalOpen && (
      <EditProfileModal
        profile={profile}
        message={message}
        onChange={handleProfileFieldChange}
        onSave={async (e) => {
        e.preventDefault();
        await handleSaveProfile(); // 완료 후 닫기
        setIsEditModalOpen(false);
      }}
        onClose={() => setIsEditModalOpen(false)}
      />
    )}

    {isGoalModalOpen && (
      <GoalEditModal
        form={goalEditForm}
        onChange={(field, value) =>
          setGoalEditForm((prev) => ({ ...prev, [field]: value }))
        }
        onSave={saveGoalFromModal}
        onClose={() => setIsGoalModalOpen(false)}
      />
    )}
  </>
);
}

/* ===== 모달 컴포넌트 ===== */
function EditProfileModal({
  profile,
  message,
  onChange,
  onSave,
  onClose,
}) {
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>내 정보 수정</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(e);
          }}
        >
          {/* 이름 */}
          <div className="profile-group">
            <label>이름 / 닉네임</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={onChange}
            />
          </div>



          {/* 키, 몸무게, 나이, 성별 */}
          <div className="profile-row">
            <div className="profile-group">
              <label>키 (cm)</label>
              <input
                type="number"
                name="height"
                value={profile.height}
                onChange={onChange}
              />
            </div>

            <div className="profile-group">
              <label>몸무게 (kg)</label>
              <input
                type="number"
                name="weight"
                value={profile.weight}
                onChange={onChange}
              />
            </div>

            <div className="profile-group">
              <label>나이</label>
              <input
                type="number"
                name="age"
                value={profile.age}
                onChange={onChange}
              />
            </div>

            <div className="profile-group">
              <label>성별</label>
              <select
                name="sex"
                value={profile.sex}
                onChange={onChange}
              >
                <option value="">선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
          </div>

          {/* 활동 레벨 */}
          <div className="profile-row">
            <div className="profile-group">
              <label>활동 레벨</label>
              <select
                name="activity_level"
                value={profile.activity_level}
                onChange={onChange}
              >
                <option value="">선택</option>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>

          {/* 근육량, 체지방률 */}
          <div className="profile-row">
            <div className="profile-group">
              <label>근육량 (kg)</label>
              <input
                type="number"
                name="muscle_mass"
                value={profile.muscle_mass}
                onChange={onChange}
              />
            </div>

            <div className="profile-group">
              <label>체지방률 (%)</label>
              <input
                type="number"
                name="body_fat"
                value={profile.body_fat}
                onChange={onChange}
              />
            </div>
          </div>

          {/* 저장 / 취소 버튼 */}
          <div className="modal-actions">
            <button type="submit" className="btn-save">
              저장
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </form>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>,
    document.body
  );
}


function GoalEditModal({ form, onChange, onSave, onClose }) {
  return createPortal(
    <div className="modal-overlay">
    <div className="modal-box">
      <div className="modal-header">
        <h3>목표 변경</h3>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-form">
        {/* 목표 종류는 전체 너비 사용 */}
        <div className="form-group goal-type-group">
          <label>목표 종류</label>
          <div className="goal-type-buttons">
            <button
              type="button"
              className={"btn btn-small " + (form.type === "loss" ? "btn-primary" : "")}
              onClick={() => onChange("type", "loss")}
            >
              감량
            </button>
            <button
              type="button"
              className={"btn btn-small " + (form.type === "gain" ? "btn-primary" : "")}
              onClick={() => onChange("type", "gain")}
            >
              증량
            </button>
            <button
              type="button"
              className={"btn btn-small " + (form.type === "keep" ? "btn-primary" : "")}
              onClick={() => onChange("type", "keep")}
            >
              유지
            </button>
          </div>
        </div>

        {/* 체중 관련 항목 가로 배치 */}
        <div className="form-row">
          <div className="form-group">
            <label>시작 체중(선택)</label>
            <input
              type="number"
              value={form.startWeight ?? ""}
              onChange={(e) => onChange("startWeight", e.target.value)}
              placeholder="현재 체중 사용"
            />
          </div>
          <div className="form-group">
            <label>목표 체중</label>
            <input
              type="number"
              value={form.targetWeight ?? ""}
              onChange={(e) => onChange("targetWeight", e.target.value)}
              placeholder="예: 55"
            />
          </div>
        </div>

        {/* 영양 및 활동 항목 가로 배치 */}
        <div className="form-row">
          <div className="form-group">
            <label>목표 칼로리 (kcal)</label>
            <input
              type="number"
              value={form.calories ?? ""}
              onChange={(e) => onChange("calories", e.target.value)}
              placeholder="예: 2000"
            />
          </div>
          <div className="form-group">
            <label>목표 단백질 (g)</label>
            <input
              type="number"
              value={form.protein ?? ""}
              onChange={(e) => onChange("protein", e.target.value)}
              placeholder="예: 120"
            />
          </div>
        </div>

        {/* 소모 칼로리는 단독 혹은 기간과 배치 가능 (여기서는 기간 위에 배치) */}
        <div className="form-group">
          <label>목표 소모 칼로리 (kcal)</label>
          <input
            type="number"
            value={form.activityKcal ?? ""}
            onChange={(e) => onChange("activityKcal", e.target.value)}
            placeholder="예: 300"
          />
        </div>

        {/* 날짜 항목 가로 배치 */}
        <div className="form-row">
          <div className="form-group">
            <label>시작일</label>
            <input
              type="date"
              value={form.startDate || ""}
              onChange={(e) => onChange("startDate", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>종료일</label>
            <input
              type="date"
              value={form.endDate || ""}
              onChange={(e) => onChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-cancel" onClick={onClose}>취소</button>
          <button type="button" className="btn btn-save" onClick={onSave}>저장</button>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
}
