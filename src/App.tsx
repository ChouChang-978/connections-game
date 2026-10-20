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

type DictionarySource = "merriam-webster" | "wiktionary";

type LookupStatus = "idle" | "loading" | "success" | "not-found" | "error";

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

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [dictionarySource, setDictionarySource] = useState<DictionarySource>("merriam-webster");
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
            aria-label="Look up an English word in Merriam-Webster's Collegiate Dictionary"
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
            gameDataSets={gameDataSets}
            submitRequest={submitRequest}
            onSubmitAvailabilityChange={setSubmitAvailable}
            rotation={rotation}
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
