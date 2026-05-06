/* ═══════════════════════════════════════════════════════════════
   MyCuisine — Private Table
   DATA FILE

   Main site password: kitchen2026
   Admin password: mycuisine2026
═══════════════════════════════════════════════════════════════ */

let SITE_CONFIG = {
  siteName: "MyCuisine",
  navLabel: "Private Table",
  heroEyebrow: "Friends-only private recipe room",
  heroTitle: "Private Table",
  heroItalic: "for safe cooking",
  heroDescription: "A luxury recipe hub for friends, dietary safety, meal planning, pantry matching, grocery lists, and cook-this-tonight decisions.",
  friendAccessCode: "kitchen2026",
  adminPassword: "mycuisine2026",
  announcementActive: true,
  announcementText: "T.J.S profile is active. Recipes with milk, butter, cream, whey, casein, lactose, or hidden dairy wording will be flagged before cooking."
};

let CATEGORIES = [
  "Chicken",
  "Beef",
  "Turkey",
  "Seafood",
  "Salad",
  "Pasta",
  "Breakfast",
  "Dessert",
  "Snack",
  "Meal Prep",
  "Date Night",
  "Quick Meal",
  "Other"
];

let FRIEND_PROFILES = [
  {
    id: "tjs",
    name: "T.J.S",
    shortName: "T.J.S",
    notes: "Lactose intolerant. Avoid milk, butter, cream, and hidden dairy ingredients.",
    restrictions: ["Dairy / Lactose"],
    blockedIngredients: [
      "milk",
      "whole milk",
      "skim milk",
      "evaporated milk",
      "condensed milk",
      "buttermilk",
      "butter",
      "ghee",
      "cream",
      "heavy cream",
      "whipping cream",
      "half and half",
      "cheese",
      "parmesan",
      "mozzarella",
      "cheddar",
      "feta",
      "ricotta",
      "cream cheese",
      "cottage cheese",
      "yogurt",
      "greek yogurt",
      "sour cream",
      "ice cream",
      "gelato",
      "whey",
      "casein",
      "caseinate",
      "lactose",
      "milk powder",
      "dry milk",
      "nonfat dry milk",
      "curds",
      "custard",
      "queso"
    ],
    warningIngredients: [
      "alfredo",
      "ranch",
      "creamy",
      "cream sauce",
      "white sauce",
      "dressing",
      "seasoning",
      "sauce",
      "marinade",
      "broth",
      "gravy",
      "protein powder",
      "chocolate",
      "chips"
    ],
    preferredIngredients: [
      "chicken",
      "steak",
      "rice",
      "potatoes",
      "salad",
      "broccoli",
      "garlic",
      "olive oil"
    ],
    dislikedIngredients: []
  }
];

let SUBSTITUTIONS = {
  "milk": ["lactose-free milk", "oat milk", "almond milk", "coconut milk"],
  "whole milk": ["lactose-free milk", "oat milk"],
  "skim milk": ["lactose-free milk", "oat milk"],
  "evaporated milk": ["lactose-free milk", "coconut milk"],
  "condensed milk": ["dairy-free condensed milk", "coconut condensed milk"],
  "buttermilk": ["dairy-free milk with lemon juice", "lactose-free milk with lemon juice"],
  "butter": ["olive oil", "avocado oil", "dairy-free butter"],
  "ghee": ["olive oil", "avocado oil"],
  "cream": ["coconut cream", "dairy-free cream"],
  "heavy cream": ["coconut cream", "dairy-free heavy cream"],
  "whipping cream": ["coconut cream", "dairy-free whipping cream"],
  "half and half": ["lactose-free half and half", "oat creamer", "coconut creamer"],
  "sour cream": ["dairy-free sour cream", "avocado", "plain lactose-free yogurt if tolerated"],
  "cream cheese": ["dairy-free cream cheese", "avocado spread"],
  "cheese": ["dairy-free cheese", "nutritional yeast", "skip or use herbs"],
  "parmesan": ["nutritional yeast", "dairy-free parmesan"],
  "mozzarella": ["dairy-free mozzarella", "skip or use herbs"],
  "cheddar": ["dairy-free cheddar", "nutritional yeast"],
  "yogurt": ["coconut yogurt", "dairy-free yogurt"],
  "greek yogurt": ["dairy-free greek-style yogurt", "coconut yogurt"],
  "alfredo": ["olive oil garlic sauce", "dairy-free alfredo"],
  "ranch": ["dairy-free ranch", "vinaigrette", "olive oil and lemon"],
  "queso": ["dairy-free queso", "salsa", "guacamole"],
  "flour": ["gluten-free flour", "rice flour", "cornstarch"],
  "pasta": ["gluten-free pasta", "chickpea pasta", "zucchini noodles"],
  "soy sauce": ["tamari", "coconut aminos"],
  "bread": ["gluten-free bread", "lettuce wrap", "rice cakes"],
  "peanut": ["sunflower seed butter", "pumpkin seeds"],
  "almond": ["sunflower seeds", "omit if nut-free"],
  "shrimp": ["chicken", "salmon", "tofu"],
  "pork": ["turkey", "chicken", "beef"],
  "bacon": ["turkey bacon", "beef bacon", "crispy mushrooms"]
};

let COLLECTIONS = [
  {
    id: "tjs-safe",
    label: "T.J.S Safe",
    desc: "Recipes that pass the T.J.S dairy safety check.",
    recipeIds: [
      "dairy-free-chicken-alfredo",
      "steakhouse-salad",
      "turkey-rice-bowls",
      "lemon-garlic-salmon"
    ]
  },
  {
    id: "weeknight",
    label: "Weeknight Winners",
    desc: "Fast meals for normal nights.",
    recipeIds: [
      "turkey-rice-bowls",
      "lemon-garlic-salmon",
      "dairy-free-chicken-alfredo"
    ]
  },
  {
    id: "date-night",
    label: "Date Night",
    desc: "Cleaner, elevated recipes for a nicer dinner.",
    recipeIds: [
      "steakhouse-salad",
      "lemon-garlic-salmon"
    ]
  }
];

let RECIPES = [
  {
    id: "dairy-free-chicken-alfredo",
    status: "approved",
    title: "Dairy-Free Chicken Alfredo Bowl",
    author: "Tyler",
    category: "Chicken",
    mealType: "Dinner",
    imageUrl: "",
    tags: ["T.J.S Safe", "High Protein", "Meal Prep Friendly", "Comfort Food"],
    time: 35,
    servings: 4,
    difficulty: "Easy",
    nutrition: {
      calories: 520,
      protein: 42,
      carbs: 48,
      fat: 16
    },
    ingredients: [
      "chicken breast",
      "dairy-free cream",
      "garlic",
      "pasta",
      "broccoli",
      "olive oil"
    ],
    steps: [
      "Season and cook the chicken until fully cooked.",
      "Boil pasta and steam broccoli.",
      "Simmer garlic with dairy-free cream and seasoning.",
      "Mix pasta, chicken, sauce, and broccoli together."
    ],
    notes: "Use a verified dairy-free cream. Check pasta labels if cooking for someone gluten-free.",
    versions: [
      {
        label: "T.J.S Safe",
        notes: "Uses dairy-free cream and olive oil instead of butter."
      },
      {
        label: "High Protein",
        notes: "Add extra chicken or use chickpea pasta."
      }
    ],
    favorites: ["tjs-safe"]
  },
  {
    id: "steakhouse-salad",
    status: "approved",
    title: "Steakhouse Salad",
    author: "Cousin",
    category: "Salad",
    mealType: "Lunch",
    imageUrl: "",
    tags: ["T.J.S Safe", "Low Carb", "High Protein", "Fresh"],
    time: 20,
    servings: 2,
    difficulty: "Easy",
    nutrition: {
      calories: 430,
      protein: 38,
      carbs: 14,
      fat: 24
    },
    ingredients: [
      "steak",
      "romaine lettuce",
      "cherry tomatoes",
      "red onion",
      "avocado",
      "balsamic dressing"
    ],
    steps: [
      "Season and sear steak to your preferred temperature.",
      "Rest the steak for 5 minutes, then slice thin.",
      "Build the salad with lettuce, tomatoes, onion, avocado, and dressing.",
      "Top with sliced steak."
    ],
    notes: "Check dressing label for hidden dairy or gluten.",
    versions: [
      {
        label: "T.J.S Safe",
        notes: "Use a dairy-free vinaigrette or plain balsamic and olive oil."
      }
    ],
    favorites: ["tjs-safe", "date-night"]
  },
  {
    id: "turkey-rice-bowls",
    status: "approved",
    title: "Turkey Rice Bowls",
    author: "Friend",
    category: "Meal Prep",
    mealType: "Meal Prep",
    imageUrl: "",
    tags: ["T.J.S Safe", "Budget Friendly", "High Protein", "Meal Prep Friendly"],
    time: 25,
    servings: 5,
    difficulty: "Easy",
    nutrition: {
      calories: 470,
      protein: 34,
      carbs: 52,
      fat: 12
    },
    ingredients: [
      "ground turkey",
      "rice",
      "bell peppers",
      "onion",
      "taco seasoning",
      "salsa"
    ],
    steps: [
      "Cook rice according to the package.",
      "Brown turkey with peppers and onion.",
      "Add taco seasoning and a splash of water.",
      "Portion rice, turkey, and salsa into bowls."
    ],
    notes: "Check taco seasoning and salsa labels for hidden dairy or gluten.",
    versions: [
      {
        label: "Low Carb",
        notes: "Use cauliflower rice instead of rice."
      }
    ],
    favorites: ["tjs-safe", "weeknight"]
  },
  {
    id: "lemon-garlic-salmon",
    status: "approved",
    title: "Lemon Garlic Salmon with Potatoes",
    author: "Tyler",
    category: "Seafood",
    mealType: "Dinner",
    imageUrl: "",
    tags: ["T.J.S Safe", "Date Night", "High Protein", "One Pan"],
    time: 32,
    servings: 2,
    difficulty: "Medium",
    nutrition: {
      calories: 610,
      protein: 44,
      carbs: 42,
      fat: 28
    },
    ingredients: [
      "salmon",
      "baby potatoes",
      "asparagus",
      "lemon",
      "garlic",
      "olive oil"
    ],
    steps: [
      "Roast potatoes with olive oil, garlic, salt, and pepper.",
      "Add salmon and asparagus to the pan.",
      "Top with lemon and roast until salmon is cooked through.",
      "Finish with fresh herbs if available."
    ],
    notes: "Naturally dairy-free when cooked with olive oil instead of butter.",
    versions: [
      {
        label: "No Seafood",
        notes: "Swap salmon with chicken breast and cook until 165°F."
      }
    ],
    favorites: ["date-night", "weeknight"]
  },
  {
    id: "classic-butter-pasta",
    status: "pending",
    title: "Classic Butter Pasta",
    author: "Friend",
    category: "Pasta",
    mealType: "Dinner",
    imageUrl: "",
    tags: ["Needs Review", "Comfort Food"],
    time: 18,
    servings: 2,
    difficulty: "Easy",
    nutrition: {
      calories: 540,
      protein: 14,
      carbs: 72,
      fat: 22
    },
    ingredients: [
      "pasta",
      "butter",
      "parmesan",
      "garlic",
      "black pepper"
    ],
    steps: [
      "Boil pasta.",
      "Melt butter with garlic.",
      "Toss pasta with butter and parmesan."
    ],
    notes: "Not safe for T.J.S without substitutions.",
    versions: [
      {
        label: "T.J.S Swap",
        notes: "Use olive oil and nutritional yeast instead of butter and parmesan."
      }
    ],
    favorites: []
  }
];

let MEAL_PLANNER = {
  Monday: "turkey-rice-bowls",
  Tuesday: "steakhouse-salad",
  Wednesday: "dairy-free-chicken-alfredo",
  Thursday: "lemon-garlic-salmon",
  Friday: "",
  Saturday: "",
  Sunday: ""
};

/* ═══════════════════════════════════════════════════════════════
   Compatibility Layer
   This makes the data readable by every version of the MyCuisine
   app and admin files.
═══════════════════════════════════════════════════════════════ */

window.SITE_CONFIG = SITE_CONFIG;
window.CATEGORIES = CATEGORIES;
window.FRIEND_PROFILES = FRIEND_PROFILES;
window.SUBSTITUTIONS = SUBSTITUTIONS;
window.COLLECTIONS = COLLECTIONS;
window.RECIPES = RECIPES;
window.MEAL_PLANNER = MEAL_PLANNER;

window.MC_DATA = {
  config: SITE_CONFIG,
  categories: CATEGORIES,
  profiles: FRIEND_PROFILES,
  substitutions: SUBSTITUTIONS,
  collections: COLLECTIONS,
  recipes: RECIPES,
  planner: MEAL_PLANNER
};

window.MYCUISINE_PASSWORDS = {
  friendAccessCode: "kitchen2026",
  adminPassword: "mycuisine2026"
};

/* ═══════════════════════════════════════════════════════════════
   Local Storage Repair
   This fixes older cached data that may have the wrong password.
═══════════════════════════════════════════════════════════════ */

try {
  const possibleKeys = [
    "mycuisine.privateTable.v4",
    "mycuisine.v5.data",
    "mycuisine.privateTable.data",
    "mycuisine.data",
    "mycuisine-recipes",
    "mycuisine-v2-recipes"
  ];

  possibleKeys.forEach(function (key) {
    const saved = localStorage.getItem(key);

    if (!saved) return;

    try {
      const savedData = JSON.parse(saved);

      if (savedData && typeof savedData === "object" && !Array.isArray(savedData)) {
        savedData.config = savedData.config || {};
        savedData.config.friendAccessCode = "kitchen2026";
        savedData.config.adminPassword = "mycuisine2026";

        if (!savedData.categories) savedData.categories = CATEGORIES;
        if (!savedData.profiles) savedData.profiles = FRIEND_PROFILES;
        if (!savedData.substitutions) savedData.substitutions = SUBSTITUTIONS;
        if (!savedData.collections) savedData.collections = COLLECTIONS;
        if (!savedData.recipes) savedData.recipes = RECIPES;
        if (!savedData.planner) savedData.planner = MEAL_PLANNER;

        localStorage.setItem(key, JSON.stringify(savedData));
      }
    } catch (innerError) {
      console.warn("MyCuisine skipped bad saved key:", key, innerError);
    }
  });
} catch (error) {
  console.warn("MyCuisine repair skipped:", error);
}
