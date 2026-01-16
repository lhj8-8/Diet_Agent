import { useEffect, useState } from "react";
import api from "../api/Axios"; // Add this line

import "./WorkoutRecommend.css";

import EXERCISE_IMAGE_MAP from "../data/exerciseImageMap";

export default function WorkoutRecommend() {
  const [workouts, setWorkouts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null);     // Add error state

  // API 호출
  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/workouts?level=${level}`);
        const data = response.data;
        const slicedData = data.slice(0, 4);
        setWorkouts(slicedData);
        setSelected(slicedData[0]);
      } catch (err) {
        console.error("Error fetching workouts:", err);
        setError("운동 추천을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, [level]);



  return (
    <div className="workout-wrapper">
      {/* LEFT */}
      <div className="workout-left">
        <h2>오늘의 추천 운동</h2>

        <div className="level-tabs">
          {["beginner", "intermediate", "advanced"].map(l => (
            <button
              key={l}
              className={level === l ? "active" : ""}
              onClick={() => setLevel(l)}
            >
              {l === "beginner" ? "초급" : l === "intermediate" ? "중급" : "고급"}
            </button>
          ))}
        </div>

        <ul className="workout-list">
          {loading ? (
            <p>운동 추천 불러오는 중...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : workouts.length === 0 ? (
            <p>추천 운동이 없습니다.</p>
          ) : (
            workouts.map(w => (
              <li
                key={w.id}
                className={selected?.id === w.id ? "selected" : ""}
                onClick={() => {
                  setSelected(w);
                }}
              >
                <h4>{w.title}</h4>
                <span>{w.duration}분 · {w.part}</span>
                <small>운동: {w.exercises.slice(0,2).map(e => e.name).join(" · ")} 외 {w.exercises.length - 2}개</small>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* RIGHT */}
      <div className="workout-right">

        <h4 className="workout-subtitle">운동 리스트</h4>

        {/* 운동 미리보기 영역 */}
        <div className="preview-area">
          {selected?.exercises?.slice(0, 5).map((e, index) => {
            const imageNumber = EXERCISE_IMAGE_MAP[e.name] || ((index % 42) + 1); // Fallback to index+1
            return (
              <div key={index} className="preview-card-wrapper">
                <div className="preview-card">
                  <div className="preview-card-image-placeholder">
                    <img src={`/img/${imageNumber}.png`} alt={e.name} />
                  </div>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(e.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <span className="preview-card-title">{e.name}</span>
                  </a>
                </div>
                <div className="card-duration-below">
                  {e.duration}분
                </div>
              </div>
            );
          })}
        </div>



        <div className="meta">
          <span className="time">
            ● {selected?.exercises?.reduce((sum, e) => sum + e.duration, 0)}분
          </span>
          <span className="tag">{selected?.part}</span>
        </div>

        <p className="desc">{selected?.description}</p>



        <div className="actions">


        </div>
      </div>
    </div>
  );
}