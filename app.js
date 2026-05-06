let data = loadData();
let selectedProfileIds = [data.profiles?.[0]?.id].filter(Boolean);
let selectedCategory = "All";
let selectedCollection = "All";
let selectedRecipeId = null;
let cookSteps = [];
let cookIndex = 0;
let groceryItems = [];
let planner = JSON.parse(localStorage.getItem(MC_PLAN_KEY) || "null") || data.planner || {};
let pantryItems = splitList(localStorage.getItem(MC_PANTRY_KEY) || "");

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

function boot(){
  initTheme();
  setupGate();
  setupNav();
  renderAnnouncement();
  renderStats();
  renderProfileChips();
  renderCategoryChips();
  renderCollectionChips();
  renderRecipes();
  renderPlanner();
  renderProfiles();
  renderCollections();
  renderGrocery();
  renderPantry();
  setupEvents();
  injectFeatureStyles();
}

document.addEventListener("DOMContentLoaded", boot);

function setupGate(){
  const gate = qs("#gate");
  if(localStorage.getItem(MC_GATE_KEY)==="ok") gate?.classList.add("hidden");
  qs("#gateForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const code = qs("#accessCode").value.trim();
    if(code === data.config.friendAccessCode){
      localStorage.setItem(MC_GATE_KEY,"ok");
      gate.classList.add("hidden");
    } else {
      qs("#gateError").classList.add("show");
    }
  });
}

function setupNav(){
  qsa("[data-theme]").forEach(btn => btn.addEventListener("click", () => applyTheme(btn.dataset.theme)));
  document.addEventListener("keydown", e => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if((isMac && e.metaKey && e.altKey && e.key.toLowerCase()==="a") || (!isMac && e.ctrlKey && e.altKey && e.key.toLowerCase()==="a")){
      location.href = "admin.html";
    }
  });
  qsa(".tab").forEach(tab => tab.addEventListener("click", () => switchView(tab.dataset.view)));
}

function setupEvents(){
  qs("#searchInput")?.addEventListener("input", renderRecipes);
  qs("#safeOnly")?.addEventListener("click", () => { qs("#safeOnly").classList.toggle("active"); renderRecipes(); });
  qs("#resetFilters")?.addEventListener("click", resetFilters);
  qs("#autoPlan")?.addEventListener("click", autoFillPlanner);
  qs("#clearPlan")?.addEventListener("click", clearPlanner);
  qs("#copyGrocery")?.addEventListener("click", copyGrocery);
  qs("#emailGrocery")?.addEventListener("click", emailGrocery);
  qs("#clearGrocery")?.addEventListener("click", () => { groceryItems=[]; localStorage.setItem(MC_GROCERY_KEY,"[]"); renderGrocery(); });
  qs("#pantryInput")?.addEventListener("input", e => { pantryItems=splitList(e.target.value); localStorage.setItem(MC_PANTRY_KEY, e.target.value); renderRecipes(); });
  qs("#cookTonight")?.addEventListener("click", cookThisTonight);
  qs("#modalClose")?.addEventListener("click", closeModal);
  qs("#modalScrim")?.addEventListener("click", closeModal);
  qs("#addModalGrocery")?.addEventListener("click", addSelectedRecipeToGrocery);
  qs("#copyModalRecipe")?.addEventListener("click", copySelectedRecipe);
  qs("#startCookMode")?.addEventListener("click", startCookMode);
  qs("#cookClose")?.addEventListener("click", stopCookMode);
  qs("#cookNext")?.addEventListener("click", () => moveCookStep(1));
  qs("#cookPrev")?.addEventListener("click", () => moveCookStep(-1));
  qs("#copyCurrentPlan")?.addEventListener("click", copyPlan);
}

function switchView(view){
  qsa(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===view));
  qsa(".view").forEach(v=>v.classList.toggle("active", v.id===`view-${view}`));
}

function renderAnnouncement(){
  const el = qs("#announcement");
  if(!el) return;
  if(data.config.announcementActive){
    el.classList.add("show");
    el.querySelector("span").textContent = data.config.announcementText;
    el.querySelector("button").onclick = () => el.classList.remove("show");
  }
}

function currentProfiles(){ return getSelectedProfiles(data, selectedProfileIds); }
function profileNames(){ return currentProfiles().map(p=>p.shortName||p.name).join(" + ") || "profiles"; }

function renderStats(){
  const approved = getApprovedRecipes(data);
  const safe = approved.filter(r => analyzeRecipeForProfiles(r,currentProfiles(),data).level === "safe").length;
  qs("#statRecipes").textContent = approved.length;
  qs("#statSafe").textContent = safe;
  qs("#statProfiles").textContent = data.profiles.length;
  qs("#statPlanner").textContent = Object.values(planner).filter(Boolean).length;
}

function renderProfileChips(){
  const wrap = qs("#profileChips");
  if(!wrap) return;
  wrap.innerHTML = data.profiles.map(profile => `<button class="profile-chip ${selectedProfileIds.includes(profile.id)?"active":""}" data-profile="${profile.id}">${escapeHtml(profile.shortName||profile.name)}</button>`).join("");
  wrap.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.profile;
    if(selectedProfileIds.includes(id)) selectedProfileIds = selectedProfileIds.filter(x=>x!==id);
    else selectedProfileIds.push(id);
    if(selectedProfileIds.length===0) selectedProfileIds=[id];
    renderProfileChips(); renderStats(); renderRecipes(); renderPlanner(); renderGrocery();
  }));
}

function renderCategoryChips(){
  const wrap = qs("#categoryChips");
  if(!wrap) return;
  wrap.innerHTML = ["All", ...data.categories].map(cat => `<button class="chip ${selectedCategory===cat?"active":""}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join("");
  wrap.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { selectedCategory = btn.dataset.cat; renderCategoryChips(); renderRecipes(); }));
}

function renderCollectionChips(){
  const wrap = qs("#collectionChips");
  if(!wrap) return;
  const labels = ["All", "Favorites", ...(data.collections||[]).map(c=>c.label)];
  wrap.innerHTML = labels.map(label => `<button class="chip ${selectedCollection===label?"active":""}" data-col="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("");
  wrap.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { selectedCollection = btn.dataset.col; renderCollectionChips(); renderRecipes(); }));
}

function renderRecipes(){
  const grid = qs("#recipeGrid");
  if(!grid) return;
  const query = normalize(qs("#searchInput")?.value || "");
  const safeOnly = qs("#safeOnly")?.classList.contains("active");
  const profiles = currentProfiles();
  let recipes = getApprovedRecipes(data);

  recipes = recipes.filter(recipe => {
    const text = normalize(`${recipe.title} ${recipe.category} ${recipe.mealType} ${(recipe.tags||[]).join(" ")} ${(recipe.ingredients||[]).join(" ")} ${recipe.notes||""}`);
    const analysis = analyzeRecipeForProfiles(recipe, profiles, data);
    const inCategory = selectedCategory === "All" || recipe.category === selectedCategory;
    const inSearch = !query || text.includes(query);
    const safeMatch = !safeOnly || analysis.level === "safe";
    let inCollection = true;
    if(selectedCollection === "Favorites") inCollection = (recipe.favorites||[]).length > 0;
    else if(selectedCollection !== "All"){
      const collection = (data.collections||[]).find(c=>c.label===selectedCollection);
      inCollection = collection ? (collection.recipeIds||[]).includes(recipe.id) : true;
    }
    return inCategory && inSearch && safeMatch && inCollection;
  });

  recipes.sort((a,b) => {
    const aa = analyzeRecipeForProfiles(a, profiles, data);
    const bb = analyzeRecipeForProfiles(b, profiles, data);
    return bb.score - aa.score;
  });

  if(!recipes.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">No recipes found. Try removing a filter or adding one through the admin portal.</div>`;
    qs("#resultCount").textContent = "0 recipes";
    return;
  }
  qs("#resultCount").textContent = `${recipes.length} recipe${recipes.length===1?"":"s"}`;
  grid.innerHTML = recipes.map(recipeCardHtml).join("");
  grid.querySelectorAll(".recipe-card").forEach(card => card.addEventListener("click", e => {
    if(e.target.closest(".favorite")) return;
    openRecipe(card.dataset.id);
  }));
  grid.querySelectorAll(".favorite").forEach(btn => btn.addEventListener("click", e => {
    e.stopPropagation();
    const id = btn.dataset.id;
    const recipe = getRecipe(data,id);
    recipe.favorites = recipe.favorites || [];
    if(recipe.favorites.includes("tjs-safe")) recipe.favorites = recipe.favorites.filter(x=>x!=="tjs-safe");
    else recipe.favorites.push("tjs-safe");
    saveData(data); renderRecipes(); renderCollections();
  }));
}

function recipeCardHtml(recipe){
  const profiles = currentProfiles();
  const analysis = analyzeRecipeForProfiles(recipe, profiles, data);
  const label = getSafetyLabel(analysis, profileNames());
  const pantry = getPantryMatch(recipe, pantryItems);
  const img = recipe.imageUrl ? `<img src="${escapeHtml(recipe.imageUrl)}" alt="${escapeHtml(recipe.title)}">` : `<div class="photo-fallback">${escapeHtml(getInitials(recipe.title))}</div>`;
  const tags = (recipe.tags||[]).slice(0,5).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  return `<article class="recipe-card" data-id="${recipe.id}">
    <div class="photo">${img}<span class="status-pill ${label.cls}">${escapeHtml(label.text)}</span><button class="favorite ${(recipe.favorites||[]).includes("tjs-safe")?"on":""}" data-id="${recipe.id}" title="Favorite">★</button></div>
    <div class="recipe-body">
      <div class="recipe-type">${escapeHtml(recipe.category)} • ${escapeHtml(recipe.mealType)} • ${escapeHtml(recipe.difficulty)}</div>
      <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
      <p class="recipe-desc">${escapeHtml(recipe.notes || "Open the recipe to review ingredients, substitutions, and cooking steps.")}</p>
      <div class="metrics">
        <div class="metric"><strong>${Number(recipe.time||0)}</strong><span>Min</span></div>
        <div class="metric"><strong>${Number(recipe.servings||0)}</strong><span>Serv</span></div>
        <div class="metric"><strong>${analysis.score}</strong><span>Score</span></div>
        <div class="metric"><strong>${pantry.count}/${pantry.total}</strong><span>Pantry</span></div>
      </div>
      <div class="tag-row">${tags}</div>
      <div class="score-row"><span class="score"><strong>${analysis.level === "safe" ? "Ready" : analysis.level === "warning" ? "Review" : "Blocked"}</strong> for ${escapeHtml(profileNames())}</span><span class="arrow">↗</span></div>
    </div>
  </article>`;
}

function resetFilters(){
  qs("#searchInput").value = "";
  selectedCategory = "All";
  selectedCollection = "All";
  qs("#safeOnly")?.classList.remove("active");
  renderCategoryChips(); renderCollectionChips(); renderRecipes();
}

function openRecipe(id){
  selectedRecipeId = id;
  const recipe = getRecipe(data,id);
  if(!recipe) return;
  const analysis = analyzeRecipeForProfiles(recipe,currentProfiles(),data);
  const label = getSafetyLabel(analysis, profileNames());
  qs("#modalTitle").textContent = recipe.title;
  qs("#modalSub").textContent = `${recipe.category} • ${recipe.mealType} • ${recipe.time} minutes • ${recipe.servings} servings`;
  qs("#modalBody").innerHTML = recipeDetailHtml(recipe,analysis,label);
  qs("#recipeModal").classList.add("open");
}
function closeModal(){qs("#recipeModal")?.classList.remove("open");}

function recipeDetailHtml(recipe,analysis,label){
  const warnings = [...analysis.blocked.map(x=>x.message), ...analysis.caution.map(x=>x.message)];
  const warningHtml = warnings.length ? `<div class="warning-box"><strong>${escapeHtml(label.text)}</strong><ul class="ingredient-list">${warnings.map(w=>`<li>${escapeHtml(w)}</li>`).join("")}</ul></div>` : `<div class="safe-box"><strong>${escapeHtml(label.text)}</strong><p class="muted" style="margin-top:6px">No blocked or warning ingredients were detected for the selected profile(s).</p></div>`;
  const swaps = analysis.swaps.length ? analysis.swaps.map(s=>`<li><strong>${escapeHtml(s.ingredient)}</strong>: ${escapeHtml(s.choices.join(", "))}</li>`).join("") : `<li>No substitution needed based on selected profiles.</li>`;
  const nutrition = recipe.nutrition || {};
  const versions = (recipe.versions||[]).length ? recipe.versions.map(v=>`<li><strong>${escapeHtml(v.label)}</strong>: ${escapeHtml(v.notes)}</li>`).join("") : `<li>No alternate versions yet.</li>`;
  return `<div class="detail-grid">
    <section class="detail-section"><h4>Safety Review</h4>${warningHtml}<h4>Suggested Swaps</h4><ul class="ingredient-list">${swaps}</ul></section>
    <section class="detail-section"><h4>Nutrition Estimate</h4><div class="metrics"><div class="metric"><strong>${nutrition.calories||"—"}</strong><span>Cal</span></div><div class="metric"><strong>${nutrition.protein||"—"}</strong><span>Protein</span></div><div class="metric"><strong>${nutrition.carbs||"—"}</strong><span>Carbs</span></div><div class="metric"><strong>${nutrition.fat||"—"}</strong><span>Fat</span></div></div><p class="muted" style="font-size:12px;margin-top:10px">Nutrition values are estimates and should be verified if needed.</p></section>
    <section class="detail-section"><h4>Ingredients</h4><ul class="ingredient-list">${(recipe.ingredients||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join("")}</ul></section>
    <section class="detail-section"><h4>Steps</h4><ol class="step-list">${(recipe.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ol></section>
    <section class="detail-section"><h4>Recipe Versions</h4><ul class="ingredient-list">${versions}</ul></section>
    <section class="detail-section"><h4>Notes</h4><p class="muted" style="line-height:1.7">${escapeHtml(recipe.notes||"No notes yet.")}</p></section>
  </div>`;
}

function addSelectedRecipeToGrocery(){
  if(!selectedRecipeId) return;
  if(!groceryItems.includes(selectedRecipeId)) groceryItems.push(selectedRecipeId);
  localStorage.setItem(MC_GROCERY_KEY, JSON.stringify(groceryItems));
  renderGrocery();
  toast("Recipe added to grocery list");
}
function copySelectedRecipe(){
  const recipe = getRecipe(data,selectedRecipeId);
  if(!recipe) return;
  copyText(formatRecipeForCopy(recipe)).then(()=>toast("Recipe copied"));
}

function renderPlanner(){
  const wrap = qs("#plannerGrid");
  if(!wrap) return;
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const options = [`<option value="">Choose recipe</option>`, ...getApprovedRecipes(data).map(r=>`<option value="${r.id}">${escapeHtml(r.title)}</option>`)].join("");
  wrap.innerHTML = days.map(day => {
    const recipe = getRecipe(data, planner[day]);
    const analysis = recipe ? analyzeRecipeForProfiles(recipe,currentProfiles(),data) : null;
    const label = analysis ? getSafetyLabel(analysis, profileNames()) : null;
    return `<div class="plan-card"><div class="plan-day">${day}</div><select class="plan-select" data-day="${day}">${options}</select>${recipe ? `<h3 class="plan-title">${escapeHtml(recipe.title)}</h3><span class="flag ${label.cls.replace("status","flag")}">${escapeHtml(label.text)}</span><p class="muted" style="font-size:12px;line-height:1.6;margin-top:10px">${recipe.time} min • ${recipe.servings} servings</p>` : `<p class="muted" style="font-size:13px;line-height:1.6">No recipe selected.</p>`}</div>`;
  }).join("");
  wrap.querySelectorAll("select").forEach(sel => {
    sel.value = planner[sel.dataset.day] || "";
    sel.addEventListener("change", () => { planner[sel.dataset.day]=sel.value; localStorage.setItem(MC_PLAN_KEY, JSON.stringify(planner)); data.planner=planner; renderPlanner(); renderStats(); });
  });
}
function autoFillPlanner(){
  const maxTime = Number(qs("#plannerTime")?.value || 45);
  planner = autoPlanWeek(data, selectedProfileIds, pantryItems, maxTime);
  localStorage.setItem(MC_PLAN_KEY, JSON.stringify(planner));
  data.planner=planner;
  renderPlanner(); renderStats(); renderGrocery(); toast("Week planned");
}
function clearPlanner(){planner={Monday:"",Tuesday:"",Wednesday:"",Thursday:"",Friday:"",Saturday:"",Sunday:""}; localStorage.setItem(MC_PLAN_KEY, JSON.stringify(planner)); data.planner=planner; renderPlanner(); renderStats();}
function copyPlan(){
  const text = Object.entries(planner).map(([day,id]) => `${day}: ${getRecipe(data,id)?.title || "—"}`).join("\n");
  copyText(text).then(()=>toast("Meal plan copied"));
}

function getGroceryRecipeIds(){
  try{groceryItems = JSON.parse(localStorage.getItem(MC_GROCERY_KEY)||"[]");}catch{groceryItems=[];}
  const plannedIds = Object.values(planner).filter(Boolean);
  return [...groceryItems, ...plannedIds].filter(Boolean);
}

function normalizeGroceryName(item){
  return normalize(item)
    .replace(/\b(fresh|baby|large|small|medium|chopped|diced|sliced|minced|boneless|skinless)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildGroceryWithQuantities(){
  const ids = getGroceryRecipeIds();
  const map = new Map();

  ids.forEach(id => {
    const recipe = getRecipe(data,id);
    if(!recipe) return;
    (recipe.ingredients||[]).forEach(item => {
      const key = normalizeGroceryName(item);
      if(!key) return;
      if(!map.has(key)){
        map.set(key, {
          item,
          count: 0,
          recipes: [],
          section: categorizeIngredient(item),
          flags: []
        });
      }
      const entry = map.get(key);
      entry.count += 1;
      if(!entry.recipes.includes(recipe.title)) entry.recipes.push(recipe.title);
    });
  });

  const profiles = currentProfiles();
  for(const entry of map.values()){
    const fakeRecipe = { title: entry.item, ingredients: [entry.item], notes: "" };
    const analysis = analyzeRecipeForProfiles(fakeRecipe, profiles, data);
    if(analysis.level === "danger") entry.flags.push("Blocked / swap needed");
    else if(analysis.level === "warning") entry.flags.push("Check label");
  }

  return [...map.values()].sort((a,b)=>a.section.localeCompare(b.section)||a.item.localeCompare(b.item));
}

function groceryLine(item){
  const qty = item.count > 1 ? ` ×${item.count}` : "";
  const usedIn = item.recipes?.length ? ` — used in ${item.recipes.length} meal${item.recipes.length===1?"":"s"}` : "";
  return `${item.item}${qty}${usedIn}${item.flags.length?` (${item.flags.join(", ")})`:""}`;
}

function groceryText(){
  const items = buildGroceryWithQuantities();
  const sections = unique(items.map(i=>i.section));
  return sections.map(section => `${section}\n${items.filter(i=>i.section===section).map(i=>`- ${groceryLine(i)}`).join("\n")}`).join("\n\n");
}

function ensureEmailButton(){
  const actions = qs("#view-grocery .planner-actions");
  if(actions && !qs("#emailGrocery")){
    const btn = document.createElement("button");
    btn.className = "btn btn-gold";
    btn.id = "emailGrocery";
    btn.type = "button";
    btn.textContent = "Email Grocery List";
    const copy = qs("#copyGrocery");
    if(copy) copy.insertAdjacentElement("afterend", btn);
    else actions.appendChild(btn);
    btn.addEventListener("click", emailGrocery);
  }
}

function renderGrocery(){
  ensureEmailButton();
  const items = buildGroceryWithQuantities();
  const wrap = qs("#groceryList");
  if(!wrap) return;
  if(!items.length){
    wrap.innerHTML = `<div class="empty">No grocery items yet. Add a recipe or create a meal plan.</div>`;
    qs("#grocerySummary").textContent = "Planner + saved recipes";
    return;
  }
  const sections = unique(items.map(i=>i.section));
  wrap.innerHTML = sections.map(section => `<div class="grocery-section"><h4>${escapeHtml(section)}</h4>${items.filter(i=>i.section===section).map(i=>`<div class="grocery-item"><span>${escapeHtml(i.item)}${i.count>1?` <strong>×${i.count}</strong>`:""}<small class="grocery-used">${i.recipes?.length?`Used in ${i.recipes.length} meal${i.recipes.length===1?"":"s"}`:""}</small></span><span>${i.flags.length ? `<span class="flag ${i.flags[0].includes("Blocked")?"flag-danger":"flag-warning"}">${escapeHtml(i.flags[0])}</span>` : `<span class="flag flag-safe">OK</span>`}</span></div>`).join("")}</div>`).join("");
  qs("#grocerySummary").textContent = `${items.length} item${items.length===1?"":"s"} with quantities from planner and saved recipes.`;
}

function copyGrocery(){
  const text = groceryText();
  copyText(text).then(()=>toast("Grocery list copied"));
}

function emailGrocery(){
  const text = groceryText();
  if(!text.trim()){ toast("No grocery items to email yet"); return; }
  const subject = encodeURIComponent("MyCuisine Grocery List");
  const body = encodeURIComponent(`MyCuisine Grocery List\n\n${text}`);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if(isMobile){
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast("Opening your mail app");
    return;
  }

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer");
  if(!opened){
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }
  toast("Opening email compose");
}

function injectFeatureStyles(){
  if(document.querySelector("#mcFeatureStyle")) return;
  const style = document.createElement("style");
  style.id = "mcFeatureStyle";
  style.textContent = `
    .grocery-item span:first-child{display:flex;flex-direction:column;gap:3px}
    .grocery-used{display:block;font-size:10px;line-height:1.35;color:var(--muted);font-weight:500;margin-top:2px}
  `;
  document.head.appendChild(style);
}

function renderProfiles(){
  const wrap = qs("#profileGrid");
  if(!wrap) return;
  wrap.innerHTML = data.profiles.map(p => `<article class="profile-card"><h3>${escapeHtml(p.name)}</h3><p class="muted" style="line-height:1.6">${escapeHtml(p.notes||"")}</p><div class="profile-list"><strong>Restrictions:</strong> ${(p.restrictions||[]).join(", ") || "None"}<br><strong>Blocked:</strong> ${(p.blockedIngredients||[]).slice(0,14).join(", ") || "None"}<br><strong>Warnings:</strong> ${(p.warningIngredients||[]).slice(0,10).join(", ") || "None"}<br><strong>Likes:</strong> ${(p.preferredIngredients||[]).join(", ") || "None"}</div></article>`).join("");
}
function renderCollections(){
  const wrap = qs("#collectionGrid");
  if(!wrap) return;
  wrap.innerHTML = (data.collections||[]).map(c => `<article class="collection-card"><h3>${escapeHtml(c.label)}</h3><p class="muted" style="line-height:1.6">${escapeHtml(c.desc||"")}</p><div class="profile-list"><strong>Recipes:</strong><br>${(c.recipeIds||[]).map(id=>escapeHtml(getRecipe(data,id)?.title||id)).join("<br>")}</div></article>`).join("");
}

function renderPantry(){
  const input = qs("#pantryInput");
  if(input) input.value = pantryItems.join(", ");
}
function cookThisTonight(){
  const maxTime = Number(qs("#tonightTime")?.value || 45);
  const recommendation = recommendTonight(data, selectedProfileIds, pantryItems, maxTime);
  const wrap = qs("#tonightResult");
  if(!recommendation){wrap.innerHTML = `<div class="empty">No safe recommendation found. Try increasing the time or adding more recipes.</div>`; return;}
  const r = recommendation.recipe;
  const label = getSafetyLabel(recommendation.analysis, profileNames());
  wrap.innerHTML = `<div class="recommend-card"><div class="panel-kicker">Tonight's best match</div><h3 class="recommend-title">${escapeHtml(r.title)}</h3><p class="muted" style="line-height:1.7">Score ${recommendation.score}/100 • Pantry ${recommendation.pantry.count}/${recommendation.pantry.total} • ${r.time} minutes</p><div style="margin:16px 0"><span class="flag ${label.cls.replace("status","flag")}">${escapeHtml(label.text)}</span></div><button class="btn btn-primary" onclick="openRecipe('${r.id}')">Open Recipe</button></div>`;
}

function startCookMode(){
  const recipe = getRecipe(data, selectedRecipeId);
  if(!recipe) return;
  cookSteps = recipe.steps || [];
  cookIndex = 0;
  qs("#cookTitle").textContent = recipe.title;
  qs("#cookMode").classList.add("open");
  renderCookStep();
}
function renderCookStep(){
  qs("#cookCounter").textContent = `${cookIndex+1} / ${cookSteps.length}`;
  qs("#cookStep").textContent = cookSteps[cookIndex] || "No steps added yet.";
}
function moveCookStep(delta){
  cookIndex = Math.max(0, Math.min(cookSteps.length-1, cookIndex + delta));
  renderCookStep();
}
function stopCookMode(){qs("#cookMode")?.classList.remove("open");}
