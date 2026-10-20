/opt/homebrew/Library/Homebrew/cmd/shellenv.sh: line 27: /bin/ps: Operation not permitted
import { useAutoAnimate } from "@formkit/auto-animate/react";

import "./Board.scss";
import Item from "./Item.tsx";
import SolvedGroup from "./SolvedGroup.tsx";
import type { WordGroup } from "./gameData.ts";

type BoardProps = {
  words: string[];
  selected: string[];
  incorrectSelection: boolean;
  rotation: number;
  toggleSelected: (value: string) => void;
  solvedGroupData: WordGroup[];
};

const Board = ({
  words,
  selected,
  incorrectSelection,
  rotation,
  solvedGroupData,
  toggleSelected,
}: BoardProps) => {
  const [parent] = useAutoAnimate({ duration: 400 });

  return (
    <div ref={parent} className={"board"}>
      {solvedGroupData.map((item) => (
        <SolvedGroup key={item.description} solvedGroup={item} />
      ))}
      {words.map((word) => (
        <Item
          key={word}
          itemOnClick={() => {
            toggleSelected(word);
          }}
          selected={selected.includes(word)}
          incorrect={incorrectSelection && selected.includes(word)}
          rotation={rotation}
        >
          {word}
        </Item>
      ))}
    </div>
  );
};

export default Board;
