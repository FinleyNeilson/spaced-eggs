"use client";

import { useEffect, useRef, useState } from "react";

import { AIDeckMaker } from "~/app/_components/ai-deck-maker";
import { CustomScrollbar } from "~/app/_components/custom-scrollbar";
import { LoadingSpinner } from "~/app/_components/loading-spinner";
import { MusicPlayer } from "~/app/_components/music-player";

import {
  GRADE_TO_SM2,
  INK,
  NEXT_STAGE,
  PAPER,
  SPECIES,
  STAGE_GROWTH_FLOOR,
  STAGE_LABEL,
} from "~/app/_components/pet-app/constants";
import {
  CenteredMessage,
  NamePetScreen,
  SpeciesPickerScreen,
} from "~/app/_components/pet-app/entry-screens";
import {
  DeathScreen,
  GraduationScreen,
  StageUpScreen,
} from "~/app/_components/pet-app/screens/celebration-screens";
import { DebugPanel } from "~/app/_components/pet-app/screens/debug-panel";
import { DeckDetailScreen } from "~/app/_components/pet-app/screens/deck-detail-screen";
import { DecksScreen } from "~/app/_components/pet-app/screens/decks-screen";
import { HomeScreen } from "~/app/_components/pet-app/screens/home-screen";
import { ResultsScreen } from "~/app/_components/pet-app/screens/results-screen";
import { RetiredPetPopup } from "~/app/_components/pet-app/screens/retired-pet-popup";
import { ReviewScreen } from "~/app/_components/pet-app/screens/review-screen";
import { Toast } from "~/app/_components/pet-app/screens/toast";
import { TopNav } from "~/app/_components/pet-app/screens/top-nav";
import {
  type DeckSummary,
  type Grade,
  type LifeStage,
  type PetState,
  type ReviewCard,
  type RetiredPet,
  type Screen,
  type SessionResults,
  type Species,
} from "~/app/_components/pet-app/types";
import { api } from "~/trpc/react";

// A pet has no name until NamePetScreen sets one, right after it hatches —
// while it's still an egg, showing a fixed placeholder like "Ember" would
// misleadingly imply it's already been named. "{Species} Hatchling" makes
// clear it hasn't been named yet.
function petDisplayName(
  name: string | null | undefined,
  species: Species | null | undefined,
): string {
  if (name) return name;
  return species ? `${SPECIES[species].label} Hatchling` : "Your pet";
}

// Shared by every place a death can be discovered (a review, skip-time,
// force-die, or just loading the app after enough real time has passed) —
// builds the celebration state DeathScreen renders from.
function diedCelebration(diedPet: {
  name: string | null;
  species: string | null;
}) {
  return {
    kind: "died" as const,
    petName: petDisplayName(diedPet.name, diedPet.species as Species | null),
    species: diedPet.species as Species | null,
  };
}

export function SignedInPetApp() {
  const utils = api.useUtils();
  const decksQuery = api.deck.list.useQuery();
  const petQuery = api.pet.get.useQuery();
  const villageQuery = api.pet.village.useQuery();
  const submitReview = api.review.submit.useMutation();
  const createDeck = api.deck.create.useMutation();
  const setSpecies = api.pet.setSpecies.useMutation();
  const setName = api.pet.setName.useMutation();
  const addTestDecks = api.debug.addTestDecks.useMutation();
  const clearTestDecks = api.debug.clearTestDecks.useMutation();
  const matureAllCards = api.debug.matureAllCards.useMutation();
  const advanceStage = api.debug.advanceStage.useMutation();
  const forceGraduate = api.debug.forceGraduate.useMutation();
  const forceDie = api.debug.forceDie.useMutation();
  const skipTime = api.debug.skipTime.useMutation();
  const resetAccount = api.debug.resetAccount.useMutation();

  const [screen, setScreen] = useState<Screen>("home");
  const [toastMsg, setToastMsg] = useState<string | false>(false);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [reviewDeckName, setReviewDeckName] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [healthAtSessionStart, setHealthAtSessionStart] = useState(0);
  const [growthAtSessionStart, setGrowthAtSessionStart] = useState(0);
  const [stageAtSessionStart, setStageAtSessionStart] =
    useState<LifeStage>("egg");
  const [results, setResults] = useState<SessionResults | null>(null);
  // Graduating (reaching "adult") retires the pet being studied and spawns
  // a blank replacement immediately, server-side — unlike an ordinary
  // stage-up, there's no "current pet" left afterward to keep comparing
  // against. A ref (not state) because it's written mid-session by grade()
  // and only ever read once, at the end of the same session, by
  // advanceSession — it never needs to trigger a render on its own.
  const pendingGraduationRef = useRef<{
    petName: string;
    species: Species;
    health: number;
    growthPoints: number;
  } | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [managingDeckId, setManagingDeckId] = useState<string | null>(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [isMakingWithAI, setIsMakingWithAI] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedRetiredPet, setSelectedRetiredPet] =
    useState<RetiredPet | null>(null);
  const [celebration, setCelebration] = useState<
    | { kind: "stageUp"; stage: LifeStage; petName: string; species: Species }
    | { kind: "graduated"; petName: string; species: Species }
    | { kind: "died"; petName: string; species: Species | null }
    | null
  >(null);
  // True right after choosing "Return to village" on the graduation
  // screen — lets the village render with the replacement egg still
  // unhatched instead of forcing the species picker immediately, the way
  // "Find a new egg" does.
  const [awaitingNewEgg, setAwaitingNewEgg] = useState(false);

  // Catches deaths discovered passively — e.g. the app was just opened
  // (or a background refetch fired) after enough real time passed for
  // health to hit 0 with no review/debug action this session to attach the
  // news to. `diedPet` is only ever non-null on the exact pet.get response
  // that discovers a given death (see getActivePet), so this never re-fires
  // for the same pet on subsequent refetches.
  useEffect(() => {
    if (petQuery.data?.diedPet) {
      setCelebration(diedCelebration(petQuery.data.diedPet));
    }
  }, [petQuery.data?.diedPet]);

  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(false), 2200);
  }

  async function invalidateAll() {
    await Promise.all([
      utils.pet.get.invalidate(),
      utils.deck.list.invalidate(),
      utils.pet.village.invalidate(),
    ]);
  }

  async function handleAddTestDecks() {
    const { createdCount } = await addTestDecks.mutateAsync();
    await invalidateAll();
    toast(`Added ${createdCount} test decks`);
  }

  async function handleClearTestDecks() {
    const { deletedCount } = await clearTestDecks.mutateAsync();
    await invalidateAll();
    toast(`Cleared ${deletedCount} test decks`);
  }

  async function handleMatureAllCards() {
    const { maturedCount } = await matureAllCards.mutateAsync();
    await invalidateAll();
    toast(`Matured ${maturedCount} cards`);
  }

  async function handleAdvanceStage() {
    const { stage, reachedNextStage, graduated } =
      await advanceStage.mutateAsync();
    await invalidateAll();
    if (graduated) {
      setCelebration({
        kind: "graduated",
        petName: graduated.name ?? "Your pet",
        species: graduated.species as Species,
      });
    } else if (reachedNextStage) {
      setCelebration({
        kind: "stageUp",
        stage,
        petName: petDisplayName(
          petQuery.data?.name,
          petQuery.data?.species as Species | null | undefined,
        ),
        species: petQuery.data?.species as Species,
      });
    } else {
      toast(
        `Not enough unmatured cards left to reach the next stage (still ${STAGE_LABEL[stage]})`,
      );
    }
  }

  async function handleForceGraduate() {
    const { graduated } = await forceGraduate.mutateAsync();
    await invalidateAll();
    setCelebration({
      kind: "graduated",
      petName: graduated.name ?? "Your pet",
      species: graduated.species as Species,
    });
  }

  async function handleForceDie() {
    const { diedPet } = await forceDie.mutateAsync();
    await invalidateAll();
    setCelebration(diedCelebration(diedPet));
  }

  async function handleSkipTime(hours: number) {
    const stats = await skipTime.mutateAsync({ hours });
    await invalidateAll();
    if (stats.diedPet) {
      setCelebration(diedCelebration(stats.diedPet));
    } else {
      toast(`Skipped ${hours}h — health now ${stats.health}%`);
    }
  }

  async function handleResetAccount(): Promise<boolean> {
    if (!confirm("Wipe all decks/cards/pets and reseed demo data?"))
      return false;
    await resetAccount.mutateAsync();
    await invalidateAll();
    toast("Account reset");
    return true;
  }

  function manageDeck(deckId: string) {
    setManagingDeckId(deckId);
    setScreen("deckDetail");
  }

  async function handleCreateDeck() {
    const name = newDeckName.trim();
    if (!name) return;
    const deck = await createDeck.mutateAsync({ name });
    setNewDeckName("");
    setIsCreatingDeck(false);
    await utils.deck.list.invalidate();
    toast(`Created “${deck.name}” — add your first card!`);
    manageDeck(deck.id);
  }

  async function startReview(deckId: string, practice = false) {
    const due = await utils.review.due.fetch({
      deckId,
      includeNotDue: practice,
    });
    if (due.length === 0) return;
    // Guards against a stray graduation from a session that ended some
    // other way (e.g. the pet died before advanceSession could consume
    // it) leaking into this new one.
    pendingGraduationRef.current = null;
    setReviewCards(due);
    setReviewDeckName(decksQuery.data?.find((d) => d.id === deckId)?.name ?? "");
    setReviewIndex(0);
    setFlipped(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setHealthAtSessionStart(petQuery.data?.health ?? 0);
    setGrowthAtSessionStart(petQuery.data?.growthPoints ?? 0);
    setStageAtSessionStart(petQuery.data?.stage ?? "egg");
    setScreen("review");
  }

  function goStudyNow() {
    const target = decksQuery.data?.find((d) => d.dueCards > 0);
    if (target) void startReview(target.id);
    else toast("All caught up, no cards due right now!");
  }

  // Finishes out a review session: either wraps up into the results screen
  // (last card, where any stage-up crossed during the session finally gets
  // its celebration) or queues up the next one.
  async function advanceSession({
    queue,
    nextIndex,
    newSessionCorrect,
    newSessionTotal,
  }: {
    queue: ReviewCard[];
    nextIndex: number;
    newSessionCorrect: number;
    newSessionTotal: number;
  }) {
    if (nextIndex >= queue.length) {
      const accuracy = Math.round((newSessionCorrect / newSessionTotal) * 100);
      const graduation = pendingGraduationRef.current;

      // A graduation earlier in this session already retired the pet being
      // studied and replaced it with a blank egg — fetching pet.get now
      // would report the replacement's stats (fresh health, zero growth),
      // not the deltas this session actually earned. Use the snapshot
      // captured at the moment of graduation instead; otherwise fetch as
      // normal.
      let finalHealth: number;
      let finalGrowth: number;
      let finalStage: LifeStage;
      if (graduation) {
        finalHealth = graduation.health;
        finalGrowth = graduation.growthPoints;
        finalStage = "adult";
      } else {
        await utils.pet.get.invalidate();
        const petResult = await utils.pet.get.fetch();
        finalHealth = petResult.health;
        finalGrowth = petResult.growthPoints;
        finalStage = petResult.stage;
      }
      void utils.deck.list.invalidate();

      const petName =
        graduation?.petName ??
        petDisplayName(
          petQuery.data?.name,
          petQuery.data?.species as Species | null | undefined,
        );
      const message =
        accuracy >= 80
          ? `${petName} is thriving! Great study session.`
          : accuracy >= 50
            ? `${petName} appreciates the effort, keep it up.`
            : `${petName} needs a bit more practice tomorrow.`;
      // A graduation always retires the pet outright regardless of where it
      // started, so "hatched" (needs a name) only ever applies to the
      // pet that's still actually around at the end of the session.
      const hatched =
        !graduation && stageAtSessionStart === "egg" && finalStage !== "egg";

      setResults({
        correct: newSessionCorrect,
        total: newSessionTotal,
        accuracy,
        healthDelta: finalHealth - healthAtSessionStart,
        growthDelta: finalGrowth - growthAtSessionStart,
        celebrate: accuracy >= 60,
        message,
        stageAtStart: stageAtSessionStart,
        growthAtStart: growthAtSessionStart,
        growthAtEnd: finalGrowth,
        healthAtStart: healthAtSessionStart,
        healthAtEnd: finalHealth,
        hatched,
        graduated: !!graduation,
      });
      setScreen("results");

      // Stage-ups (e.g. hatching out of the egg), graduations, and naming
      // all celebrate/prompt once the whole session wraps up, rather than
      // interrupting mid-deck the instant a card happens to cross a
      // threshold. They also all wait for the results screen itself to be
      // dismissed (see the "screen !== results" checks below and the
      // results screen's own buttons) rather than covering it immediately,
      // so the player always sees what this session earned before any of
      // that. Setting celebration here, in the same pass as setScreen
      // above and before the (now-safe) invalidate below, still matters
      // for graduation specifically: petQuery.data flipping to the
      // replacement's null species must never be visible without
      // "graduated" already covering it (see the species gate a few dozen
      // lines down) once the results screen is eventually dismissed.
      if (graduation) {
        setCelebration({
          kind: "graduated",
          petName: graduation.petName,
          species: graduation.species,
        });
        pendingGraduationRef.current = null;
        void utils.pet.get.invalidate();
        void utils.pet.village.invalidate();
      } else if (finalStage !== stageAtSessionStart && !hatched) {
        // Hatching gets no separate stage-up popup — the results screen's
        // own growth bar filling up, plus its naming prompt, already cover
        // it. A plain stage-up (e.g. child -> teen) still gets one.
        setCelebration({
          kind: "stageUp",
          stage: finalStage,
          petName,
          species: petQuery.data?.species as Species,
        });
      }
    } else {
      setReviewCards(queue);
      setSessionCorrect(newSessionCorrect);
      setSessionTotal(newSessionTotal);
      setReviewIndex(nextIndex);
      setFlipped(false);
    }
  }

  function dismissStageUp() {
    // The results screen underneath was already set by advanceSession —
    // dismissing just reveals it (see the stage-up check there).
    setCelebration(null);
  }

  function dismissGraduation(returnToVillage: boolean) {
    // Same as dismissStageUp — the results screen underneath was already
    // set by advanceSession, so this just reveals it instead of jumping
    // straight to the village; its own "back to village" button handles
    // getting there once the player's actually read the results.
    setCelebration(null);
    setAwaitingNewEgg(returnToVillage);
  }

  function dismissDied() {
    setCelebration(null);
    // Same reasoning as graduation: the pet that was reviewing no longer
    // exists, so the session just ends — the species gate below will pick
    // up the fresh (species-less) replacement automatically.
    setScreen("home");
  }

  async function grade(quality: Grade) {
    const card = reviewCards[reviewIndex];
    if (!card || isSubmittingReview) return;

    setIsSubmittingReview(true);
    let graduated: { name: string | null; species: string | null } | null =
      null;
    let diedPet: { name: string | null; species: string | null } | null =
      null;
    try {
      const result = await submitReview.mutateAsync({
        cardId: card.id,
        grade: GRADE_TO_SM2[quality],
      });
      graduated = result.graduated;
      diedPet = result.diedPet;
      // A graduation retires the pet being studied — stash its final
      // stats now, since they're only ever available on the response of
      // the exact review that crossed the threshold (see the comment on
      // pendingGraduationRef and the matching one in review.ts). Not
      // celebrated here — see advanceSession, which surfaces it once the
      // whole session wraps up instead of interrupting it mid-deck.
      if (graduated) {
        pendingGraduationRef.current = {
          petName: graduated.name ?? "Your pet",
          // Growth only accrues after a species is chosen, so a pet that
          // just graduated always has one.
          species: graduated.species as Species,
          health: result.health,
          growthPoints: result.growthPoints,
        };
      }
      // Ordinary stage-ups (result.stageAdvanced) need no such snapshot —
      // they're likewise deferred, but advanceSession can just re-fetch
      // the (still the same) pet's current stats at session end.
    } finally {
      setIsSubmittingReview(false);
    }

    const correct = quality !== "again";
    const newSessionCorrect = sessionCorrect + (correct ? 1 : 0);
    const newSessionTotal = sessionTotal + 1;
    // "Again" requeues the card at the end of this session instead of just
    // moving on — SM-2 already pushed its real dueAt a full day out, but
    // the point of grading something "Again" is to retry it now, not
    // tomorrow.
    const queue = quality === "again" ? [...reviewCards, card] : reviewCards;
    const nextIndex = reviewIndex + 1;

    // A death discovered here means the *previous* pet (not the one this
    // review just graded against) had already starved out from backlog
    // before this review even started — see getActivePet. Takes priority
    // over graduation/session-advance since it's the more surprising,
    // scene-setting event of the two.
    if (diedPet) {
      await utils.pet.village.invalidate();
      await utils.pet.get.invalidate();
      setCelebration(diedCelebration(diedPet));
      return;
    }

    // graduated is handled by advanceSession (see pendingGraduationRef
    // above) rather than here, so the rest of the deck keeps going instead
    // of getting cut off the instant the threshold is crossed.
    await advanceSession({
      queue,
      nextIndex,
      newSessionCorrect,
      newSessionTotal,
    });
  }

  if (decksQuery.isPending || petQuery.isPending) {
    return (
      <CenteredMessage>
        <LoadingSpinner size={38} label="Loading your pet" />
        Loading your pet…
      </CenteredMessage>
    );
  }
  if (decksQuery.isError || petQuery.isError) {
    return (
      <CenteredMessage>Something went wrong loading your data.</CenteredMessage>
    );
  }
  // Checked ahead of the species gate below: right after graduating, the
  // replacement pet has no species yet either, and the celebration screen
  // needs to take over before that gate would otherwise force the species
  // picker on top of it. Also gated on the results screen having already
  // been dismissed (see advanceSession) — the player sees what the
  // session earned before the graduation announcement covers it.
  if (celebration?.kind === "graduated" && screen !== "results") {
    return (
      <GraduationScreen
        petName={celebration.petName}
        species={celebration.species}
        onReturnToVillage={() => dismissGraduation(true)}
        onFindNewEgg={() => dismissGraduation(false)}
      />
    );
  }
  // Same reasoning as graduation above — the replacement pet spawned after
  // a death also has no species yet.
  if (celebration?.kind === "died") {
    return (
      <DeathScreen
        petName={celebration.petName}
        species={celebration.species}
        onContinue={dismissDied}
      />
    );
  }
  // Also gated on the results screen having been dismissed: a graduation's
  // invalidate (see advanceSession) can flip petQuery.data.species to null
  // while the player is still looking at that session's results, and
  // unlike the graduated-celebration check above, this gate doesn't
  // otherwise know or care what screen is showing — without this it pops
  // up over the results screen uninvited, well before the player has even
  // seen the graduation announcement, let alone chosen "Find a new egg".
  if (!petQuery.data.species && !awaitingNewEgg && screen !== "results") {
    return (
      <SpeciesPickerScreen
        onChoose={async (species) => {
          await setSpecies.mutateAsync({ species });
          setAwaitingNewEgg(false);
          await utils.pet.get.invalidate();
        }}
      />
    );
  }
  // Naming is a deliberate choice, not a forced gate — reached only via
  // the results screen's "Name your hatched egg" button or clicking the
  // unnamed label on the home screen (see HomeScreen's onNamePet), both of
  // which only ever set screen to "namePet" once species + a non-egg stage
  // are already true. A pet can go on being unnamed indefinitely; nothing
  // else in the app requires a name.
  if (
    screen === "namePet" &&
    petQuery.data.species &&
    !petQuery.data.name
  ) {
    return (
      <NamePetScreen
        species={petQuery.data.species as Species}
        onSubmit={async (name) => {
          await setName.mutateAsync({ name });
          await utils.pet.get.invalidate();
          setScreen("home");
        }}
      />
    );
  }

  const decks: DeckSummary[] = decksQuery.data;
  const pet: PetState = {
    name: petDisplayName(
      petQuery.data.name,
      petQuery.data.species as Species | null,
    ),
    hasCustomName: !!petQuery.data.name,
    // Null only in the awaitingNewEgg state — see the PetState.species
    // comment.
    species: petQuery.data.species as Species | null,
    health: petQuery.data.health,
    stage: petQuery.data.stage,
    growthPoints: petQuery.data.growthPoints,
  };

  const speciesLabel = pet.species ? SPECIES[pet.species].label : "";
  const isNeglected = pet.health < 30;

  // Checked here (rather than alongside the graduated celebration above)
  // because it needs `pet`/petDisplayName already resolved, and — unlike
  // graduation — never coincides with a null species, so there's no
  // ordering conflict with the gates above. Also gated on the results
  // screen already being dismissed, same reasoning as graduation.
  if (celebration?.kind === "stageUp" && screen !== "results") {
    return (
      <StageUpScreen
        petName={celebration.petName}
        species={celebration.species}
        stage={celebration.stage}
        onContinue={dismissStageUp}
      />
    );
  }

  const nextStage = NEXT_STAGE[pet.stage];
  const stageFloor = STAGE_GROWTH_FLOOR[pet.stage];
  const stageCeil = nextStage ? STAGE_GROWTH_FLOOR[nextStage] : stageFloor;
  const growthProgressPct = nextStage
    ? Math.round(
        Math.min(
          1,
          (pet.growthPoints - stageFloor) / (stageCeil - stageFloor),
        ) * 100,
      )
    : 100;
  const growthRightLabel = nextStage
    ? `${pet.growthPoints.toFixed(1)} / ${stageCeil} to ${STAGE_LABEL[nextStage]}`
    : "Max stage";

  const managingDeck = decks.find((d) => d.id === managingDeckId) ?? null;
  const accuracySeries = [62, 70, 58, 80, 75, 90, 84];
  const weeklyAccuracy = Math.round(
    accuracySeries.reduce((a, b) => a + b, 0) / accuracySeries.length,
  );

  // Decks/Review require a species (growth can't accrue without one) — hide
  // the tab entirely while awaiting a new egg instead of leaving a nav
  // route open that would crash the moment it's used.
  const navItems: { key: Screen; label: string }[] = [
    { key: "home", label: "Village" },
    ...(pet.species ? [{ key: "decks" as const, label: "Decks" }] : []),
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Nunito', sans-serif",
        color: INK,
        background: PAPER,
      }}
    >
      <TopNav navItems={navItems} screen={screen} setScreen={setScreen} />

      <CustomScrollbar />
      <Toast message={toastMsg} />
      <MusicPlayer />

      {isMakingWithAI && (
        <AIDeckMaker
          onClose={() => setIsMakingWithAI(false)}
          onCreated={async (deck) => {
            setIsMakingWithAI(false);
            await utils.deck.list.invalidate();
            toast(`Created “${deck.name}” with ${deck.cardCount} cards!`);
            manageDeck(deck.id);
          }}
        />
      )}

      {selectedRetiredPet && (
        <RetiredPetPopup
          pet={selectedRetiredPet}
          onClose={() => setSelectedRetiredPet(null)}
        />
      )}

      <DebugPanel
        pet={pet}
        onAddTestDecks={() => void handleAddTestDecks()}
        onClearTestDecks={() => void handleClearTestDecks()}
        onMatureAllCards={() => void handleMatureAllCards()}
        onAdvanceStage={() => void handleAdvanceStage()}
        onForceGraduate={() => void handleForceGraduate()}
        onForceDie={() => void handleForceDie()}
        onSkipTime={(hours) => void handleSkipTime(hours)}
        onResetAccount={handleResetAccount}
        isAddingTestDecks={addTestDecks.isPending}
        isClearingTestDecks={clearTestDecks.isPending}
        isMaturing={matureAllCards.isPending}
        isAdvancing={advanceStage.isPending}
        isGraduating={forceGraduate.isPending}
        isDying={forceDie.isPending}
        isSkippingTime={skipTime.isPending}
        isResetting={resetAccount.isPending}
      />

      {screen === "home" && (
        <HomeScreen
          pet={pet}
          speciesLabel={speciesLabel}
          isNeglected={isNeglected}
          growthProgressPct={growthProgressPct}
          growthRightLabel={growthRightLabel}
          decksCount={decks.length}
          weeklyAccuracy={weeklyAccuracy}
          retiredPets={villageQuery.data}
          onSelectRetiredPet={setSelectedRetiredPet}
          onStudyNow={goStudyNow}
          onHatchNewEgg={() => setAwaitingNewEgg(false)}
          onNamePet={() => setScreen("namePet")}
        />
      )}

      {/* OTHER SCREENS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: screen === "home" ? "0 0 auto" : "1 1 auto",
          padding: screen === "home" ? 0 : "32px clamp(20px,4vw,56px) 48px",
          maxWidth: 1120,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {screen === "decks" && (
          <DecksScreen
            decks={decks}
            isCreatingDeck={isCreatingDeck}
            setIsCreatingDeck={setIsCreatingDeck}
            newDeckName={newDeckName}
            setNewDeckName={setNewDeckName}
            onCreateDeck={handleCreateDeck}
            isCreatingDeckPending={createDeck.isPending}
            onStartReview={(deckId) => void startReview(deckId)}
            onPractice={(deckId) => void startReview(deckId, true)}
            onManageDeck={manageDeck}
            onCreateWithAi={() => setIsMakingWithAI(true)}
          />
        )}

        {screen === "review" && (
          <ReviewScreen
            pet={pet}
            deckName={reviewDeckName}
            reviewCards={reviewCards}
            reviewIndex={reviewIndex}
            flipped={flipped}
            setFlipped={setFlipped}
            isSubmittingReview={isSubmittingReview}
            onGrade={grade}
            onBack={() => setScreen("decks")}
          />
        )}

        {screen === "results" && results && (
          <ResultsScreen
            results={results}
            pet={pet}
            onBackHome={() => setScreen("home")}
            onNameHatchling={() => setScreen("namePet")}
          />
        )}

        {screen === "deckDetail" && managingDeck && (
          <DeckDetailScreen
            deck={managingDeck}
            onBack={() => {
              setScreen("decks");
              setManagingDeckId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
