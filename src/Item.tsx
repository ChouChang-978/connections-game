import classNames from "classnames";
import type { ReactNode } from "react";
import "./Item.scss";

type ItemProps = {
  children: ReactNode;
  selected: boolean;
  incorrect: boolean;
  disabled?: boolean;
  itemOnClick: () => void;
};

export type SolvedGroupColor = "easy" | "medium" | "hard" | "tricky";

export type LookupGridCell = {
  word: string | null;
  solvedDifficulty?: SolvedGroupColor;
} | null;
export type LookupGridSide = "left" | "right" | "bottom";

export type DictionaryLookupRequest = {
  word: string;
  row: number;
  column: number;
  side: LookupGridSide;
  panelPosition: { left: number; top: number; panelSize: number };
  requestId: number;
};

const Item = ({ children, selected, incorrect, disabled = false, itemOnClick }: ItemProps) => {
  const wordText = String(children);

  return (
    <div className={classNames("item", { selected, incorrect })}>
      <button
        type="button"
        disabled={disabled}
        onClick={itemOnClick}
        onContextMenu={(event) => event.preventDefault()}
        data-activity-button={`word-tile:${wordText.toLocaleLowerCase()}`}
        data-activity-word={wordText}
        aria-label={`${wordText}. ${disabled ? "Unavailable." : "Tap to select."}`}
      >
        {children}
      </button>
    </div>
  );
};

export default Item;
