import React from 'react'

export default function GoalStatusCard({
  goalType='감량',
  targetWeight=55,
  startDate='2024.01.10',
  endDate='2024.03.10',
  progress=42,
  calories = "-",
  protein = "-",
  activityKcal = "-",
  onChangeGoal=()=>{}
}){
  const badgeClass = {
    '감량':'badge-loss',
    '증량':'badge-gain',
    '유지':'badge-maintain'
  }[goalType] || 'badge-maintain'

  return (
    <section className="card goal-card">
      <div className="card-header">
        <h3>나의 목표 상태</h3>
        <button className="btn small" onClick={onChangeGoal}>목표 변경하기</button>
      </div>

      <div className="goal-body">
        <div className="goal-row">
          <div className="label">현재 목표</div>
          <div className={`goal-badge ${badgeClass}`}>{goalType}</div>
        </div>

        <div className="goal-row">
          <div className="label">목표 체중</div>
          <div className="value">{targetWeight} kg</div>
        </div>

        <div className="goal-row">
          <div className="label">목표 기간</div>
          <div className="value">{startDate} ~ {endDate}</div>
        </div>

        {/* 새로 추가 */}
        <div className="goal-row">
          <div className="label">목표 칼로리</div>
          <div className="value">{calories} kcal</div>
        </div>
        <div className="goal-row">
          <div className="label">목표 단백질</div>
          <div className="value">{protein} g</div>
        </div>
        <div className="goal-row">
          <div className="label">목표 소모 칼로리</div>
          <div className="value">{activityKcal} kcal</div>
        </div>

        <div className="progress-wrap">
          <div className="label">진행률</div>
          <div className="progress-bar" aria-hidden>
            <div className="progress-fill" style={{width: `${progress}%`}} />
          </div>
          <div className="progress-num">{progress}%</div>
        </div>
      </div>
    </section>
  )
}