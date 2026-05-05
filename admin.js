/* MyCuisine admin portal */
const LS = { theme:"mycuisine-theme", admin:"mycuisine-admin-ok", draft:"mycuisine-admin-draft" };
let state = loadDraft();
let selectedId = state.recipes[0]?.id || null;

function $(id){ return document.getElementById(id); }
function loadJSON(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch{ return fallback; } }
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char])); }
function slug(value){ return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || `recipe-${Date.now()}`; }
function splitComma(value){ return String(value || "").split(",").map(x => x.trim()).filter(Boolean); }
function splitLines(value){ return String(value || "").split(/\n+/).map(x => x.trim()).filter(Boolean); }
function unique(items){ return [...new Set(items.filter(Boolean))]; }
function normalize(value){ return String(value || "").toLowerCase(); }
function arrayText(items){ return Array.isArray(items) ? items.join(" ") : String(items || ""); }

function loadDraft(){
  const saved = loadJSON(LS.draft, null);
  if(saved) return saved;
  return {
    config: JSON.parse(JSON.stringify(SITE_CONFIG)),
    categories: JSON.parse(JSON.stringify(CATEGORIES)),
    restrictions: JSON.parse(JSON.stringify(RESTRICTIONS)),
    categoryRules: JSON.parse(JSON.stringify(CATEGORY_RULES)),
    recipes: JSON.parse(JSON.stringify(RECIPES))
  };
}
function persist(){ saveJSON(LS.draft, state); updateExportPreview(); }

function setTheme(theme){ document.documentElement.setAttribute("data-theme", theme); localStorage.setItem(LS.theme, theme); updateThemePills(); }
function toggleTheme(){ setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); }
function updateThemePills(){ const t = document.documentElement.getAttribute("data-theme"); $("lightPill")?.classList.toggle("on", t === "light"); $("darkPill")?.classList.toggle("on", t === "dark"); }
function toast(message){ const el = $("toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1700); }

function setupGate(){
  if(localStorage.getItem(LS.admin) === "true") { $("adminGate").classList.add("hidden"); return; }
  $("adminGateForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if($("adminPassword").value.trim() === state.config.adminPassword){
      localStorage.setItem(LS.admin, "true");
      $("adminGate").classList.add("hidden");
      toast("Admin opened");
    }else{
      $("adminGateError").classList.add("show");
    }
  });
}

function setTab(tab){
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));
  $(`tab-${tab}`).classList.remove("hidden");
  if(tab === "export") updateExportPreview();
}

function analyzeRecipe({ title, ingredients }){
  const ingredientList = Array.isArray(ingredients) ? ingredients : splitComma(ingredients);
  const text = normalize(`${title} ${ingredientList.join(" ")}`);
  const categoryRule = state.categoryRules.find(rule => (rule.keywords || []).some(keyword => text.includes(normalize(keyword))));
  const category = categoryRule ? categoryRule.category : "Other";
  const warnings = state.restrictions
    .filter(rule => rule.id !== "vegetarian" && rule.id !== "lowcarb")
    .filter(rule => (rule.keywords || []).some(keyword => text.includes(normalize(keyword))))
    .map(rule => rule.warning);

  const proteinWords = ["chicken","beef","steak","turkey","salmon","tuna","shrimp","egg","tofu","beans","lentils","greek yogurt"];
  const meatWords = ["chicken","beef","steak","turkey","pork","bacon","ham","sausage","salmon","tuna","shrimp","crab","lobster","fish"];
  const carbWords = ["rice","pasta","bread","potato","tortilla","oats","noodles","bun","flour"];
  const tags = [];
  if(!warnings.some(w => w.toLowerCase().includes("dairy") || w.toLowerCase().includes("lactose"))) tags.push("Likely Lactose Free");
  if(!warnings.some(w => w.toLowerCase().includes("gluten"))) tags.push("Likely Gluten Free");
  if(proteinWords.some(word => text.includes(word))) tags.push("High Protein");
  if(!meatWords.some(word => text.includes(word))) tags.push("Vegetarian Friendly");
  if(!carbWords.some(word => text.includes(word))) tags.push("Low Carb Friendly");
  if(ingredientList.length <= 6) tags.push("Simple Ingredients");
  if(text.includes("lettuce") || text.includes("spinach") || text.includes("kale")) tags.push("Fresh / Salad");
  return { category, tags: unique(tags), warnings: unique(warnings) };
}

function renderRecipeList(){
  const list = $("recipeList");
  $("recipeCount").textContent = `${state.recipes.length} recipe${state.recipes.length === 1 ? "" : "s"}`;
  list.innerHTML = state.recipes.map((recipe) => `
    <div class="row ${recipe.id === selectedId ? "active" : ""}" onclick="selectRecipe('${recipe.id}')">
      <div class="row-ico">${getCategoryIcon(recipe.category)}</div>
      <div class="row-main">
        <div class="row-title">${escapeHTML(recipe.title)}</div>
        <div class="row-sub">${escapeHTML(recipe.category)} · ${escapeHTML(recipe.author || "Friend")}</div>
      </div>
    </div>
  `).join("");
}

function getCategoryIcon(label){ return state.categories.find(cat => cat.label === label)?.icon || "🍽️"; }
function selectRecipe(id){ selectedId = id; renderRecipeList(); loadSelectedRecipe(); }
function selectedRecipe(){ return state.recipes.find(recipe => recipe.id === selectedId); }
function fillCategoryOptions(){ $("fCategory").innerHTML = state.categories.map(cat => `<option>${escapeHTML(cat.label)}</option>`).join(""); }

function loadSelectedRecipe(){
  fillCategoryOptions();
  const recipe = selectedRecipe();
  if(!recipe) return newRecipe();
  $("fTitle").value = recipe.title || "";
  $("fAuthor").value = recipe.author || "";
  $("fCategoryMode").value = recipe.categoryMode || "Manual";
  $("fCategory").value = recipe.category || state.categories[0]?.label || "Other";
  $("fMealType").value = recipe.mealType || "Dinner";
  $("fTime").value = recipe.time || 30;
  $("fServings").value = recipe.servings || 2;
  $("fRating").value = recipe.rating || 5;
  $("fDifficulty").value = recipe.difficulty || "Easy";
  $("fTags").value = (recipe.tags || []).join(", ");
  $("fIngredients").value = (recipe.ingredients || []).join(", ");
  $("fSteps").value = Array.isArray(recipe.steps) ? recipe.steps.join("\n") : recipe.steps || "";
  $("fNotes").value = recipe.notes || "";
  updateAnalysisPreview();
}

function currentFormRecipe(){
  const base = selectedRecipe() || {};
  const ingredients = splitComma($("fIngredients").value);
  const steps = splitLines($("fSteps").value);
  const manualTags = splitComma($("fTags").value);
  const analysis = analyzeRecipe({ title: $("fTitle").value, ingredients });
  const categoryMode = $("fCategoryMode").value;
  return {
    id: base.id || slug($("fTitle").value),
    title: $("fTitle").value.trim() || "Untitled Recipe",
    author: $("fAuthor").value.trim() || "Friend",
    categoryMode,
    category: categoryMode === "Auto" ? analysis.category : $("fCategory").value,
    mealType: $("fMealType").value.trim() || "Meal",
    time: Number($("fTime").value || 30),
    servings: Number($("fServings").value || 2),
    difficulty: $("fDifficulty").value || "Easy",
    rating: Number($("fRating").value || 5),
    tags: unique([...manualTags, ...analysis.tags]),
    ingredients,
    steps,
    notes: $("fNotes").value.trim(),
    isNew: base.isNew || false
  };
}

function updateAnalysisPreview(){
  const recipe = currentFormRecipe();
  const analysis = analyzeRecipe(recipe);
  $("analysisPreview").innerHTML = `
    <div class="preview-title">Automatic analysis</div>
    <p class="preview-copy">Suggested category: <strong>${escapeHTML(analysis.category)}</strong></p>
    <div class="tag-row" style="margin-top:12px">
      ${analysis.tags.map(tag => `<span class="tag good">${escapeHTML(tag)}</span>`).join("")}
      ${analysis.warnings.length ? analysis.warnings.map(w => `<span class="tag warn">${escapeHTML(w)}</span>`).join("") : `<span class="tag good">No major warning detected</span>`}
    </div>
    <p class="preview-copy" style="margin-top:12px">Auto detection is keyword-based. Always check real labels for allergies and cross-contamination.</p>`;
}

function saveRecipe(){
  const recipe = currentFormRecipe();
  if(!recipe.title || !recipe.ingredients.length){ toast("Add a title and ingredients"); return; }
  const index = state.recipes.findIndex(item => item.id === selectedId);
  if(index >= 0) state.recipes[index] = recipe;
  else state.recipes.unshift(recipe);
  if(!state.categories.some(cat => cat.label === recipe.category)) state.categories.push({ label:recipe.category, icon:"✨", desc:"Auto-created category." });
  selectedId = recipe.id;
  persist();
  renderAll();
  toast("Recipe saved");
}

function newRecipe(){
  selectedId = `recipe-${Date.now()}`;
  const recipe = { id:selectedId, title:"Untitled Recipe", author:"Friend", categoryMode:"Auto", category:"Other", mealType:"Dinner", time:30, servings:2, difficulty:"Easy", rating:5, tags:[], ingredients:[], steps:[], notes:"", isNew:true };
  state.recipes.unshift(recipe);
  persist();
  renderAll();
  loadSelectedRecipe();
  toast("New recipe started");
}

function duplicateSelectedRecipe(){
  const recipe = selectedRecipe();
  if(!recipe) return;
  const clone = JSON.parse(JSON.stringify(recipe));
  clone.id = `${slug(clone.title)}-${Date.now()}`;
  clone.title = `${clone.title} Copy`;
  state.recipes.unshift(clone);
  selectedId = clone.id;
  persist();
  renderAll();
  toast("Recipe duplicated");
}

function deleteSelectedRecipe(){
  if(!selectedId) return;
  if(!confirm("Delete this recipe from the admin draft?")) return;
  state.recipes = state.recipes.filter(recipe => recipe.id !== selectedId);
  selectedId = state.recipes[0]?.id || null;
  persist();
  renderAll();
  toast("Recipe deleted");
}

function fillExampleRecipe(){
  $("fTitle").value = "Honey Garlic Salmon Bowls";
  $("fAuthor").value = "Tyler";
  $("fCategoryMode").value = "Auto";
  $("fMealType").value = "Dinner";
  $("fTime").value = 28;
  $("fServings").value = 3;
  $("fRating").value = 5;
  $("fDifficulty").value = "Easy";
  $("fTags").value = "High Protein, Quick Meal";
  $("fIngredients").value = "Salmon, rice, broccoli, honey, garlic, soy sauce";
  $("fSteps").value = "Cook rice.\nBake or pan-sear salmon with honey garlic sauce.\nSteam broccoli.\nAssemble bowls and serve warm.";
  $("fNotes").value = "Use gluten-free soy sauce if needed.";
  updateAnalysisPreview();
}

function renderCategoryManager(){
  const host = $("categoryManager");
  host.innerHTML = state.categories.map((cat, index) => `
    <div class="category-item">
      <div><strong>${escapeHTML(cat.icon || "✨")} ${escapeHTML(cat.label)}</strong><div class="muted" style="font-size:12px;margin-top:4px">${escapeHTML(cat.desc || "No description")}</div></div>
      <button class="btn btn-soft" onclick="deleteCategory(${index})">Remove</button>
    </div>`).join("");
}

function addCategory(){
  const label = $("cLabel").value.trim();
  if(!label) return toast("Name the category");
  if(state.categories.some(cat => cat.label.toLowerCase() === label.toLowerCase())) return toast("Category already exists");
  state.categories.push({ label, icon: $("cIcon").value.trim() || "✨", desc: $("cDesc").value.trim() || "Custom category." });
  $("cLabel").value = ""; $("cIcon").value = ""; $("cDesc").value = "";
  persist(); renderAll(); toast("Category added");
}

function deleteCategory(index){
  const cat = state.categories[index];
  if(!cat) return;
  if(state.recipes.some(recipe => recipe.category === cat.label)) return toast("Category is used by recipes");
  state.categories.splice(index, 1);
  persist(); renderAll(); toast("Category removed");
}

function loadSettings(){
  $("sSiteName").value = state.config.siteName || "MyCuisine";
  $("sNavLabel").value = state.config.navLabel || "Private Kitchen";
  $("sEyebrow").value = state.config.eyebrow || "";
  $("sHeroTitle").value = state.config.heroTitle || "";
  $("sHeroItalic").value = state.config.heroItalic || "";
  $("sHeroDescription").value = state.config.heroDescription || "";
  $("sAnnouncementText").value = state.config.announcementText || "";
  $("sAccessCode").value = state.config.accessCode || "";
  $("sAdminPassword").value = state.config.adminPassword || "";
  $("sRequireAccess").value = String(!!state.config.requireAccessCode);
}

function saveSettings(){
  state.config.siteName = $("sSiteName").value.trim() || "MyCuisine";
  state.config.navLabel = $("sNavLabel").value.trim() || "Private Kitchen";
  state.config.eyebrow = $("sEyebrow").value.trim();
  state.config.heroTitle = $("sHeroTitle").value.trim();
  state.config.heroItalic = $("sHeroItalic").value.trim();
  state.config.heroDescription = $("sHeroDescription").value.trim();
  state.config.announcementText = $("sAnnouncementText").value.trim();
  state.config.accessCode = $("sAccessCode").value.trim() || "kitchen2026";
  state.config.adminPassword = $("sAdminPassword").value.trim() || "mycuisine2026";
  state.config.requireAccessCode = $("sRequireAccess").value === "true";
  persist();
  toast("Settings saved");
}

function buildDataFile(){
  return `/* ═══════════════════════════════════════════════════════════════\n   MyCuisine — Private Recipe Club\n   DATA FILE\n   Exported from admin.html\n═══════════════════════════════════════════════════════════════ */\n\nlet SITE_CONFIG = ${JSON.stringify(state.config, null, 2)};\n\nlet CATEGORIES = ${JSON.stringify(state.categories, null, 2)};\n\nlet RESTRICTIONS = ${JSON.stringify(state.restrictions, null, 2)};\n\nlet CATEGORY_RULES = ${JSON.stringify(state.categoryRules, null, 2)};\n\nlet RECIPES = ${JSON.stringify(state.recipes, null, 2)};\n`;
}

function updateExportPreview(){ if($("exportPreview")) $("exportPreview").value = buildDataFile(); }
function downloadDataFile(){
  const blob = new Blob([buildDataFile()], { type:"text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "recipes.js"; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("recipes.js downloaded");
}
function copyDataFile(){ navigator.clipboard?.writeText(buildDataFile()).then(() => toast("File text copied")); }

function renderAll(){ renderRecipeList(); renderCategoryManager(); fillCategoryOptions(); loadSettings(); if(selectedId) loadSelectedRecipe(); updateExportPreview(); }

window.addEventListener("DOMContentLoaded", () => {
  setTheme(localStorage.getItem(LS.theme) || "light");
  setupGate();
  ["fTitle","fIngredients","fTags","fCategoryMode"].forEach(id => $(id).addEventListener("input", updateAnalysisPreview));
  $("fCategoryMode").addEventListener("change", updateAnalysisPreview);
  renderAll();
});
