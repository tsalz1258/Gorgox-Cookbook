/* ═══════════════════════════════════════════════════════════════
   MyCuisine — Private Recipe Club
   DATA FILE
   ───────────────────────────────────────────────────────────────
   This is the main file to update after using admin.html.
   Admin workflow:
   1. Open admin.html
   2. Add/edit recipes, categories, and settings
   3. Click Export recipes.js
   4. Replace this file in GitHub
═══════════════════════════════════════════════════════════════ */

let SITE_CONFIG = {
  siteName: "MyCuisine",
  navLabel: "Private Kitchen",
  eyebrow: "Friends-only recipe club",
  heroTitle: "MyCuisine",
  heroItalic: "Private Table",
  heroDescription: "A polished recipe library for friends and family to share meals, sort by ingredients, and protect dietary restrictions before anyone starts cooking.",
  announcementActive: true,
  announcementText: "Welcome to MyCuisine. Use Dietary Guard before choosing a recipe if anyone has allergies, lactose restrictions, gluten restrictions, or specific food preferences.",
  requireAccessCode: true,
  accessCode: "kitchen2026",
  adminPassword: "mycuisine2026"
};

let CATEGORIES = [
  { label: "Chicken", icon: "🍗", desc: "Chicken-based dinners, lunches, and meal prep." },
  { label: "Beef", icon: "🥩", desc: "Steaks, ground beef, bowls, and comfort food." },
  { label: "Turkey", icon: "🦃", desc: "Ground turkey, turkey bowls, and lighter proteins." },
  { label: "Seafood", icon: "🐟", desc: "Fish, shrimp, crab, and coastal-style meals." },
  { label: "Salad", icon: "🥗", desc: "Fresh salads, bowls, and lighter meals." },
  { label: "Pasta", icon: "🍝", desc: "Pasta, noodles, and sauces." },
  { label: "Breakfast", icon: "🍳", desc: "Breakfast, brunch, and morning favorites." },
  { label: "Dessert", icon: "🍰", desc: "Sweet recipes and dessert ideas." },
  { label: "Snack", icon: "🍿", desc: "Quick bites and snack ideas." },
  { label: "Meal Prep", icon: "🍱", desc: "Recipes that save well for the week." },
  { label: "Other", icon: "✨", desc: "Everything else." }
];

let RESTRICTIONS = [
  { id: "dairy", label: "Dairy / Lactose", warning: "Contains dairy or lactose ingredients", keywords: ["milk", "cheese", "butter", "cream", "yogurt", "parmesan", "mozzarella", "cheddar", "whey", "casein", "sour cream", "cream cheese", "ice cream"] },
  { id: "gluten", label: "Gluten", warning: "May contain gluten", keywords: ["flour", "wheat", "bread", "breadcrumbs", "pasta", "noodles", "tortilla", "soy sauce", "croutons", "bagel", "bun"] },
  { id: "nuts", label: "Tree Nuts / Peanuts", warning: "Contains nuts or peanuts", keywords: ["peanut", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "nut butter"] },
  { id: "shellfish", label: "Shellfish", warning: "Contains shellfish", keywords: ["shrimp", "crab", "lobster", "scallop", "clam", "oyster", "mussel"] },
  { id: "pork", label: "Pork", warning: "Contains pork", keywords: ["pork", "bacon", "ham", "prosciutto", "sausage", "pepperoni"] },
  { id: "vegetarian", label: "Vegetarian Only", warning: "Not vegetarian-friendly", keywords: ["chicken", "beef", "steak", "turkey", "pork", "bacon", "ham", "sausage", "salmon", "tuna", "shrimp", "crab", "lobster", "fish"] },
  { id: "lowcarb", label: "Low Carb", warning: "May not be low-carb", keywords: ["rice", "pasta", "bread", "potato", "tortilla", "oats", "noodles", "bun", "flour", "sugar"] }
];

let CATEGORY_RULES = [
  { category: "Chicken", keywords: ["chicken", "rotisserie"] },
  { category: "Beef", keywords: ["beef", "steak", "ground beef", "sirloin", "ribeye"] },
  { category: "Turkey", keywords: ["turkey"] },
  { category: "Seafood", keywords: ["salmon", "tuna", "cod", "tilapia", "shrimp", "crab", "lobster", "fish"] },
  { category: "Salad", keywords: ["lettuce", "romaine", "spinach", "kale", "arugula", "spring mix"] },
  { category: "Pasta", keywords: ["pasta", "noodle", "spaghetti", "penne", "linguine"] },
  { category: "Breakfast", keywords: ["egg", "oat", "pancake", "waffle", "bacon"] },
  { category: "Dessert", keywords: ["sugar", "chocolate", "cake", "cookie", "brownie", "ice cream"] }
];

let RECIPES = [
  {
    id: "lactose-free-chicken-alfredo-bowl",
    title: "Lactose-Free Chicken Alfredo Bowl",
    author: "Tyler",
    category: "Chicken",
    mealType: "Dinner",
    time: 35,
    servings: 4,
    difficulty: "Easy",
    rating: 5,
    tags: ["Likely Lactose Free", "High Protein", "Meal Prep Friendly"],
    ingredients: ["Chicken breast", "Lactose-free cream", "Garlic", "Pasta", "Broccoli", "Italian seasoning"],
    steps: ["Season and cook the chicken until fully done.", "Boil pasta until tender.", "Simmer garlic with lactose-free cream and seasoning.", "Mix everything together with broccoli and serve warm."],
    notes: "Good for meal prep. Add red pepper flakes if you want heat.",
    isNew: true
  },
  {
    id: "steakhouse-salad",
    title: "Steakhouse Salad",
    author: "Cousin",
    category: "Salad",
    mealType: "Lunch",
    time: 20,
    servings: 2,
    difficulty: "Easy",
    rating: 5,
    tags: ["Low Carb Friendly", "High Protein", "Likely Gluten Free"],
    ingredients: ["Steak", "Romaine lettuce", "Cherry tomatoes", "Red onion", "Avocado", "Balsamic dressing"],
    steps: ["Sear steak to your liking.", "Let the steak rest, then slice thin.", "Build the salad with vegetables, avocado, and dressing.", "Place steak on top and serve."],
    notes: "Use leftover steak to make this faster.",
    isNew: false
  },
  {
    id: "turkey-rice-bowls",
    title: "Turkey Rice Bowls",
    author: "Friend",
    category: "Meal Prep",
    mealType: "Meal Prep",
    time: 25,
    servings: 5,
    difficulty: "Easy",
    rating: 4,
    tags: ["High Protein", "Budget Friendly", "Dairy Free"],
    ingredients: ["Ground turkey", "Rice", "Bell peppers", "Onion", "Taco seasoning", "Salsa"],
    steps: ["Cook rice.", "Brown turkey with peppers and onions.", "Season everything well.", "Portion into bowls with salsa."],
    notes: "Easy work lunch option.",
    isNew: false
  }
];
