import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx", "txt", "md"];

const generatedDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  cards: z
    .array(
      z
        .object({
          front: z.string().min(1).max(2000),
          back: z.string().min(1).max(2000),
          type: z.enum(["flashcard", "quiz"]),
          options: z.array(z.string().min(1).max(500)).min(2).max(4).nullable(),
          correctIndex: z.number().int().min(0).max(3).nullable(),
        })
        .superRefine((card, ctx) => {
          if (
            card.type === "quiz" &&
            (!card.options ||
              card.correctIndex === null ||
              card.correctIndex >= card.options.length)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Quiz cards require valid options and a correct answer.",
            });
          }
        }),
    )
    .min(1)
    .max(100),
});

type OpenAIFile = { id: string };
type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function getOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("");
}

function fillMissingQuizAnswers(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("cards" in value)) return value;
  const deck = value as Record<string, unknown>;
  if (!Array.isArray(deck.cards)) return value;
  const cards = deck.cards as unknown[];

  return {
    ...deck,
    cards: cards.map((item: unknown): unknown => {
      if (!item || typeof item !== "object") return item;
      const card = item as Record<string, unknown>;
      const options = Array.isArray(card.options)
        ? (card.options as unknown[])
        : null;
      const correctIndex = card.correctIndex;
      const correctOption =
        options &&
          typeof correctIndex === "number" &&
          Number.isInteger(correctIndex)
          ? options[correctIndex]
          : null;
      if (
        card.type === "quiz" &&
        typeof card.back === "string" &&
        !card.back.trim() &&
        typeof correctOption === "string" &&
        correctOption.trim()
      ) {
        return { ...card, back: correctOption.trim() };
      }
      return item;
    }),
  };
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function openAIRequest(path: string, init: RequestInit) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      payload?.error?.message ?? "OpenAI could not process these files.",
    );
  }
  return response;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return error("Please sign in first.", 401);
  if (!env.OPENAI_API_KEY) {
    return error("AI deck generation has not been configured yet.", 503);
  }

  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File);
  const instructionsValue = form.get("instructions");
  const instructions =
    typeof instructionsValue === "string"
      ? instructionsValue.trim().slice(0, 1000)
      : "";
  const requestedCount = Number(form.get("cardCount") ?? 20);
  const contentTypeValue = form.get("contentType");
  const contentType =
    contentTypeValue === "flashcards" ||
      contentTypeValue === "quizzes" ||
      contentTypeValue === "mixed"
      ? contentTypeValue
      : "mixed";
  const cardCount = Number.isFinite(requestedCount)
    ? Math.min(100, Math.max(5, Math.round(requestedCount)))
    : 20;

  if (files.length === 0) return error("Choose at least one file.", 400);
  if (files.length > MAX_FILES)
    return error(`Upload up to ${MAX_FILES} files at once.`, 400);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    return error("Files must be 50 MB or less in total.", 400);
  }
  const unsupported = files.find((file) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return !ACCEPTED_EXTENSIONS.includes(extension);
  });
  if (unsupported)
    return error(`Unsupported file type: ${unsupported.name}`, 400);

  const uploadedIds: string[] = [];
  try {
    for (const file of files) {
      const upload = new FormData();
      upload.append("purpose", "user_data");
      upload.append("file", file, file.name);
      const uploaded = (await (
        await openAIRequest("/files", { method: "POST", body: upload })
      ).json()) as OpenAIFile;
      uploadedIds.push(uploaded.id);
    }

    const studyItemInstructions =
      contentType === "flashcards"
        ? "Create only flashcards. Set type to flashcard, options to null, and correctIndex to null for every item."
        : contentType === "quizzes"
          ? "Create only multiple-choice quiz questions. Set type to quiz, provide 2 to 4 plausible answer options, and set correctIndex to the zero-based index of the correct option. The back must contain the correct answer."
          : "Create a useful mix of flashcards and multiple-choice quiz questions. Quiz questions must have 2 to 4 plausible options and a valid zero-based correctIndex; flashcards must have null options and correctIndex.";

    const prompt = [
      `Create a study deck containing exactly ${cardCount} items from the attached course material.`,
      studyItemInstructions,
      "Every card must have non-empty front and back text. For a quiz, back must exactly match the correct option.",
      "Focus only on the highest-value concepts needed to understand and remember the material.",
      "Requirements: Each flashcard tests exactly ONE fact or concept. Questions should be clear, specific, and unambiguous. Answers must be as short as possible while remaining correct. Prefer answers that are 1–10 words (avoid full sentences unless necessary). Do not combine multiple facts into one card. Use active recall questions rather than recognition or trivia. Avoid duplicate or overlapping cards. Each card must make sense without referring back to the source material. If a concept is complex, split it into multiple simple flashcards instead of one large card. Prefer definitions, key relationships, causes, effects, formulas, and essential facts. Do not include unnecessary explanations or examples in the answer. A good flashcard: Q: What is the powerhouse of the cell? A: Mitochondrion. Bad flashcard: Q: Explain everything about mitochondria. A: A long paragraph...",
      instructions ? `Learner instructions: ${instructions}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiResponse = (await (
      await openAIRequest("/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          reasoning: { effort: "low" },
          input: [
            {
              role: "user",
              content: [
                ...uploadedIds.map((file_id) => ({
                  type: "input_file",
                  file_id,
                })),
                { type: "input_text", text: prompt },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "flashcard_deck",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["name", "description", "cards"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100 },
                  description: { type: "string", maxLength: 500 },
                  cards: {
                    type: "array",
                    minItems: 1,
                    maxItems: 100,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "front",
                        "back",
                        "type",
                        "options",
                        "correctIndex",
                      ],
                      properties: {
                        front: {
                          type: "string",
                          minLength: 1,
                          maxLength: 2000,
                        },
                        back: {
                          type: "string",
                          minLength: 1,
                          maxLength: 2000,
                        },
                        type: { type: "string", enum: ["flashcard", "quiz"] },
                        options: {
                          anyOf: [
                            {
                              type: "array",
                              minItems: 2,
                              maxItems: 4,
                              items: {
                                type: "string",
                                minLength: 1,
                                maxLength: 500,
                              },
                            },
                            { type: "null" },
                          ],
                        },
                        correctIndex: {
                          anyOf: [
                            { type: "integer", minimum: 0, maximum: 3 },
                            { type: "null" },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          safety_identifier: session.user.id,
        }),
      })
    ).json()) as OpenAIResponse;

    const outputText = getOutputText(aiResponse);
    if (!outputText) throw new Error("The AI returned an empty deck.");
    const generated = generatedDeckSchema.parse(
      fillMissingQuizAnswers(JSON.parse(outputText)),
    );
    const deck = await db.deck.create({
      data: {
        userId: session.user.id,
        name: generated.name,
        description: generated.description,
        cards: {
          create: generated.cards.map((card) => ({
            front: card.front,
            back: card.back,
            type: card.type,
            optionsJson:
              card.type === "quiz" ? JSON.stringify(card.options) : null,
            correctIndex: card.type === "quiz" ? card.correctIndex : null,
          })),
        },
      },
      include: { _count: { select: { cards: true } } },
    });

    return NextResponse.json({
      id: deck.id,
      name: deck.name,
      cardCount: deck._count.cards,
    });
  } catch (cause) {
    console.error("AI deck generation failed", cause);
    const message =
      cause instanceof z.ZodError
        ? "The AI produced an incomplete deck. Please generate it again."
        : cause instanceof SyntaxError
          ? "The AI returned an unreadable deck. Please generate it again."
          : cause instanceof Error
            ? cause.message
            : "Could not generate a deck.";
    return error(message, 502);
  } finally {
    await Promise.allSettled(
      uploadedIds.map((id) =>
        openAIRequest(`/files/${id}`, { method: "DELETE" }),
      ),
    );
  }
}
