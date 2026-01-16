// frontend/src/hooks/useProfile.js
import { useState, useEffect } from "react";
import axios from "axios";

const useProfile = (userId) => {
  const [profile, setProfile] = useState({
    email: "",
    name: "",
    height: "",
    weight: "",
    goal: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      setMessage("로그인 후 이용해주세요.");
      return;
    }
    const fetchData = async () => {
      try {
        const profileRes = await axios.get(`/api/user/me/${userId}`);
        const data = profileRes.data;
        setProfile({
          email: data.email || "",
          name: data.name || "",
          height: data.height ?? "",
          weight: data.weight ?? "",
          goal: data.goal || "",
        });
      } catch (error) {
        console.error("get myinfo error", error);
        setMessage("내 정보를 불러오지 못했습니다.");
      }
    };
    fetchData();
  }, [userId]);

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!userId) {
      setMessage("로그인 후 이용해주세요.");
      return;
    }
    try {
      await axios.put(`/api/user/me/${userId}`, {
        name: profile.name,
        height: profile.height || null,
        weight: profile.weight || null,
        goal: profile.goal,
      });
      setMessage("내 정보가 저장되었습니다.");
    } catch (error) {
      console.error("save myinfo error", error);
      setMessage("저장 중 오류가 발생했습니다.");
    }
  };

  const handleProfileFieldChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const bmi =
    profile.height && profile.weight
      ? (Number(profile.weight) / ((Number(profile.height) / 100) ** 2)).toFixed(1)
      : "-";

  return {
    profile,
    setProfile,
    message,
    setMessage,
    handleSaveProfile,
    handleProfileFieldChange,
    bmi,
  };
};

export default useProfile;
