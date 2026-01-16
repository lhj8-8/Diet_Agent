import React from 'react'

export default function TodayScheduleCard({
  events = [],
  onViewDetail = () => {},
  onToggleComplete = () => {}
}) {
  return (
    <section className="card schedule-card">
      <div className="card-header">
        <h3>오늘의 스케줄</h3>
        <button className="btn small" onClick={onViewDetail}>
          스케줄 자세히 보기
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ opacity: 0.8 }}>
          <p>📅 오늘 등록된 일정이 없습니다.</p>
          <p>'스케줄 자세히 보기'에서 일정을 추가해보세요!</p>
        </div>
      ) : (
        <ul className="schedule-list">
          {events.map(e => (
            <li key={e.id} className={`schedule-item ${e.done ? 'done' : ''}`}>
              <label className="chk">
                <input
                  type="checkbox"
                  checked={e.done}
                  onChange={() => onToggleComplete(e.id)}
                />
              </label>
              <div className="time">{e.time}</div>
              <div className="title">{e.title}</div>
              <div className="tag">{e.type}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}