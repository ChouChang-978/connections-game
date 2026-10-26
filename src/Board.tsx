import { useRef } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { AutoAnimationPlugin } from "@formkit/auto-animate";

import "./Board.scss";
import Item from "./Item.tsx";
import SolvedGroup from "./SolvedGroup.tsx";
import type { WordGroup } from "./gameData.ts";

type BoardCoordinates = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const BOARD_ANIMATION_DURATION_MS = 400;

const toBoardCoordinates = (x: number, y: number, rotation: number) => {
  switch (rotation) {
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default:
      return { x, y };
  }
};

const getScrollOffset = (element: HTMLElement) => {
  let ancestor = element.parentElement;
  while (ancestor) {
    if (ancestor.scrollLeft || ancestor.scrollTop) {
      return { x: ancestor.scrollLeft, y: ancestor.scrollTop };
    }
    ancestor = ancestor.parentElement;
  }
  return { x: 0, y: 0 };
};

const createBoardAnimationPlugin = (
  rotationRef: { current: number },
): AutoAnimationPlugin => (element, action, firstCoordinates, secondCoordinates) => {
  const rotation = rotationRef.current;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const duration = prefersReducedMotion ? 1 : BOARD_ANIMATION_DURATION_MS;

  if (action === "add" && firstCoordinates) {
    return new KeyframeEffect(
      element,
      [
        { transform: "scale(0.98)", opacity: 0 },
        { transform: "scale(0.98)", opacity: 0, offset: 0.5 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: duration * 1.5, easing: "ease-in" },
    );
  }

  if (
    action === "remain" &&
    firstCoordinates &&
    secondCoordinates
  ) {
    const oldCoordinates = firstCoordinates as BoardCoordinates;
    const newCoordinates = secondCoordinates as BoardCoordinates;
    const oldCenter = {
      x: oldCoordinates.left + oldCoordinates.width / 2,
      y: oldCoordinates.top + oldCoordinates.height / 2,
    };
    const newCenter = {
      x: newCoordinates.left + newCoordinates.width / 2,
      y: newCoordinates.top + newCoordinates.height / 2,
    };
    const movement = toBoardCoordinates(
      oldCenter.x - newCenter.x,
      oldCenter.y - newCenter.y,
      rotation,
    );
    const quarterTurn = rotation === 90 || rotation === 270;
    const oldWidth = quarterTurn ? oldCoordinates.height : oldCoordinates.width;
    const newWidth = quarterTurn ? newCoordinates.height : newCoordinates.width;
    const oldHeight = quarterTurn ? oldCoordinates.width : oldCoordinates.height;
    const newHeight = quarterTurn ? newCoordinates.width : newCoordinates.height;
    const from: Keyframe = {
      transform: `translate(${movement.x}px, ${movement.y}px)`,
    };
    const to: Keyframe = { transform: "translate(0, 0)" };

    if (oldWidth !== newWidth) {
      from.width = `${oldWidth}px`;
      to.width = `${newWidth}px`;
    }
    if (oldHeight !== newHeight) {
      from.height = `${oldHeight}px`;
      to.height = `${newHeight}px`;
    }

    return new KeyframeEffect(element, [from, to], {
      duration,
      easing: "ease-in-out",
    });
  }

  if (action === "remove" && firstCoordinates) {
    const oldCoordinates = firstCoordinates as BoardCoordinates;
    const effect = new KeyframeEffect(
      element,
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.98)", opacity: 0 },
      ],
      { duration, easing: "ease-out" },
    );

    if (rotation === 0) return effect;

    let offsetParent = element.parentElement as HTMLElement | null;
    while (
      offsetParent &&
      (getComputedStyle(offsetParent).position === "static" ||
        offsetParent instanceof HTMLBodyElement)
    ) {
      offsetParent = offsetParent.parentElement;
    }
    offsetParent ??= document.body;

    const parentRect = offsetParent.getBoundingClientRect();
    const scrollOffset = getScrollOffset(offsetParent);
    const parentCenter = {
      x: parentRect.left + scrollOffset.x + parentRect.width / 2,
      y: parentRect.top + scrollOffset.y + parentRect.height / 2,
    };
    const oldCenter = {
      x: oldCoordinates.left + oldCoordinates.width / 2,
      y: oldCoordinates.top + oldCoordinates.height / 2,
    };
    const localCenter = toBoardCoordinates(
      oldCenter.x - parentCenter.x,
      oldCenter.y - parentCenter.y,
      rotation,
    );
    const quarterTurn = rotation === 90 || rotation === 270;
    const parentWidth = quarterTurn ? parentRect.height : parentRect.width;
    const parentHeight = quarterTurn ? parentRect.width : parentRect.height;
    const elementWidth = quarterTurn ? oldCoordinates.height : oldCoordinates.width;
    const elementHeight = quarterTurn ? oldCoordinates.width : oldCoordinates.height;
    const parentStyles = getComputedStyle(offsetParent);
    const borderLeft = Number.parseFloat(parentStyles.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(parentStyles.borderTopWidth) || 0;
    const styleReset = {
      position: "absolute",
      top: `${parentHeight / 2 + localCenter.y - elementHeight / 2 - borderTop}px`,
      left: `${parentWidth / 2 + localCenter.x - elementWidth / 2 - borderLeft}px`,
      width: `${elementWidth}px`,
      height: `${elementHeight}px`,
      margin: "0",
      pointerEvents: "none",
      transformOrigin: "center",
      zIndex: "100",
    } as unknown as CSSStyleDeclaration;

    return [effect, { styleReset }];
  }

  return new KeyframeEffect(element, [], { duration: 1 });
};

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
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const [parent] = useAutoAnimate(createBoardAnimationPlugin(rotationRef));

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
        >
          {word}
        </Item>
      ))}
    </div>
  );
};

export default Board;
