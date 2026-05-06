/* MyCuisine shared logic */
const MC_STORE_KEY = "mycuisine.privateTable.v4";
const MC_PLAN_KEY = "mycuisine.privateTable.v4.plan";
const MC_THEME_KEY = "mycuisine.privateTable.theme";
const MC_GATE_KEY = "mycuisine.privateTable.gate";
const MC_GROCERY_KEY = "mycuisine.privateTable.grocery";
const MC_PANTRY_KEY = "mycuisine.privateTable.pantry";

const ALLERGEN_RULES = [
  {
    label: "Dairy / Lactose",
    keywords: ["milk", "whole milk", "skim milk", "evaporated milk", "condensed milk", "buttermilk", "butter", "ghee", "cream", "heavy cream", "whipping cream", "half and half", "cheese", "parmesan", "mozzarella", "cheddar", "feta", "ricotta", "cream cheese", "cottage cheese", "yogurt", "greek yogurt", "sour cream", "ice cream", "gelato", "whey", "casein", "caseinate", "lactose", "milk powder", "dry milk", "nonfat dry milk", "curds", "custard", "queso", "alfredo", "ranch", "creamy", "cream sauce", "white sauce"],
    severity: "blocked"
  },
  {
    label: "Gluten",
    keywords: ["flour", "wheat", "barley", "rye", "malt", "seitan", "bread", "breadcrumbs", "panko", "pasta", "noodles", "spaghetti", "penne", "linguine", "tortilla", "soy sauce", "croutons", "bagel", "bun", "roll", "cracker", "couscous", "farro"],
    severity: "blocked"
  },
  {
    label: "Tree Nuts / Peanuts",
    keywords: ["peanut", "peanuts", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "pine nut", "nut butter", "peanut butter", "almond butter", "cashew butter", "marzipan", "praline", "pesto"],
    severity: "blocked"
  },
  {
    label: "Shellfish",
    keywords: ["shrimp", "crab", "lobster", "scallop", "clam", "oyster", "mussel", "crawfish", "crayfish", "prawn"],
    severity: "blocked"
  },
  {
    label: "Pork",
    keywords: ["pork", "bacon", "ham", "prosciutto", "pancetta", "sausage", "pepperoni", "salami", "lard", "chorizo"],
    severity: "blocked"
  }
];

const CAUTION_KEYWORDS = ["seasoning", "sauce", "dressing", "marinade", "gravy", "broth", "bouillon", "stock", "spice blend", "protein powder", "chocolate", "chips", "restaurant", "store bought"];
const MEAT_KEYWORDS = ["chicken", "beef", "steak", "turkey", "pork", "bacon", "ham", "sausage", "salmon", "tuna", "shrimp", "crab", "lobster", "fish"];
const CARB_KEYWORDS = ["rice", "pasta", "bread", "potato", "tortilla", "oats", "noodles", "bun", "flour"];
const PROTEIN_KEYWORDS = ["chicken", "beef", "steak", "turkey", "salmon", "tuna", "shrimp", "egg", "tofu", "beans", "lentils", "greek yogurt"];

function deepClone(value){return JSON.parse(JSON.stringify(value));}
function slugify(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || `item-${Date.now()}`;}
function normalize(value){return String(value||"").toLowerCase().replace(/[^a-z0-9\s/-]/g," ");}
function unique(arr){return [...new Set((arr||[]).filter(Boolean))];}
function splitList(value){
  if(Array.isArray(value)) return value.map(x=>String(x).trim()).filter(Boolean);
  return String(value||"").split(/,|\n/).map(x=>x.trim()).filter(Boolean);
}
function sentenceList(value){
  if(Array.isArray(value)) return value.map(x=>String(x).trim()).filter(Boolean);
  return String(value||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function hasAny(text, keywords){return (keywords||[]).some(k => normalize(text).includes(normalize(k)));}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
function getInitials(title){return String(title||"MC").split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();}

function defaultData(){
  return {
    config: deepClone(window.SITE_CONFIG || {}),
    categories: deepClone(window.CATEGORIES || []),
    profiles: deepClone(window.FRIEND_PROFILES || []),
    recipes: deepClone(window.RECIPES || []),
    collections: deepClone(window.COLLECTIONS || []),
    substitutions: deepClone(window.SUBSTITUTIONS || {}),
    planner: deepClone(window.MEAL_PLANNER || {})
  };
}

function loadData(){
  try{
    const saved = localStorage.getItem(MC_STORE_KEY);
    if(saved){
      const parsed = JSON.parse(saved);
      return { ...defaultData(), ...parsed };
    }
  }catch(err){console.warn("Could not load saved MyCuisine data", err);}
  return defaultData();
}

function saveData(data){localStorage.setItem(MC_STORE_KEY, JSON.stringify(data));}
function getApprovedRecipes(data){return (data.recipes||[]).filter(r => (r.status||"approved") === "approved");}
function getRecipe(data,id){return (data.recipes||[]).find(r=>r.id===id);}
function getSelectedProfiles(data, selectedIds){
  const ids = selectedIds && selectedIds.length ? selectedIds : [data.profiles?.[0]?.id].filter(Boolean);
  return (data.profiles||[]).filter(p => ids.includes(p.id));
}

function analyzeRecipeForProfiles(recipe, profiles, data){
  const ingredients = recipe.ingredients || [];
  const text = normalize(`${recipe.title} ${ingredients.join(" ")} ${recipe.notes||""}`);
  const blocked = [];
  const caution = [];
  const swaps = [];

  profiles.forEach(profile => {
    (profile.blockedIngredients||[]).forEach(item => {
      if(hasAny(text, [item])){
        blocked.push({ profile: profile.name, ingredient: item, message: `${profile.name}: blocked ingredient detected — ${item}` });
        const choices = data.substitutions?.[item] || [];
        if(choices.length) swaps.push({ ingredient: item, choices });
      }
    });

    (profile.warningIngredients||[]).forEach(item => {
      if(hasAny(text, [item])){
        caution.push({ profile: profile.name, ingredient: item, message: `${profile.name}: check label or recipe wording — ${item}` });
      }
    });

    (profile.restrictions||[]).forEach(restriction => {
      const rule = ALLERGEN_RULES.find(r => r.label === restriction);
      if(rule && hasAny(text, rule.keywords)){
        blocked.push({ profile: profile.name, ingredient: restriction, message: `${profile.name}: ${restriction} risk detected` });
      }
      if(restriction === "Vegetarian Only" && hasAny(text, MEAT_KEYWORDS)){
        blocked.push({ profile: profile.name, ingredient: "meat", message: `${profile.name}: not vegetarian-friendly` });
      }
      if(restriction === "Low Carb" && hasAny(text, CARB_KEYWORDS)){
        caution.push({ profile: profile.name, ingredient: "carb", message: `${profile.name}: may not be low-carb` });
      }
    });
  });

  if(profiles.length && hasAny(text, CAUTION_KEYWORDS)){
    caution.push({ profile: "Label Check", ingredient: "packaged ingredient", message: "Check labels for sauces, seasonings, dressing, marinades, broth, or packaged ingredients." });
  }

  const uniqueBlocked = [];
  blocked.forEach(item => { if(!uniqueBlocked.some(x=>x.message===item.message)) uniqueBlocked.push(item); });
  const uniqueCaution = [];
  caution.forEach(item => { if(!uniqueCaution.some(x=>x.message===item.message)) uniqueCaution.push(item); });
  const uniqueSwaps = [];
  swaps.forEach(item => { if(!uniqueSwaps.some(x=>x.ingredient===item.ingredient)) uniqueSwaps.push(item); });

  let level = "safe";
  if(uniqueBlocked.length) level = "danger";
  else if(uniqueCaution.length) level = "warning";

  const score = scoreRecipe(recipe, profiles, data, uniqueBlocked, uniqueCaution);
  return { level, blocked: uniqueBlocked, caution: uniqueCaution, swaps: uniqueSwaps, score };
}

function scoreRecipe(recipe, profiles, data, blocked, caution, pantryItems=[], maxTime=999){
  let score = 100;
  score -= (blocked||[]).length * 35;
  score -= (caution||[]).length * 8;
  if(Number(recipe.time||0) > maxTime) score -= 18;

  const text = normalize(`${recipe.title} ${(recipe.ingredients||[]).join(" ")} ${(recipe.tags||[]).join(" ")}`);
  profiles.forEach(profile => {
    (profile.preferredIngredients||[]).forEach(item => { if(hasAny(text,[item])) score += 3; });
    (profile.dislikedIngredients||[]).forEach(item => { if(hasAny(text,[item])) score -= 8; });
  });

  const pantry = pantryItems.map(normalize).filter(Boolean);
  if(pantry.length){
    const match = getPantryMatch(recipe, pantryItems);
    score += Math.min(18, match.count * 4);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSafetyLabel(analysis, profileNames="selected profiles"){
  if(analysis.level === "danger") return { text: `Not safe for ${profileNames}`, cls: "status-danger" };
  if(analysis.level === "warning") return { text: `Check label for ${profileNames}`, cls: "status-warning" };
  return { text: `Safe for ${profileNames}`, cls: "status-safe" };
}

function getPantryMatch(recipe, pantryItems){
  const pantry = pantryItems.map(normalize).filter(Boolean);
  const ingredients = (recipe.ingredients||[]).map(normalize);
  const matched = ingredients.filter(ing => pantry.some(item => ing.includes(item) || item.includes(ing)));
  return { count: matched.length, total: ingredients.length, matched };
}

function categorizeIngredient(item){
  const t = normalize(item);
  if(hasAny(t,["chicken","beef","steak","turkey","salmon","tuna","shrimp","crab","pork","bacon","ham","sausage","fish"])) return "Meat & Protein";
  if(hasAny(t,["lettuce","romaine","spinach","kale","tomato","onion","avocado","broccoli","asparagus","pepper","garlic","lemon","potato","potatoes"])) return "Produce";
  if(hasAny(t,["milk","cream","butter","cheese","yogurt","dairy-free","oat milk","almond milk"])) return "Dairy-Free / Refrigerated";
  if(hasAny(t,["rice","pasta","flour","bread","seasoning","salsa","olive oil","oil","sauce","dressing","broth"])) return "Pantry";
  if(hasAny(t,["frozen"])) return "Frozen";
  return "Other";
}

function buildGroceryFromRecipeIds(data, recipeIds, selectedProfiles){
  const map = new Map();
  recipeIds.filter(Boolean).forEach(id => {
    const recipe = getRecipe(data,id);
    if(!recipe) return;
    (recipe.ingredients||[]).forEach(item => {
      const key = normalize(item);
      if(!map.has(key)) map.set(key, { item, recipes: [], section: categorizeIngredient(item), flags: [] });
      map.get(key).recipes.push(recipe.title);
    });
  });

  const profiles = selectedProfiles || [];
  for(const entry of map.values()){
    const fakeRecipe = { title: entry.item, ingredients: [entry.item], notes: "" };
    const analysis = analyzeRecipeForProfiles(fakeRecipe, profiles, data);
    if(analysis.level === "danger") entry.flags.push("Blocked / swap needed");
    else if(analysis.level === "warning") entry.flags.push("Check label");
  }
  return [...map.values()].sort((a,b)=>a.section.localeCompare(b.section)||a.item.localeCompare(b.item));
}

function autoPlanWeek(data, selectedProfileIds, pantryItems=[], maxTime=45){
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const profiles = getSelectedProfiles(data, selectedProfileIds);
  const approved = getApprovedRecipes(data);
  const ranked = approved.map(recipe => {
    const analysis = analyzeRecipeForProfiles(recipe, profiles, data);
    const score = scoreRecipe(recipe, profiles, data, analysis.blocked, analysis.caution, pantryItems, maxTime);
    return { recipe, score, level: analysis.level };
  }).filter(item => item.level !== "danger" && Number(item.recipe.time||0) <= maxTime)
    .sort((a,b)=>b.score-a.score);

  const plan = {};
  days.forEach((day, index) => {
    plan[day] = ranked[index % ranked.length]?.recipe.id || "";
  });
  return plan;
}

function recommendTonight(data, selectedProfileIds, pantryItems=[], maxTime=45){
  const profiles = getSelectedProfiles(data, selectedProfileIds);
  const approved = getApprovedRecipes(data);
  const ranked = approved.map(recipe => {
    const analysis = analyzeRecipeForProfiles(recipe, profiles, data);
    const pantry = getPantryMatch(recipe, pantryItems);
    const score = scoreRecipe(recipe, profiles, data, analysis.blocked, analysis.caution, pantryItems, maxTime);
    return { recipe, analysis, pantry, score };
  }).filter(item => item.analysis.level !== "danger" && Number(item.recipe.time||0) <= maxTime)
    .sort((a,b)=>b.score-a.score || b.pantry.count-a.pantry.count);
  return ranked[0] || null;
}

function exportRecipesJs(data){
  return `/* MyCuisine — exported data file */\n\nlet SITE_CONFIG = ${JSON.stringify(data.config,null,2)};\n\nlet CATEGORIES = ${JSON.stringify(data.categories,null,2)};\n\nlet FRIEND_PROFILES = ${JSON.stringify(data.profiles,null,2)};\n\nlet SUBSTITUTIONS = ${JSON.stringify(data.substitutions,null,2)};\n\nlet COLLECTIONS = ${JSON.stringify(data.collections,null,2)};\n\nlet RECIPES = ${JSON.stringify(data.recipes,null,2)};\n\nlet MEAL_PLANNER = ${JSON.stringify(data.planner,null,2)};\n`;
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function copyText(text){
  if(navigator.clipboard) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  return Promise.resolve();
}

function toast(message){
  let el = document.querySelector(".toast");
  if(!el){el=document.createElement("div");el.className="toast";document.body.appendChild(el);}
  el.textContent = message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}

function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(MC_THEME_KEY, theme);
  document.querySelectorAll(".theme-pill span").forEach(span => span.classList.toggle("on", span.dataset.theme === theme));
}
function initTheme(){applyTheme(localStorage.getItem(MC_THEME_KEY) || "light");}
function toggleTheme(){applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");}

function formatRecipeForCopy(recipe){
  return `${recipe.title}\n\nIngredients:\n${(recipe.ingredients||[]).map(i=>`- ${i}`).join("\n")}\n\nSteps:\n${(recipe.steps||[]).map((s,i)=>`${i+1}. ${s}`).join("\n")}\n\nNotes:\n${recipe.notes||""}`;
}
