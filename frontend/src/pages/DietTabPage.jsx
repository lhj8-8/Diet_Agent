// 다이어트 관리 페이지의 식단 탭 코드
import { useEffect, useMemo, useState } from "react";
import api from "../api/Axios";
import "./DietTabPage.css";
import Papa from "papaparse";
import { createPortal } from "react-dom";


const todayStr = () => new Date().toISOString().substring(0, 10);


const getMondayISO = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // Sun=0
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().substring(0, 10);
};

const mealTypes = ["아침", "점심", "저녁", "간식"];

function buildWeeklyPlan(goalType, baseMeals) {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.map((day, idx) => {
    let modifier = "";
    if (goalType === "loss") {
      modifier = idx % 2 === 0 ? "저탄수 · 고단백" : "채소 중심";
    } else if (goalType === "gain") {
      modifier = idx % 2 === 0 ? "고단백 · 탄수화물 보강" : "근성장 집중";
    } else {
      modifier = "균형 잡힌 한 끼";
    }
    return {
      day,
      breakfast: baseMeals.breakfast + " (" + modifier + ")",
      lunch: baseMeals.lunch,
      dinner: baseMeals.dinner,
    };
  });
}

// food.csv를 fetch해서 nutrition 정보를 찾는 함수
export const useFoodNutrition = () => {
  const [foodData, setFoodData] = useState([]);

  useEffect(() => {
    fetch("/food.csv")
      .then((res) => res.text())
      .then((text) => {
        const rows = text
          .split("\n")
          .slice(1) // 헤더 제외
          .map((line) => {
            const parts = line.split(",");
            if (parts.length < 5) return null;
            return {
              id: parts[0].trim(),
              food_name: parts[1].trim(), // 두 번째 열이 이름(name)
              calories: parseInt(parts[2]) || 0, 
              protein: parseInt(parts[3]) || 0,  
            };
          })
          .filter(Boolean);
        setFoodData(rows);
      });
  }, []);

  return { foodData };
};

function AddMealModal({ isOpen, onClose, date, foodData, onMealAdded }) {
  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");

  useEffect(() => {
    if (!foodName) {
      setCalories("");
      setProtein("");
      return;
    }

    const matchedFood = foodData.find(
      (f) => f.food_name.replace(/\s/g, "") === foodName.replace(/\s/g, "")
    );

    if (matchedFood) {
      setCalories(matchedFood.calories);
      setProtein(matchedFood.protein);
    }
  }, [foodName, foodData]);

  const handleSubmit = async () => {
    if (!foodName || !mealType || !calories) {
      alert("음식 이름, 식사 종류, 칼로리는 필수 입력입니다!");
      return;
    }
    try {
      await api.post("/api/diet/today/items", {
        date,
        meal_type: mealType,
        food_name: foodName,
        calories: parseInt(calories),
        protein: parseInt(protein || 0),
      });
      onMealAdded();
      onClose();
      setFoodName("");
      setCalories("");
      setProtein("");
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

    // 🔥 Portal 적용: body 직속에 렌더
  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal">
        <h2>음식 기록하기</h2>
        <input
          type="text"
          placeholder="음식 이름 입력"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          list="food-list"
          className="input-field"
        />
        <datalist id="food-list">
          {foodData.map((f) => (
            <option key={f.id} value={f.food_name} />
          ))}
        </datalist>

        <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
          <option value="breakfast">아침</option>
          <option value="lunch">점심</option>
          <option value="dinner">저녁</option>
          <option value="snack">간식</option>
        </select>

        <div className="input-group">
          <input
            type="number"
            placeholder="칼로리(kcal)"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <input
            type="number"
            placeholder="단백질(g)"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button className="add-btn" onClick={handleSubmit}>추가</button>
          <button className="cancel-btn" onClick={onClose}>취소</button>
        </div>
      </div>
    </>,
    document.body // 🔹 body 직속
  );
}

function PrefsModal({ isOpen, onClose, prefs, setPrefs, excludedItems, setExcludedItems, onSave }) {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal">
        <h3>선호 식단 및 제외 식재료 편집</h3>
        <form
          className="prefs-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
            onClose();
          }}
        >
          <div className="form-group">
            <label>좋아하는 음식</label>
            <textarea
              rows={2}
              value={prefs.like}
              onChange={(e) => setPrefs((prev) => ({ ...prev, like: e.target.value }))}
              placeholder="예: 연어, 샐러드, 그릭요거트"
            />
          </div>
          <div className="form-group">
            <label>싫어하는 음식</label>
            <textarea
              rows={2}
              value={prefs.dislike}
              onChange={(e) => setPrefs((prev) => ({ ...prev, dislike: e.target.value }))}
              placeholder="예: 튀김, 라면, 너무 짠 음식"
            />
          </div>
          <div className="form-group">
            <label>알레르기</label>
            <textarea
              rows={2}
              value={prefs.allergy}
              onChange={(e) => setPrefs((prev) => ({ ...prev, allergy: e.target.value }))}
              placeholder="예: 땅콩, 새우, 우유 등"
            />
          </div>
          <div className="form-group">
            <label>제외 식재료 (추가)</label>
            <textarea
              rows={2}
              value={excludedItems}
              onChange={(e) => setExcludedItems(e.target.value)}
              placeholder="예: 밀가루, 유제품, 튀김 재료 등"
            />
          </div>
          <div className="prefs-actions">
            <button type="submit" className="primary-btn">저장</button>
            <button type="button" className="secondary-btn" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}


function analyzeLogsForDay(logsForDate) {
  if (!logsForDate || logsForDate.length === 0) {
    return "기록된 식단이 거의 없습니다. 오늘 먹은 것을 간단히라도 적어보면 패턴을 파악하는 데 도움이 돼요.";
  }

  const allText = logsForDate.map((l) => l.foodName || "").join(" ");
  const highFatKeywords = ["튀김", "라면", "버터", "치즈", "피자", "햄버거", "치킨", "탕수육"];
  const healthyKeywords = ["샐러드", "닭가슴살", "현미", "채소", "과일", "요거트", "그릭"];

  const hasHighFat = highFatKeywords.some((k) => allText.includes(k));
  const hasHealthy = healthyKeywords.some((k) => allText.includes(k));

  if (hasHighFat && !hasHealthy) {
    return "오늘은 튀김/고지방 메뉴 비중이 조금 높은 편이에요. 내일은 채소와 단백질 위주의 식단으로 균형을 맞춰보면 좋겠어요.";
  }
  if (hasHealthy && !hasHighFat) {
    return "단백질과 채소가 잘 들어간 하루예요. 이런 패턴을 유지하면서 간식이나 야식만 조금만 줄여보면 더 좋습니다.";
  }
  if (hasHealthy && hasHighFat) {
    return "건강한 메뉴와 함께 고지방 메뉴도 함께 들어가 있어요. 비율만 살짝 조정해서 건강한 메뉴의 비중을 더 늘려보면 좋습니다.";
  }
  return "오늘 섭취 패턴은 비교적 무난해요. 규칙적인 식사 시간과 충분한 수분 섭취를 함께 챙겨보면 더 도움이 됩니다.";
}

export default function DietTabPage() {
  const [date, setDate] = useState(todayStr()); // 메모 날짜
  const today = todayStr();

  const { foodData } = useFoodNutrition();
  
  const [recDate] = useState(todayStr()); // 추천/주간기준 날짜(오늘)
  // ✅ 기존 코드 호환용(userId localStorage) + JWT 기반 id 확보
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");


  const [todayItems, setTodayItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // AI 추천 식단 적용 기능 중 아침/점심/저녁 식단을 선택하여 적용하는 기능
  const [selectedMeals, setSelectedMeals] = useState([]);
  const toggleMeal = (type) => {
    setSelectedMeals((prev) =>
      prev.includes(type)
        ? prev.filter((m) => m !== type)
        : [...prev, type]
    );
  };

  // 선호/ 식재료 모달창
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);


  // 선호 / 제외 식재료 DB에서 불러오기
  useEffect(() => {
    fetchPrefsFromDb();
    fetchExcludedFromDb();
  }, []);


  // AI 추천 식단 + 선호도
  const [meals, setMeals] = useState({
    breakfast: "-",
    lunch: "-",
    dinner: "-",
  });

  const [weeklyRecs, setWeeklyRecs] = useState([]); // [{date, dayLabel, meals:{breakfast,lunch,dinner}}]
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    like: "",
    dislike: "",
    allergy: "",
  });
  const [excludedItems, setExcludedItems] = useState("");
  const [loadingDb, setLoadingDb] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);

  useEffect(() => {
    // 1) 내 정보에서 userId/현재체중 확보 (JWT)
    (async () => {
      try {
        const me = await api.get("/api/user/me");
        if (me?.data?.id) {
          const idStr = String(me.data.id);
          setUserId(idStr);
          localStorage.setItem("userId", idStr);
        }
        setCurrentWeight(me?.data?.weight ?? null);
      } catch (e) {
        // /me 실패(토큰 만료 등)
      }
    })();
  }, []);

  // 사용자 식단 기록 불러오기
const [selectedDate, setSelectedDate] = useState(todayStr());
const [mealItems, setMealItems] = useState([]);
const [loading, setLoading] = useState(false);

  // 오늘의 식단 불러오기
  useEffect(() => {
  fetchTodayMeal();
}, []);

const fetchTodayMeal = async () => {
  try {
    const res = await api.get("/api/diet/today");
    // setTodayMeal(res.data.meal);
    setTodayItems(res.data.items);

    // ✅ 사용자 식단 기록의 날짜가 오늘과 같으면 같이 갱신
    if (selectedDate === todayStr()) {
      loadMealItems(selectedDate);
    }
    window.dispatchEvent(new CustomEvent("diet-data-updated")); // ✅ 식단 데이터 변경 이벤트 발생
  } catch (e) {
    console.error("오늘의 식단 불러오기 실패", e);
  }
};

  // AI 추천 식단 불러오기
  useEffect(() => {
    fetchTodayPlan();
  }, []);

  const fetchTodayPlan = async () => {
  const res = await api.get("/api/plan/me", {
    params: { date: todayStr() },
  });

  const diets = res.data.recommendations.diets;

  const nextMeals = {
    breakfast: "-",
    lunch: "-",
    dinner: "-",
  };

  diets.forEach((d) => {
    nextMeals[d.meal_type] = d.menu;
  });

  setMeals(nextMeals);
};


  const dietsToMeals = (diets) => {
    const m = { breakfast: "-", lunch: "-", dinner: "-" };
    (diets || []).forEach((r) => {
      const t = (r.meal_type || r.mealType || "").toLowerCase();
      if (t === "breakfast") m.breakfast = r.menu;
      if (t === "lunch") m.lunch = r.menu;
      if (t === "dinner") m.dinner = r.menu;
    });
    return m;
  };

  const fetchDailyRecommendation = async (force = false) => {
    try {
      if (force) {
        const gen = await api.post("/api/plan/generate", { date: recDate });
        setMeals(dietsToMeals(gen?.data?.recommendations?.diets));
        return;
      }

      const res = await api.get("/api/plan/me", { params: { date: recDate } });
      const diets = res?.data?.recommendations?.diets || [];
      if (diets.length === 0) {
        const gen = await api.post("/api/plan/generate", { date: recDate });
        setMeals(dietsToMeals(gen?.data?.recommendations?.diets));
      } else {
        setMeals(dietsToMeals(diets));
      }
    } catch (e) {
      console.error("load daily recommendation error", e);
    }
  };

  const fetchWeeklyRecommendations = async (force = false) => {
    setWeeklyLoading(true);
    try {
      const start = getMondayISO(recDate);
      const res = await api.get("/api/plan/week", {
        params: { start, force: force ? 1 : 0 },
      });
      const days = res?.data?.days || [];
      const labels = ["일", "월", "화", "수", "목", "금", "토"]; // Date.getDay
      const mapped = days.map((d) => {
        const dt = new Date((d.date || "") + "T00:00:00");
        const dayLabel = labels[dt.getDay()] || "";
        const diets = d?.recommendations?.diets || [];
        return {
          date: d.date,
          dayLabel,
          meals: dietsToMeals(diets),
        };
      });
      setWeeklyRecs(mapped);
    } catch (e) {
      console.error("load weekly plan error", e);
    } finally {
      setWeeklyLoading(false);
    }
  };

  // 2) 텍스트 식단 메모 로드 (JWT)
  useEffect(() => {
    const fetchDietMemo = async () => {
      try {
        // (버그픽스) 식단 메모는 /api/memo/me 로 저장/조회합니다.
        const res = await api.get(`/api/memo/me`, {
          params: { date },
        });
        setContent(res.data.content || "");
      } catch (error) {
        console.error("get diet memo error", error);
        setMessage("식단 메모를 불러오지 못했습니다.");
      }
    };
    fetchDietMemo();
  }, [date]);


const fetchPrefsFromDb = async () => {
  try {
    const res = await api.get("/api/preferences/food");
    const data = res.data || {};
    // (호환) 예전 localStorage에 저장된 선호/비선호/알레르기 값이 있고, DB가 비어있다면 우선 표시
    if (userId && !(data.likes || data.dislikes || data.allergies)) {
      try {
        const raw = localStorage.getItem(`dietPrefs_${userId}`);
        if (raw) {
          const legacy = JSON.parse(raw);
          data.likes = legacy.like || data.likes;
          data.dislikes = legacy.dislike || data.dislikes;
          data.allergies = legacy.allergy || data.allergies;
        }
      } catch (_) {}
    }
    setPrefs({
      like: data.likes || "",
      dislike: data.dislikes || "",
      allergy: data.allergies || "",
    });
  } catch (e) {
    console.error("fetch food prefs error", e);
  }
};

const fetchExcludedFromDb = async () => {
  try {
    const res = await api.get("/api/diet/excluded");
    setExcludedItems(res?.data?.items || "");
  } catch (e) {
    console.error("fetch excluded items error", e);
  }
};

const dateToISO = (d) => d.toISOString().substring(0, 10);
const addDays = (iso, days) => {
  const dt = new Date(iso);
  dt.setDate(dt.getDate() + days);
  return dateToISO(dt);
};

  // ✅ AI 추천(백엔드 생성) 기반으로 매번 새 조합을 받아옵니다.
  const refreshMeals = async () => {
    await fetchDailyRecommendation(true);
    // 주간 추천에서 오늘 칸도 최신으로 보이도록 한번 갱신
    await fetchWeeklyRecommendations(false);
  };

  const handlePrefsSave = async () => {
  try {
    await api.put("/api/preferences/food", {
      likes: prefs.like,
      dislikes: prefs.dislike,
      allergies: prefs.allergy,
    });
  } catch (e) {
    console.error("save food prefs error", e);
    setMessage("선호도 저장 중 오류가 발생했습니다.");
  }

  try {
    await api.put("/api/diet/excluded", {
      items: excludedItems,
    });
  } catch (e) {
    console.error("save excluded items error", e);
    setMessage("제외 식재료 저장 중 오류가 발생했습니다.");
  }

  setEditingPrefs(false);
  setMessage("선호도/제외 식재료가 저장되었습니다.");
};

  const handleLogFormChange = (field, value) => {
    setLogForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleLogFormChange("photoName", file ? file.name : "");
  };

  const handleAddLog = async (e) => {
  e.preventDefault();
  if (!logForm.foodName.trim()) {
    setMessage("음식명을 입력해주세요.");
    return;
  }

  try {
    await api.post("/api/diet/logs", {
      date: logForm.date,
      mealType: logForm.mealType,
      foodName: logForm.foodName,
      calories: logForm.calories,
      photoName: logForm.photoName,
    });
    await fetchDietLogsRange();
    setLogForm((prev) => ({
      ...prev,
      foodName: "",
      calories: "",
      photoName: "",
    }));
    setMessage("식단 기록이 저장되었습니다.");
  } catch (e2) {
    console.error("save diet log to server error", e2);
    setMessage("식단 기록 저장 중 오류가 발생했습니다.");
  }
};


// 오늘의 음식 삭제 함수
const deleteTodayItem = async (itemId) => {
  try {
    await api.delete(`/api/diet/today/items/${itemId}`);
    await fetchTodayMeal(); // 🔥 삭제 후 다시 불러오기
  } catch (e) {
    console.error("음식 삭제 실패", e);
    alert("삭제 실패");
  }
};

// 오늘의 식단 카드 중 AI 추천 식단 적용 기능 함수
const applyAll = async () => {
  await api.post("/api/plan/apply", {
    date: todayStr(),
  });

  alert("AI 추천 식단이 모두 적용되었습니다.");
  fetchTodayMeal(); // 오늘 식단 다시 불러오기
};
// 선택한 식단만 적용 기능 함수
const applySelectedMeals = async () => {
  if (selectedMeals.length === 0) {
    alert("적용할 식사를 선택하세요.");
    return;
  }

  await api.post("/api/plan/apply/partial", {
    date: todayStr(),
    meal_types: selectedMeals, // ["breakfast", "lunch"]
  });

  alert("선택한 식단이 적용되었습니다.");
  setSelectedMeals([]);
  fetchTodayMeal();
};

// 날짜별 식단 아이템 조회
const fetchMealItemsByDate = async (date) => {
  const res = await api.get("/api/diet/items", {
    params: { date },
  });
  return res.data; // { date, items }
};

useEffect(() => {
  loadMealItems(selectedDate);
}, [selectedDate]);

const loadMealItems = async (date) => {
  setLoading(true);
  try {
    const data = await fetchMealItemsByDate(date);
    setMealItems(data.items);
  } catch (err) {
    console.error("식단 조회 실패", err);
  } finally {
    setLoading(false);
  }
};

// 사용자 식단 기록 영역 - 칼로리 및 단백질 계산 코드
const totalCalories = mealItems.reduce(
  (sum, item) => sum + (item.calories || 0),
  0
);

const totalProtein = mealItems.reduce(
  (sum, item) => sum + (item.protein || 0),
  0
);

const mealTypeLabel = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 주간 추천은 백엔드(/api/plan/week) 기반

  return (
    <div className="diet-page">
      <div className="diettab-container">
        <section className="diet-section">
          <div className="diet-card">
            <h3>🍱 오늘의 식단</h3>
            {/* 음식 리스트 */}
            <div className="meal-list" style={{flex:1}}>
            {todayItems.map((item) => (
            <div key={item.id} className="meal-item">
              <span className="meal-type">
                {mealTypeLabel[item.meal_type] || item.meal_type}
              </span>
              <span className="food-name">{item.food_name}</span>
              <span className="calories">{item.calories} kcal</span>

              {/* ✅ 삭제 버튼 */}
              <button className="delete-btn" onClick={() => deleteTodayItem(item.id)} title="삭제">✕</button>
            </div>
          ))}
            {todayItems.length === 0 && <p style={{color:'#94a3b8', textAlign:'center', padding:'2rem'}}>기록된 식단이 없습니다.</p>}
          </div>

            <div className="meal-actions">
               <AddMealModal isOpen={modalOpen} onClose={() => setModalOpen(false)} date={today} foodData={foodData} onMealAdded={fetchTodayMeal} />
              <button onClick={() => setModalOpen(true)}>음식 추가</button>
              <button onClick={applyAll}>🤖 AI 추천 식단 적용</button>
            </div>
          </div>
        </section>

        {/* ======================================== */}
        {/* AI 추천 + 선호 식단 카드 (통합) */}
        <section className="diet-section">
          <div className="diet-card single-card">
            {/* 카드 제목 */}
            <h3>✨ AI 추천 식단 및 재료 설정</h3>

            {/* ======================================== */}
            {/* 1. 오늘의 추천 식단 */}
            <div className="diet-card-subsection">
              <h4>오늘의 추천 식단</h4>

              <div className="meal-row">
                <input
                  type="checkbox"
                  checked={selectedMeals.includes("breakfast")}
                  onChange={() => toggleMeal("breakfast")}
                />
                <span className="meal-label">아침</span>
                <span className="meal-value">{meals.breakfast}</span>
              </div>

              <div className="meal-row">
                <input
                  type="checkbox"
                  checked={selectedMeals.includes("lunch")}
                  onChange={() => toggleMeal("lunch")}
                />
                <span className="meal-label">점심</span>
                <span className="meal-value">{meals.lunch}</span>
              </div>

              <div className="meal-row">
                <input
                  type="checkbox"
                  checked={selectedMeals.includes("dinner")}
                  onChange={() => toggleMeal("dinner")}
                />
                <span className="meal-label">저녁</span>
                <span className="meal-value">{meals.dinner}</span>
              </div>

              {/* 버튼 그룹 */}
              <div className="meal-actions">
                <button type="button" className="secondary-btn" onClick={refreshMeals}>
                  다시 추천
                </button>
                {/* <button type="button" className="secondary-btn" onClick={refreshMeals}>
                  선호 음식 기반 추천 강화
                </button> */}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPrefsModalOpen(true)}
                >
                  식재료 제외 설정
                </button>
                <button type="button" className="secondary-btn" onClick={applySelectedMeals}>
                  선택 적용
                </button>
              </div>
            </div>

              {/* 모달 */}
              <PrefsModal
                isOpen={prefsModalOpen}
                onClose={() => setPrefsModalOpen(false)}
                prefs={prefs}
                setPrefs={setPrefs}
                excludedItems={excludedItems}
                setExcludedItems={setExcludedItems}
                onSave={handlePrefsSave}
              />
          </div>
        </section>


        {/* 사용자 식단 기록 */}
        <section className="diet-section user-diet-card">
          <div className="diet-card">
            <div className="top-date-card">
              <h3 className="date-title">📅 식단 기록 조회</h3>
              <input type="date" className="date-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>

            <div className="log-list">
              {loading ? (
                <p style={{textAlign:'center', padding:'2rem'}}>기록 로딩 중...</p>
              ) : (
                <>
                  <ul className="log-items">
                    {mealItems.map((item) => (
                      <li key={item.id} className="log-item">
                        <span className="log-meal-type">{item.meal_type}</span>
                        <span className="log-food-name">{item.food_name}</span>
                        <div className="log-item-meta">
                          <span>{item.calories} kcal</span>
                          <span>단백질 {item.protein}g</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {mealItems.length > 0 ? (
                    <div className="log-summary">
                      <div>
                        <strong>총 섭취 칼로리</strong>
                        <span>{totalCalories} kcal</span>
                      </div>
                      <div>
                        <strong>총 단백질</strong>
                        <span>{totalProtein} g</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{textAlign:'center', padding:'3rem', color:'#94a3b8'}}>이 날짜에는 기록된 식단이 없습니다.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}