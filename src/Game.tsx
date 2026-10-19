import { useEffect, useRef, useState } from "react";
import Board from "./Board.tsx";
import shuffle from "lodash.shuffle";
import type { GameData } from "./gameData.ts";

const solvedGroupColorClasses = ["easy", "medium", "hard", "tricky"] as const;

const Game = ({
  gameDataSets,
  submitRequest,
  onSubmitAvailabilityChange,
}: {
  gameDataSets: GameData[];
  submitRequest: number;
  onSubmitAvailabilityChange: (available: boolean) => void;
}) => {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const gameData = gameDataSets[currentPuzzleIndex];
  const [remainingWords, setRemainingWords] = useState(() =>
    shuffle(gameDataSets[0].words),
  );
  const [submitLocked, setSubmitLocked] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(4);
  const [hintMessage, setHintMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

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
    setStatusMessage("");
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
      setStatusMessage("Those four words do not make a group. Try again.");
      return;
    }

    setSelected([]);
    setSolvedGroups([...solvedGroups, matchedGroup.description]);
    setStatusMessage(`Correct: ${matchedGroup.description}`);

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
      setHintMessage(`Hint: one group is “${nextGroup.description}”.`);
    }
  };

  const resetPuzzle = (puzzleIndex: number) => {
    setCurrentPuzzleIndex(puzzleIndex);
    setRemainingWords(shuffle(gameDataSets[puzzleIndex].words));
    setSelected([]);
    setSolvedGroups([]);
    setMistakesLeft(4);
    setSubmitLocked(false);
    setHintMessage("");
    setStatusMessage("");
    setShowAnswers(false);
  };

  const onRestart = () => resetPuzzle(currentPuzzleIndex);

  const onNext = () => {
    const nextPuzzleIndex = (currentPuzzleIndex + 1) % gameDataSets.length;
    resetPuzzle(nextPuzzleIndex);
  };

  return (
    <>
      <div className="card puzzle-counter">
        Puzzle {currentPuzzleIndex + 1} of {gameDataSets.length}
      </div>
      <div className="card game-instruction">
        {hasWon
          ? "Congratulations! You solved all four groups!"
          : hasLost
            ? "Game over. Start a new game to try again."
            : "Create four groups of four"}
      </div>
      <div>
        <Board
          words={remainingWords}
          selected={selected}
          solvedGroupData={solvedGroupData}
          toggleSelected={toggleSelected}
        />

        <div className="card">
          mistakes remaining:{" "}
          {Array(mistakesLeft)
            .fill(null)
            .map((_value, index) => (
              <span key={`dot-${index}`}>&#9679; </span>
            ))}
        </div>

        <div className="game-controls">
          <button disabled={isGameOver} onClick={onHint}>
            Hint
          </button>
          <button
            aria-expanded={showAnswers}
            onClick={() => setShowAnswers((visible) => !visible)}
          >
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </button>
          <button onClick={onRestart}>Restart</button>
          <button onClick={onNext}>Next</button>
        </div>

        {statusMessage && (
          <p className="game-message" role="status">
            {statusMessage}
          </p>
        )}
        {hintMessage && (
          <p className="game-message hint-message" role="status">
            {hintMessage}
          </p>
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
