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
      "TACO",
      "PRINT",
      "SHOT",
      "SNAP",
      "SNOW",
      "PILLOW",
      "BURRITO",
      "PYJAMA",
      "KING",
      "DONUT",
      "POPCORN",
      "STILL",
      "FIDDLER",
      "HERMIT",
      "BED",
      "LAMP",
    ],
    groups: [
      {
        description: "FOODS",
        className: "easy",
        words: ["TACO", "DONUT", "POPCORN", "BURRITO"],
      },
      {
        description: "____ CRAB",
        className: "MEDIUM",
        words: ["FIDDLER", "HERMIT", "KING", "SNOW"],
      },
      {
        description: "THINGS FOUND IN A BEDROOM",
        className: "HARD",
        words: ["PILLOW", "PYJAMA", "BED", "LAMP"],
      },
      {
        description: "PHOTOGRAPHY TERMS",
        className: "TRICKY",
        words: ["PRINT", "SHOT", "SNAP", "STILL"],
      },
    ],
  },
  {
    words: [
      "PENNE",
      "SECOND",
      "TURTLE",
      "ALERT",
      "FUSILLI",
      "MINUTE",
      "EGG",
      "CHIME",
      "RIGATONI",
      "HOUR",
      "PEANUT",
      "DING",
      "ORZO",
      "DAY",
      "SNAIL",
      "PING",
    ],
    groups: [
      {
        description: "PASTA SHAPES",
        className: "easy",
        words: ["PENNE", "FUSILLI", "RIGATONI", "ORZO"],
      },
      {
        description: "UNITS OF TIME",
        className: "MEDIUM",
        words: ["SECOND", "MINUTE", "HOUR", "DAY"],
      },
      {
        description: "THINGS WITH SHELLS",
        className: "HARD",
        words: ["TURTLE", "EGG", "PEANUT", "SNAIL"],
      },
      {
        description: "NOTIFICATION SOUNDS / CHIMES",
        className: "TRICKY",
        words: ["ALERT", "CHIME", "DING", "PING"],
      },
    ],
  },
  {
    words: [
      "CANVAS",
      "VIOLIN",
      "SPARROW",
      "NET",
      "PAINT",
      "CELLO",
      "FALCON",
      "SERVE",
      "BRUSH",
      "FLUTE",
      "HERON",
      "COURT",
      "FRAME",
      "TRUMPET",
      "ROBIN",
      "LOVE",
    ],
    groups: [
      {
        description: "PAINTING",
        className: "easy",
        words: ["CANVAS", "PAINT", "BRUSH", "FRAME"],
      },
      {
        description: "MUSICAL INSTRUMENTS",
        className: "MEDIUM",
        words: ["VIOLIN", "CELLO", "FLUTE", "TRUMPET"],
      },
      {
        description: "BIRDS",
        className: "HARD",
        words: ["SPARROW", "FALCON", "HERON", "ROBIN"],
      },
      {
        description: "TENNIS TERMS",
        className: "TRICKY",
        words: ["NET", "LOVE", "SERVE", "COURT"],
      },
    ],
  },
  {
    words: [
      "MICHELLE",
      "DAISY",
      "DRIZZLE",
      "BOXER",
      "TAXMAN",
      "DEWEY",
      "HAIL",
      "GOGGLE",
      "HELP",
      "SCROOGE",
      "FOG",
      "PANT",
      "YESTERDAY",
      "DONALD",
      "THUNDER",
      "TONG",
    ],
    groups: [
      {
        description: "BEATLES SONGS",
        className: "easy",
        words: ["MICHELLE", "TAXMAN", "HELP", "YESTERDAY"],
      },
      {
        description: "DISNEY DUCKS",
        className: "MEDIUM",
        words: ["DAISY", "DEWEY", "DONALD", "SCROOGE"],
      },
      {
        description: "WEATHER CONDITIONS",
        className: "HARD",
        words: ["DRIZZLE", "HAIL", "FOG", "THUNDER"],
      },
      {
        description: "SINGULAR OF THINGS SEEN IN PAIRS",
        className: "TRICKY",
        words: ["BOXER", "GOGGLE", "PANT", "TONG"],
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
