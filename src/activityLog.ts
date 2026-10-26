export type ActivityEvent = {
  eventId: string;
  sessionId: string;
  gameId?: string | null;
  sequence: number;
  eventType: string;
  occurredAtUtc: string;
  elapsedMsFromGameStart: number | null;
  roundId: number | null;
  attemptId: number | null;
  details: Record<string, unknown>;
};

const STORAGE_PREFIX = "connections-game-activity-";
const EXPORTED_EVENT_TYPES = new Set([
  "page_open",
  "game_setup_opened",
  "game_start",
  "game_end",
  "next_round_started",
  "round_attempt_started",
  "round_completed",
  "button_click",
  "button_state_changed",
  "word_tile_click",
  "word_selected",
  "word_deselected",
  "group_submit_result",
  "hint_displayed",
  "hint_window_closed",
  "page_rotation_requested",
  "activity_log_download_requested",
  "dictionary_search_result",
  "dictionary_panel_closed",
]);

let sessionId = "";
let currentGameId: string | null = null;
let gameLogActive = false;
let sequence = 0;
let gameStartPerformanceTime: number | null = null;
let currentRoundId: number | null = null;
let currentAttemptId: number | null = null;
let fallbackEvents: ActivityEvent[] = [];
let initialized = false;
let buttonStateBaselineCaptured = false;
let inputMethod: { value: string; time: number } | null = null;
let buttonStateFrame = 0;

const buttonSnapshots = new Map<string, {
  state: string;
  details: Record<string, unknown>;
}>();

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getSessionStorageKey = () => `${STORAGE_PREFIX}${sessionId}`;

const readCurrentSessionEvents = (): ActivityEvent[] => {
  try {
    const stored = localStorage.getItem(getSessionStorageKey());
    return stored ? (JSON.parse(stored) as ActivityEvent[]) : [];
  } catch {
    return [...fallbackEvents];
  }
};

const saveEvent = (event: ActivityEvent) => {
  try {
    const events = readCurrentSessionEvents();
    events.push(event);
    localStorage.setItem(getSessionStorageKey(), JSON.stringify(events));
  } catch {
    // Keep the current session in memory if browser storage is unavailable.
  }
  fallbackEvents.push(event);
};

const getElapsedMs = () =>
  gameStartPerformanceTime === null
    ? null
    : Math.max(0, Math.round(performance.now() - gameStartPerformanceTime));

const appendEvent = (
  eventType: string,
  details: Record<string, unknown> = {},
  elapsedOverride?: number | null,
) => {
  if (!sessionId || !EXPORTED_EVENT_TYPES.has(eventType)) return;
  sequence += 1;
  const event: ActivityEvent = {
    eventId: createId(),
    sessionId,
    gameId: gameLogActive ? currentGameId : null,
    sequence,
    eventType,
    occurredAtUtc: new Date().toISOString(),
    elapsedMsFromGameStart: elapsedOverride === undefined ? getElapsedMs() : elapsedOverride,
    roundId: currentRoundId,
    attemptId: currentAttemptId,
    details,
  };
  saveEvent(event);
};

export const logActivity = (
  eventType: string,
  details: Record<string, unknown> = {},
) => appendEvent(eventType, details);

export const startGameActivity = (details: Record<string, unknown> = {}) => {
  if (gameStartPerformanceTime !== null) return;
  gameStartPerformanceTime = performance.now();
  currentRoundId = 1;
  currentAttemptId = 1;
  appendEvent("game_start", details, 0);
};

export const beginGameActivityLog = (details: Record<string, unknown> = {}) => {
  currentGameId = createId();
  gameLogActive = true;
  gameStartPerformanceTime = null;
  currentRoundId = null;
  currentAttemptId = null;
  appendEvent("game_setup_opened", details, null);
};

export const endGameActivity = (details: Record<string, unknown> = {}) => {
  if (!gameLogActive) return;
  appendEvent("game_end", details);
  gameLogActive = false;
  gameStartPerformanceTime = null;
  currentRoundId = null;
  currentAttemptId = null;
};

export const restartRoundActivity = () => {
  if (gameStartPerformanceTime === null || currentRoundId === null) return;
  const previousAttemptId = currentAttemptId ?? 1;
  currentAttemptId = previousAttemptId + 1;
  appendEvent("round_attempt_started", {
    reason: "restart",
    fromAttemptId: previousAttemptId,
    toAttemptId: currentAttemptId,
  });
};

export const startNextRoundActivity = (details: Record<string, unknown> = {}) => {
  const previousRoundId = currentRoundId ?? 0;
  currentRoundId = previousRoundId + 1;
  currentAttemptId = 1;
  appendEvent("next_round_started", {
    fromRoundId: previousRoundId,
    toRoundId: currentRoundId,
    ...details,
  });
};

const getButtonId = (button: HTMLButtonElement, index: number) =>
  button.dataset.activityButton ||
  button.id ||
  button.getAttribute("aria-label") ||
  `${(button.innerText || button.textContent || "button").trim()}-${index}`;

const getButtonSnapshot = (button: HTMLButtonElement, index: number) => {
  const style = window.getComputedStyle(button);
  const text = (button.innerText || button.textContent || "").trim().replace(/\s+/g, " ");
  const blockedByInert = Boolean(button.closest("[inert]"));
  const details = {
    buttonId: getButtonId(button, index),
    label: text || button.getAttribute("aria-label") || "",
    ariaLabel: button.getAttribute("aria-label"),
    text,
    visible:
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      button.getClientRects().length > 0,
    enabled:
      !button.disabled &&
      button.getAttribute("aria-disabled") !== "true" &&
      !blockedByInert,
    ariaExpanded: button.getAttribute("aria-expanded"),
    ariaPressed: button.getAttribute("aria-pressed"),
  };
  return { state: JSON.stringify(details), details };
};

const getButtonFromTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;
  return target.closest("button");
};

const getSelectedWordCount = (button: HTMLButtonElement) => {
  const gameLayout = button.closest(".game-layout") ?? document.querySelector<HTMLElement>(".game-layout");
  const rawCount = gameLayout?.getAttribute("data-selected-count");
  const selectedWordCount = rawCount === null || rawCount === undefined ? null : Number(rawCount);
  return Number.isFinite(selectedWordCount) ? selectedWordCount : null;
};

const getInputMethod = (event: MouseEvent) => {
  if (inputMethod && event.timeStamp - inputMethod.time < 1500) return inputMethod.value;
  return event.detail === 0 ? "keyboard or assistive technology" : "unknown";
};

const getButtonDetails = (button: HTMLButtonElement, event: MouseEvent) => {
  const { details } = getButtonSnapshot(button, 0);
  return {
    ...details,
    buttonType: button.type || "submit",
    inputMethod: getInputMethod(event),
    selectedWordCount: getSelectedWordCount(button),
  };
};

const scanButtonStates = () => {
  if (typeof document === "undefined") return;
  const currentButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  if (!buttonStateBaselineCaptured && currentButtons.length === 0) return;
  const captureBaseline = !buttonStateBaselineCaptured;
  const seen = new Set<string>();

  currentButtons.forEach((button, index) => {
    const snapshot = getButtonSnapshot(button, index);
    let buttonId = String(snapshot.details.buttonId);
    if (seen.has(buttonId)) buttonId = `${buttonId}-${index}`;
    seen.add(buttonId);

    const isFaceMeButton = buttonId.startsWith("face-me-");
    const rotationTransition = document.querySelector<HTMLElement>(".app-shell")?.dataset.rotationTransition;
    if (isFaceMeButton && rotationTransition && rotationTransition !== "idle") return;

    const previous = buttonSnapshots.get(buttonId);
    if (!captureBaseline && !previous && snapshot.details.visible) {
      appendEvent("button_state_changed", {
        ...snapshot.details,
        selectedWordCount: getSelectedWordCount(button),
      });
    } else if (previous && previous.state !== snapshot.state) {
      appendEvent("button_state_changed", {
        ...snapshot.details,
        selectedWordCount: getSelectedWordCount(button),
      });
    }
    buttonSnapshots.set(buttonId, {
      state: snapshot.state,
      details: snapshot.details,
    });
  });

  if (captureBaseline) buttonStateBaselineCaptured = true;

  for (const [buttonId, previous] of buttonSnapshots) {
    if (seen.has(buttonId)) continue;
    if (previous.details.visible && !buttonId.startsWith("face-me-")) {
      appendEvent("button_state_changed", {
        ...previous.details,
        visible: false,
        enabled: false,
      });
    }
    buttonSnapshots.delete(buttonId);
  }
};

const scheduleButtonStateScan = () => {
  if (buttonStateFrame || typeof requestAnimationFrame !== "function") return;
  buttonStateFrame = requestAnimationFrame(() => {
    buttonStateFrame = 0;
    scanButtonStates();
  });
};

export const initializeActivityLogging = () => {
  if (initialized || typeof document === "undefined") return;
  initialized = true;
  sessionId = createId();
  sequence = 0;
  currentGameId = createId();
  gameLogActive = true;

  appendEvent("page_open", {
    page: window.location.pathname,
    title: document.title,
  }, null);
  appendEvent("game_setup_opened", { reason: "page_open" }, null);

  document.addEventListener("pointerdown", (event) => {
    inputMethod = { value: event.pointerType || "pointer", time: event.timeStamp };
  }, true);
  document.addEventListener("touchstart", (event) => {
    inputMethod = { value: "touch", time: event.timeStamp };
  }, { capture: true, passive: true });
  document.addEventListener("mousedown", (event) => {
    inputMethod = { value: "mouse", time: event.timeStamp };
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      inputMethod = { value: "keyboard", time: event.timeStamp };
    }
  }, true);

  document.addEventListener("click", (event) => {
    const button = getButtonFromTarget(event.target);
    if (!button) return;

    if (button.dataset.activityButton === "start-game") {
      currentRoundId = 1;
      currentAttemptId = 1;
    }
    const word = button.dataset.activityWord;
    if (word) {
      appendEvent("word_tile_click", { word, ...getButtonDetails(button, event) });
    } else {
      appendEvent("button_click", getButtonDetails(button, event));
    }
  }, true);

  if (typeof MutationObserver !== "undefined" && document.body) {
    const observer = new MutationObserver(scheduleButtonStateScan);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-disabled", "aria-expanded", "aria-hidden", "aria-pressed", "class", "disabled", "hidden", "inert", "style"],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
  window.addEventListener("resize", scheduleButtonStateScan);
  window.addEventListener("orientationchange", scheduleButtonStateScan);
};

export const getActivityLogEvents = (): ActivityEvent[] => {
  const events: ActivityEvent[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      try {
        const stored = localStorage.getItem(key);
        if (stored) events.push(...(JSON.parse(stored) as ActivityEvent[]));
      } catch {
        // Ignore a damaged stored session and keep the other available sessions.
      }
    }
  } catch {
    events.push(...fallbackEvents);
  }

  events.push(...fallbackEvents, ...readCurrentSessionEvents());
  const uniqueEvents = Array.from(
    new Map(
      events
        .filter((event) => event && EXPORTED_EVENT_TYPES.has(event.eventType))
        .map((event) => [event.eventId, event]),
    ).values(),
  );
  return uniqueEvents.sort((left, right) =>
    left.occurredAtUtc.localeCompare(right.occurredAtUtc) ||
    left.sessionId.localeCompare(right.sessionId) ||
    left.sequence - right.sequence,
  );
};

export const downloadActivityLog = () => {
  downloadEvents(getActivityLogEvents(), "all-activity");
};

export const getCurrentGameActivityLogEvents = (): ActivityEvent[] => {
  if (!currentGameId) return [];
  return getActivityLogEvents().filter((event) => event.gameId === currentGameId);
};

export const downloadCurrentGameActivityLog = () => {
  downloadEvents(getCurrentGameActivityLogEvents(), "this-game");
};

const downloadEvents = (events: ActivityEvent[], scope: string) => {
  const file = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `connections-activity-log-${scope}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
