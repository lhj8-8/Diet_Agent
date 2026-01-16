import React from 'react'

export default function RecommendationCard({meals = [], workout = {}, onRecalc = ()=>{}}){
  const defaultMeals = [
    {meal_type:'아침', name:'오트밀 + 과일', calories:420},
    {meal_type:'점심', name:'닭가슴살 샐러드', calories:560},
    {meal_type:'저녁', name:'연어구이 + 채소', calories:550}
  ]
  const m = meals.length? meals : defaultMeals

  return (
    <section className="card rec-card">
      <div className="card-header">
        <h3>오늘의 추천</h3>
        <button className="btn small" onClick={onRecalc}>AI에게 다시 추천 요청하기</button>
      </div>

      <div className="rec-grid">
        <div className="meals">
          {m.map((item, idx) => (
            <div key={idx} className="meal-card">
              <div className="meal-type">{item.meal_type}</div>
              <div className="meal-name">{item.name}</div>
              <div className="meal-cals">{item.calories} kcal</div>
            </div>
          ))}
        </div>

        <div className="workout">
          <div className="workout-title">추천 운동</div>
          <div className="workout-name">{workout.name || '걷기'}</div>
          <div className="workout-meta">{workout.minutes || 30} 분 · {workout.calories || 200} kcal</div>
        </div>
      </div>
    </section>
  )
}
