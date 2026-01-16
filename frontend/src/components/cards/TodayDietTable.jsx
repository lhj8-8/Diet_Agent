import { useNavigate } from "react-router-dom";

const mealTypeLabel = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export default function TodayDietTable({ meals = [], loading }) {
  const navigate = useNavigate();

  return (
    <div className="diet-table-section card">
      <div className="diet-table-head">
        <h3>오늘 식단</h3>
        <button
          className="diet-add-btn"
          onClick={() => navigate("/diet")}
        >
          + 식단 추가
        </button>
      </div>

      <div className="diet-table">
        <div className="diet-table-row header">
          <div>시간</div>
          <div>메뉴</div>
          <div>칼로리</div>
          <div>단백질</div>
        </div>

        {loading ? (
          <div className="diet-table-row">
            <div style={{ gridColumn: "1 / -1", opacity: 0.6 }}>
              불러오는 중...
            </div>
          </div>
        ) : meals.length === 0 ? (
          <div className="diet-table-row">
            <div style={{ gridColumn: "1 / -1", opacity: 0.8 }}>
              아직 오늘 식단 기록이 없어요.
            </div>
          </div>
        ) : (
          meals.map((m) => (
            <div className="diet-table-row" key={m.id}>
              <div>{mealTypeLabel[m.meal_type] || m.meal_type}</div>
              <div>{m.food_name}</div>
              <div>{m.calories} kcal</div>
              <div>{m.protein} g</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}