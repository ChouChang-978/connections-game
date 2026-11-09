import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  ActivityLogEvent,
  createActivityWorkbook,
  createExcelFilename,
  describeEvent,
  explainEvent,
  formatElapsedTime,
  formatUtcTime,
  getEventsForExcel,
  parseActivityLog,
  ParsedActivityLog,
} from "./activityLogConverter.ts";
import "./activityLogConverter.css";

const PREVIEW_LIMIT = 10;

const downloadWorkbook = (parsed: ParsedActivityLog, filename: string) => {
  const blob = createActivityWorkbook(parsed.events, filename, parsed.skipped.length);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = createExcelFilename(filename);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ActivityRow = ({ event }: { event: ActivityLogEvent }) => (
  <tr>
    <td>{event.sequence}</td>
    <td>{formatUtcTime(event.occurredAtUtc)}</td>
    <td>{formatElapsedTime(event.elapsedMsFromGameStart) || "—"}</td>
    <td>{event.roundId ?? "—"}</td>
    <td>{event.attemptId ?? "—"}</td>
    <td>{describeEvent(event)}</td>
    <td>{explainEvent(event)}</td>
  </tr>
);

export default function ActivityLogConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<ParsedActivityLog | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const exportEvents = parsed ? getEventsForExcel(parsed.events) : [];
  const omittedStateCount = parsed ? parsed.events.length - exportEvents.length : 0;

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setParsed(null);
    setFilename(file.name);
    try {
      const result = parseActivityLog(await file.text());
      if (getEventsForExcel(result.events).length === 0) {
        setError("No exportable activity events were found. Button state changes are omitted from Excel.");
        return;
      }
      setParsed(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this JSON file.");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFile(event.currentTarget.files?.[0]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  };

  const reset = () => {
    setFilename("");
    setParsed(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="converter-page">
      <header className="converter-heading">
        <a className="converter-back" href="./">← Back to the game</a>
        <p className="converter-eyebrow">LOCAL FILE TOOL</p>
        <h1>Turn an activity log into Excel</h1>
        <p className="converter-intro">
          Choose a Connections Game JSON log to preview its recorded events and download a readable Excel workbook.
        </p>
      </header>

      <section
        className={`converter-upload${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={onDrop}
        aria-label="Choose a JSON activity log"
      >
        <div className="converter-file-icon" aria-hidden="true">JSON</div>
        <h2>{filename || "Choose your JSON file"}</h2>
        <p>Drag a file here, or select it from your computer.</p>
        <input
          ref={inputRef}
          className="converter-file-input"
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          aria-label="Select activity log JSON file"
        />
        <button className="converter-button converter-button-secondary" onClick={() => inputRef.current?.click()}>
          Choose JSON file
        </button>
        <p className="converter-privacy">The file is read in this browser and is not uploaded.</p>
      </section>

      {error && <div className="converter-error" role="alert">{error}</div>}

      {parsed && (
        <section className="converter-results" aria-live="polite">
          <div className="converter-summary">
            <div>
              <p className="converter-eyebrow">FILE READY</p>
              <h2>{filename}</h2>
              <p>
                {exportEvents.length} event{exportEvents.length === 1 ? "" : "s"} included in Excel
                {omittedStateCount > 0 && ` · ${omittedStateCount} button state changes omitted`}
                {parsed.skipped.length > 0 && ` · ${parsed.skipped.length} skipped`}
              </p>
            </div>
            <div className="converter-actions">
              <button className="converter-button converter-button-primary" onClick={() => downloadWorkbook(parsed, filename)}>
                Download Excel
              </button>
              <button className="converter-reset" onClick={reset}>Choose another file</button>
            </div>
          </div>

          {parsed.skipped.length > 0 && (
            <details className="converter-skipped">
              <summary>{parsed.skipped.length} invalid row{parsed.skipped.length === 1 ? " was" : "s were"} left out</summary>
              <ul>
                {parsed.skipped.map((item) => <li key={`${item.row}-${item.reason}`}>Event {item.row}: {item.reason}</li>)}
              </ul>
            </details>
          )}

          <div className="converter-preview-heading">
            <h2>Preview</h2>
            <span>First {Math.min(PREVIEW_LIMIT, exportEvents.length)} of {exportEvents.length} events</span>
          </div>
          <div className="converter-table-wrap">
            <table className="converter-table">
              <thead>
                <tr>
                  <th>Sequence</th>
                  <th>World Time (UTC)</th>
                  <th>Game Elapsed Time</th>
                  <th>round_id</th>
                  <th>attempt_id</th>
                  <th>Event Details</th>
                  <th>Event Explanation</th>
                </tr>
              </thead>
              <tbody>
                {exportEvents.slice(0, PREVIEW_LIMIT).map((event) => <ActivityRow key={`${event.sequence}-${event.sourceIndex}`} event={event} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
