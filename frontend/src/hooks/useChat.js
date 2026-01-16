// frontend/src/hooks/useChat.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatOnboarding from './useChatOnboarding';

const useChat = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text:
        '안녕하세요! 저는 AGENT AI 코치입니다.\n' +
        '먼저, 요즘 가장 집중하고 싶은 건 뭐예요?',
      options: [
        { key: 'Hypertrophy', label: '근비대 / 운동', value: 'Hypertrophy' },
        { key: 'Diet', label: '다이어트 / 식단', value: 'Diet' },
        { key: 'Health', label: '건강 / 컨디션', value: 'Health' },
      ],
    },
  ]);

  const [input, setInput] = useState('');

  const {
    mode,
    onboardingStep,
    profile,
    handleOptionClick,
    onboardingDone,
    setMode,
    setProfile,
    setOnboardingStep,
  } = useChatOnboarding(setMessages);

  const sessionId = 'temp-session-123';

  const handleQuickPrompt = (type) => {
    let text = '';
    if (type === 'today-diet') {
      text = '오늘 제 식단을 전체적으로 평가해줘.';
    } else if (type === 'today-workout') {
      text = '오늘 가능하면 좋은 운동 루틴을 추천해줘.';
    } else if (type === 'next-week-plan') {
      text = '내 기록과 스케줄을 기반으로 다음주 다이어트/운동 계획을 짜줘.';
    } else if (type === 'records-feedback') {
      text = '최근 기록을 기반으로 식단/운동 피드백을 자세히 알려줘.';
    }
    if (!text) return;
    setInput(text);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { from: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);

    const userInput = input;
    setInput('');

    if (!onboardingDone) {
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: '먼저 위의 선택지로 정보를 알려주세요!',
        },
      ]);
      return;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          mode: mode || 'Hypertrophy',
          message: userInput,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: data.reply || 'AI 응답 오류' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: '현재 데모 모드입니다.' },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return {
    messages,
    input,
    setInput,
    handleKeyDown,
    sendMessage,
    handleOptionClick,
    handleQuickPrompt,
    mode, // Exposed for potential use in ChatPage if needed
  };
};

export default useChat;
