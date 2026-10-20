import classNames from "classnames";
import "./Item.scss";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ItemProps = {
  children: ReactNode;
  selected: boolean;
  incorrect: boolean;
  rotation: number;
  itemOnClick: () => void;
};

type HoverDictionaryEntry = {
  partOfSpeech?: string;
  definitions: string[];
};

type HoverDefinition = {
  status: "loading" | "success" | "not-found" | "error";
  entries: HoverDictionaryEntry[];
  x: number;
  y: number;
};

const HOVER_DELAY_MS = 3000;
const HOVER_CLOSE_DELAY_MS = 650;

const getShortDefinitions = (data: unknown): HoverDictionaryEntry[] => {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const shortDefinitions = Array.isArray(entry.shortdef)
      ? entry.shortdef.filter((definition): definition is string => typeof definition === "string")
      : [];
    return shortDefinitions.length > 0
      ? [{
          partOfSpeech: typeof entry.fl === "string" ? entry.fl : undefined,
          definitions: shortDefinitions,
        }]
      : [];
  });
};

const Item = ({ children, selected, incorrect, rotation, itemOnClick }: ItemProps) => {
  const [hoverDefinition, setHoverDefinition] = useState<HoverDefinition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 8, top: 8 });
  const tooltipElement = useRef<HTMLAsideElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const lookupController = useRef<AbortController | null>(null);
  const tooltipIsOpen = useRef(false);
  const pointerPosition = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const tooltip = tooltipElement.current;
    if (!hoverDefinition || !tooltip) return;

    const bounds = tooltip.getBoundingClientRect();
    const desiredLeft = hoverDefinition.x + 16;
    const desiredTop = hoverDefinition.y + 16;
    let shiftX = desiredLeft - bounds.left;
    let shiftY = desiredTop - bounds.top;
    const candidateLeft = bounds.left + shiftX;
    const candidateTop = bounds.top + shiftY;

    if (candidateLeft < 8) shiftX += 8 - candidateLeft;
    if (candidateLeft + bounds.width > window.innerWidth - 8) {
      shiftX += window.innerWidth - 8 - (candidateLeft + bounds.width);
    }
    if (candidateTop < 8) shiftY += 8 - candidateTop;
    if (candidateTop + bounds.height > window.innerHeight - 8) {
      shiftY += window.innerHeight - 8 - (candidateTop + bounds.height);
    }

    if (Math.abs(shiftX) > 0.5 || Math.abs(shiftY) > 0.5) {
      setTooltipPosition((position) => ({
        left: position.left + shiftX,
        top: position.top + shiftY,
      }));
    }
  }, [hoverDefinition, rotation, tooltipPosition]);

  const cancelTimers = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const cancelHoverLookup = () => {
    cancelTimers();
    lookupController.current?.abort();
    lookupController.current = null;
  };

  useEffect(() => () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    lookupController.current?.abort();
  }, []);

  const closeTooltip = () => {
    tooltipIsOpen.current = false;
    cancelHoverLookup();
    setHoverDefinition(null);
  };

  const scheduleTooltipClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(closeTooltip, HOVER_CLOSE_DELAY_MS);
  };

  const startHoverLookup = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (tooltipIsOpen.current) {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      return;
    }
    cancelHoverLookup();
    setHoverDefinition(null);
    pointerPosition.current = { x: event.clientX, y: event.clientY };

    hoverTimer.current = window.setTimeout(async () => {
      hoverTimer.current = null;
      const controller = new AbortController();
      lookupController.current = controller;
      tooltipIsOpen.current = true;
      const anchor = { ...pointerPosition.current };
      setTooltipPosition({ left: anchor.x + 16, top: anchor.y + 16 });
      setHoverDefinition({
        status: "loading",
        entries: [],
        ...anchor,
      });

      try {
        const word = String(children).toLocaleLowerCase();
        const response = await fetch(
          `/api/dictionary?word=${encodeURIComponent(word)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);

        const entries = getShortDefinitions(await response.json());
        if (lookupController.current !== controller) return;
        setHoverDefinition({
          status: entries.length > 0 ? "success" : "not-found",
          entries,
          ...anchor,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (lookupController.current !== controller) return;
        setHoverDefinition({
          status: "error",
          entries: [],
          ...anchor,
        });
      }
    }, HOVER_DELAY_MS);
  };

  const trackPointer = (event: ReactMouseEvent<HTMLButtonElement>) => {
    pointerPosition.current = { x: event.clientX, y: event.clientY };
  };

  return (
    <div className={classNames("item", { selected, incorrect })}>
      <button
        onClick={itemOnClick}
        onMouseEnter={startHoverLookup}
        onMouseMove={trackPointer}
        onMouseLeave={() => {
          if (hoverTimer.current !== null) {
            window.clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
          } else if (tooltipIsOpen.current) {
            scheduleTooltipClose();
          }
        }}
      >
        {children}
      </button>
      {hoverDefinition &&
        createPortal(
          <aside
            ref={tooltipElement}
            className="dictionary-hover-tooltip"
            role="status"
            aria-live="polite"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
            onMouseEnter={() => {
              if (closeTimer.current !== null) {
                window.clearTimeout(closeTimer.current);
                closeTimer.current = null;
              }
            }}
            onMouseLeave={scheduleTooltipClose}
          >
            <strong className="dictionary-hover-word">{children}</strong>
            {hoverDefinition.status === "loading" && <p>Looking up…</p>}
            {hoverDefinition.status === "not-found" && <p>No Collegiate definition found.</p>}
            {hoverDefinition.status === "error" && <p>Could not reach Merriam-Webster.</p>}
            {hoverDefinition.status === "success" && (
              hoverDefinition.entries.map((entry, entryIndex) => (
                <section className="dictionary-hover-entry" key={`${entry.partOfSpeech}-${entryIndex}`}>
                  {entry.partOfSpeech && <h3>{entry.partOfSpeech}</h3>}
                  <ol>
                    {entry.definitions.map((definition, index) => (
                      <li key={`${index}-${definition}`}>{definition}</li>
                    ))}
                  </ol>
                </section>
              ))
            )}
          </aside>,
          document.body,
        )}
    </div>
  );
};

export default Item;
