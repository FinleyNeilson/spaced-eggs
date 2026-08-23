"use client";

import { useState } from "react";

import {
  CARD_BG,
  CARD_LINE,
  INK,
  TERRACOTTA,
} from "~/app/_components/pet-app/constants";
import {
  type CardItem,
  type DeckSummary,
} from "~/app/_components/pet-app/types";
import { api } from "~/trpc/react";

export function DeckDetailScreen({
  deck,
  onBack,
}: {
  deck: DeckSummary;
  onBack: () => void;
}) {
  const utils = api.useUtils();
  const cardsQuery = api.card.listByDeck.useQuery({ deckId: deck.id });

  const updateDeck = api.deck.update.useMutation();
  const deleteDeck = api.deck.delete.useMutation();
  const createCard = api.card.create.useMutation();
  const updateCard = api.card.update.useMutation();
  const deleteCard = api.card.delete.useMutation();

  const [nameDraft, setNameDraft] = useState(deck.name);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newType, setNewType] = useState<"flashcard" | "quiz">("flashcard");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editType, setEditType] = useState<"flashcard" | "quiz">("flashcard");
  const [editOptions, setEditOptions] = useState(["", "", "", ""]);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);

  async function saveRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === deck.name) return;
    await updateDeck.mutateAsync({ id: deck.id, name: trimmed });
    await utils.deck.list.invalidate();
  }

  async function handleDeleteDeck() {
    if (
      !confirm(`Delete "${deck.name}" and all its cards? This can't be undone.`)
    )
      return;
    await deleteDeck.mutateAsync({ id: deck.id });
    await utils.deck.list.invalidate();
    onBack();
  }

  async function handleAddCard() {
    const front = newFront.trim();
    const back = newBack.trim();
    const lastOptionIndex = newOptions.reduce(
      (last, option, index) => (option.trim() ? index : last),
      -1,
    );
    const options = newOptions
      .slice(0, lastOptionIndex + 1)
      .map((option) => option.trim());
    if (!front || (newType === "flashcard" && !back)) return;
    if (
      newType === "quiz" &&
      (options.length < 2 ||
        options.some((option) => !option) ||
        newCorrectIndex >= options.length)
    )
      return;
    await createCard.mutateAsync({
      deckId: deck.id,
      front,
      back: newType === "quiz" ? options[newCorrectIndex]! : back,
      type: newType,
      ...(newType === "quiz" ? { options, correctIndex: newCorrectIndex } : {}),
    });
    setNewFront("");
    setNewBack("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
    await Promise.all([
      utils.card.listByDeck.invalidate({ deckId: deck.id }),
      utils.deck.list.invalidate(),
    ]);
  }

  function startEditCard(card: CardItem) {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditType(card.type === "quiz" ? "quiz" : "flashcard");
    const options = card.optionsJson
      ? (JSON.parse(card.optionsJson) as string[])
      : [];
    setEditOptions([...options, "", "", ""].slice(0, 4));
    setEditCorrectIndex(card.correctIndex ?? 0);
  }

  async function saveCardEdit() {
    if (!editingCardId) return;
    const front = editFront.trim();
    const back = editBack.trim();
    const lastOptionIndex = editOptions.reduce(
      (last, option, index) => (option.trim() ? index : last),
      -1,
    );
    const options = editOptions
      .slice(0, lastOptionIndex + 1)
      .map((option) => option.trim());
    if (!front || (editType === "flashcard" && !back)) return;
    if (
      editType === "quiz" &&
      (options.length < 2 ||
        options.some((option) => !option) ||
        editCorrectIndex >= options.length)
    )
      return;
    await updateCard.mutateAsync({
      id: editingCardId,
      front,
      back: editType === "quiz" ? options[editCorrectIndex]! : back,
      type: editType,
      ...(editType === "quiz"
        ? { options, correctIndex: editCorrectIndex }
        : {}),
    });
    setEditingCardId(null);
    await utils.card.listByDeck.invalidate({ deckId: deck.id });
  }

  async function handleDeleteCard(cardId: string) {
    await deleteCard.mutateAsync({ id: cardId });
    await Promise.all([
      utils.card.listByDeck.invalidate({ deckId: deck.id }),
      utils.deck.list.invalidate(),
    ]);
  }

  const inputStyle = {
    padding: "10px 14px",
    borderRadius: 12,
    border: `2px solid ${CARD_LINE}`,
    fontSize: 14,
    fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "oklch(91% 0.03 230)",
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
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 26,
          }}
        >
          Manage deck
        </div>
      </div>

      <div
        style={{
          background: CARD_BG,
          borderRadius: 22,
          padding: 22,
          border: `2px solid ${CARD_LINE}`,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
          />
          <button
            onClick={() => void saveRename()}
            disabled={
              !nameDraft.trim() ||
              nameDraft.trim() === deck.name ||
              updateDeck.isPending
            }
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: 12,
              background: TERRACOTTA,
              color: "oklch(98% 0.01 90)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save name
          </button>
        </div>
        <button
          onClick={() => void handleDeleteDeck()}
          style={{
            marginTop: 14,
            border: "none",
            background: "transparent",
            color: "oklch(52% 0.16 350)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Delete deck
        </button>
      </div>

      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
        Cards ({cardsQuery.data?.length ?? 0})
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {cardsQuery.data?.map((card) => (
          <div
            key={card.id}
            style={{
              background: CARD_BG,
              borderRadius: 16,
              padding: 16,
              border: `2px solid ${CARD_LINE}`,
            }}
          >
            {editingCardId === card.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 7 }}>
                  {(["flashcard", "quiz"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditType(type)}
                      style={{
                        flex: 1,
                        padding: 8,
                        border: `2px solid ${editType === type ? TERRACOTTA : CARD_LINE}`,
                        borderRadius: 10,
                        background:
                          editType === type
                            ? "oklch(94% 0.05 40)"
                            : "transparent",
                        color: INK,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {type === "quiz" ? "Quiz" : "Flashcard"}
                    </button>
                  ))}
                </div>
                <input
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  placeholder="Front"
                  style={inputStyle}
                />
                {editType === "flashcard" ? (
                  <input
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    placeholder="Back"
                    style={inputStyle}
                  />
                ) : (
                  editOptions.map((option, index) => (
                    <label
                      key={index}
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <input
                        type="radio"
                        name={`edit-correct-${card.id}`}
                        checked={editCorrectIndex === index}
                        onChange={() => setEditCorrectIndex(index)}
                      />
                      <input
                        value={option}
                        onChange={(event) =>
                          setEditOptions((current) =>
                            current.map((value, i) =>
                              i === index ? event.target.value : value,
                            ),
                          )
                        }
                        placeholder={`Answer ${index + 1}${index > 1 ? " (optional)" : ""}`}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </label>
                  ))
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => void saveCardEdit()}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: 10,
                      background: TERRACOTTA,
                      color: "oklch(98% 0.01 90)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCardId(null)}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: 10,
                      background: "oklch(91% 0.03 230)",
                      color: INK,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  <div
                    style={{
                      display: "inline-block",
                      marginBottom: 7,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background:
                        card.type === "quiz"
                          ? "oklch(90% 0.07 260)"
                          : "oklch(91% 0.03 80)",
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {card.type === "quiz" ? "Multiple choice" : "Flashcard"}
                  </div>
                  <div style={{ fontWeight: 700 }}>{card.front}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "oklch(48% 0.04 255 / 0.6)",
                      marginTop: 4,
                    }}
                  >
                    {card.back}
                  </div>
                  {card.type === "quiz" && card.optionsJson && (
                    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                      {(JSON.parse(card.optionsJson) as string[]).map(
                        (option, index) => (
                          <div
                            key={option}
                            style={{
                              fontSize: 12,
                              fontWeight:
                                index === card.correctIndex ? 800 : 600,
                              color:
                                index === card.correctIndex
                                  ? "oklch(42% 0.1 150)"
                                  : "oklch(48% 0.04 255 / 0.65)",
                            }}
                          >
                            {index === card.correctIndex ? "✓" : "○"} {option}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    marginLeft: "auto",
                  }}
                >
                  <button
                    onClick={() => startEditCard(card)}
                    style={{
                      width: 76,
                      height: 38,
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${CARD_LINE}`,
                      borderRadius: 10,
                      background: "transparent",
                      color: INK,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDeleteCard(card.id)}
                    style={{
                      width: 76,
                      height: 38,
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${CARD_LINE}`,
                      borderRadius: 10,
                      background: "transparent",
                      color: "oklch(52% 0.16 350)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          background: CARD_BG,
          borderRadius: 22,
          padding: 22,
          border: `2px solid ${CARD_LINE}`,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
          Add a study item
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {(["flashcard", "quiz"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setNewType(type)}
                style={{
                  padding: 11,
                  border: `2px solid ${newType === type ? TERRACOTTA : CARD_LINE}`,
                  borderRadius: 12,
                  background:
                    newType === type ? "oklch(94% 0.05 40)" : "transparent",
                  color: INK,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {type === "flashcard"
                  ? "↻ Flashcard"
                  : "☷ Multiple-choice quiz"}
              </button>
            ))}
          </div>
          <input
            value={newFront}
            onChange={(e) => setNewFront(e.target.value)}
            placeholder={
              newType === "quiz" ? "Quiz question" : "Front (question)"
            }
            style={inputStyle}
          />
          {newType === "flashcard" ? (
            <input
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Back (answer)"
              style={inputStyle}
            />
          ) : (
            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                Select the correct answer. Leave unused choices blank.
              </div>
              {newOptions.map((option, index) => (
                <label
                  key={index}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="radio"
                    name="new-correct-answer"
                    checked={newCorrectIndex === index}
                    onChange={() => setNewCorrectIndex(index)}
                  />
                  <input
                    value={option}
                    onChange={(event) =>
                      setNewOptions((current) =>
                        current.map((value, i) =>
                          i === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder={`Answer ${index + 1}${index > 1 ? " (optional)" : ""}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </label>
              ))}
            </div>
          )}
          <button
            onClick={() => void handleAddCard()}
            disabled={
              !newFront.trim() ||
              (newType === "flashcard" && !newBack.trim()) ||
              (newType === "quiz" &&
                (newOptions.filter((option) => option.trim()).length < 2 ||
                  !newOptions[newCorrectIndex]?.trim())) ||
              createCard.isPending
            }
            style={{
              padding: 12,
              border: "none",
              borderRadius: 12,
              background: TERRACOTTA,
              color: "oklch(98% 0.01 90)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            + Add {newType === "quiz" ? "quiz" : "flashcard"}
          </button>
        </div>
      </div>
    </div>
  );
}
