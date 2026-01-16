import React from 'react'
import { BsPersonLinesFill, BsCalendar2Event, BsChatDots, BsFillPenFill } from 'react-icons/bs'
import { GiMeal } from 'react-icons/gi'
import { FaDumbbell } from 'react-icons/fa'

export default function QuickActions({onNavigate = ()=>{}}){
  const actions = [
    {label:'나의 정보', icon:<BsPersonLinesFill /> , to:'/myinfo'},
    {label:'식단 관리', icon:<GiMeal /> , to:'/diet'},
    {label:'운동 관리', icon:<FaDumbbell /> , to:'/workout'},
    {label:'식단 기록하기', icon:<BsFillPenFill /> , to:'/diet'},
    {label:'전체 스케줄', icon:<BsCalendar2Event /> , to:'/schedule'},
    {label:'AI 비서 채팅하기', icon:<BsChatDots /> , to:'/chat'},
  ]
  return (
    <section className="card quick-card">
      <div className="card-header">
        <h3>빠른 이동</h3>
      </div>

      <div className="quick-grid">
        {actions.map((a, idx)=>(
          <button key={idx} className="action-btn" onClick={()=>onNavigate(a.to)}>
            <div className="icon">{a.icon}</div>
            <div className="label">{a.label}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
