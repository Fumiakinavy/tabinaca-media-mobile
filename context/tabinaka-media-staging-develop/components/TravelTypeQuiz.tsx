import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TravelTypeCode,
  getTravelTypeInfo,
  isValidTravelTypeCode,
} from "../lib/travelTypeMapping";

export type TravelTypeAxis = "People" | "World" | "Decision" | "Time";

export type TravelTypeOptionValue =
  | "G"
  | "S"
  | "R"
  | "D"
  | "L"
  | "H"
  | "P"
  | "F";

export interface TravelTypeQuestionDefinition {
  id: string;
  question: string;
  axis: TravelTypeAxis;
  answers: Array<{
    id: string;
    text: string;
    value: TravelTypeOptionValue;
  }>;
}

export interface TravelTypeQuizAnswer {
  axis: TravelTypeAxis;
  value: TravelTypeOptionValue;
  questionIndex: number;
}

export interface TravelTypeUserState {
  travelTypeCode: TravelTypeCode;
  travelTypeName: string;
  travelTypeEmoji: string;
  travelTypeDescription: string;
  // Location information
  locationLat?: number;
  locationLng?: number;
  locationPermission?: boolean;
  currentLocation?: string;
}

interface TravelTypeQuizProps {
  onComplete: (userState: TravelTypeUserState) => void;
  onSkip: () => void;
  isVisible: boolean;
  onSignIn?: () => void;
}

export const TRAVEL_TYPE_QUESTIONS: TravelTypeQuestionDefinition[] = [
  {
    id: "q1",
    question: "What recharges you most when traveling?",
    axis: "People",
    answers: [
      { id: "a", text: "Hanging out with friends", value: "G" },
      { id: "b", text: "Time alone and quiet", value: "S" },
    ],
  },
  {
    id: "q2",
    question: "What's the stronger factor when choosing a destination?",
    axis: "World",
    answers: [
      {
        id: "a",
        text: 'Local flavors, scents, experiences = "Realness"',
        value: "R",
      },
      {
        id: "b",
        text: 'Stories, worldviews, meaning = "Narrative"',
        value: "D",
      },
    ],
  },
  {
    id: "q3",
    question: "What do you prioritize when choosing food?",
    axis: "Decision",
    answers: [
      { id: "a", text: "Reviews, value, distance", value: "L" },
      { id: "b", text: "Intuition, atmosphere, current mood", value: "H" },
    ],
  },
  {
    id: "q4",
    question: "How do you create your itinerary?",
    axis: "Time",
    answers: [
      { id: "a", text: "Create a detailed schedule with timings", value: "P" },
      {
        id: "b",
        text: "Decide the main points, then go with the flow",
        value: "F",
      },
    ],
  },
  {
    id: "q5",
    question: "What scenes do you photograph more?",
    axis: "People",
    answers: [
      { id: "a", text: "Group shots with everyone", value: "G" },
      { id: "b", text: "Landscapes and quiet snapshots", value: "S" },
    ],
  },
  {
    id: "q6",
    question: "Which attracts you more?",
    axis: "World",
    answers: [
      { id: "a", text: "Markets, food stalls, artisan workshops", value: "R" },
      { id: "b", text: "Galleries, narrative-driven exhibitions", value: "D" },
    ],
  },
  {
    id: "q7",
    question: "First reaction when plans go off track?",
    axis: "Decision",
    answers: [
      {
        id: "a",
        text: "Immediately recalculate route and find alternatives",
        value: "L",
      },
      { id: "b", text: "Rebuild the plan based on current mood", value: "H" },
    ],
  },
  {
    id: "q8",
    question: "How do you start your morning?",
    axis: "Time",
    answers: [
      { id: "a", text: "Set a departure time and go", value: "P" },
      { id: "b", text: "Start when you wake up naturally", value: "F" },
    ],
  },
  {
    id: "q9",
    question: "How do you spend time during transit?",
    axis: "People",
    answers: [
      {
        id: "a",
        text: "Conversation and vibes to liven up the journey",
        value: "G",
      },
      { id: "b", text: "Music, podcasts, solo time", value: "S" },
    ],
  },
  {
    id: "q10",
    question: "What do you do when you encounter a line?",
    axis: "Decision",
    answers: [
      {
        id: "a",
        text: "Check crowd data and wait times to decide",
        value: "L",
      },
      {
        id: "b",
        text: "Might as well join, or take a break nearby",
        value: "H",
      },
    ],
  },
  {
    id: "q11",
    question: "What do you do when you find an interesting alley?",
    axis: "Time",
    answers: [
      { id: "a", text: "Add it to the itinerary for later", value: "P" },
      { id: "b", text: "Turn into it right now", value: "F" },
    ],
  },
];

/**
 * 質問の重み付け設定
 * 質問の順序と軸ごとの重要度を考慮して分散を均等化
 */
const QUESTION_WEIGHTS: Record<string, number> = {
  q1: 1.2, // People - 最初の質問、基本特性を示す
  q2: 1.5, // World - 質問数が少ないため重みを高く
  q3: 1.1, // Decision
  q4: 1.1, // Time
  q5: 1.0, // People
  q6: 1.5, // World - 質問数が少ないため重みを高く
  q7: 1.0, // Decision
  q8: 1.0, // Time
  q9: 0.9, // People - 最後の質問
  q10: 0.9, // Decision - 最後の質問
  q11: 0.9, // Time - 最後の質問
};

/**
 * 各軸の正規化係数
 * 質問数の偏りを補正して、各軸の影響力を均等化
 */
const AXIS_NORMALIZATION: Record<TravelTypeAxis, number> = {
  People: 1.0, // 3問
  World: 1.5, // 2問のみなので補正
  Decision: 1.0, // 3問
  Time: 1.0, // 3問
};

/**
 * 判定のしきい値
 * スコアの差がこの値以下の場合は、よりバランスの取れた判定を行う
 */
const THRESHOLD = 0.15;

export function calculateTravelTypeFromAnswers(
  allAnswers: TravelTypeQuizAnswer[],
): TravelTypeCode {
  // 各軸のスコアを計算
  const scores = {
    People: { G: 0, S: 0 },
    World: { R: 0, D: 0 },
    Decision: { L: 0, H: 0 },
    Time: { P: 0, F: 0 },
  };

  // 各回答をスコアに変換
  allAnswers.forEach((answer) => {
    const axis = answer.axis;
    const questionId = TRAVEL_TYPE_QUESTIONS[answer.questionIndex]?.id;
    
    if (!questionId) return;

    const weight = QUESTION_WEIGHTS[questionId] || 1.0;
    const normalizedWeight = weight * AXIS_NORMALIZATION[axis];

    if (axis === "People" && (answer.value === "G" || answer.value === "S")) {
      scores.People[answer.value] += normalizedWeight;
    } else if (axis === "World" && (answer.value === "R" || answer.value === "D")) {
      scores.World[answer.value] += normalizedWeight;
    } else if (axis === "Decision" && (answer.value === "L" || answer.value === "H")) {
      scores.Decision[answer.value] += normalizedWeight;
    } else if (axis === "Time" && (answer.value === "P" || answer.value === "F")) {
      scores.Time[answer.value] += normalizedWeight;
    }
  });

  // 各軸の総スコアを計算
  const totals = {
    People: scores.People.G + scores.People.S,
    World: scores.World.R + scores.World.D,
    Decision: scores.Decision.L + scores.Decision.H,
    Time: scores.Time.P + scores.Time.F,
  };

  // 正規化スコア（0-1の範囲）を計算
  const normalizedScores = {
    People: {
      G: totals.People > 0 ? scores.People.G / totals.People : 0.5,
      S: totals.People > 0 ? scores.People.S / totals.People : 0.5,
      total: totals.People,
    },
    World: {
      R: totals.World > 0 ? scores.World.R / totals.World : 0.5,
      D: totals.World > 0 ? scores.World.D / totals.World : 0.5,
      total: totals.World,
    },
    Decision: {
      L: totals.Decision > 0 ? scores.Decision.L / totals.Decision : 0.5,
      H: totals.Decision > 0 ? scores.Decision.H / totals.Decision : 0.5,
      total: totals.Decision,
    },
    Time: {
      P: totals.Time > 0 ? scores.Time.P / totals.Time : 0.5,
      F: totals.Time > 0 ? scores.Time.F / totals.Time : 0.5,
      total: totals.Time,
    },
  };

  /**
   * 各軸の値を決定する関数
   * スコアの差がしきい値以下の場合は、より多様性を考慮した判定を行う
   */
  const determineValue = <T extends string>(
    axisScores: { [key: string]: number; total: number },
    rawScores: { [key: string]: number },
    option1: T,
    option2: T,
    axis: TravelTypeAxis,
    allAnswers: TravelTypeQuizAnswer[],
  ): T => {
    const score1 = axisScores[option1];
    const score2 = axisScores[option2];
    const rawScore1 = rawScores[option1];
    const rawScore2 = rawScores[option2];
    const diff = Math.abs(score1 - score2);
    const totalScore = axisScores.total;

    // スコアの差がしきい値以下の場合、より詳細な判定を行う
    const relativeDiff = totalScore > 0 ? diff / totalScore : 0;
    
    if (relativeDiff <= THRESHOLD) {
      // より多様性を高めるため、質問の順序と回答の一貫性を考慮
      const axisAnswers = allAnswers
        .filter((a) => a.axis === axis)
        .sort((a, b) => b.questionIndex - a.questionIndex); // 後半の質問を優先

      // 後半の質問（より具体的な質問）の回答を重視
      let recentBias = 0;
      const recentAnswers = axisAnswers.slice(0, Math.ceil(axisAnswers.length / 2));
      recentAnswers.forEach((answer) => {
        const qWeight = QUESTION_WEIGHTS[TRAVEL_TYPE_QUESTIONS[answer.questionIndex]?.id || ""] || 1.0;
        if (answer.value === option1) {
          recentBias += qWeight;
        } else if (answer.value === option2) {
          recentBias -= qWeight;
        }
      });

      // 後半の質問の傾向が明確な場合
      if (Math.abs(recentBias) > 0.1) {
        return recentBias > 0 ? option1 : option2;
      }

      // 後半の傾向も同程度の場合は、回答数で判定
      const option1Count = axisAnswers.filter((a) => a.value === option1).length;
      const option2Count = axisAnswers.filter((a) => a.value === option2).length;

      if (option1Count > option2Count) {
        return option1;
      } else if (option2Count > option1Count) {
        return option2;
      }

      // 完全に同数の場合は、最初の質問（基本特性）の回答を優先
      if (axisAnswers.length > 0) {
        const firstAnswer = axisAnswers[axisAnswers.length - 1]; // 最初の質問
        if (firstAnswer.value === option1 || firstAnswer.value === option2) {
          return firstAnswer.value as T;
        }
      }
      
      // 最終フォールバック: スコアが高い方を選択
      return rawScore1 >= rawScore2 ? option1 : option2;
    }

    // 明確な差がある場合は、スコアが高い方を選択
    return score1 > score2 ? option1 : option2;
  };

  const people = determineValue(
    normalizedScores.People,
    scores.People,
    "G",
    "S",
    "People",
    allAnswers,
  );
  const world = determineValue(
    normalizedScores.World,
    scores.World,
    "R",
    "D",
    "World",
    allAnswers,
  );
  const decision = determineValue(
    normalizedScores.Decision,
    scores.Decision,
    "L",
    "H",
    "Decision",
    allAnswers,
  );
  const time = determineValue(
    normalizedScores.Time,
    scores.Time,
    "P",
    "F",
    "Time",
    allAnswers,
  );

  const code = `${people}${world}${decision}${time}` as TravelTypeCode;

  if (!isValidTravelTypeCode(code)) {
    console.warn("Invalid travel type code calculated:", code);
    return "GRLP";
  }

  return code;
}

export const TravelTypeQuiz: React.FC<TravelTypeQuizProps> = ({
  onComplete,
  onSkip,
  isVisible,
  onSignIn,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Array<TravelTypeQuizAnswer | undefined>
  >([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [travelTypeCode, setTravelTypeCode] = useState<TravelTypeCode | null>(
    null,
  );
  const showSignInCta = Boolean(onSignIn);

  const currentQuestion = TRAVEL_TYPE_QUESTIONS[currentQuestionIndex];
  const progress =
    ((currentQuestionIndex + 1) / TRAVEL_TYPE_QUESTIONS.length) * 100;

  const handleAnswerSelect = (answerValue: TravelTypeOptionValue) => {
    setIsAnimating(true);

    const newAnswer: TravelTypeQuizAnswer = {
      axis: currentQuestion.axis,
      value: answerValue,
      questionIndex: currentQuestionIndex,
    };
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers);
    const completedAnswers = updatedAnswers.filter(
      (answer): answer is TravelTypeQuizAnswer => Boolean(answer),
    );

    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestionIndex < TRAVEL_TYPE_QUESTIONS.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // すべての質問が終わったら結果を計算し即時保存
        const calculatedType = calculateTravelTypeFromAnswers(completedAnswers);
        setTravelTypeCode(calculatedType);
        setShowResult(true);

        const typeInfo = getTravelTypeInfo(calculatedType);
        onComplete({
          travelTypeCode: calculatedType,
          travelTypeName: typeInfo.name,
          travelTypeEmoji: typeInfo.emoji,
          travelTypeDescription: typeInfo.description,
        });
      }
      setIsAnimating(false);
    }, 600);
  };

  if (!isVisible) return null;

  // 結果表示
  if (showResult && travelTypeCode) {
    const typeInfo = getTravelTypeInfo(travelTypeCode);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 touch-pan-y min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto pb-safe-bottom -webkit-overflow-scrolling-touch"
        >
          <div className="text-center mb-6">
            <div className="text-5xl sm:text-6xl mb-4">{typeInfo.emoji}</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {typeInfo.name}
            </h2>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              {typeInfo.code}
            </p>
            <p className="text-base sm:text-lg leading-relaxed">
              {typeInfo.description}
            </p>
          </div>

          {showSignInCta && (
            <div className="mt-6 space-y-2 text-center">
              <button
                onClick={onSignIn}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors text-sm sm:text-base"
              >
                Sign in to unlock Gappy chat
              </button>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Save this mini quiz result, sync across devices, and get
                personalized chat.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // クイズ表示
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 touch-pan-y min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto pb-safe-bottom -webkit-overflow-scrolling-touch"
      >
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm text-gray-600">
              Question {currentQuestionIndex + 1} /{" "}
              {TRAVEL_TYPE_QUESTIONS.length}
            </span>
            <button
              onClick={onSkip}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-green-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-center border-b-2 border-slate-200 pb-3 sm:pb-4">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {currentQuestion.answers.map((answer) => (
                <motion.button
                  key={answer.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(answer.value)}
                  disabled={isAnimating}
                  className="w-full p-4 sm:p-5 text-left border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50 text-sm sm:text-lg"
                >
                  <span className="text-base sm:text-lg">{answer.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
