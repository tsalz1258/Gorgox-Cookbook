/* MyCuisine public recipe library */
const LS = {
  theme: "mycuisine-theme",
  access: "mycuisine-access-ok",
  favorites: "mycuisine-favorites",
  restrictions: "mycuisine-active-restrictions",
  announce: "mycuisine-announcement-dismissed"
};

let activeCategory = "All";
let activeTag = "All";
let safeOnly = false;
let favoritesOnly = false;
let searchTerm = "";
let activeRestrictions = loadJSON(LS.restrictions, ["dairy"]);
let favorites = loadJSON(LS.favorites, []);

function $(id){ return document.getElementById(id); }
function loadJSON(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch{ return fallback; } }
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function normalize(value){ return String(value || "").toLowerCase(); }
function arrayText(items){ return Array.isArray(items) ? items.join(" ") : String(items || ""); }
function slug(value){ return normalize(value).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || `recipe-${Date.now()}`; }
function unique(items){ return [...new Set(items.filter(Boolean))]; }

function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(LS.theme, theme);
  updateThemePills();
}
function toggleTheme(){ setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); }
function updateThemePills(){
  const theme = document.documentElement.getAttribute("data-theme");
  if($("lightPill")) $("lightPill").classList.toggle("on", theme === "light");
  if($("darkPill")) $("darkPill").classList.toggle("on", theme === "dark");
}

function setupAccessGate(){
  if(!SITE_CONFIG.requireAccessCode) return;
  if(localStorage.getItem(LS.access) === "true") return;
  const gate = $("accessGate");
  if(gate) gate.classList.remove("hidden");
  $("gateForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const entered = $("accessCode").value.trim();
    if(entered === SITE_CONFIG.accessCode){
      localStorage.setItem(LS.access, "true");
      gate.classList.add("hidden");
      toast("Welcome in");
    }else{
      $("gateError").classList.add("show");
    }
  });
}

function applyConfig(){
  document.title = `${SITE_CONFIG.siteName} · Private Recipe Club`;
  $("navLabel").textContent = SITE_CONFIG.navLabel;
  $("heroEyebrow").textContent = SITE_CONFIG.eyebrow;
  $("heroTitle").textContent = SITE_CONFIG.heroTitle;
  $("heroItalic").textContent = SITE_CONFIG.heroItalic;
  $("heroDescription").textContent = SITE_CONFIG.heroDescription;
  if(SITE_CONFIG.announcementActive && localStorage.getItem(LS.announce) !== "true"){
    $("announcementText").textContent = SITE_CONFIG.announcementText;
    $("announcement").classList.remove("hidden");
  }
}

function dismissAnnouncement(){
  localStorage.setItem(LS.announce, "true");
  $("announcement").classList.add("hidden");
}

function getConflicts(recipe){
  const text = normalize(`${recipe.title} ${arrayText(recipe.ingredients)} ${arrayText(recipe.tags)} ${arrayText(recipe.steps)}`);
  const conflicts = [];
  activeRestrictions.forEach((id) => {
    const rule = RESTRICTIONS.find((item) => item.id === id);
    if(rule && rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))){
      conflicts.push(rule.warning);
    }
  });
  return unique(conflicts);
}

function getAllTags(){
  return unique(RECIPES.flatMap((recipe) => recipe.tags || [])).sort();
}

function matchesRecipe(recipe){
  const haystack = normalize([recipe.title, recipe.author, recipe.category, recipe.mealType, arrayText(recipe.tags), arrayText(recipe.ingredients), arrayText(recipe.steps), recipe.notes].join(" "));
  const conflicts = getConflicts(recipe);
  if(activeCategory !== "All" && recipe.category !== activeCategory) return false;
  if(activeTag !== "All" && !(recipe.tags || []).includes(activeTag)) return false;
  if(favoritesOnly && !favorites.includes(recipe.id)) return false;
  if(safeOnly && conflicts.length > 0) return false;
  if(searchTerm && !haystack.includes(searchTerm)) return false;
  return true;
}

function renderRestrictionChips(){
  const host = $("restrictionChips");
  host.innerHTML = "";
  RESTRICTIONS.forEach((restriction) => {
    const btn = document.createElement("button");
    btn.className = `chip safe ${activeRestrictions.includes(restriction.id) ? "active" : ""}`;
    btn.textContent = restriction.label;
    btn.onclick = () => {
      activeRestrictions = activeRestrictions.includes(restriction.id)
        ? activeRestrictions.filter((id) => id !== restriction.id)
        : [...activeRestrictions, restriction.id];
      saveJSON(LS.restrictions, activeRestrictions);
      renderAll();
    };
    host.appendChild(btn);
  });
}

function renderCategoryChips(){
  const host = $("categoryChips");
  host.innerHTML = "";
  const all = [{ label:"All", icon:"◎" }, ...CATEGORIES];
  all.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `chip ${activeCategory === cat.label ? "active" : ""}`;
    btn.textContent = `${cat.icon || "•"} ${cat.label}`;
    btn.onclick = () => { activeCategory = cat.label; renderAll(); };
    host.appendChild(btn);
  });
}

function renderTagChips(){
  const host = $("tagChips");
  host.innerHTML = "";
  const tagButtons = ["All", "Safe Only", "Favorites", ...getAllTags()];
  tagButtons.forEach((tag) => {
    const btn = document.createElement("button");
    const isActive = tag === "Safe Only" ? safeOnly : tag === "Favorites" ? favoritesOnly : activeTag === tag;
    btn.className = `chip ${tag === "Safe Only" ? "safe" : ""} ${tag === "Favorites" ? "danger" : ""} ${isActive ? "active" : ""}`;
    btn.textContent = tag === "Favorites" ? `★ ${tag}` : tag;
    btn.onclick = () => {
      if(tag === "Safe Only") safeOnly = !safeOnly;
      else if(tag === "Favorites") favoritesOnly = !favoritesOnly;
      else activeTag = tag;
      renderAll();
    };
    host.appendChild(btn);
  });
}

function renderCards(){
  const grid = $("recipeGrid");
  const recipes = RECIPES.filter(matchesRecipe);
  grid.innerHTML = "";
  $("emptyState").classList.toggle("hidden", recipes.length > 0);
  $("searchCount").textContent = `${recipes.length} result${recipes.length === 1 ? "" : "s"}`;
  $("resultNote").textContent = recipes.length === RECIPES.length ? "Showing all recipes" : `Showing ${recipes.length} filtered recipe${recipes.length === 1 ? "" : "s"}`;

  recipes.forEach((recipe) => {
    const conflicts = getConflicts(recipe);
    const card = document.createElement("article");
    card.className = "recipe-card";
    card.onclick = () => openRecipe(recipe.id);
    card.innerHTML = `
      <div class="recipe-top">
        <div class="recipe-meta">
          <div class="recipe-type">${escapeHTML(recipe.category)} · ${escapeHTML(recipe.mealType || "Meal")}</div>
          <button class="fav-btn ${favorites.includes(recipe.id) ? "active" : ""}" onclick="event.stopPropagation();toggleFavorite('${recipe.id}')" title="Favorite">★</button>
        </div>
        <h3 class="recipe-title">${escapeHTML(recipe.title)}</h3>
      </div>
      <div class="recipe-body">
        <div class="recipe-facts">
          <div class="fact"><strong>${Number(recipe.time || 0)}</strong> min</div>
          <div class="fact"><strong>${Number(recipe.servings || 0)}</strong> servings</div>
          <div class="fact"><strong>${Number(recipe.rating || 0)}/5</strong> rating</div>
        </div>
        <div class="tag-row">
          ${conflicts.length ? `<span class="tag warn">⚠ Review</span>` : `<span class="tag good">✓ Safe match</span>`}
          ${(recipe.tags || []).slice(0,4).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
        </div>
        <p class="recipe-desc">${escapeHTML(Array.isArray(recipe.steps) ? recipe.steps.join(" ") : recipe.steps || "")}</p>
        <div class="ingredient-cloud">
          ${(recipe.ingredients || []).slice(0,7).map((item) => `<span class="ingredient">${escapeHTML(item)}</span>`).join("")}
        </div>
        <div class="card-foot"><span>By ${escapeHTML(recipe.author || "Friend")}</span><span class="arrow">↗</span></div>
      </div>`;
    grid.appendChild(card);
  });
}

function renderReviewList(){
  const host = $("reviewList");
  const items = RECIPES.map((recipe) => ({ recipe, conflicts:getConflicts(recipe) })).filter((item) => item.conflicts.length > 0);
  if(!items.length){
    host.innerHTML = `<div class="review-item" style="border-color:rgba(22,128,60,.22);background:rgba(22,128,60,.08)"><div class="review-title">✓ No conflicts found</div><div class="review-reason">No recipes conflict with the current restriction profile.</div></div>`;
    return;
  }
  host.innerHTML = items.slice(0,5).map(({recipe, conflicts}) => `
    <div class="review-item">
      <div class="review-title">${escapeHTML(recipe.title)}</div>
      <div class="review-reason">${conflicts.map(escapeHTML).join(" · ")}</div>
    </div>`).join("");
}

function renderStats(){
  const safe = RECIPES.filter((recipe) => getConflicts(recipe).length === 0).length;
  $("statRecipes").textContent = RECIPES.length;
  $("statSafe").textContent = safe;
  $("statFavorites").textContent = favorites.length;
}

function renderAll(){
  renderRestrictionChips();
  renderCategoryChips();
  renderTagChips();
  renderCards();
  renderReviewList();
  renderStats();
}

function toggleFavorite(id){
  favorites = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
  saveJSON(LS.favorites, favorites);
  renderAll();
}

function openRecipe(id){
  const recipe = RECIPES.find((item) => item.id === id);
  if(!recipe) return;
  const conflicts = getConflicts(recipe);
  $("modalKicker").textContent = `${recipe.category} · ${recipe.mealType || "Meal"}`;
  $("modalTitle").textContent = recipe.title;
  $("modalSub").textContent = `${recipe.time} minutes · ${recipe.servings} servings · ${recipe.difficulty || "Easy"} · Added by ${recipe.author || "Friend"}`;
  const steps = Array.isArray(recipe.steps) ? recipe.steps : String(recipe.steps || "").split(/\n+/).filter(Boolean);
  $("modalBody").innerHTML = `
    <div class="tag-row" style="margin-bottom:18px">
      ${conflicts.length ? `<span class="tag warn">⚠ ${conflicts.map(escapeHTML).join(" · ")}</span>` : `<span class="tag good">✓ Safe for selected restrictions</span>`}
      ${(recipe.tags || []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
    </div>
    <div class="recipe-detail-grid">
      <div class="detail-box">
        <div class="detail-label">Ingredients</div>
        <ul>${(recipe.ingredients || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      </div>
      <div class="detail-box">
        <div class="detail-label">Instructions</div>
        <ol>${steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
      </div>
      <div class="detail-box">
        <div class="detail-label">Notes</div>
        <p>${escapeHTML(recipe.notes || "No extra notes yet.")}</p>
      </div>
      <div class="detail-box">
        <div class="detail-label">Quick Actions</div>
        <div class="toolbar" style="margin-top:0">
          <button class="btn btn-primary" onclick="copyIngredients('${recipe.id}')">Copy Ingredients</button>
          <button class="btn btn-soft" onclick="toggleFavorite('${recipe.id}')">${favorites.includes(recipe.id) ? "Remove Favorite" : "Save Favorite"}</button>
        </div>
      </div>
    </div>`;
  $("recipeModal").classList.add("open");
}
function closeModal(){ $("recipeModal").classList.remove("open"); }

function copyIngredients(id){
  const recipe = RECIPES.find((item) => item.id === id);
  if(!recipe) return;
  const text = `${recipe.title}\n\nIngredients:\n${(recipe.ingredients || []).map((item) => `- ${item}`).join("\n")}`;
  navigator.clipboard?.writeText(text).then(() => toast("Ingredients copied"));
}

function clearSearch(){ $("searchInput").value = ""; searchTerm = ""; renderAll(); }
function toast(message){ const el = $("toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }
function escapeHTML(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char])); }

window.addEventListener("keydown", (event) => {
  const macCombo = event.metaKey && event.altKey && event.key.toLowerCase() === "a";
  const winCombo = event.ctrlKey && event.altKey && event.key.toLowerCase() === "a";
  if(macCombo || winCombo){ window.location.href = "admin.html"; }
  if(event.key === "Escape") closeModal();
});

window.addEventListener("DOMContentLoaded", () => {
  setTheme(localStorage.getItem(LS.theme) || document.documentElement.getAttribute("data-theme") || "light");
  applyConfig();
  setupAccessGate();
  $("searchInput").addEventListener("input", (event) => { searchTerm = normalize(event.target.value); renderAll(); });
  renderAll();
});
