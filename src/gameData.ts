export type WordGroup = {
  description: string;
  className?: string;
  words: string[];
};

export interface GameData {
  words: string[];
  groups: WordGroup[];
}

// Add one object per puzzle: 16 words total, split into four groups of four.
export const gameDataSets: GameData[] = [
  {
    words: [
      "BASKETBALL",
      "CARROT",
      "GOLDFISH",
      "PUMPKIN",
      "SALT",
      "FAT",
      "ACID",
      "HEAT",
      "AT",
      "DOLLAR",
      "PERCENT",
      "POUND",
      "GAP",
      "LEAP",
      "LIGHT",
      "SCHOOL",
    ],
    groups: [
      {
        description: "THINGS THAT ARE ORANGE",
        className: "easy",
        words: ["BASKETBALL", "CARROT", "GOLDFISH", "PUMPKIN"],
      },
      {
        description: "ELEMENTS OF COOKING, PER SAMIN NOSRAT",
        className: "medium",
        words: ["SALT", "FAT", "ACID", "HEAT"],
      },
      {
        description: "SYMBOLS ABOVE NUMBERS ON A KEYBOARD",
        className: "hard",
        words: ["AT", "DOLLAR", "PERCENT", "POUND"],
      },
      {
        description: "___ YEAR",
        className: "tricky",
        words: ["GAP", "LEAP", "LIGHT", "SCHOOL"],
      },
    ],
  },
  {
    words: [
      "BROOM",
      "MOP",
      "RAG",
      "SPONGE",
      "GEN",
      "MS",
      "PROF",
      "REV",
      "BLUE",
      "GREEN",
      "WHITE",
      "YELLOW",
      "CIRCLE",
      "HORSESHOE",
      "PITCHFORK",
      "TRIANGLE",
    ],
    groups: [
      {
        description: "CLEANING SUPPLIES",
        className: "easy",
        words: ["BROOM", "MOP", "RAG", "SPONGE"],
      },
      {
        description: "NAME PREFIXES",
        className: "medium",
        words: ["GEN", "MS", "PROF", "REV"],
      },
      {
        description: "COLORS IN BRAZIL'S FLAG",
        className: "hard",
        words: ["BLUE", "GREEN", "WHITE", "YELLOW"],
      },
      {
        description: "SHAPES OF CAPITAL GREEK LETTERS",
        className: "tricky",
        words: ["CIRCLE", "HORSESHOE", "PITCHFORK", "TRIANGLE"],
      },
    ],
  },
  {
    words: [
      "MESSAGE",
      "OMEN",
      "SIGN",
      "WARNING",
      "CRUMBLE",
      "MELT",
      "SHRED",
      "SLICE",
      "DUST",
      "PEPPER",
      "POLLEN",
      "SMOKE",
      "BABY",
      "EYE",
      "SWEET",
      "WISDOM",
    ],
    groups: [
      {
        description: "INDICATION OF THINGS TO COME",
        className: "easy",
        words: ["MESSAGE", "OMEN", "SIGN", "WARNING"],
      },
      {
        description: "WAYS TO PREPARE CHEESE",
        className: "medium",
        words: ["CRUMBLE", "MELT", "SHRED", "SLICE"],
      },
      {
        description: "THINGS THAT MAKE YOU SNEEZE",
        className: "hard",
        words: ["DUST", "PEPPER", "POLLEN", "SMOKE"],
      },
      {
        description: "___ TOOTH",
        className: "tricky",
        words: ["BABY", "EYE", "SWEET", "WISDOM"],
      },
    ],
  },
  {
    words: [
      "BOW",
      "BOX",
      "CARD",
      "WRAPPING",
      "BAR",
      "FINAL",
      "ORAL",
      "PHYSICAL",
      "CHAIN",
      "COVER",
      "LOVE",
      "SCARLET",
      "BOOB",
      "EGGSHELL",
      "GIGGLE",
      "HELLO",
    ],
    groups: [
      {
        description: "GIFT-GIVING ACCESSORIES",
        className: "easy",
        words: ["BOW", "BOX", "CARD", "WRAPPING"],
      },
      {
        description: "KINDS OF EXAMS",
        className: "medium",
        words: ["BAR", "FINAL", "ORAL", "PHYSICAL"],
      },
      {
        description: "___ LETTER",
        className: "hard",
        words: ["CHAIN", "COVER", "LOVE", "SCARLET"],
      },
      {
        description: "WORDS SPELLED WITH AN UPSIDE-DOWN CALCULATOR",
        className: "tricky",
        words: ["BOOB", "EGGSHELL", "GIGGLE", "HELLO"],
      },
    ],
  },
  {
    words: [
      "MANGO",
      "ALGEBRA",
      "HELICOPTER",
      "DIM",
      "PAPAYA",
      "BIOLOGY",
      "KITE",
      "NICK",
      "GUAVA",
      "HISTORY",
      "GLIDER",
      "PEN",
      "LYCHEE",
      "GEOGRAPHY",
      "BALLOON",
      "QUART",
    ],
    groups: [
      {
        description: "TROPICAL FRUITS",
        className: "easy",
        words: ["MANGO", "PAPAYA", "GUAVA", "LYCHEE"],
      },
      {
        description: "SCHOOL SUBJECTS",
        className: "MEDIUM",
        words: ["ALGEBRA", "BIOLOGY", "HISTORY", "GEOGRAPHY"],
      },
      {
        description: "THINGS THAT CAN FLY",
        className: "HARD",
        words: ["HELICOPTER", "KITE", "GLIDER", "BALLOON"],
      },
      {
        description: "STARTS OF U.S. COINS",
        className: "TRICKY",
        words: ["DIM", "NICK", "PEN", "QUART"],
      },
    ],
  },
  {
    words: [
      "HULU",
      "CARDS",
      "CAPITOL",
      "SUNLIGHT",
      "NETFLIX",
      "CHIPS",
      "COLUMBIA",
      "SUNFLOWER",
      "PEACOCK",
      "DICE",
      "ISLAND",
      "SUNRISE",
      "PRIME",
      "SLOTS",
      "VIRGIN",
      "SUNDIAL",
    ],
    groups: [
      {
        description: "STREAMING SERVICES",
        className: "easy",
        words: ["HULU", "NETFLIX", "PEACOCK", "PRIME"],
      },
      {
        description: "CASINO / GAMBLING",
        className: "MEDIUM",
        words: ["CARDS", "CHIPS", "DICE", "SLOTS"],
      },
      {
        description: "RECORD LABELS",
        className: "HARD",
        words: ["CAPITOL", "COLUMBIA", "ISLAND", "VIRGIN"],
      },
      {
        description: "WORDS BEGINNING WITH “SUN”",
        className: "TRICKY",
        words: ["SUNLIGHT", "SUNFLOWER", "SUNRISE", "SUNDIAL"],
      },
    ],
  },
];
