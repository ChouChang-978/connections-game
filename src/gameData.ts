export type WordGroup = {
  description: string;
  className?: string;
  hint: string;
  words: string[];
};

export interface GameData {
  words: string[];
  groups: WordGroup[];
}

// Each puzzle contains 16 words split into four groups of four.
export const gameDataSets: GameData[] = [
  {
    words: [
      "PLANT", "SEED", "WATER", "WEED",
      "OLIVE", "FOREST", "LIME", "MINT",
      "BAT", "MALLET", "RACKET", "STICK",
      "EAR", "KETTLE", "OIL", "STEEL",
    ],
    groups: [
      {
        description: "GARDENING NOUNS/VERBS",
        className: "easy",
        hint: "Read them once as a list, then as instructions.",
        words: ["PLANT", "SEED", "WATER", "WEED"],
      },
      {
        description: "SHADES OF GREEN",
        className: "medium",
        hint: "A painter and a park ranger might both recognize these.",
        words: ["OLIVE", "FOREST", "LIME", "MINT"],
      },
      {
        description: "USED TO HIT A BALL IN SPORTS",
        className: "hard",
        hint: "Different games, similar follow-through.",
        words: ["BAT", "MALLET", "RACKET", "STICK"],
      },
      {
        description: "WORDS BEFORE “DRUM”",
        className: "tricky",
        hint: "A familiar compound may be hiding in the second half.",
        words: ["EAR", "KETTLE", "OIL", "STEEL"],
      },
    ],
  },
  {
    words: [
      "BRICK", "CHERRY", "ROSE", "RUBY",
      "BARRIER", "CONE", "FLAG", "FLARE",
      "BLEW", "CHORAL", "READ", "ROWS",
      "CLUE", "FROWN", "MELLOW", "PREEN",
    ],
    groups: [
      {
        description: "SHADES OF RED",
        className: "easy",
        hint: "A palette can borrow names from everyday things.",
        words: ["BRICK", "CHERRY", "ROSE", "RUBY"],
      },
      {
        description: "USED TO REDIRECT TRAFFIC",
        className: "medium",
        hint: "Think of a road crew working around a detour.",
        words: ["BARRIER", "CONE", "FLAG", "FLARE"],
      },
      {
        description: "COLOR HOMOPHONES",
        className: "hard",
        hint: "Try hearing them beside a paintbox.",
        words: ["BLEW", "CHORAL", "READ", "ROWS"],
      },
      {
        description: "COLORS WITH THEIR FIRST LETTERS CHANGED",
        className: "tricky",
        hint: "A one-letter adjustment at the beginning changes the picture.",
        words: ["CLUE", "FROWN", "MELLOW", "PREEN"],
      },
    ],
  },
  {
    words: [
      "BEIGE", "CAMEL", "KHAKI", "TAN",
      "KINDLING", "LOG", "MATCH", "TINDER",
      "CHOIR", "FIRE", "LIAR", "FRYER",
      "CHOKE", "MIST", "TEAR", "WELL",
    ],
    groups: [
      {
        description: "YELLOW-BROWN SHADES",
        className: "easy",
        hint: "Look beyond the first thing each word brings to mind.",
        words: ["BEIGE", "CAMEL", "KHAKI", "TAN"],
      },
      {
        description: "USED IN BUILDING A FIRE",
        className: "medium",
        hint: "An outdoor evening may bring these together.",
        words: ["KINDLING", "LOG", "MATCH", "TINDER"],
      },
      {
        description: "RHYMES",
        className: "hard",
        hint: "Their endings have more in common than their spellings suggest.",
        words: ["CHOIR", "FIRE", "LIAR", "FRYER"],
      },
      {
        description: "START TO CRY, WITH “UP”",
        className: "tricky",
        hint: "A brief expression may be completed after each.",
        words: ["CHOKE", "MIST", "TEAR", "WELL"],
      },
    ],
  },
  {
    words: [
      "CHOCK", "JACK", "TIRE", "WRENCH",
      "EON", "ETHER", "NET", "TOW",
      "MOO", "NEW", "PIE", "ROW",
      "CAT", "EDITOR", "PASTE", "THAT",
    ],
    groups: [
      {
        description: "USED TO FIX A FLAT",
        className: "easy",
        hint: "A roadside stop could make this set useful.",
        words: ["CHOCK", "JACK", "TIRE", "WRENCH"],
      },
      {
        description: "NUMBER ANAGRAMS",
        className: "medium",
        hint: "Numbers can hide in plain sight when their letters move.",
        words: ["EON", "ETHER", "NET", "TOW"],
      },
      {
        description: "HOMOPHONES OF GREEK LETTERS",
        className: "hard",
        hint: "One old alphabet is best approached by ear.",
        words: ["MOO", "NEW", "PIE", "ROW"],
      },
      {
        description: "WORDS AFTER “COPY”",
        className: "tricky",
        hint: "A desktop shortcut points toward the connection.",
        words: ["CAT", "EDITOR", "PASTE", "THAT"],
      },
    ],
  },
  {
    words: [
      "BUCKLE", "BUTTON", "SNAP", "ZIP",
      "MICROSCOPE", "SLIDE", "SPECIMEN", "STAIN",
      "CAN", "HABIT", "HORNETS’ NEST", "TIRES",
      "AARDVARK", "EERIE", "LLAMA", "OOZE",
    ],
    groups: [
      {
        description: "FASTENING VERBS",
        className: "easy",
        hint: "What might you do before heading out?",
        words: ["BUCKLE", "BUTTON", "SNAP", "ZIP"],
      },
      {
        description: "USED TO VIEW A BIOLOGICAL SAMPLE",
        className: "medium",
        hint: "A biology lab is the setting; the roles differ.",
        words: ["MICROSCOPE", "SLIDE", "SPECIMEN", "STAIN"],
      },
      {
        description: "PROVERBIAL THINGS TO KICK",
        className: "hard",
        hint: "Some phrases are meant literally, others figuratively.",
        words: ["CAN", "HABIT", "HORNETS’ NEST", "TIRES"],
      },
      {
        description: "BEGINNING WITH DOUBLE LETTERS",
        className: "tricky",
        hint: "Pay close attention to the openings.",
        words: ["AARDVARK", "EERIE", "LLAMA", "OOZE"],
      },
    ],
  },
  {
    words: [
      "DODGE", "HIDE", "HOP", "TAG",
      "EBONY", "JET", "ONYX", "RAVEN",
      "EWE", "U", "YEW", "YOU",
      "BRAZIL", "BUTTER", "DOUGH", "PINE",
    ],
    groups: [
      {
        description: "PLAYGROUND VERBS",
        className: "easy",
        hint: "Picture a schoolyard at recess.",
        words: ["DODGE", "HIDE", "HOP", "TAG"],
      },
      {
        description: "SHADES OF BLACK",
        className: "medium",
        hint: "Nature and a dark palette overlap.",
        words: ["EBONY", "JET", "ONYX", "RAVEN"],
      },
      {
        description: "HOMOPHONES",
        className: "hard",
        hint: "Let sound take the lead.",
        words: ["EWE", "U", "YEW", "YOU"],
      },
      {
        description: "WORDS BEFORE “NUT”",
        className: "tricky",
        hint: "A snack aisle and a tree could both help.",
        words: ["BRAZIL", "BUTTER", "DOUGH", "PINE"],
      },
    ],
  },
];
