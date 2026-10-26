import classNames from "classnames";
import "./Item.scss";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { logActivity } from "./activityLog.ts";

type ItemProps = {
  children: ReactNode;
  selected: boolean;
  incorrect: boolean;
  rotation: number;
  itemOnClick: () => void;
  lookupRequest: DictionaryLookupRequest | null;
  onLookupRequestHandled: (requestId: number) => void;
};

export type LookupGridCell = string | null;
export type LookupGridSide = "left" | "right" | "bottom";

export type DictionaryLookupRequest = {
  word: string;
  row: number;
  column: number;
  side: LookupGridSide;
  panelPosition: { left: number; top: number };
  requestId: number;
};

type DictionaryEntry = {
  partOfSpeech?: string;
  definitions: string[];
};

type DictionaryPanel = {
  status: "loading" | "success" | "not-found" | "error";
  entries: DictionaryEntry[];
  gridRow: number;
  gridColumn: number;
  side: LookupGridSide;
};

const getShortDefinitions = (data: unknown): DictionaryEntry[] => {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const definitions = Array.isArray(entry.shortdef)
      ? entry.shortdef.filter((definition): definition is string => typeof definition === "string")
      : [];
    return definitions.length > 0
      ? [{ partOfSpeech: typeof entry.fl === "string" ? entry.fl : undefined, definitions }]
      : [];
  });
};

const Item = ({
  children,
  selected,
  incorrect,
  rotation,
  itemOnClick,
  lookupRequest,
  onLookupRequestHandled,
}: ItemProps) => {
  const [dictionaryPanel, setDictionaryPanel] = useState<DictionaryPanel | null>(null);
  const [panelPosition, setPanelPosition] = useState({ left: 8, top: 8 });
  const buttonElement = useRef<HTMLButtonElement | null>(null);
  const panelElement = useRef<HTMLElement | null>(null);
  const lookupController = useRef<AbortController | null>(null);
  const handledLookupRequest = useRef<number | null>(null);
  const panelIsOpen = useRef(false);
  const lookupResultLogged = useRef(false);
  const wordText = String(children);

  useLayoutEffect(() => {
    if (!dictionaryPanel || !panelElement.current) return;
    const bounds = panelElement.current.getBoundingClientRect();
    let shiftX = 0;
    let shiftY = 0;
    if (bounds.left < 8) shiftX = 8 - bounds.left;
    if (bounds.right > window.innerWidth - 8) {
      shiftX = window.innerWidth - 8 - bounds.right;
    }
    if (bounds.top < 8) shiftY = 8 - bounds.top;
    if (bounds.bottom > window.innerHeight - 8) {
      shiftY = window.innerHeight - 8 - bounds.bottom;
    }
    if (shiftX || shiftY) {
      setPanelPosition((position) => ({
        left: position.left + shiftX,
        top: position.top + shiftY,
      }));
    }
  }, [dictionaryPanel, rotation]);

  useEffect(() => {
    if (
      !dictionaryPanel ||
      dictionaryPanel.status === "loading" ||
      !panelElement.current ||
      lookupResultLogged.current
    ) return;

    if (panelElement.current.getClientRects().length === 0) return;
    lookupResultLogged.current = true;
    logActivity("dictionary_search_result", {
      query: wordText,
      word: wordText,
      source: "merriam-webster",
      inputMethod: "position_matrix",
      side: dictionaryPanel.side,
      gridRow: dictionaryPanel.gridRow,
      gridColumn: dictionaryPanel.gridColumn,
      status: dictionaryPanel.status,
      entryCount: dictionaryPanel.entries.length,
      definitionCount: dictionaryPanel.entries.reduce(
        (total, entry) => total + entry.definitions.length,
        0,
      ),
    });
  }, [dictionaryPanel, wordText]);

  const closePanel = useCallback((reason: string) => {
    if (panelIsOpen.current) {
      logActivity("dictionary_panel_closed", {
        query: wordText,
        word: wordText,
        inputMethod: "position_matrix",
        side: dictionaryPanel?.side ?? null,
        gridRow: dictionaryPanel?.gridRow ?? null,
        gridColumn: dictionaryPanel?.gridColumn ?? null,
        reason,
        finalStatus: dictionaryPanel?.status ?? "unknown",
      });
    }
    panelIsOpen.current = false;
    lookupController.current?.abort();
    lookupController.current = null;
    setDictionaryPanel(null);
  }, [dictionaryPanel, wordText]);

  useEffect(() => {
    if (!dictionaryPanel) return;
    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonElement.current?.contains(target) || panelElement.current?.contains(target)) return;
      closePanel("outside_tap");
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, [dictionaryPanel, closePanel]);

  useEffect(() => () => {
    lookupController.current?.abort();
  }, []);

  const startDictionaryLookup = useCallback(async (
    request: DictionaryLookupRequest,
  ) => {
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    lookupResultLogged.current = false;
    panelIsOpen.current = true;
    setPanelPosition(request.panelPosition);
    setDictionaryPanel({
      status: "loading",
      entries: [],
      gridRow: request.row,
      gridColumn: request.column,
      side: request.side,
    });

    try {
      const response = await fetch(
        `/api/dictionary?word=${encodeURIComponent(wordText.toLocaleLowerCase())}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);

      const entries = getShortDefinitions(await response.json());
      if (lookupController.current !== controller) return;
      setDictionaryPanel({
        status: entries.length > 0 ? "success" : "not-found",
        entries,
        gridRow: request.row,
        gridColumn: request.column,
        side: request.side,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (lookupController.current !== controller) return;
      setDictionaryPanel({
        status: "error",
        entries: [],
        gridRow: request.row,
        gridColumn: request.column,
        side: request.side,
      });
    } finally {
      if (lookupController.current === controller) lookupController.current = null;
    }
  }, [wordText]);

  useEffect(() => {
    if (
      !lookupRequest ||
      lookupRequest.word !== wordText ||
      handledLookupRequest.current === lookupRequest.requestId
    ) return;

    handledLookupRequest.current = lookupRequest.requestId;
    if (!buttonElement.current) return;
    void startDictionaryLookup(lookupRequest);
    onLookupRequestHandled(lookupRequest.requestId);
  }, [lookupRequest, onLookupRequestHandled, startDictionaryLookup, wordText]);

  return (
    <div className={classNames("item", { selected, incorrect })}>
      <button
        ref={buttonElement}
        type="button"
        onClick={itemOnClick}
        onContextMenu={(event) => event.preventDefault()}
        data-activity-button={`word-tile:${wordText.toLocaleLowerCase()}`}
        data-activity-word={wordText}
        aria-label={`${wordText}. Tap to select.`}
      >
        {children}
      </button>
      {dictionaryPanel &&
        createPortal(
          <aside
            ref={panelElement}
            className="dictionary-word-panel"
            role="dialog"
            aria-label={`${wordText} dictionary definition`}
            style={{
              left: panelPosition.left,
              top: panelPosition.top,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div className="dictionary-panel-heading">
              <strong className="dictionary-panel-word">{children}</strong>
              <button
                className="dictionary-panel-close"
                data-activity-button="dictionary-panel-close"
                type="button"
                aria-label={`Close definition for ${wordText}`}
                onClick={() => closePanel("close_button")}
              >
                ×
              </button>
            </div>
            {dictionaryPanel.status === "loading" && <p>Looking up…</p>}
            {dictionaryPanel.status === "not-found" && <p>No Collegiate definition found.</p>}
            {dictionaryPanel.status === "error" && <p>Could not reach Merriam-Webster.</p>}
            {dictionaryPanel.status === "success" && (
              dictionaryPanel.entries.map((entry, entryIndex) => (
                <section className="dictionary-panel-entry" key={`${entry.partOfSpeech}-${entryIndex}`}>
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
