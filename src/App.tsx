import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import Game from "./Game.tsx";
import type { DictionaryLookupRequest, LookupGridCell, LookupGridSide } from "./Item.tsx";
import { gameDataSets } from "./gameData.ts";
import {
  beginGameActivityLog,
  downloadActivityLog,
  downloadCurrentGameActivityLog,
  endGameActivity,
  logActivity,
  startGameActivity,
} from "./activityLog.ts";

type DictionaryDefinition = {
  definition?: string;
  examples?: string[];
};

type DictionaryEntry = {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
};

type DictionarySource = "merriam-webster" | "wiktionary";

type LookupStatus = "idle" | "loading" | "success" | "not-found" | "error";

type LookupDictionaryEntry = {
  partOfSpeech?: string;
  definitions: string[];
};

const LOOKUP_PANEL_SIZE = 260;
const LOOKUP_PANEL_GAP = 12;

const getLookupPanelPosition = (
  matrix: HTMLElement,
  side: LookupGridSide,
  openRequests: DictionaryLookupRequest[],
) => {
  const bounds = matrix.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelSize = Math.max(
    1,
    Math.min(
      LOOKUP_PANEL_SIZE,
      viewportWidth - 16,
      (viewportHeight - 16 - LOOKUP_PANEL_GAP * 2) / 3,
    ),
  );
  const getVisualBounds = (request: DictionaryLookupRequest) => ({
    left: request.panelPosition.left,
    top: request.panelPosition.top,
    right: request.panelPosition.left + request.panelPosition.panelSize,
    bottom: request.panelPosition.top + request.panelPosition.panelSize,
  });
  const occupied = openRequests.map(getVisualBounds);
  const maxLeft = Math.max(8, viewportWidth - panelSize - 8);
  const maxTop = Math.max(8, viewportHeight - panelSize - 8);
  const clamp = (value: number, maximum: number) => Math.max(8, Math.min(value, maximum));
  const verticalCenter = bounds.top + bounds.height / 2 - panelSize / 2;
  const horizontalCenter = bounds.left + bounds.width / 2 - panelSize / 2;
  const preferred = side === "left"
    ? [
        { left: bounds.right + LOOKUP_PANEL_GAP, top: verticalCenter },
        { left: bounds.left - panelSize - LOOKUP_PANEL_GAP, top: verticalCenter },
        { left: horizontalCenter, top: bounds.top - panelSize - LOOKUP_PANEL_GAP },
        { left: horizontalCenter, top: bounds.bottom + LOOKUP_PANEL_GAP },
      ]
    : side === "right"
      ? [
          { left: bounds.left - panelSize - LOOKUP_PANEL_GAP, top: verticalCenter },
          { left: bounds.right + LOOKUP_PANEL_GAP, top: verticalCenter },
          { left: horizontalCenter, top: bounds.top - panelSize - LOOKUP_PANEL_GAP },
          { left: horizontalCenter, top: bounds.bottom + LOOKUP_PANEL_GAP },
        ]
      : [
          { left: horizontalCenter, top: bounds.top - panelSize - LOOKUP_PANEL_GAP },
          { left: horizontalCenter, top: bounds.bottom + LOOKUP_PANEL_GAP },
          { left: bounds.left - panelSize - LOOKUP_PANEL_GAP, top: verticalCenter },
          { left: bounds.right + LOOKUP_PANEL_GAP, top: verticalCenter },
        ];

  const candidates = [...preferred];
  for (let top = 8; top <= maxTop; top += panelSize + LOOKUP_PANEL_GAP) {
    for (let left = 8; left <= maxLeft; left += panelSize + LOOKUP_PANEL_GAP) {
      candidates.push({ left, top });
    }
  }

  const position = candidates
    .map(({ left, top }) => ({ left: clamp(left, maxLeft), top: clamp(top, maxTop) }))
    .find((candidate, index, allCandidates) => {
      const key = `${candidate.left}:${candidate.top}`;
      if (allCandidates.findIndex((other) => `${other.left}:${other.top}` === key) !== index) return false;
      return occupied.every((rect) =>
        candidate.left + panelSize + LOOKUP_PANEL_GAP <= rect.left ||
        candidate.left >= rect.right + LOOKUP_PANEL_GAP ||
        candidate.top + panelSize + LOOKUP_PANEL_GAP <= rect.top ||
        candidate.top >= rect.bottom + LOOKUP_PANEL_GAP,
      );
    });

  return { ...(position ?? { left: 8, top: 8 }), panelSize };
};

const LookupMatrix = ({
  side,
  cells,
  openRequests,
  rotation,
  disabled,
  onLookup,
}: {
  side: LookupGridSide;
  cells: LookupGridCell[];
  openRequests: DictionaryLookupRequest[];
  rotation: number;
  disabled: boolean;
  onLookup: (word: string, row: number, column: number, side: LookupGridSide, panelPosition: { left: number; top: number; panelSize: number }) => void;
}) => {
  const sideRotation = side === "right" ? 90 : side === "left" ? -90 : 0;
  const matrixRotation = ((rotation - sideRotation) % 360 + 360) % 360;

  return (
    <div
      className="word-lookup-matrix"
      role="group"
      aria-label={`Dictionary lookup positions on the ${side} side`}
      style={{ transform: `rotate(${matrixRotation}deg)` }}
    >
      {Array.from({ length: 16 }, (_value, index) => {
        const row = Math.floor(index / 4) + 1;
        const column = (index % 4) + 1;
        const word = cells[index] ?? null;
        const sameSideRequests = openRequests.filter((request) => request.side !== side);
        return (
          <button
            key={`${side}-${row}-${column}`}
            className="word-lookup-matrix-button"
            data-activity-button={`word-lookup-${side}-r${row}c${column}`}
            type="button"
            disabled={!word || disabled}
            aria-label={word
              ? `Look up the word at row ${row}, column ${column}`
              : `No word at row ${row}, column ${column}`}
            onClick={(event) => {
              if (!word) return;
              const matrix = event.currentTarget.closest<HTMLElement>(".word-lookup-matrix");
              if (!matrix) return;
              onLookup(word, row, column, side, getLookupPanelPosition(matrix, side, sameSideRequests));
            }}
          />
        );
      })}
    </div>
  );
};

const getShortDefinitions = (data: unknown): LookupDictionaryEntry[] => {
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

const DictionaryLookupPanel = ({
  request,
  onClose,
}: {
  request: DictionaryLookupRequest;
  onClose: (requestId: number) => void;
}) => {
  const [status, setStatus] = useState<Exclude<LookupStatus, "idle">>("loading");
  const [entries, setEntries] = useState<LookupDictionaryEntry[]>([]);
  const resultLogged = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setEntries([]);
    resultLogged.current = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/dictionary?word=${encodeURIComponent(request.word.toLocaleLowerCase())}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);
        const results = getShortDefinitions(await response.json());
        if (controller.signal.aborted) return;
        setEntries(results);
        setStatus(results.length > 0 ? "success" : "not-found");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (!controller.signal.aborted) setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [request.requestId, request.word]);

  useEffect(() => {
    if (status === "loading" || resultLogged.current) return;
    resultLogged.current = true;
    logActivity("dictionary_search_result", {
      query: request.word,
      word: request.word,
      source: "merriam-webster",
      inputMethod: "position_matrix",
      side: request.side,
      gridRow: request.row,
      gridColumn: request.column,
      requestId: request.requestId,
      status,
      entryCount: entries.length,
      definitionCount: entries.reduce((total, entry) => total + entry.definitions.length, 0),
    });
  }, [entries, request, status]);

  const close = () => {
    logActivity("dictionary_panel_closed", {
      query: request.word,
      word: request.word,
      inputMethod: "position_matrix",
      side: request.side,
      gridRow: request.row,
      gridColumn: request.column,
      requestId: request.requestId,
      reason: "close_button",
      finalStatus: status,
    });
    onClose(request.requestId);
  };

  const orientation = request.side === "left"
    ? "rotate(90deg)"
    : request.side === "right"
      ? "rotate(-90deg)"
      : "rotate(0deg)";

  return createPortal(
    <aside
      className="dictionary-word-panel"
      role="dialog"
      aria-label={`${request.word} dictionary definition`}
      data-side={request.side}
      style={{
        left: request.panelPosition.left,
        top: request.panelPosition.top,
        width: request.panelPosition.panelSize,
        maxHeight: request.panelPosition.panelSize,
        transform: orientation,
        transformOrigin: "center center",
      }}
    >
      <div className="dictionary-panel-heading">
        <strong className="dictionary-panel-word">{request.word}</strong>
        <button
          className="dictionary-panel-close"
          data-activity-button="dictionary-panel-close"
          type="button"
          aria-label={`Close definition for ${request.word}`}
          onClick={close}
        >
          ×
        </button>
      </div>
      {status === "loading" && <p>Looking up…</p>}
      {status === "not-found" && <p>No Collegiate definition found.</p>}
      {status === "error" && <p>Could not reach Merriam-Webster.</p>}
      {status === "success" && entries.map((entry, entryIndex) => (
        <section className="dictionary-panel-entry" key={`${entry.partOfSpeech}-${entryIndex}`}>
          {entry.partOfSpeech && <h3>{entry.partOfSpeech}</h3>}
          <ol>
            {entry.definitions.map((definition, index) => (
              <li key={`${index}-${definition}`}>{definition}</li>
            ))}
          </ol>
        </section>
      ))}
    </aside>,
    document.body,
  );
};

const stripMarkup = (value: string) =>
  new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ?? "";

const getMerriamWebsterEntries = (data: unknown): DictionaryEntry[] => {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const definitions = Array.isArray(entry.shortdef)
      ? entry.shortdef
          .filter((definition): definition is string => typeof definition === "string")
          .map((definition) => ({ definition }))
      : [];

    return definitions.length > 0
      ? [{
          partOfSpeech: typeof entry.fl === "string" ? entry.fl : undefined,
          definitions,
        }]
      : [];
  });
};

const getWiktionaryEntries = (data: unknown): DictionaryEntry[] => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];

  const response = data as Record<string, unknown>;
  const entries = response.en ?? response.English;
  return Array.isArray(entries) ? (entries as DictionaryEntry[]) : [];
};

const mergeWiktionaryEntries = (entryGroups: DictionaryEntry[][]): DictionaryEntry[] => {
  const merged = new Map<string, DictionaryEntry>();
  const seenDefinitions = new Map<string, Set<string>>();

  for (const entry of entryGroups.flat()) {
    const partOfSpeech = entry.partOfSpeech?.trim() ?? "";
    const entryKey = partOfSpeech.toLocaleLowerCase();
    if (!merged.has(entryKey)) {
      merged.set(entryKey, { partOfSpeech, definitions: [] });
      seenDefinitions.set(entryKey, new Set());
    }

    const target = merged.get(entryKey)!;
    const seen = seenDefinitions.get(entryKey)!;
    for (const definition of entry.definitions ?? []) {
      if (!definition.definition) continue;
      const definitionKey = stripMarkup(definition.definition)
        .toLocaleLowerCase()
        .replace(/\s+/g, " ");
      if (!definitionKey || seen.has(definitionKey)) continue;
      seen.add(definitionKey);
      target.definitions?.push(definition);
    }
  }

  return Array.from(merged.values()).filter((entry) => entry.definitions?.length);
};

const ROTATION_FADE_DURATION_MS = 180;

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [showDownloadChoices, setShowDownloadChoices] = useState(false);
  const [gameInstance, setGameInstance] = useState(0);
  const [groupSize, setGroupSize] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [dictionarySource, setDictionarySource] = useState<DictionarySource>("merriam-webster");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const activeLookup = useRef<AbortController | null>(null);
  const [rotation, setRotation] = useState(0);
  const [rotationTransition, setRotationTransition] = useState<"idle" | "fade-out" | "fade-in">("idle");
  const rotationTimer = useRef<number | null>(null);
  const [submitRequest, setSubmitRequest] = useState(0);
  const [submitSource, setSubmitSource] = useState("unknown");
  const [submitAvailable, setSubmitAvailable] = useState(false);
  const [lookupGrid, setLookupGrid] = useState<LookupGridCell[]>(() => Array(16).fill(null));
  const [lookupRequests, setLookupRequests] = useState<DictionaryLookupRequest[]>([]);
  const lookupRequestSequence = useRef(0);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const faceMeControlsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const interfaceActive = gameStarted && !gameEnded;
    if (appShellRef.current) appShellRef.current.inert = !interfaceActive;
    if (faceMeControlsRef.current) faceMeControlsRef.current.inert = !interfaceActive;
  }, [gameStarted, gameEnded]);

  useEffect(() => () => {
    activeLookup.current?.abort();
    if (rotationTimer.current !== null) window.clearTimeout(rotationTimer.current);
  }, []);

  const rotatePage = (nextRotation: number, direction: "top" | "right" | "bottom" | "left") => {
    logActivity("page_rotation_requested", {
      direction,
      fromRotation: rotation,
      toRotation: nextRotation,
    });
    if (nextRotation === rotation || rotationTransition !== "idle") return;

    const fadeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : ROTATION_FADE_DURATION_MS;
    setRotationTransition("fade-out");
    rotationTimer.current = window.setTimeout(() => {
      setRotation(nextRotation);
      setRotationTransition("fade-in");
      rotationTimer.current = window.setTimeout(() => {
        setRotationTransition("idle");
        rotationTimer.current = null;
      }, fadeDuration);
    }, fadeDuration);
  };

  const submitFromSide = (side: "top" | "right" | "bottom" | "left") => {
    setSubmitSource(`submit-${side}`);
    setSubmitRequest((request) => request + 1);
  };

  const lookupWordAtPosition = (
    word: string,
    row: number,
    column: number,
    side: LookupGridSide,
    panelPosition: { left: number; top: number; panelSize: number },
  ) => {
    const existingSideRequest = lookupRequests.find((request) => request.side === side);
    if (existingSideRequest?.word === word) return;

    if (existingSideRequest) {
      logActivity("dictionary_panel_closed", {
        query: existingSideRequest.word,
        word: existingSideRequest.word,
        inputMethod: "position_matrix",
        side: existingSideRequest.side,
        gridRow: existingSideRequest.row,
        gridColumn: existingSideRequest.column,
        requestId: existingSideRequest.requestId,
        reason: "replaced_by_lookup",
      });
    }

    lookupRequestSequence.current += 1;
    const request = {
      word,
      row,
      column,
      side,
      panelPosition,
      requestId: lookupRequestSequence.current,
    };
    setLookupRequests((current) => [
      ...current.filter((openRequest) => openRequest.side !== side),
      request,
    ]);
  };

  const closeLookupPanel = (requestId: number) => {
    setLookupRequests((current) => current.filter((request) => request.requestId !== requestId));
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    activeLookup.current?.abort();
    const controller = new AbortController();
    activeLookup.current = controller;
    setSearchedTerm(query);
    setDictionaryEntries([]);
    setLookupStatus("loading");

    try {
      const response = await fetch(
        `/api/dictionary?word=${encodeURIComponent(query.toLowerCase())}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );

      let data: unknown;
      let entries: DictionaryEntry[];
      if (response.status === 404) {
        // GitHub Pages cannot run the proxy; look up both common and capitalized forms.
        const lowercaseQuery = query.toLocaleLowerCase();
        const capitalizedQuery = lowercaseQuery.charAt(0).toLocaleUpperCase() + lowercaseQuery.slice(1);
        const titles = Array.from(
          new Set(
            [lowercaseQuery, capitalizedQuery, query].map((term) =>
              encodeURIComponent(term.replace(/\s+/g, "_")),
            ),
          ),
        );
        const entryGroups = await Promise.all(
          titles.map(async (title) => {
            const fallback = await fetch(
              `https://en.wiktionary.org/api/rest_v1/page/definition/${title}`,
              { signal: controller.signal, headers: { Accept: "application/json" } },
            );
            if (fallback.status === 404) return [];
            if (!fallback.ok) throw new Error(`Dictionary request failed: ${fallback.status}`);
            return getWiktionaryEntries(await fallback.json());
          }),
        );
        entries = mergeWiktionaryEntries(entryGroups);
        setDictionarySource("wiktionary");
      } else {
        if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);
        data = await response.json();
        entries = getMerriamWebsterEntries(data);
        setDictionarySource("merriam-webster");
      }

      entries = entries.filter((entry) =>
        entry.definitions?.some((definition) => definition.definition),
      );
      setDictionaryEntries(entries);
      const nextStatus = entries.length > 0 ? "success" : "not-found";
      setLookupStatus(nextStatus);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setLookupStatus("error");
    } finally {
      if (activeLookup.current === controller) activeLookup.current = null;
    }
  };

  useEffect(() => {
    if (lookupStatus === "idle" || lookupStatus === "loading") return;
    const panel = document.querySelector<HTMLElement>(".dictionary-results");
    if (!panel) return;
    const style = window.getComputedStyle(panel);
    if (style.display === "none" || style.visibility === "hidden" || panel.getClientRects().length === 0) return;

    logActivity("dictionary_search_result", {
      query: searchedTerm,
      source: dictionarySource,
      status: lookupStatus,
      entryCount: dictionaryEntries.length,
    });
  }, [dictionaryEntries.length, dictionarySource, lookupStatus, searchedTerm]);

  return (
    <>
      <div
        ref={appShellRef}
        className="app-shell"
        data-rotation={rotation}
        data-rotation-transition={rotationTransition}
      >
        <h1>My Connections Game</h1>
        <form className="web-search" role="search" onSubmit={handleSearch}>
          <input
            data-activity-input="dictionary-search-query"
            type="search"
            aria-label="Look up an English word in Merriam-Webster's Collegiate Dictionary"
            placeholder="Look up an English word..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button data-activity-button="dictionary-search" type="submit" disabled={!searchTerm.trim()}>
            Look Up
          </button>
        </form>
        {lookupStatus !== "idle" && (
          <section className="dictionary-results" aria-live="polite">
            <div className="dictionary-results-heading">
              <h2>{searchedTerm}</h2>
              <button
                className="dictionary-close"
                data-activity-button="dictionary-close"
                type="button"
                aria-label="Close dictionary results"
                onClick={() => {
                  logActivity("dictionary_panel_closed", { query: searchedTerm });
                  setLookupStatus("idle");
                }}
              >
                ×
              </button>
            </div>
            {lookupStatus === "loading" && <p>Looking up the word...</p>}
            {lookupStatus === "not-found" && (
              <p>No English definition found for “{searchedTerm}”.</p>
            )}
            {lookupStatus === "error" && (
              <p>Could not reach the dictionary. Check your internet connection and try again.</p>
            )}
            {lookupStatus === "success" && (
              <>
                {dictionaryEntries.map((entry, entryIndex) => (
                  <div className="dictionary-entry" key={`${entry.partOfSpeech}-${entryIndex}`}>
                    {entry.partOfSpeech && <h3>{entry.partOfSpeech}</h3>}
                    <ol>
                      {entry.definitions?.slice(0, 6).map((definition, index) => {
                        const text = definition.definition
                          ? stripMarkup(definition.definition)
                          : "";
                        if (!text) return null;

                        const example = definition.examples?.[0]
                          ? stripMarkup(definition.examples[0])
                          : "";
                        return (
                          <li key={`${entryIndex}-${index}`}>
                            {text}
                            {example && <p className="dictionary-example">Example: {example}</p>}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
                {dictionarySource === "merriam-webster" ? (
                  <div className="dictionary-source merriam-webster-source">
                    <a
                      href={`https://www.merriam-webster.com/dictionary/${encodeURIComponent(searchedTerm)}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Merriam-Webster's Collegiate Dictionary"
                    >
                      <img
                        src="https://dictionaryapi.com/images/info/branding-guidelines/MWLogo_LightBG_120x120_2x.png"
                        alt="Merriam-Webster"
                        width="50"
                        height="50"
                      />
                    </a>
                    <span>Source: Merriam-Webster&apos;s Collegiate<sup>®</sup> Dictionary</span>
                  </div>
                ) : (
                  <p className="dictionary-source">
                    Source: <a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(searchedTerm.replace(/\s+/g, "_"))}`} target="_blank" rel="noreferrer">Wiktionary</a>
                  </p>
                )}
              </>
            )}
          </section>
        )}
        <div>
          <Game
            key={gameInstance}
            gameDataSets={gameDataSets}
            submitRequest={submitRequest}
            submitSource={submitSource}
            onSubmitAvailabilityChange={setSubmitAvailable}
            rotation={rotation}
            rotationTransition={rotationTransition}
            onWordGridChange={setLookupGrid}
          />
        </div>
        <br />
        <br />
        <p className="foot-disclaimer">
          Personal local version based on the Connections-style game by{" "}
          <a href="https://github.com/wheeler">@wheeler</a>. Original game:{" "}
          <a href="https://www.nytimes.com/games/connections">
            NY Times Connections
          </a>
          .
        </p>
      </div>
      <nav ref={faceMeControlsRef} className="face-me-controls" aria-label="Rotate page toward a seat">
        <div className="face-me-pair face-me-top">
          <button
            className="face-me-button"
            data-activity-button="face-me-top"
            type="button"
            aria-label="Rotate page to face the person at the top"
            disabled={rotationTransition !== "idle"}
            onClick={() => rotatePage(180, "top")}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            data-activity-button="submit-top"
            type="button"
            disabled={!submitAvailable}
            onClick={() => submitFromSide("top")}
          >
            <span className="button-label">Submit</span>
          </button>
        </div>
        <div className="face-me-pair face-me-right">
          <button
            className="face-me-button"
            data-activity-button="face-me-right"
            type="button"
            aria-label="Rotate page to face the person on the right"
            disabled={rotationTransition !== "idle"}
            onClick={() => rotatePage(270, "right")}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            data-activity-button="submit-right"
            type="button"
            disabled={!submitAvailable}
            onClick={() => submitFromSide("right")}
          >
            <span className="button-label">Submit</span>
          </button>
          <LookupMatrix
            side="right"
            cells={lookupGrid}
            openRequests={lookupRequests}
            rotation={rotation}
            disabled={rotationTransition !== "idle"}
            onLookup={lookupWordAtPosition}
          />
        </div>
        <div className="face-me-pair face-me-bottom">
          <button
            className="face-me-button"
            data-activity-button="face-me-bottom"
            type="button"
            aria-label="Rotate page to face the person at the bottom"
            disabled={rotationTransition !== "idle"}
            onClick={() => rotatePage(0, "bottom")}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            data-activity-button="submit-bottom"
            type="button"
            disabled={!submitAvailable}
            onClick={() => submitFromSide("bottom")}
          >
            <span className="button-label">Submit</span>
          </button>
          <LookupMatrix
            side="bottom"
            cells={lookupGrid}
            openRequests={lookupRequests}
            rotation={rotation}
            disabled={rotationTransition !== "idle"}
            onLookup={lookupWordAtPosition}
          />
        </div>
        <div className="face-me-pair face-me-left">
          <button
            className="face-me-button"
            data-activity-button="face-me-left"
            type="button"
            aria-label="Rotate page to face the person on the left"
            disabled={rotationTransition !== "idle"}
            onClick={() => rotatePage(90, "left")}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            data-activity-button="submit-left"
            type="button"
            disabled={!submitAvailable}
            onClick={() => submitFromSide("left")}
          >
            <span className="button-label">Submit</span>
          </button>
          <LookupMatrix
            side="left"
            cells={lookupGrid}
            openRequests={lookupRequests}
            rotation={rotation}
            disabled={rotationTransition !== "idle"}
            onLookup={lookupWordAtPosition}
          />
        </div>
      </nav>
      {lookupRequests.map((request) => (
        <DictionaryLookupPanel
          key={request.requestId}
          request={request}
          onClose={closeLookupPanel}
        />
      ))}
      {gameStarted && !gameEnded && (
        <button
          className="game-end-button"
          data-activity-button="game-end"
          type="button"
          aria-label="Game End"
          onClick={() => {
            const gameLayout = document.querySelector<HTMLElement>(".game-layout");
            endGameActivity({
              round: Number(gameLayout?.dataset.round) || null,
              roundResult: gameLayout?.dataset.roundResult ?? null,
            });
            setShowDownloadChoices(false);
            setGameEnded(true);
          }}
        >
          ⏹
        </button>
      )}
      {!gameStarted && !gameEnded && (
        <div className="start-game-overlay" role="dialog" aria-modal="true" aria-label="Start game">
          <div className="start-game-content">
            <label className="start-game-group-size">
              Group size (optional)
              <input
                type="number"
                min="1"
                max="20"
                inputMode="numeric"
                value={groupSize}
                onChange={(event) => setGroupSize(event.target.value)}
              />
            </label>
            <button
              className="start-game-button"
              data-activity-button="start-game"
              type="button"
              autoFocus
              onClick={() => {
                const parsedGroupSize = Number.parseInt(groupSize, 10);
                startGameActivity({
                  puzzle: "Puzzle 1",
                  groupSize: Number.isFinite(parsedGroupSize) && parsedGroupSize > 0
                    ? parsedGroupSize
                    : null,
                });
                setGameStarted(true);
              }}
            >
              Start Game
            </button>
          </div>
        </div>
      )}
      {gameEnded && (
        <div className="start-game-overlay" role="dialog" aria-modal="true" aria-label="Game ended">
          <div className="start-game-content game-end-content">
            {!showDownloadChoices ? (
              <button
                className="postgame-button"
                data-activity-button="download-json-menu"
                type="button"
                onClick={() => setShowDownloadChoices(true)}
              >
                Download JSON
              </button>
            ) : (
              <div className="download-json-choices" role="group" aria-label="Choose JSON download scope">
                <button
                  className="postgame-button"
                  data-activity-button="download-this-game-json"
                  type="button"
                  onClick={() => {
                    logActivity("activity_log_download_requested", { format: "JSON", scope: "this_game" });
                    downloadCurrentGameActivityLog();
                  }}
                >
                  This Game
                </button>
                <button
                  className="postgame-button"
                  data-activity-button="download-all-activity-json"
                  type="button"
                  onClick={() => {
                    logActivity("activity_log_download_requested", { format: "JSON", scope: "all_activity" });
                    downloadActivityLog();
                  }}
                >
                  All Activity
                </button>
                <button
                  className="postgame-back-button"
                  data-activity-button="download-json-back"
                  type="button"
                  onClick={() => setShowDownloadChoices(false)}
                >
                  Back
                </button>
              </div>
            )}
            <button
              className="initialize-button"
              data-activity-button="initialize-game"
              type="button"
              onClick={() => {
                beginGameActivityLog({ reason: "initialize" });
                if (rotationTimer.current !== null) {
                  window.clearTimeout(rotationTimer.current);
                  rotationTimer.current = null;
                }
                setRotation(0);
                setRotationTransition("idle");
                setGameInstance((instance) => instance + 1);
                setShowDownloadChoices(false);
                setGameEnded(false);
                setGameStarted(false);
                setLookupStatus("idle");
                setSearchedTerm("");
                setDictionaryEntries([]);
              }}
            >
              Initialize
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
