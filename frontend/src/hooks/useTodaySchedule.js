// frontend/src/hooks/useTodaySchedule.js
import { useState, useEffect } from "react";
import axios from "axios";

const useTodaySchedule = (userId) => {
  const [todaySchedules, setTodaySchedules] = useState([]);

  const todayStr = () => new Date().toISOString().substring(0, 10);

  useEffect(() => {
    if (!userId) {
      setTodaySchedules([]);
      return;
    }
    const fetchSchedules = async () => {
      try {
        const scheduleRes = await axios.get(`/api/schedule/items/${userId}`, {
          params: { date: todayStr() },
        });
        const apiItems = scheduleRes.data.items || [];
        const mapped = apiItems.map((item, idx) => ({
          id: item.id || idx + 1,
          time: "하루 종일",
          title: item.title || "일정",
          type: "일정",
          done: false,
        }));
        setTodaySchedules(mapped);
      } catch (error) {
        console.error("get today schedule error", error);
        setTodaySchedules([]);
      }
    };
    fetchSchedules();
  }, [userId]);

  return {
    todaySchedules,
    setTodaySchedules,
    todayStr,
  };
};

export default useTodaySchedule;
