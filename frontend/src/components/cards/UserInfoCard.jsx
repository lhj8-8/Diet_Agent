import React from 'react'

export default function UserInfoCard({height="-", weight="-", bmi="-", age = "-", sex = "-", activity_level = "-",  muscleMass="-", bodyFat="-", onEdit=()=>{}}){
  return (
    <section className="card user-card">
      <div className="card-header">
        <h3>나의 기본 정보</h3>
        <button className="btn small" onClick={onEdit}>정보 수정하기</button>
      </div>

      <div className="user-grid">
        <div className="user-item">
          <div className="label">키</div>
          <div className="value">{height}cm</div>
        </div>
        <div className="user-item">
          <div className="label">몸무게</div>
          <div className="value">{weight}kg</div>
        </div>
        <div className="user-item">
          <div className="label">BMI</div>
          <div className="value">{bmi}</div>
        </div>
        <div className='user-item'>
          <div className='label'>나이</div>
          <div className='value'>{age}세</div>
        </div>
        <div className='user-item'>
          <div className='label'>성별</div>
          <div className='value'>{sex}</div>
        </div>
        <div className='user-item'>
          <div className='label'>활동 레벨</div>
          <div className='value'>{activity_level}</div>
        </div>
        <div className="user-item">
          <div className="label">골격근량(SMM)</div>
          <div className="value">{muscleMass}kg</div>
        </div>
        <div className="user-item">
          <div className="label">체지방률</div>
          <div className="value">{bodyFat}%</div>
        </div>
      </div>
    </section>
  )
}
