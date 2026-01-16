// frontend/src/hooks/useChatOnboarding.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const useChatOnboarding = (setMessages) => {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profile, setProfile] = useState({
    focus: null,
    daysPerWeek: null,
    level: null,
  });

  const onboardingDone = onboardingStep >= 3;

  const handleOptionClick = (msgIndex, option) => {
    // 🔹 회원가입 버튼 클릭 시
    if (option.value === 'signup') {
      navigate('/login');
      return;
    }
    if (option.value === 'later') {
      return;
    }

    if (onboardingStep === 0) {
      setMode(option.value);
      setProfile((prev) => ({ ...prev, focus: option.value }));

      const userText = `저는 ${option.label} 쪽이 더 중요해요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: 'user', text: userText });
        next.push({
          from: 'bot',
          text:
            '좋아요! 그럼 현실적으로 일주일에 몇 번 정도 운동이나 자기 관리를 할 수 있을 것 같아요?',
          options: [
            { key: '2', label: '주 2회', value: 2 },
            { key: '3', label: '주 3회', value: 3 },
            { key: '4', label: '주 4회 이상', value: 4 },
          ],
        });
        return next;
      });

      setOnboardingStep(1);
      return;
    }

    if (onboardingStep === 1) {
      setProfile((prev) => ({ ...prev, daysPerWeek: option.value }));

      const userText = `일주일에 ${option.label} 정도는 할 수 있을 것 같아요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: 'user', text: userText });
        next.push({
          from: 'bot',
          text: '알겠습니다! 마지막으로, 본인을 어느 정도 수준이라고 생각하세요?',
          options: [
            { key: 'beginner', label: '완전 초보', value: 'beginner' },
            { key: 'intermediate', label: '중간 정도', value: 'intermediate' },
            { key: 'advanced', label: '상급 / 오래 해봄', value: 'advanced' },
          ],
        });
        return next;
      });

      setOnboardingStep(2);
      return;
    }

    if (onboardingStep === 2) {
      setProfile((prev) => ({ ...prev, level: option.value }));

      const userText = `제 수준은 ${option.label} 쯤인 것 같아요.`;

      setMessages((prev) => {
        const next = [...prev];
        next[msgIndex] = { ...next[msgIndex], options: undefined };
        next.push({ from: 'user', text: userText });

        const planText = `
- 목표: ${profile.focus}
- 주당 운동 횟수: ${profile.daysPerWeek}회
- 현재 수준: ${option.label}
        `;

        next.push({
          from: 'bot',
          text:
            '좋아요! 지금까지 정보를 바탕으로 추천 계획을 만들어봤어요:\n\n' +
            planText +
            '\n더 궁금한 점 있으시면 언제든 질문해 주세요 🙂',
        });

        next.push({
          from: 'bot',
          text: '회원가입하시면 더 다양한 맞춤 계획을 받아볼 수 있어요. 지금 회원가입하시겠어요?',
          options: [
            { key: 'signup', label: '회원가입', value: 'signup' },
            { key: 'later', label: '나중에', value: 'later' },
          ],
        });

        return next;
      });

      setOnboardingStep(3);
    }
  };

  return {
    mode,
    onboardingStep,
    profile,
    handleOptionClick,
    onboardingDone,
    setMode,
    setProfile,
    setOnboardingStep,
  };
};

export default useChatOnboarding;
