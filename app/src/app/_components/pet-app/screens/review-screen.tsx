"use client";

import { useEffect, useState } from "react";

import { INK, TERRACOTTA } from "~/app/_components/pet-app/constants";
import { PetPortrait } from "~/app/_components/pet-app/pet-visuals";
import {
  type Grade,
  type PetState,
  type ReviewCard,
} from "~/app/_components/pet-app/types";

export function ReviewScreen({
  pet,
  deckName,
  reviewCards,
  reviewIndex,
  flipped,
  setFlipped,
  isSubmittingReview,
  onGrade,
  onBack,
}: {
  pet: PetState;
  deckName: string;
  reviewCards: ReviewCard[];
  reviewIndex: number;
  flipped: boolean;
  setFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmittingReview: boolean;
  onGrade: (quality: Grade) => Promise<void>;
  onBack: () => void;
}) {
  const currentCard = reviewCards[reviewIndex];
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const isQuiz = currentCard?.type === "quiz";
  const quizOptions =
    isQuiz && currentCard.optionsJson
      ? (JSON.parse(currentCard.optionsJson) as string[])
      : [];
  const quizAnswered = selectedOption !== null;
  const quizCorrect =
    quizAnswered && selectedOption === currentCard?.correctIndex;

  useEffect(() => {
    setSelectedOption(null);
  }, [currentCard?.id]);

  async function submitGrade(quality: Grade) {
    if (isSubmittingReview) return;
    await onGrade(quality);
    setFlipped(false);
    setSelectedOption(null);
  }

  return (
    <div className="review-screen">
      {deckName && (
        <div
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: 13,
            color: "#7692A0",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {deckName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "#E9F7FF",
            width: 36,
            height: 36,
            borderRadius: "50%",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            color: INK,
          }}
        >
          ←
        </button>
        <div
          style={{
            flex: 1,
            height: 10,
            borderRadius: 6,
            background: "oklch(91% 0.03 230)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${reviewCards.length ? Math.round((reviewIndex / reviewCards.length) * 100) : 0}%`,
              background: TERRACOTTA,
              borderRadius: 6,
              transition: "width 0.3s",
            }}
          />
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 13,
            color: "#3563A5",
            whiteSpace: "nowrap",
          }}
        >
          {currentCard ? `${reviewIndex} / ${reviewCards.length}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 110, height: 110 }}>
          <PetPortrait pet={pet} size={110} align="center" />
        </div>
      </div>

      {isQuiz ? (
        <div className="quiz-review-card">
          <div className="study-side-label">Multiple choice</div>
          <div className="study-card-copy">{currentCard.front}</div>
          <div className="quiz-options">
            {quizOptions.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect =
                quizAnswered && index === currentCard.correctIndex;
              const isWrong = quizAnswered && isSelected && !isCorrect;
              return (
                <button
                  key={`${index}-${option}`}
                  type="button"
                  disabled={quizAnswered}
                  onClick={() => setSelectedOption(index)}
                  className={
                    isCorrect
                      ? "quiz-option quiz-option-correct"
                      : isWrong
                        ? "quiz-option quiz-option-wrong"
                        : "quiz-option"
                  }
                >
                  <span className="quiz-option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  {isCorrect && <span className="quiz-option-mark">✓</span>}
                  {isWrong && <span className="quiz-option-mark">×</span>}
                </button>
              );
            })}
          </div>
          {quizAnswered && (
            <div
              className={`quiz-feedback ${quizCorrect ? "quiz-feedback-correct" : "quiz-feedback-wrong"}`}
            >
              <strong>{quizCorrect ? "Correct!" : "Not quite."}</strong>
              {!quizCorrect && <span>The answer is {currentCard.back}.</span>}
            </div>
          )}
        </div>
      ) : (
        <div className="flashcard-scene">
          <div
            className={
              flipped ? "flashcard-flipper is-flipped" : "flashcard-flipper"
            }
          >
            <button
              type="button"
              aria-label="Reveal answer"
              onClick={() => setFlipped(true)}
              className="flashcard-face flashcard-front"
            >
              <span className="study-side-label">Question</span>
              <span className="study-card-copy">
                {currentCard?.front ?? ""}
              </span>
              <span className="flashcard-hint">
                Click the card to reveal the answer ↻
              </span>
            </button>
            <button
              type="button"
              aria-label="Show question"
              onClick={() => setFlipped(false)}
              className="flashcard-face flashcard-back"
            >
              <span className="answer-side-label">Answer</span>
              <span className="study-card-copy answer-copy">
                {currentCard?.back ?? ""}
              </span>
              <span className="flashcard-hint">
                Click to see the question again ↻
              </span>
            </button>
          </div>
        </div>
      )}

      {isQuiz && quizAnswered && (
        <button
          type="button"
          disabled={isSubmittingReview}
          onClick={() => void submitGrade(quizCorrect ? "good" : "again")}
          className="quiz-continue-button"
        >
          Continue
        </button>
      )}

      {!isQuiz && flipped && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            disabled={isSubmittingReview}
            onClick={(e) => {
              e.stopPropagation();
              void submitGrade("again");
            }}
            style={{
              padding: 16,
              border: "none",
              borderRadius: 16,
              background: "#FBD2C9",
              color: "#803A3D",
              fontWeight: 800,
              fontSize: 14,
              cursor: isSubmittingReview ? "default" : "pointer",
              opacity: isSubmittingReview ? 0.6 : 1,
            }}
          >
            Again
          </button>
          <button
            disabled={isSubmittingReview}
            onClick={(e) => {
              e.stopPropagation();
              void submitGrade("hard");
            }}
            style={{
              padding: 16,
              border: "none",
              borderRadius: 16,
              background: "#FFDBB8",
              color: "#844119",
              fontWeight: 800,
              fontSize: 14,
              cursor: isSubmittingReview ? "default" : "pointer",
              opacity: isSubmittingReview ? 0.6 : 1,
            }}
          >
            Hard
          </button>
          <button
            disabled={isSubmittingReview}
            onClick={(e) => {
              e.stopPropagation();
              void submitGrade("good");
            }}
            style={{
              padding: 16,
              border: "none",
              borderRadius: 16,
              background: "#D7EBCB",
              color: "#315D28",
              fontWeight: 800,
              fontSize: 14,
              cursor: isSubmittingReview ? "default" : "pointer",
              opacity: isSubmittingReview ? 0.6 : 1,
            }}
          >
            Good
          </button>
          <button
            disabled={isSubmittingReview}
            onClick={(e) => {
              e.stopPropagation();
              void submitGrade("easy");
            }}
            style={{
              padding: 16,
              border: "none",
              borderRadius: 16,
              background: "#FFED96",
              color: "#0B459D",
              fontWeight: 800,
              fontSize: 14,
              cursor: isSubmittingReview ? "default" : "pointer",
              opacity: isSubmittingReview ? 0.6 : 1,
            }}
          >
            Easy
          </button>
        </div>
      )}
    </div>
  );
}
