"use client";

import { useState } from "react";

import { LoadingSpinner } from "./loading-spinner";

const MIN_CARD_COUNT = 5;
const MAX_CARD_COUNT = 100;

export type GeneratedDeckResult = {
  id: string;
  name: string;
  cardCount: number;
};

export function AIDeckMaker({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (deck: GeneratedDeckResult) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [cardCountInput, setCardCountInput] = useState("20");
  const [contentType, setContentType] = useState<
    "flashcards" | "quizzes" | "mixed"
  >("mixed");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const cardCount = Number(cardCountInput);
  const isCardCountValid =
    cardCountInput.trim() !== "" &&
    Number.isInteger(cardCount) &&
    cardCount >= MIN_CARD_COUNT &&
    cardCount <= MAX_CARD_COUNT;

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles((current) => {
      const all = [...current, ...Array.from(incoming)];
      return all
        .filter(
          (file, index) =>
            all.findIndex(
              (other) => other.name === file.name && other.size === file.size,
            ) === index,
        )
        .slice(0, 10);
    });
    setErrorMessage("");
  }

  async function generateDeck() {
    if (files.length === 0 || isGenerating) return;
    if (!isCardCountValid) {
      setErrorMessage(
        `Enter a whole number between ${MIN_CARD_COUNT} and ${MAX_CARD_COUNT}.`,
      );
      return;
    }
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("cardCount", String(cardCount));
      form.append("contentType", contentType);
      form.append("instructions", instructions);
      const response = await fetch("/api/ai/decks", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as GeneratedDeckResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Could not generate the deck.");
      await onCreated(result);
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error ? cause.message : "Could not generate the deck.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const totalMb = files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;
  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    marginTop: 6,
    padding: 10,
    borderRadius: 11,
    border: "2px solid oklch(85% 0.05 250)",
    font: "inherit",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-deck-title"
      className="ai-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isGenerating) onClose();
      }}
    >
      <div className="ai-modal-card">
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 18 }}
        >
          <div>
            <div id="ai-deck-title" className="ai-modal-title">
              Make a deck with AI
            </div>
            <div className="ai-modal-subtitle">
              Add lecture slides or notes and Spaced Eggs will turn the key
              ideas into cards.
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={isGenerating}
            onClick={onClose}
            className="ai-close"
          >
            ×
          </button>
        </div>

        <div
          className="ai-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!isGenerating) addFiles(event.dataTransfer.files);
          }}
        >
          <input
            id="ai-source-files"
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md"
            disabled={isGenerating}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
            className="sr-file-input"
          />
          <label htmlFor="ai-source-files" className="ai-file-picker-label">
            <span style={{ display: "block", fontSize: 30 }}>📚</span>
            <strong style={{ display: "block", marginTop: 6 }}>
              Choose files or drop them here
            </strong>
            <span style={{ display: "block", marginTop: 5, fontSize: 12 }}>
              PDF, PowerPoint, Word, text or Markdown · up to 10 files / 50 MB
              total
            </span>
          </label>
        </div>

        {files.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}`} className="ai-file-row">
                <span className="ai-file-name">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  disabled={isGenerating}
                  onClick={() =>
                    setFiles((current) => current.filter((_, i) => i !== index))
                  }
                  className="ai-remove-file"
                >
                  ×
                </button>
              </div>
            ))}
            <div style={{ fontSize: 11, textAlign: "right" }}>
              {totalMb.toFixed(1)} MB total
            </div>
          </div>
        )}

        <div className="ai-options">
          <label style={{ fontSize: 13, fontWeight: 800 }}>
            Create
            <select
              value={contentType}
              disabled={isGenerating}
              onChange={(event) =>
                setContentType(
                  event.target.value as "flashcards" | "quizzes" | "mixed",
                )
              }
              style={fieldStyle}
            >
              <option value="mixed">A mixed deck</option>
              <option value="flashcards">Flashcards only</option>
              <option value="quizzes">Quizzes only</option>
            </select>
          </label>
          <label style={{ fontSize: 13, fontWeight: 800 }}>
            Number of cards
            <input
              type="number"
              min={MIN_CARD_COUNT}
              max={MAX_CARD_COUNT}
              step={1}
              value={cardCountInput}
              disabled={isGenerating}
              aria-invalid={!isCardCountValid}
              onChange={(event) => {
                setCardCountInput(event.target.value);
                setErrorMessage("");
              }}
              style={fieldStyle}
            />
            <span
              style={{ display: "block", marginTop: 5, fontSize: 11, fontWeight: 500 }}
            >
              {MIN_CARD_COUNT}–{MAX_CARD_COUNT} cards
            </span>
          </label>
          <label
            className="ai-focus-field"
            style={{ fontSize: 13, fontWeight: 800 }}
          >
            Anything to focus on?{" "}
            <span style={{ fontWeight: 500 }}>(optional)</span>
            <input
              value={instructions}
              maxLength={1000}
              disabled={isGenerating}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="e.g. focus on exam objectives"
              style={fieldStyle}
            />
          </label>
        </div>

        {errorMessage && (
          <div role="alert" className="ai-error">
            {errorMessage}
          </div>
        )}
        <button
          type="button"
          disabled={
            files.length === 0 ||
            isGenerating ||
            totalMb > 50 ||
            !isCardCountValid
          }
          onClick={() => void generateDeck()}
          className="ai-generate"
        >
          {isGenerating ? (
            "Reading your files and making cards…"
          ) : (
            "Generate deck"
          )}
        </button>
        {isGenerating && (
          <div className="ai-waiting-message" aria-live="polite">
            <LoadingSpinner size={28} label="Waiting for the AI response" />
            <span>
              This can take a minute for larger slide decks. Please keep this
              window open.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
