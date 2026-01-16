import React, { useState, useMemo } from "react";
import "./SelfCheckPage.css";
import { useNavigate } from "react-router-dom";

export default function SelfCheckPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // STEP 1. 기본 정보
  const [age, setAge] = useState("");
  const [gender, setGender] = useState(""); // "male" | "female"
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("3");
  const [smm, setSmm] = useState("");
  const [fatMass, setFatMass] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [obesityIndex, setObesityIndex] = useState("");

  // STEP 2. 목표
  const [goalType, setGoalType] = useState("loss"); // loss / gain / keep
  const [targetWeight, setTargetWeight] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("");

  // STEP 3. 생활 패턴
  const [eatingHabits, setEatingHabits] = useState("");
  const [foodToAvoid, setFoodToAvoid] = useState("");
  const [availableDaysTimes, setAvailableDaysTimes] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [scheduleInfo, setScheduleInfo] = useState("");

  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);

  const isLoggedIn = !!localStorage.getItem("userId");

  const activityText = useMemo(() => {
    const map = {
      "1": "거의 움직이지 않음 (앉아서 생활)",
      "2": "가벼운 활동 (주 1~2회 가벼운 운동)",
      "3": "보통 활동 (주 3회 내외 운동)",
      "4": "많이 움직임 (육체 노동 / 잦은 운동)",
      "5": "매우 활동적 (스포츠 선수 수준)"
    };
    return map[activityLevel] || "";
  }, [activityLevel]);

  // BMR 및 권장 칼로리 계산
  const resultValues = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseFloat(age);
    if (!gender || Number.isNaN(h) || Number.isNaN(w) || Number.isNaN(a)) {
      return null;
    }

    // Mifflin-St Jeor equation
    let bmr = 10 * w + 6.25 * h - 5 * a + (gender === "male" ? 5 : -161);

    const activityMap = {
      "1": 1.2,
      "2": 1.375,
      "3": 1.55,
      "4": 1.725,
      "5": 1.9
    };
    const factor = activityMap[activityLevel] || 1.4;
    const maintenance = bmr * factor;

    let recommended = maintenance;
    if (goalType === "loss") {
      recommended = maintenance - 400;
    } else if (goalType === "gain") {
      recommended = maintenance + 300;
    }

    if (recommended < 1100) {
      recommended = 1100;
    }

    return {
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      recommended: Math.round(recommended)
    };
  }, [age, gender, height, weight, activityLevel, goalType]);

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!age || !gender || !height || !weight || !activityLevel) {
        setError("나이, 성별, 키, 몸무게, 활동량은 필수 입력 값이에요.");
        return;
      }
    }
    if (step === 2) {
      if (!goalType || !targetWeight || !targetPeriod) {
        setError("목표 종류, 목표 체중, 목표 기간을 입력해주세요.");
        return;
      }
    }
    if (step === 3) {
      if (!eatingHabits || !sleepHours || !scheduleInfo) {
        setError("식습관, 수면시간, 스케줄 정보는 최소한 간단히라도 적어주세요.");
        return;
      }
      setShowResult(true);
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGoLogin = () => {
    navigate("/login");
  };

  const handleGoMyPage = () => {
    navigate("/myinfo");
  };

  const goalText = useMemo(() => {
    if (goalType === "loss") return "체중 감량";
    if (goalType === "gain") return "체중 증량";
    return "체중 유지";
  }, [goalType]);

  // 추천 식단 간단 문구
  const dietRecommendation = useMemo(() => {
    if (!resultValues) {
      return "기초 정보가 부족해요. 나이/성별/키/몸무게를 모두 입력하면 더 정확한 식단 가이드를 드릴 수 있어요.";
    }
    const kcal = resultValues.recommended;
    let line1 = `하루 약 ${kcal.toLocaleString()} kcal 기준으로,`;
    let line2 = "";
    if (goalType === "loss") {
      line2 = "단백질 비중을 높이고(체중 1kg당 1.6~2.0g), 정제 탄수화물과 야식을 줄여보세요.";
    } else if (goalType === "gain") {
      line2 = "탄수화물과 단백질을 충분히 섭취하면서 3끼 + 1~2회 간식을 유지해보세요.";
    } else {
      line2 = "탄수화물·단백질·지방을 균형 있게 섭취하며 규칙적인 식사를 유지하는 것이 좋아요.";
    }
    const avoidLine = foodToAvoid.trim()
      ? `특히 "${foodToAvoid}"(은/는) 가능하면 줄이거나 건강한 대체 식품으로 바꿔보세요.`
      : "평소에 과자, 튀김, 음료(액상과당)는 조금만 줄여도 큰 도움이 돼요.";

    return `${line1} ${line2} ${avoidLine}`;
  }, [resultValues, goalType, foodToAvoid]);

  const exerciseRecommendation = useMemo(() => {
    let base = "";
    if (activityLevel === "1" || activityLevel === "2") {
      base = "주 3회, 30분 내외의 가벼운 유산소(걷기, 자전거)부터 시작해보세요.";
    } else if (activityLevel === "3") {
      base = "주 3~4회, 30~40분 정도의 유산소 + 주 2~3회 근력운동을 섞어보면 좋아요.";
    } else {
      base = "현재 활동량을 유지하면서, 근력운동 위주로 루틴을 조금씩 업그레이드해보세요.";
    }

    const avail = availableDaysTimes.trim()
      ? `
입력해주신 "${availableDaysTimes}" 시간대를 기준으로, 자신만의 고정 운동 루틴을 만들어보는 걸 추천해요.`
      : "";

    const sleepLine = sleepHours
      ? `
하루 평균 수면은 약 ${sleepHours}시간으로 입력해주셨어요. 최소 7시간 전후의 수면을 유지하면 회복과 체중 관리에 큰 도움이 됩니다.`
      : "";

    return base + avail + sleepLine;
  }, [activityLevel, availableDaysTimes, sleepHours]);

  return (
    <div className="selfcheck-page">
      <div className="selfcheck-container">
        <header className="selfcheck-header">
          <div className="selfcheck-logo" onClick={() => navigate("/")}>
            <span className="selfcheck-logo-mark">DA</span>
            <span className="selfcheck-logo-text">Diet Agent Self-Check</span>
          </div>
          <button
            type="button"
            className="selfcheck-header-login"
            onClick={isLoggedIn ? handleGoMyPage : handleGoLogin}
          >
            {isLoggedIn ? "마이페이지" : "로그인"}
          </button>
        </header>

        <div className="selfcheck-body">
          <h1 className="selfcheck-title">나만의 다이어트 & 일정관리 자가진단</h1>
          <p className="selfcheck-sub">
            비회원도 자유롭게 진단할 수 있어요. 결과를 마이페이지에 저장하고 싶다면, 마지막 단계에서{" "}
            <strong>로그인</strong>을 진행하면 됩니다.
          </p>

          {/* 단계 표시 */}
          <div className="selfcheck-steps">
            <div className={step >= 1 ? "step-item active" : "step-item"}>
              <span className="step-index">1</span>
              <span className="step-label">기본정보</span>
            </div>
            <div className={step >= 2 ? "step-item active" : "step-item"}>
              <span className="step-index">2</span>
              <span className="step-label">목표</span>
            </div>
            <div className={step >= 3 ? "step-item active" : "step-item"}>
              <span className="step-index">3</span>
              <span className="step-label">생활 패턴</span>
            </div>
            <div className={step >= 4 && showResult ? "step-item active" : "step-item"}>
              <span className="step-index">R</span>
              <span className="step-label">결과</span>
            </div>
          </div>

          {error && <div className="selfcheck-error">{error}</div>}

          {/* STEP 1 */}
          {step === 1 && (
            <section className="selfcheck-section">
              <h2>STEP 1. 기본정보</h2>
              <div className="selfcheck-grid">
                <div className="form-field">
                  <label>나이</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    placeholder="예: 25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>성별</label>
                  <div className="gender-group">
                    <button
                      type="button"
                      className={gender === "male" ? "chip-btn active" : "chip-btn"}
                      onClick={() => setGender("male")}
                    >
                      남성
                    </button>
                    <button
                      type="button"
                      className={gender === "female" ? "chip-btn active" : "chip-btn"}
                      onClick={() => setGender("female")}
                    >
                      여성
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>키 (cm)</label>
                  <input
                    type="number"
                    placeholder="예: 165"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>몸무게 (kg)</label>
                  <input
                    type="number"
                    placeholder="예: 60"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>활동량 (1~5)</label>
                  <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                    <option value="1">1 - 거의 운동하지 않음</option>
                    <option value="2">2 - 가벼운 활동</option>
                    <option value="3">3 - 보통 활동</option>
                    <option value="4">4 - 활동량이 많은 편</option>
                    <option value="5">5 - 매우 활동적</option>
                  </select>
                  <p className="field-help">{activityText}</p>
                </div>
              </div>

              <div className="selfcheck-inbody">
                <h3>선택 입력 · 인바디 세부 정보</h3>
                <p className="inbody-guide">
                  인바디 정보를 입력하면 훨씬 더 정확한 AI 코칭을 받을 수 있어요!
                </p>
                <div className="selfcheck-grid">
                  <div className="form-field">
                    <label>골격근량 (SMM, kg)</label>
                    <input
                      type="number"
                      placeholder="예: 25.0"
                      value={smm}
                      onChange={(e) => setSmm(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>체지방량 (Fat mass, kg)</label>
                    <input
                      type="number"
                      placeholder="예: 18.0"
                      value={fatMass}
                      onChange={(e) => setFatMass(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>체지방률 (%)</label>
                    <input
                      type="number"
                      placeholder="예: 27"
                      value={bodyFatPercent}
                      onChange={(e) => setBodyFatPercent(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>비만도 (BMI, WHR 등)</label>
                    <input
                      type="text"
                      placeholder="예: BMI 24.3, WHR 0.85"
                      value={obesityIndex}
                      onChange={(e) => setObesityIndex(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <section className="selfcheck-section">
              <h2>STEP 2. 목표 설정</h2>
              <div className="selfcheck-grid">
                <div className="form-field">
                  <label>목표 종류</label>
                  <div className="goal-group">
                    <button
                      type="button"
                      className={goalType === "loss" ? "chip-btn active" : "chip-btn"}
                      onClick={() => setGoalType("loss")}
                    >
                      감량
                    </button>
                    <button
                      type="button"
                      className={goalType === "gain" ? "chip-btn active" : "chip-btn"}
                      onClick={() => setGoalType("gain")}
                    >
                      증량
                    </button>
                    <button
                      type="button"
                      className={goalType === "keep" ? "chip-btn active" : "chip-btn"}
                      onClick={() => setGoalType("keep")}
                    >
                      유지
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>목표 체중 (kg)</label>
                  <input
                    type="number"
                    placeholder="예: 55"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>목표 기간 (주 단위)</label>
                  <input
                    type="number"
                    placeholder="예: 12 (주)"
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <section className="selfcheck-section">
              <h2>STEP 3. 생활 패턴</h2>
              <div className="selfcheck-grid">
                <div className="form-field full">
                  <label>식습관</label>
                  <textarea
                    rows={3}
                    placeholder="예: 하루 2끼, 야식 자주 먹음, 단 음식 좋아함 등"
                    value={eatingHabits}
                    onChange={(e) => setEatingHabits(e.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label>제외하고 싶은 음식</label>
                  <textarea
                    rows={2}
                    placeholder="예: 튀김, 밀가루, 술 등"
                    value={foodToAvoid}
                    onChange={(e) => setFoodToAvoid(e.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label>운동 가능 요일 / 시간</label>
                  <textarea
                    rows={2}
                    placeholder="예: 월/수/금 저녁 7시 이후 가능"
                    value={availableDaysTimes}
                    onChange={(e) => setAvailableDaysTimes(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>하루 평균 수면시간 (시간)</label>
                  <input
                    type="number"
                    placeholder="예: 6.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label>스케줄 (출근/등교 시간, 취침 시간 등)</label>
                  <textarea
                    rows={2}
                    placeholder="예: 평일 8시 등교, 23시 취침 / 주말은 불규칙 등"
                    value={scheduleInfo}
                    onChange={(e) => setScheduleInfo(e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: 결과 */}
          {step === 4 && showResult && (
            <section className="selfcheck-section">
              <h2>결과 요약</h2>

              <div className="result-grid">
                <div className="result-card">
                  <h3>기초대사량 (BMR)</h3>
                  {resultValues ? (
                    <>
                      <p className="result-main">
                        약 <strong>{resultValues.bmr.toLocaleString()} kcal</strong> / 하루
                      </p>
                      <p className="result-sub">
                        아무 것도 하지 않아도, 지금 몸을 유지하는 데 필요한 에너지 양이에요.
                      </p>
                    </>
                  ) : (
                    <p className="result-sub">
                      나이/성별/키/몸무게 정보를 모두 입력하면 BMR을 계산해 드릴 수 있어요.
                    </p>
                  )}
                </div>

                <div className="result-card">
                  <h3>일일 권장 칼로리</h3>
                  {resultValues ? (
                    <>
                      <p className="result-main">
                        약 <strong>{resultValues.recommended.toLocaleString()} kcal</strong> / 하루
                      </p>
                      <p className="result-sub">
                        활동량과 목표({goalText})를 반영한 1일 섭취 기준치예요.
                      </p>
                    </>
                  ) : (
                    <p className="result-sub">
                      활동량과 기초 정보를 입력하면, 목표에 맞는 칼로리 가이드를 드릴 수 있어요.
                    </p>
                  )}
                </div>

                <div className="result-card">
                  <h3>기본 추천 식단</h3>
                  <p className="result-sub">{dietRecommendation}</p>
                  {eatingHabits && (
                    <p className="result-sub">
                      입력해주신 식습관: <em>{eatingHabits}</em>
                    </p>
                  )}
                </div>

                <div className="result-card">
                  <h3>기본 추천 운동</h3>
                  <p className="result-sub">{exerciseRecommendation}</p>
                </div>
              </div>

              <div className="result-login-box">
                <p className="result-login-text">
                  더 자세한 추천을 받고 싶다면
                  로그인이 필요해요.
                </p>
                <div className="result-login-actions">
                  {!isLoggedIn && (
                    <button type="button" className="primary-btn" onClick={handleGoLogin}>
                      로그인하고 마이페이지에 저장하기
                    </button>
                  )}
                  {isLoggedIn && (
                    <button type="button" className="primary-btn" onClick={handleGoMyPage}>
                      마이페이지에서 바로 관리하기
                    </button>
                  )}
                  <button type="button" className="secondary-btn" onClick={() => setStep(1)}>
                    다시 진단하기
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 버튼 영역 */}
          <div className="selfcheck-footer-buttons">
            {step > 1 && step <= 3 && (
              <button type="button" className="secondary-btn" onClick={handlePrev}>
                이전 단계
              </button>
            )}
            {step <= 3 && (
              <button type="button" className="primary-btn" onClick={handleNext}>
                {step === 3 ? "결과 보기" : "다음 단계"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
