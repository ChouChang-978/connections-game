import { useEffect, useRef, useState, type FormEvent } from "react";
import "./App.css";
import Game from "./Game.tsx";
import { gameDataSets } from "./gameData.ts";

type DictionaryDefinition = {
  definition?: string;
  examples?: string[];
};

type DictionaryEntry = {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
};

type LookupStatus = "idle" | "loading" | "success" | "not-found" | "error";

const stripMarkup = (value: string) =>
  new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ?? "";

const getEnglishEntries = (data: unknown): DictionaryEntry[] => {
  if (Array.isArray(data)) return data as DictionaryEntry[];
  if (!data || typeof data !== "object") return [];

  const response = data as Record<string, unknown>;
  const entries = response.en ?? response.English;
  return Array.isArray(entries) ? (entries as DictionaryEntry[]) : [];
};

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const activeLookup = useRef<AbortController | null>(null);
  const [rotation, setRotation] = useState(0);
  const [submitRequest, setSubmitRequest] = useState(0);
  const [submitAvailable, setSubmitAvailable] = useState(false);

  useEffect(() => () => activeLookup.current?.abort(), []);

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
      const title = encodeURIComponent(query.replace(/\s+/g, "_"));
      const response = await fetch(
        `https://en.wiktionary.org/api/rest_v1/page/definition/${title}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );

      if (response.status === 404) {
        setLookupStatus("not-found");
        return;
      }
      if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);

      const data: unknown = await response.json();
      const entries = getEnglishEntries(data).filter((entry) =>
        entry.definitions?.some((definition) => definition.definition),
      );
      setDictionaryEntries(entries);
      setLookupStatus(entries.length > 0 ? "success" : "not-found");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setLookupStatus("error");
    } finally {
      if (activeLookup.current === controller) activeLookup.current = null;
    }
  };

  return (
    <>
      <div className="app-shell" data-rotation={rotation}>
        <h1>My Connections Game</h1>
        <form className="web-search" role="search" onSubmit={handleSearch}>
          <input
            type="search"
            aria-label="Look up an English word in Wiktionary"
            placeholder="Look up an English word..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button type="submit" disabled={!searchTerm.trim()}>
            Look Up
          </button>
        </form>
        {lookupStatus !== "idle" && (
          <section className="dictionary-results" aria-live="polite">
            <div className="dictionary-results-heading">
              <h2>{searchedTerm}</h2>
              <button
                className="dictionary-close"
                type="button"
                aria-label="Close dictionary results"
                onClick={() => setLookupStatus("idle")}
              >
                ×
              </button>
            </div>
            {lookupStatus === "loading" && <p>Looking up the word...</p>}
            {lookupStatus === "not-found" && (
              <p>No English definition found for “{searchedTerm}”.</p>
            )}
            {lookupStatus === "error" && (
              <p>Could not reach Wiktionary. Check your internet connection and try again.</p>
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
                <p className="dictionary-source">
                  Source: <a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(searchedTerm.replace(/\s+/g, "_"))}`} target="_blank" rel="noreferrer">Wiktionary</a>
                </p>
              </>
            )}
          </section>
        )}
        <div>
          <Game
            gameDataSets={gameDataSets}
            submitRequest={submitRequest}
            onSubmitAvailabilityChange={setSubmitAvailable}
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
      <nav className="face-me-controls" aria-label="Rotate page toward a seat">
        <div className="face-me-pair face-me-top">
          <button
            className="face-me-button"
            type="button"
            aria-label="Rotate page to face the person at the top"
            onClick={() => setRotation(180)}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            type="button"
            disabled={!submitAvailable}
            onClick={() => setSubmitRequest((request) => request + 1)}
          >
            <span className="button-label">Submit</span>
          </button>
        </div>
        <div className="face-me-pair face-me-right">
          <button
            className="face-me-button"
            type="button"
            aria-label="Rotate page to face the person on the right"
            onClick={() => setRotation(270)}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            type="button"
            disabled={!submitAvailable}
            onClick={() => setSubmitRequest((request) => request + 1)}
          >
            <span className="button-label">Submit</span>
          </button>
        </div>
        <div className="face-me-pair face-me-bottom">
          <button
            className="face-me-button"
            type="button"
            aria-label="Rotate page to face the person at the bottom"
            onClick={() => setRotation(0)}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            type="button"
            disabled={!submitAvailable}
            onClick={() => setSubmitRequest((request) => request + 1)}
          >
            <span className="button-label">Submit</span>
          </button>
        </div>
        <div className="face-me-pair face-me-left">
          <button
            className="face-me-button"
            type="button"
            aria-label="Rotate page to face the person on the left"
            onClick={() => setRotation(90)}
          >
            <span className="button-label">Face Me</span>
          </button>
          <button
            className="submit-button"
            type="button"
            disabled={!submitAvailable}
            onClick={() => setSubmitRequest((request) => request + 1)}
          >
            <span className="button-label">Submit</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default App;
