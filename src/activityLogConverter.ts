export type ActivityLogEvent = {
  eventId?: unknown;
  sessionId?: unknown;
  gameId?: unknown;
  sequence: number;
  eventType: string;
  occurredAtUtc: string;
  elapsedMsFromGameStart: number | null;
  roundId: number | null;
  attemptId: number | null;
  details: Record<string, unknown>;
  sourceIndex: number;
};

export type SkippedEvent = { row: number; reason: string };

export type ParsedActivityLog = {
  events: ActivityLogEvent[];
  skipped: SkippedEvent[];
  totalCount: number;
};

export const getEventsForExcel = (events: ActivityLogEvent[]) =>
  events.filter((event) => event.eventType !== "button_state_changed");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNullableNonNegativeNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);

const isNullablePositiveInteger = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isSafeInteger(value) && value > 0);

export const parseActivityLog = (source: string): ParsedActivityLog => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new Error("This file is not valid JSON. Choose a game activity log JSON file.");
  }

  const rawEvents = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.events)
      ? parsed.events
      : null;
  if (!rawEvents) {
    throw new Error("The JSON must be an event list or an object containing an events list.");
  }

  const events: ActivityLogEvent[] = [];
  const skipped: SkippedEvent[] = [];

  rawEvents.forEach((rawEvent, index) => {
    const row = index + 1;
    if (!isRecord(rawEvent)) {
      skipped.push({ row, reason: "The event is not an object." });
      return;
    }

    const reasons: string[] = [];
    if (!Number.isSafeInteger(rawEvent.sequence) || Number(rawEvent.sequence) < 1) {
      reasons.push("sequence is missing or invalid");
    }
    if (typeof rawEvent.eventType !== "string" || !rawEvent.eventType.trim()) {
      reasons.push("eventType is missing");
    }
    const timestamp = typeof rawEvent.occurredAtUtc === "string"
      ? Date.parse(rawEvent.occurredAtUtc)
      : Number.NaN;
    if (!Number.isFinite(timestamp)) reasons.push("occurredAtUtc is missing or invalid");
    if (!isNullableNonNegativeNumber(rawEvent.elapsedMsFromGameStart)) {
      reasons.push("elapsedMsFromGameStart is invalid");
    }
    if (!isNullablePositiveInteger(rawEvent.roundId)) reasons.push("roundId is invalid");
    if (!isNullablePositiveInteger(rawEvent.attemptId)) reasons.push("attemptId is invalid");
    if (!isRecord(rawEvent.details)) reasons.push("details is missing or is not an object");

    if (reasons.length > 0) {
      skipped.push({ row, reason: reasons.join("; ") });
      return;
    }

    events.push({
      eventId: rawEvent.eventId,
      sessionId: rawEvent.sessionId,
      gameId: rawEvent.gameId,
      sequence: rawEvent.sequence as number,
      eventType: rawEvent.eventType as string,
      occurredAtUtc: rawEvent.occurredAtUtc as string,
      elapsedMsFromGameStart: rawEvent.elapsedMsFromGameStart as number | null,
      roundId: rawEvent.roundId as number | null,
      attemptId: rawEvent.attemptId as number | null,
      details: rawEvent.details as Record<string, unknown>,
      sourceIndex: index,
    });
  });

  events.sort((a, b) => a.sequence - b.sequence || a.sourceIndex - b.sourceIndex);
  return { events, skipped, totalCount: rawEvents.length };
};

const EVENT_LABELS: Record<string, string> = {
  page_open: "Page opened",
  game_setup_opened: "Game setup opened",
  game_start: "Game started",
  game_end: "Game ended",
  next_round_started: "Next round started",
  round_attempt_started: "Round restarted",
  round_completed: "Round completed",
  button_click: "Button clicked",
  button_state_changed: "Button state changed",
  word_tile_click: "Word tile clicked",
  word_selected: "Word selected",
  word_deselected: "Word deselected",
  group_submit_result: "Group submission result",
  hint_displayed: "Hint displayed",
  hint_window_closed: "Hint window closed",
  page_rotation_requested: "Page rotation requested",
  activity_log_download_requested: "Activity log download requested",
  dictionary_search_result: "Dictionary result displayed",
  dictionary_panel_closed: "Dictionary panel closed",
  word_hover_lookup_result: "Dictionary result displayed",
  word_hover_tooltip_closed: "Dictionary panel closed",
};

const DETAIL_LABELS: Record<string, string> = {
  page: "Page",
  title: "Title",
  reason: "Reason",
  puzzle: "Puzzle",
  groupSize: "Group size",
  round: "Round",
  roundResult: "Round result",
  fromRoundId: "From round",
  toRoundId: "To round",
  fromPuzzleIndex: "From puzzle index",
  toPuzzleIndex: "To puzzle index",
  puzzleIndex: "Puzzle index",
  totalRounds: "Total rounds",
  fromAttemptId: "From attempt",
  toAttemptId: "To attempt",
  buttonId: "Button ID",
  label: "Button",
  visible: "Visible",
  enabled: "Enabled",
  inputMethod: "Input method",
  selectedWordCount: "Selected word count",
  selectedWords: "Selected words",
  word: "Word",
  result: "Result",
  groupDescription: "Group",
  difficulty: "Difficulty",
  color: "Color",
  solvedPosition: "Solved position",
  mistakesRemaining: "Mistakes remaining",
  source: "Source",
  format: "Format",
  scope: "Scope",
  hint: "Hint",
  query: "Query",
  status: "Status",
  entryCount: "Dictionary entries",
  definitionCount: "Definitions",
  side: "Side",
  gridRow: "Grid row",
  gridColumn: "Grid column",
  requestId: "Request ID",
  finalStatus: "Final status",
  direction: "Direction",
  fromRotation: "From rotation",
  toRotation: "To rotation",
  ariaExpanded: "Expanded",
  ariaPressed: "Pressed",
  ariaLabel: "Accessible label",
  buttonType: "Button type",
  selectedWord: "Selected word",
};

const formatDetailValue = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatDetailValue).join(", ");
  if (isRecord(value)) return JSON.stringify(value);
  if (value === null) return "Not recorded";
  return String(value);
};

const humanizeKey = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");

export const describeEvent = (event: ActivityLogEvent) => {
  const label = EVENT_LABELS[event.eventType] ?? humanizeKey(event.eventType);
  const details = Object.entries(event.details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${DETAIL_LABELS[key] ?? humanizeKey(key)}: ${formatDetailValue(value)}`);
  return details.length > 0 ? `${label} — ${details.join("; ")}` : label;
};

const detailText = (event: ActivityLogEvent, key: string) => {
  const value = event.details[key];
  return value === null || value === undefined || value === "" ? "" : formatDetailValue(value);
};

const detailNumber = (event: ActivityLogEvent, key: string) => {
  const value = event.details[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const wordsText = (value: unknown) => Array.isArray(value)
  ? value.map(formatDetailValue).join(", ")
  : typeof value === "string" ? value : "";

const roundLabel = (round: number | null) => round === null ? "the current round" : `Round ${round}`;

export const explainEvent = (event: ActivityLogEvent) => {
  const details = event.details;
  const round = event.roundId ?? detailNumber(event, "round") ?? detailNumber(event, "puzzleIndex");
  const words = wordsText(details.selectedWords);

  switch (event.eventType) {
    case "page_open": {
      const title = detailText(event, "title");
      return title ? `The game page was opened (${title}).` : "The game page was opened.";
    }
    case "game_setup_opened": {
      const reason = detailText(event, "reason");
      return reason === "page_open"
        ? "The game setup screen was opened automatically when the page loaded."
        : reason ? `The game setup screen was opened (${reason}).` : "The game setup screen was opened.";
    }
    case "game_start": {
      const puzzle = detailText(event, "puzzle");
      return puzzle ? `The game started at ${puzzle}.` : `The game started${round === null ? "." : ` at ${roundLabel(round)}.`}`;
    }
    case "game_end": {
      const result = detailText(event, "roundResult").replace(/_/g, " ");
      return result === "in progress"
        ? `The game session ended while ${roundLabel(round)} was still in progress.`
        : result ? `The game session ended during ${roundLabel(round)} (status: ${result}).`
          : `The game session ended${round === null ? "." : ` during ${roundLabel(round)}.`}`;
    }
    case "next_round_started": {
      const from = detailNumber(event, "fromRoundId");
      const to = detailNumber(event, "toRoundId") ?? round;
      const total = detailNumber(event, "totalRounds");
      const transition = from !== null && to !== null
        ? `The game advanced from Round ${from} to Round ${to}`
        : `The game advanced to ${roundLabel(to)}`;
      return `${transition}${total === null ? "." : ` (${total} rounds are available).`}`;
    }
    case "round_attempt_started": {
      const from = detailNumber(event, "fromAttemptId");
      const to = detailNumber(event, "toAttemptId");
      return from !== null && to !== null
        ? `${roundLabel(round)} was restarted, beginning attempt ${to} after attempt ${from}.`
        : `${roundLabel(round)} was restarted.`;
    }
    case "round_completed": {
      const result = detailText(event, "result");
      const outcome = result === "won" ? "was won" : result === "lost" ? "was lost" : result ? `ended (${result})` : "was completed";
      const solved = detailNumber(event, "solvedGroupCount");
      const mistakes = detailNumber(event, "mistakesRemaining");
      const summary = [`${roundLabel(round)} ${outcome}`];
      if (solved !== null) summary.push(`${solved} of 4 groups were solved`);
      if (mistakes !== null) summary.push(`${mistakes} mistakes remained`);
      return `${summary.join("; ")}.`;
    }
    case "button_click": {
      const button = detailText(event, "ariaLabel") || detailText(event, "label") || detailText(event, "text") || detailText(event, "buttonId") || "button";
      const method = detailText(event, "inputMethod");
      const selected = detailNumber(event, "selectedWordCount");
      let explanation = `The “${button}” button was clicked${method ? ` using ${method}` : ""}`;
      if (selected !== null) explanation += ` with ${selected} word${selected === 1 ? "" : "s"} selected`;
      return `${explanation}.`;
    }
    case "word_tile_click": {
      const word = detailText(event, "word") || "A word";
      const selected = detailNumber(event, "selectedWordCount");
      return `${word} was clicked${selected === null ? "." : ` while ${selected} word${selected === 1 ? " was" : "s were"} already selected.`}`;
    }
    case "word_selected": {
      const word = detailText(event, "word") || "A word";
      return words ? `${word} was selected. The selected words were: ${words}.` : `${word} was selected.`;
    }
    case "word_deselected": {
      const word = detailText(event, "word") || "A word";
      return words ? `${word} was deselected. The remaining selected words were: ${words}.` : `${word} was deselected.`;
    }
    case "group_submit_result": {
      const result = detailText(event, "result");
      const group = detailText(event, "groupDescription");
      const difficulty = detailText(event, "difficulty");
      const position = detailNumber(event, "solvedPosition");
      const mistakes = detailNumber(event, "mistakesRemaining");
      let explanation = result === "correct"
        ? `The submitted words${words ? ` (${words})` : ""} formed a correct group${group ? `: ${group}` : ""}`
        : `The submitted words${words ? ` (${words})` : ""} did not match a group`;
      if (result === "incorrect" && details.oneAway === true) explanation += "; the selection was one word away from a correct group";
      if (difficulty) explanation += `; difficulty: ${difficulty}`;
      if (position !== null) explanation += `; solved as group ${position}`;
      if (mistakes !== null) explanation += `; ${mistakes} mistakes remained`;
      return `${explanation}.`;
    }
    case "hint_displayed": {
      const hints = Array.isArray(details.hints) ? details.hints : [];
      const hintText = hints.map((item) => {
        if (!isRecord(item)) return formatDetailValue(item);
        const difficulty = typeof item.difficulty === "string" ? `${item.difficulty}: ` : "";
        return `${difficulty}${formatDetailValue(item.hint)}`;
      }).filter(Boolean).join("; ");
      return hintText ? `The Hint window was displayed with these clues: ${hintText}.` : "The Hint window was displayed.";
    }
    case "hint_window_closed": {
      const reason = detailText(event, "reason");
      return `The Hint window was closed${reason ? ` (${reason.replace(/_/g, " ")})` : ""}.`;
    }
    case "page_rotation_requested": {
      const direction = detailText(event, "direction");
      const from = detailNumber(event, "fromRotation");
      const to = detailNumber(event, "toRotation");
      const change = from !== null && to !== null ? ` from ${from}° to ${to}°` : "";
      return `A page rotation${direction ? ` toward ${direction}` : ""} was requested${change}.`;
    }
    case "activity_log_download_requested": {
      const format = detailText(event, "format");
      const scope = detailText(event, "scope").replace(/_/g, " ");
      return `A${format ? ` ${format}` : "n activity log"} download was requested${scope ? ` for ${scope}` : ""}.`;
    }
    case "dictionary_search_result":
    case "word_hover_lookup_result": {
      const word = detailText(event, "word") || detailText(event, "query");
      const status = detailText(event, "status");
      const entries = detailNumber(event, "entryCount");
      const definitions = detailNumber(event, "definitionCount");
      const side = detailText(event, "side");
      const row = detailNumber(event, "gridRow");
      const column = detailNumber(event, "gridColumn");
      let explanation = word ? `Dictionary results for “${word}” were displayed` : "Dictionary results were displayed";
      if (status) explanation += ` (status: ${status})`;
      if (entries !== null) explanation += `; ${entries} entr${entries === 1 ? "y" : "ies"}`;
      if (definitions !== null) explanation += ` and ${definitions} definition${definitions === 1 ? "" : "s"}`;
      if (side) explanation += `; opened from the ${side} lookup grid`;
      if (row !== null && column !== null) explanation += ` at row ${row}, column ${column}`;
      return `${explanation}.`;
    }
    case "dictionary_panel_closed":
    case "word_hover_tooltip_closed": {
      const word = detailText(event, "word") || detailText(event, "query");
      const reason = detailText(event, "reason").replace(/_/g, " ");
      return `The dictionary window${word ? ` for “${word}”` : ""} was closed${reason ? ` (${reason})` : ""}.`;
    }
    default: {
      const detailsText = Object.entries(details)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `${DETAIL_LABELS[key] ?? humanizeKey(key)}: ${formatDetailValue(value)}`)
        .join("; ");
      const label = EVENT_LABELS[event.eventType] ?? humanizeKey(event.eventType);
      return detailsText ? `${label} was recorded. ${detailsText}.` : `${label} was recorded.`;
    }
  }
};

export const formatElapsedTime = (milliseconds: number | null) => {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return "";
  const total = Math.floor(milliseconds);
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const millis = total % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

export const formatUtcTime = (value: string) =>
  new Date(value).toISOString().replace("T", " ").replace("Z", " UTC");

const countEvents = (events: ActivityLogEvent[], eventType: string) =>
  events.filter((event) => event.eventType === eventType).length;

const uniqueIds = (events: ActivityLogEvent[], key: "sessionId" | "gameId") =>
  [...new Set(events.map((event) => event[key]).filter((value): value is string => typeof value === "string" && value.length > 0))];

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const columnName = (index: number) => {
  let current = index + 1;
  let result = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

type SheetCell = { value?: string | number | null; style?: number };

const createCellXml = (reference: string, cell: SheetCell) => {
  const style = cell.style ?? 0;
  const value = cell.value;
  if (value === undefined || value === null || value === "") return `<c r="${reference}" s="${style}"/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}" s="${style}" t="n"><v>${value}</v></c>`;
  }
  const text = xmlEscape(String(value));
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
};

type SheetRow = { cells: SheetCell[]; height?: number };

const createSheetXml = (
  rows: SheetRow[],
  widths: number[],
  options: { freezeRows?: number; autoFilter?: string; mergedRanges?: string[] } = {},
) => {
  const lastColumn = columnName(widths.length - 1);
  const lastRow = Math.max(rows.length, 1);
  const columnXml = widths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const rowXml = rows.map((row, index) => {
    const rowNumber = index + 1;
    const cells = row.cells.map((cell, cellIndex) => createCellXml(`${columnName(cellIndex)}${rowNumber}`, cell)).join("");
    const height = row.height ? ` ht="${row.height}" customHeight="1"` : "";
    return `<row r="${rowNumber}"${height}>${cells}</row>`;
  }).join("");
  const freeze = options.freezeRows
    ? `<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="${options.freezeRows}" topLeftCell="A${options.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${options.freezeRows + 1}" sqref="A${options.freezeRows + 1}"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>`;
  const autoFilter = options.autoFilter ? `<autoFilter ref="${options.autoFilter}"/>` : "";
  const mergedRanges = options.mergedRanges?.length
    ? `<mergeCells count="${options.mergedRanges.length}">${options.mergedRanges.map((range) => `<mergeCell ref="${range}"/>`).join("")}</mergeCells>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastColumn}${lastRow}"/>${freeze}<sheetFormatPr defaultRowHeight="18"/>` +
    `<cols>${columnXml}</cols><sheetData>${rowXml}</sheetData>${autoFilter}${mergedRanges}` +
    `<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>` +
    `</worksheet>`;
};

const makeRow = (...cells: Array<string | number | null | SheetCell>): SheetRow => ({
  cells: cells.map((cell) => isRecord(cell) && "value" in cell
    ? cell as SheetCell
    : { value: cell as string | number | null }),
});

const styled = (value: string | number | null, style: number): SheetCell => ({ value, style });

const boolMetric = (events: ActivityLogEvent[], eventType: string) => countEvents(events, eventType);

const resultSummary = (events: ActivityLogEvent[]) => {
  const rounds = new Map<string, { round: number | null; result: string; event: ActivityLogEvent }>();
  events.forEach((event) => {
    if (event.eventType === "round_completed") {
      const key = `${String(event.sessionId)}|${String(event.gameId)}|${String(event.roundId)}`;
      rounds.set(key, {
        round: event.roundId,
        result: String(event.details.result ?? "Completed"),
        event,
      });
    } else if (event.eventType === "game_end") {
      const round = event.roundId ?? (typeof event.details.round === "number" ? event.details.round : null);
      const key = `${String(event.sessionId)}|${String(event.gameId)}|${String(round)}`;
      if (!rounds.has(key) && event.details.roundResult !== undefined) {
        rounds.set(key, { round, result: String(event.details.roundResult), event });
      }
    }
  });
  return [...rounds.values()].sort((a, b) => (a.round ?? Number.MAX_SAFE_INTEGER) - (b.round ?? Number.MAX_SAFE_INTEGER));
};

const createActivityRows = (
  events: ActivityLogEvent[],
  filename: string,
  skippedCount: number,
) => {
  const sessions = uniqueIds(events, "sessionId");
  const games = uniqueIds(events, "gameId");
  const showSessionIds = sessions.length > 1;
  const showGameIds = games.length > 1;
  const headers: Array<string | number | null> = ["Sequence", "World Time (UTC)", "Game Elapsed Time"];
  if (showSessionIds) headers.push("session_id");
  if (showGameIds) headers.push("game_id");
  headers.push("round_id", "attempt_id", "Event Details", "Event Explanation");
  const note = `${filename} · One row per recorded event · ${events.length} valid records exported; ${skippedCount} skipped · Elapsed time: HH:MM:SS.mmm`;

  const rows: SheetRow[] = [
    makeRow(styled("Connections Game — Activity Log", 1)),
    makeRow(styled(note, 2)),
    makeRow(),
    makeRow(...headers.map((header) => styled(header, 3))),
  ];

  for (const event of events) {
    const cells: Array<string | number | null | SheetCell> = [
      styled(event.sequence, 5),
      styled(formatUtcTime(event.occurredAtUtc), 4),
      styled(formatElapsedTime(event.elapsedMsFromGameStart), 5),
    ];
    if (showSessionIds) cells.push(styled(typeof event.sessionId === "string" ? event.sessionId : "", 4));
    if (showGameIds) cells.push(styled(typeof event.gameId === "string" ? event.gameId : "", 4));
    cells.push(
      styled(event.roundId, 5),
      styled(event.attemptId, 5),
      styled(describeEvent(event), 4),
      styled(explainEvent(event), 4),
    );
    const detailLength = describeEvent(event).length;
    const explanationLength = explainEvent(event).length;
    const wrappedLines = Math.max(Math.ceil(detailLength / 85), Math.ceil(explanationLength / 76), 1);
    rows.push({ cells: cells.map((cell) => isRecord(cell) && "value" in cell ? cell as SheetCell : { value: cell as string | number | null }), height: Math.min(108, Math.max(28, 18 * wrappedLines)) });
  }

  const widths = [10, 31, 22];
  if (showSessionIds) widths.push(38);
  if (showGameIds) widths.push(38);
  widths.push(12, 13, 82, 76);
  const lastColumn = columnName(widths.length - 1);
  return {
    rows,
    widths,
    lastColumn,
    merges: [`A1:${lastColumn}1`, `A2:${lastColumn}2`],
  };
};

const createMetricsRows = (events: ActivityLogEvent[], skippedCount: number, filename: string) => {
  const eventCounts = new Map<string, number>();
  events.forEach((event) => eventCounts.set(event.eventType, (eventCounts.get(event.eventType) ?? 0) + 1));
  const sortedEventCounts = [...eventCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const sessions = uniqueIds(events, "sessionId");
  const games = uniqueIds(events, "gameId");
  const groupSizes = [...new Set(events
    .filter((event) => event.eventType === "game_start")
    .map((event) => event.details.groupSize)
    .filter((value): value is string | number => (typeof value === "string" || typeof value === "number") && value !== ""))];
  const groupSizeText = groupSizes.length === 0 ? "Not recorded" : groupSizes.join(", ");
  const correct = events.filter((event) => event.eventType === "group_submit_result" && event.details.result === "correct").length;
  const incorrect = events.filter((event) => event.eventType === "group_submit_result" && event.details.result === "incorrect").length;
  const otherSubmissions = countEvents(events, "group_submit_result") - correct - incorrect;
  const outcomes = resultSummary(events);
  const outcomeText = outcomes.length
    ? outcomes.map(({ round, result }) => `Round ${round ?? "unknown"}: ${result}`).join("; ")
    : "No round outcome recorded";
  const lookupResults = countEvents(events, "dictionary_search_result") + countEvents(events, "word_hover_lookup_result");
  const lookupCloses = countEvents(events, "dictionary_panel_closed") + countEvents(events, "word_hover_tooltip_closed");
  const hintShows = countEvents(events, "hint_displayed");
  const hintCloses = countEvents(events, "hint_window_closed");
  const submissionsText = `${countEvents(events, "group_submit_result")} total (${correct} correct, ${incorrect} incorrect${otherSubmissions ? `, ${otherSubmissions} other` : ""})`;

  const metrics: Array<[string, string | number, string]> = [
    ["Anonymous sessions", sessions.length || "Not recorded", "Count of distinct session_id values present in the JSON."],
    ["Game instances", games.length || "Not recorded", "Count of distinct game_id values present in the JSON."],
    ["Group size", groupSizeText, "Read from game_start. “Not recorded” means the source JSON did not contain a value."],
    ["Valid events exported", events.length, "One row per valid event in the Activity Log sheet."],
    ["Rows skipped", skippedCount, "Rows missing required event fields are excluded and listed on the import page."],
    ["Button clicks", boolMetric(events, "button_click"), "Recorded button_click events; word-tile clicks are counted separately."],
    ["Word-tile clicks", boolMetric(events, "word_tile_click"), "Recorded clicks on the 4×4 word grid."],
    ["Words selected / deselected", `${countEvents(events, "word_selected")} / ${countEvents(events, "word_deselected")}`, "Counts selection and deselection events separately."],
    ["Group submissions", submissionsText, "Based on group_submit_result records; no result is inferred from selected words."],
    ["Rounds completed", countEvents(events, "round_completed"), "Count of explicit round_completed events."],
    ["Restart actions", countEvents(events, "round_attempt_started"), "Count of explicit round_attempt_started events."],
    ["Next-round starts", countEvents(events, "next_round_started"), "Count of explicit next_round_started events."],
    ["Hints shown / closed", `${hintShows} / ${hintCloses}`, "Counts hint_displayed and hint_window_closed events."],
    ["Dictionary results / panels closed", `${lookupResults} / ${lookupCloses}`, "Counts displayed lookup results and dictionary panel close events."],
    ["Page rotation requests", countEvents(events, "page_rotation_requested"), "Count of recorded rotation requests."],
    ["Activity-log download requests", countEvents(events, "activity_log_download_requested"), "Count of requests recorded in the source JSON."],
    ["Round outcomes", outcomeText, "Uses explicit round_completed and game_end records only."],
  ];

  const rows: SheetRow[] = [
    makeRow(styled("Connections Game — Field Guide & Metrics", 1)),
    makeRow(styled(`${filename} · Values are calculated from valid source events; missing source values are not guessed.`, 2)),
    makeRow(),
    makeRow(styled("Metric", 3), styled("Value", 3), styled("Description", 3), null, styled("Event Type", 3), styled("Count", 3)),
  ];
  metrics.forEach(([metric, value, description], index) => {
    rows.push(makeRow(styled(metric, 6), styled(value, 5), styled(description, 4), null,
      sortedEventCounts[index] ? styled(sortedEventCounts[index][0], 4) : null,
      sortedEventCounts[index] ? styled(sortedEventCounts[index][1], 5) : null));
  });
  sortedEventCounts.slice(metrics.length).forEach(([eventType, count]) => {
    rows.push(makeRow(null, null, null, null, styled(eventType, 4), styled(count, 5)));
  });

  const roundSectionStart = Math.max(22, rows.length + 2);
  rows[roundSectionStart - 1] = makeRow(styled("Round Outcomes", 7));
  rows[roundSectionStart] = makeRow(styled("Round ID", 3), styled("Result", 3), styled("Completed / ended at (UTC)", 3), styled("Game elapsed time", 3));
  outcomes.forEach(({ round, result, event }, index) => {
    rows[roundSectionStart + index + 1] = makeRow(
      styled(round, 5), styled(result, 4), styled(formatUtcTime(event.occurredAtUtc), 4), styled(formatElapsedTime(event.elapsedMsFromGameStart), 5),
    );
  });
  if (outcomes.length === 0) {
    rows[roundSectionStart + 1] = makeRow(styled("No round outcome was recorded in this file.", 4));
  }

  const definitionsStart = roundSectionStart + Math.max(outcomes.length, 1) + 4;
  rows[definitionsStart - 1] = makeRow(styled("Field Definitions", 7));
  rows[definitionsStart] = makeRow(styled("Field", 3), styled("Meaning", 3), styled("Example / display", 3));
  const definitions = [
    ["Sequence", "Event order recorded by the game. In files with multiple sessions, session_id is included to distinguish repeated sequence numbers.", "52"],
    ["World Time (UTC)", "Real-world timestamp from occurredAtUtc, displayed in UTC.", "2026-11-02 17:38:12.950 UTC"],
    ["Game Elapsed Time", "Milliseconds since game_start; blank when the game timer had not started.", "00:07:09.266"],
    ["round_id", "Puzzle round number. It changes when a next round starts; it may be blank outside an active round.", "1"],
    ["attempt_id", "Attempt number within a round. It increases after Restart and resets on the next round.", "Round 1, attempt 2"],
    ["Event Details", "Readable English labels with values taken from the source event details. No action or word is inferred.", "Word tile clicked — Word: OLIVE"],
    ["Event Explanation", "A plain-English description based only on fields recorded in this event; it does not infer unrecorded actions or intent.", "OLIVE was clicked while 0 words were already selected."],
  ];
  definitions.forEach((definition, index) => {
    rows[definitionsStart + index + 1] = makeRow(...definition.map((value) => styled(value, 4)));
  });

  const mergedRanges = [`A1:F1`, `A2:F2`, `A${roundSectionStart}:D${roundSectionStart}`, `A${definitionsStart}:C${definitionsStart}`];
  return { rows, mergedRanges };
};

const FONT = (size: number, color: string, bold = false, italic = false) =>
  `<font><sz val="${size}"/><color rgb="${color}"/><name val="Calibri"/><family val="2"/>${bold ? "<b/>" : ""}${italic ? "<i/>" : ""}</font>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="4">${FONT(11, "FF263746")}${FONT(16, "FFFFFFFF", true)}${FONT(10, "FF526273", false, true)}${FONT(11, "FFFFFFFF", true)}</fonts>` +
  `<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF355C78"/><bgColor indexed="64"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFEAF1F5"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="2"><border/><border><left/><right/><top/><bottom style="thin"><color rgb="FFD7E0E8"/></bottom><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="8">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"><alignment vertical="top" wrapText="1"/></xf>` +
  `<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf>` +
  `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const concatBytes = (chunks: Uint8Array[]) => {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

const zipStoredFiles = (files: Array<{ name: string; content: string }>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const crc = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x0021, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, contentBytes.length, true);
    local.setUint32(22, contentBytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 0x0021, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, contentBytes.length, true);
    central.setUint32(24, contentBytes.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, localOffset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);
  return concatBytes([...localParts, centralDirectory, end]);
};

const createWorkbookStyles = () => stylesXml;

export const createActivityWorkbook = (
  events: ActivityLogEvent[],
  filename: string,
  skippedCount: number,
) => {
  const exportEvents = getEventsForExcel(events);
  const activity = createActivityRows(exportEvents, filename, skippedCount);
  const metrics = createMetricsRows(exportEvents, skippedCount, filename);
  const eventSheet = createSheetXml(activity.rows, activity.widths, {
    freezeRows: 4,
    autoFilter: `A4:${activity.lastColumn}${activity.rows.length}`,
    mergedRanges: activity.merges,
  });
  const metricsSheet = createSheetXml(metrics.rows, [32, 34, 74, 20, 40, 12], {
    freezeRows: 4,
    mergedRanges: metrics.mergedRanges,
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;
  const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<bookViews><workbookView activeTab="0"/></bookViews><sheets>` +
    `<sheet name="Activity Log" sheetId="1" r:id="rId1"/><sheet name="Field Guide &amp; Metrics" sheetId="2" r:id="rId2"/>` +
    `</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const bytes = zipStoredFiles([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: packageRels },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: createWorkbookStyles() },
    { name: "xl/worksheets/sheet1.xml", content: eventSheet },
    { name: "xl/worksheets/sheet2.xml", content: metricsSheet },
  ]);
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

export const createExcelFilename = (jsonFilename: string) => {
  const base = jsonFilename.replace(/\.json$/i, "") || "connections-activity-log";
  const safeBase = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "connections-activity-log";
  return `${safeBase}.xlsx`;
};
