import classNames from "classnames";
import type { ReactNode } from "react";
import "./Item.scss";

type ItemProps = {
  children: ReactNode;
  selected: boolean;
  incorrect: boolean;
  itemOnClick: () => void;
};

export type LookupGridCell = string | null;
export type LookupGridSide = "left" | "right" | "bottom";

export type DictionaryLookupRequest = {
  word: string;
  row: number;
  column: number;
  side: LookupGridSide;
  panelPosition: { left: number; top: number; panelSize: number };
  requestId: number;
};

const Item = ({ children, selected, incorrect, itemOnClick }: ItemProps) => {
  const wordText = String(children);

  return (
    <div className={classNames("item", { selected, incorrect })}>
      <button
        type="button"
        onClick={itemOnClick}
        onContextMenu={(event) => event.preventDefault()}
        data-activity-button={`word-tile:${wordText.toLocaleLowerCase()}`}
        data-activity-word={wordText}
        aria-label={`${wordText}. Tap to select.`}
      >
        {children}
      </button>
    </div>
  );
};

export default Item;
