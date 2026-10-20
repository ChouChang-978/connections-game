/opt/homebrew/Library/Homebrew/cmd/shellenv.sh: line 27: /bin/ps: Operation not permitted
import { useEffect, useRef, useState } from "react";
import Board from "./Board.tsx";
import shuffle from "lodash.shuffle";
import type { GameData } from "./gameData.ts";

const solvedGroupColorClasses = ["easy", "medium", "hard", "tricky"] as const;
const WRONG_ANSWER_FLASH_MS = 850;
const WRONG_ANSWER_RESET_DELAY_MS = 300;

const Game = ({
  gameDataSets,
  submitRequest,
  onSubmitAvailabilityChange,
  rotation,
}: {
  gameDataSets: GameData[];
  submitRequest: number;
  onSubmitAvailabilityChange: (available: boolean) => void;
  rotation: number;
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
  const [hintMessage, setHintMessage] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const incorrectAnimationTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (incorrectAnimationTimer.current !== null) {
      window.clearTimeout(incorrectAnimationTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!hintMessage) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHintMessage("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hintMessage]);

  const solvedGroupData = solvedGroups.flatMap((description, index) => {
    const group = gameData.groups.find(
      (candidate) => candidate.description === description,
    );
    return group
      ? [
          {
            ...group,
            className: solvedGroupColorClasses[index] ?? "tricky",
          },
        ]
      : [];
  });
  const hasWon = solvedGroups.length === gameData.groups.length;
  const hasLost = mistakesLeft === 0 && !hasWon;
  const isGameOver = hasWon || hasLost;
  const canSubmit = selected.length === 4 && !submitLocked && !isGameOver;

  useEffect(() => {
    onSubmitAvailabilityChange(canSubmit);
  }, [canSubmit, onSubmitAvailabilityChange]);

  const toggleSelected = (value: string) => {
    if (incorrectSelection || submitLocked) return;
    if (selected.includes(value)) {
      setSelected(selected.filter((word) => word !== value));
      setSubmitLocked(false);
      return;
    }

    if (selected.length < 4) {
      setSelected([...selected, value]);
      setSubmitLocked(false);
    }
  };

  const onSubmit = () => {
    if (selected.length !== 4) return;

    const matchedGroup = gameData.groups.find(({ words, description }) =>
      !solvedGroups.includes(description) &&
      words.every((word) => selected.includes(word)),
    );

    if (!matchedGroup) {
      setSubmitLocked(true);
      setMistakesLeft((count) => Math.max(0, count - 1));
      setIncorrectSelection(true);
      if (incorrectAnimationTimer.current !== null) {
        window.clearTimeout(incorrectAnimationTimer.current);
      }
      incorrectAnimationTimer.current = window.setTimeout(() => {
        setIncorrectSelection(false);
        incorrectAnimationTimer.current = window.setTimeout(() => {
          setSelected([]);
          setSubmitLocked(false);
          incorrectAnimationTimer.current = null;
        }, WRONG_ANSWER_RESET_DELAY_MS);
      }, WRONG_ANSWER_FLASH_MS);
      return;
    }

    setIncorrectSelection(false);
    setSelected([]);
    setSolvedGroups([...solvedGroups, matchedGroup.description]);

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
    const nextGroup = gameData.groups.find(
      ({ description }) => !solvedGroups.includes(description),
    );
    if (nextGroup) {
      setHintMessage(`One group is “${nextGroup.description}”.`);
    }
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
    setHintMessage("");
    setShowAnswers(false);
  };

  const onRestart = () => resetPuzzle(currentPuzzleIndex);

  const onNext = () => {
    const nextPuzzleIndex = (currentPuzzleIndex + 1) % gameDataSets.length;
    resetPuzzle(nextPuzzleIndex);
  };

  return (
    <>
      <div className="game-layout">
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
            <button className="game-control-button" disabled={isGameOver} onClick={onHint}>
              Hint
            </button>
            <button
              className="game-control-button"
              aria-expanded={showAnswers}
              onClick={() => setShowAnswers((visible) => !visible)}
            >
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
            <button className="game-control-button" onClick={onRestart}>Restart</button>
            <button className="game-control-button" onClick={onNext}>Next</button>
          </div>
        </div>

        <div className="board-stage">
          <Board
            words={remainingWords}
            selected={selected}
            incorrectSelection={incorrectSelection}
            rotation={rotation}
            solvedGroupData={solvedGroupData}
            toggleSelected={toggleSelected}
          />
        </div>

        {hintMessage && (
          <div
            className="hint-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setHintMessage("");
            }}
          >
            <section
              className="hint-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hint-modal-title"
              aria-describedby="hint-modal-description"
            >
              <div className="hint-modal-heading">
                <h2 id="hint-modal-title">Hint</h2>
                <button
                  className="hint-modal-close"
                  type="button"
                  aria-label="Close hint"
                  onClick={() => setHintMessage("")}
                >
                  ×
                </button>
              </div>
              <p id="hint-modal-description">{hintMessage}</p>
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
