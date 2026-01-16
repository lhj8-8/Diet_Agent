import { useEffect, useMemo, useState } from "react";
import "./DietPage.css";
import api from "../api/Axios";
import WorkoutPage from "./WorkoutPage"; // 운동 페이지 컴포넌트
import DietTabPage from "./DietTabPage"; // 식단 페이지(식단탭)

const todayStr = () => new Date().toISOString().substring(0, 10);

export default function DietPage({ onGoalUpdated } = {}) {
  const [activeTab, setActiveTab] = useState("diet"); 
// "diet" | "exercise"
  // ✅ 기존 코드 호환용(userId localStorage) + JWT 기반 id 확보
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [currentWeight, setCurrentWeight] = useState(null);


  const [todayMeal, setTodayMeal] = useState(null);
  const [todayItems, setTodayItems] = useState([]);


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







  return (
    <div className="diet-page">
      <div className="diet-container">
        <div className="diet-tabs">
          <button
            className={activeTab === "diet" ? "tab active" : "tab"}
            onClick={() => setActiveTab("diet")}
          >
            식단 관리
          </button>
          <button
            className={activeTab === "workout" ? "tab active" : "tab"}
            onClick={() => setActiveTab("workout")}
          >
            운동 관리
          </button>
        </div>
  
        {activeTab === "diet" && (
          <div className="diettab-content">
            <DietTabPage />
          </div>
        )}
      {activeTab === "workout" && (
          <div className="workout-content">
            <WorkoutPage />
          </div>
        )}
      </div>
    </div>
  );
}
