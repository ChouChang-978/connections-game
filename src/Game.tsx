import { useCallback, useEffect, useRef, useState } from "react";
import Board from "./Board.tsx";
import type { LookupGridCell } from "./Item.tsx";
import shuffle from "lodash.shuffle";
import type { GameData, WordGroup } from "./gameData.ts";
import {
  logActivity,
  restartRoundActivity,
  startNextRoundActivity,
} from "./activityLog.ts";

const WRONG_ANSWER_FLASH_MS = 850;
const WRONG_ANSWER_RESET_DELAY_MS = 300;
const ONE_AWAY_MESSAGE_MS = 1400;

const getSolvedGroupColorClass = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "easy";
    case "medium":
      return "medium";
    case "hard":
      return "hard";
    case "tricky":
      return "tricky";
    default:
      return "tricky";
  }
};

const getDifficultyLabel = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case "easy": return "Straightforward";
    case "medium": return "Medium";
    case "hard": return "Hard";
    default: return "Tricky";
  }
};

const Game = ({
  gameDataSets,
  submitRequest,
  submitSource,
  onSubmitAvailabilityChange,
  rotation,
  rotationTransition,
  onWordGridChange,
}: {
  gameDataSets: GameData[];
  submitRequest: number;
  submitSource: string;
  onSubmitAvailabilityChange: (available: boolean) => void;
  rotation: number;
  rotationTransition: "idle" | "fade-out" | "fade-in";
  onWordGridChange: (cells: LookupGridCell[]) => void;
}) => {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const gameData = gameDataSets[currentPuzzleIndex];
  const [remainingWords, setRemainingWords] = useState(() =>
    shuffle(gameDataSets[0].words),
  );
  const [submitLocked, setSubmitLocked] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [incorrectSelection, setIncorrectSelection] = useState(false);
  const [solvedGroups, setSolvedGroups] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(4);
  const [hintGroups, setHintGroups] = useState<WordGroup[] | null>(null);
  const [oneAwayVisible, setOneAwayVisible] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const incorrectAnimationTimer = useRef<number | null>(null);
  const oneAwayTimer = useRef<number | null>(null);
  const gameOverLogged = useRef(false);

  useEffect(() => () => {
    if (incorrectAnimationTimer.current !== null) {
      window.clearTimeout(incorrectAnimationTimer.current);
    }
    if (oneAwayTimer.current !== null) {
      window.clearTimeout(oneAwayTimer.current);
    }
  }, []);

  const closeHint = useCallback((reason = "close_button") => {
    if (!hintGroups) return;
    logActivity("hint_window_closed", {
      reason,
      hints: hintGroups.map(({ className, hint }) => ({ difficulty: className, hint })),
    });
    setHintGroups(null);
  }, [hintGroups]);

  useEffect(() => {
    if (!hintGroups) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHint("escape");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hintGroups, closeHint]);

  useEffect(() => {
    if (hintGroups) {
      logActivity("hint_displayed", {
        hints: hintGroups.map(({ className, hint }) => ({ difficulty: className, hint })),
      });
    }
  }, [hintGroups]);

  const solvedGroupData = solvedGroups.flatMap((description) => {
    const group = gameData.groups.find(
      (candidate) => candidate.description === description,
    );
    return group
      ? [
          {
            ...group,
            className: getSolvedGroupColorClass(group.className),
          },
        ]
      : [];
  });
  const hasWon = solvedGroups.length === gameData.groups.length;
  const hasLost = mistakesLeft === 0 && !hasWon;
  const isGameOver = hasWon || hasLost;
  const canSubmit = selected.length === 4 && !submitLocked && !isGameOver;

  useEffect(() => {
    const solvedCells = Array<LookupGridCell>(solvedGroups.length * 4).fill(null);
    onWordGridChange([...solvedCells, ...remainingWords]);
  }, [onWordGridChange, remainingWords, solvedGroups.length]);

  useEffect(() => {
    onSubmitAvailabilityChange(canSubmit);
  }, [canSubmit, onSubmitAvailabilityChange]);

  useEffect(() => {
    if (isGameOver && !gameOverLogged.current) {
      gameOverLogged.current = true;
      logActivity("round_completed", {
        puzzleIndex: currentPuzzleIndex + 1,
        result: hasWon ? "won" : "lost",
        solvedGroupCount: solvedGroups.length,
        mistakesRemaining: mistakesLeft,
      });
    } else if (!isGameOver) {
      gameOverLogged.current = false;
    }
  }, [currentPuzzleIndex, hasLost, hasWon, isGameOver, mistakesLeft, solvedGroups.length]);

  const toggleSelected = (value: string) => {
    if (incorrectSelection || submitLocked || isGameOver) return;

    if (selected.includes(value)) {
      const nextSelected = selected.filter((word) => word !== value);
      setSelected(nextSelected);
      setSubmitLocked(false);
      logActivity("word_deselected", { word: value, selectedWords: nextSelected });
      return;
    }

    if (selected.length < 4) {
      const nextSelected = [...selected, value];
      setSelected(nextSelected);
      setSubmitLocked(false);
      logActivity("word_selected", { word: value, selectedWords: nextSelected });
    }
  };

  const onSubmit = () => {
    if (selected.length !== 4 || submitLocked || isGameOver) return;

    const submittedWords = [...selected];
    const matchedGroup = gameData.groups.find(({ words, description }) =>
      !solvedGroups.includes(description) &&
      words.every((word) => submittedWords.includes(word)),
    );
    const oneAway = !matchedGroup && gameData.groups.some(({ words, description }) =>
      !solvedGroups.includes(description) &&
      words.filter((word) => submittedWords.includes(word)).length === 3,
    );
    if (oneAwayTimer.current !== null) {
      window.clearTimeout(oneAwayTimer.current);
      oneAwayTimer.current = null;
    }
    setOneAwayVisible(oneAway);
    if (oneAway) {
      oneAwayTimer.current = window.setTimeout(() => {
        setOneAwayVisible(false);
        oneAwayTimer.current = null;
      }, ONE_AWAY_MESSAGE_MS);
    }

    if (!matchedGroup) {
      const nextMistakesLeft = Math.max(0, mistakesLeft - 1);
      logActivity("group_submit_result", {
        source: submitSource,
        result: "incorrect",
        selectedWords: submittedWords,
        oneAway,
        mistakesRemaining: nextMistakesLeft,
      });
      setSubmitLocked(true);
      setMistakesLeft(nextMistakesLeft);
      setIncorrectSelection(true);
      if (incorrectAnimationTimer.current !== null) {
        window.clearTimeout(incorrectAnimationTimer.current);
      }
      incorrectAnimationTimer.current = window.setTimeout(() => {
        setIncorrectSelection(false);
        incorrectAnimationTimer.current = window.setTimeout(() => {
          setSubmitLocked(false);
          incorrectAnimationTimer.current = null;
        }, WRONG_ANSWER_RESET_DELAY_MS);
      }, WRONG_ANSWER_FLASH_MS);
      return;
    }

    const nextSolvedGroups = [...solvedGroups, matchedGroup.description];
    const solvedPosition = nextSolvedGroups.length;
    const color = getSolvedGroupColorClass(matchedGroup.className);
    logActivity("group_submit_result", {
      source: submitSource,
      result: "correct",
      selectedWords: submittedWords,
      groupDescription: matchedGroup.description,
      difficulty: matchedGroup.className ?? "tricky",
      color,
      solvedPosition,
      mistakesRemaining: mistakesLeft,
    });
    setIncorrectSelection(false);
    setSelected([]);
    setSolvedGroups(nextSolvedGroups);

    // Move the remaining top-row words into the spaces made by the solved group.
    const topRowWords = remainingWords
      .slice(0, 4)
      .filter((word) => !matchedGroup.words.includes(word));
    const bottomWords = remainingWords.slice(4).map((word) =>
      matchedGroup.words.includes(word) ? topRowWords.shift()! : word,
    );
    setRemainingWords(bottomWords);
  };

  const onSubmitRef = useRef(onSubmit);
  const handledSubmitRequest = useRef(submitRequest);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  useEffect(() => {
    if (submitRequest === handledSubmitRequest.current) return;
    handledSubmitRequest.current = submitRequest;
    onSubmitRef.current();
  }, [submitRequest]);

  const onHint = () => {
    const unsolvedGroups = gameData.groups.filter(
      ({ description }) => !solvedGroups.includes(description),
    );
    if (unsolvedGroups.length > 0) setHintGroups(unsolvedGroups);
  };

  const resetPuzzle = (puzzleIndex: number) => {
    if (incorrectAnimationTimer.current !== null) {
      window.clearTimeout(incorrectAnimationTimer.current);
      incorrectAnimationTimer.current = null;
    }
    setCurrentPuzzleIndex(puzzleIndex);
    setRemainingWords(shuffle(gameDataSets[puzzleIndex].words));
    setSelected([]);
    setIncorrectSelection(false);
    setSolvedGroups([]);
    setMistakesLeft(4);
    setSubmitLocked(false);
    setHintGroups(null);
    setShowAnswers(false);
    setOneAwayVisible(false);
    if (oneAwayTimer.current !== null) {
      window.clearTimeout(oneAwayTimer.current);
      oneAwayTimer.current = null;
    }
    gameOverLogged.current = false;
  };

  const onRestart = () => {
    if (hintGroups) closeHint("round_restart");
    restartRoundActivity();
    resetPuzzle(currentPuzzleIndex);
  };

  const onNext = () => {
    const nextPuzzleIndex = (currentPuzzleIndex + 1) % gameDataSets.length;
    if (hintGroups) closeHint("next_round");
    startNextRoundActivity({
      fromPuzzleIndex: currentPuzzleIndex + 1,
      toPuzzleIndex: nextPuzzleIndex + 1,
      totalRounds: gameDataSets.length,
    });
    resetPuzzle(nextPuzzleIndex);
  };

  return (
    <>
      <div
        className="game-layout"
        data-round={currentPuzzleIndex + 1}
        data-selected-count={selected.length}
        data-round-result={hasWon ? "won" : hasLost ? "lost" : "in_progress"}
        data-rotation={rotation}
      >
        <div className="game-top-controls">
          <div
            className="card mistakes-remaining"
            role="group"
            aria-label={`Mistakes remaining: ${mistakesLeft}`}
          >
            MISTAKES REMAINING:{" "}
            {Array(mistakesLeft)
              .fill(null)
              .map((_value, index) => (
                <span className="mistake-dot" key={`dot-${index}`}>&#9679;</span>
              ))}
          </div>

          <div className="game-controls">
            <button
              className="game-control-button"
              data-activity-button="hint"
              disabled={isGameOver}
              onClick={onHint}
            >
              Hint
            </button>
            <button
              className="game-control-button"
              data-activity-button="show-answers"
              aria-expanded={showAnswers}
              onClick={() => setShowAnswers(!showAnswers)}
            >
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
            <button className="game-control-button" data-activity-button="restart-round" onClick={onRestart}>Restart</button>
            <button className="game-control-button" data-activity-button="next-round" onClick={onNext}>Next</button>
          </div>
        </div>

        <div className="board-stage">
          <div
            className="board-rotation-frame"
            data-rotation={rotation}
            data-rotation-transition={rotationTransition}
          >
            <Board
              words={remainingWords}
              selected={selected}
              incorrectSelection={incorrectSelection}
              rotation={rotation}
              solvedGroupData={solvedGroupData}
              toggleSelected={toggleSelected}
            />
          </div>
        </div>

        {oneAwayVisible && (
          <div className="one-away-toast" role="status" aria-live="polite">
            One away
          </div>
        )}

        {hintGroups && (
          <div
            className="hint-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeHint("backdrop");
            }}
          >
            <section
              className="hint-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hint-modal-title"
            >
              <div className="hint-modal-heading">
                <h2 id="hint-modal-title">Hint</h2>
                <button
                  className="hint-modal-close"
                  data-activity-button="hint-close"
                  type="button"
                  aria-label="Close hint"
                  onClick={() => closeHint("close_button")}
                >
                  ×
                </button>
              </div>
              <div className="hint-group-list">
                {hintGroups.map((group) => (
                  <div className="hint-group-row" key={group.description}>
                    <span
                      className={`hint-color-swatch ${getSolvedGroupColorClass(group.className)}`}
                      aria-hidden="true"
                    />
                    <strong>{getDifficultyLabel(group.className)}</strong>
                    <p>{group.hint}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {showAnswers && (
          <section className="answer-key" aria-label="Answer key">
            <h2>Answer key</h2>
            {gameData.groups.map((group) => (
              <p key={group.description}>
                <strong>{group.description}:</strong> {group.words.join(", ")}
              </p>
            ))}
          </section>
        )}
      </div>
    </>
  );
};

export default Game;
