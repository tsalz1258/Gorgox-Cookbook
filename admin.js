let data = loadData();
let selectedRecipe = data.recipes?.[0]?.id || null;
let selectedProfile = data.profiles?.[0]?.id || null;

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

document.addEventListener("DOMContentLoaded", bootAdmin);

function bootAdmin(){
  initTheme();
  setupAdminGate();
  setupAdminNav();
  renderRecipeList();
  renderRecipeEditor();
  renderProfileList();
  renderProfileEditor();
  renderApprovalQueue();
  renderExportBox();
}

function setupAdminGate(){
  const gate = qs("#adminGate");
  if(sessionStorage.getItem("mycuisine.admin") === "ok") gate.classList.add("hidden");
  qs("#adminGateForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const pass = qs("#adminPass").value.trim();
    if(pass === data.config.adminPassword){
      sessionStorage.setItem("mycuisine.admin","ok");
      gate.classList.add("hidden");
    } else qs("#adminGateError").classList.add("show");
  });
}

function setupAdminNav(){
  qsa("[data-theme]").forEach(btn => btn.addEventListener("click", () => applyTheme(btn.dataset.theme)));
  qsa(".tab").forEach(tab => tab.addEventListener("click", () => switchAdminView(tab.dataset.view)));
  qs("#newRecipe")?.addEventListener("click", newRecipe);
  qs("#saveRecipe")?.addEventListener("click", saveRecipeFromForm);
  qs("#deleteRecipe")?.addEventListener("click", deleteCurrentRecipe);
  qs("#approveRecipe")?.addEventListener("click", () => updateCurrentRecipeStatus("approved"));
  qs("#pendingRecipe")?.addEventListener("click", () => updateCurrentRecipeStatus("pending"));
  qs("#newProfile")?.addEventListener("click", newProfile);
  qs("#saveProfile")?.addEventListener("click", saveProfileFromForm);
  qs("#deleteProfile")?.addEventListener("click", deleteCurrentProfile);
  qs("#exportBtn")?.addEventListener("click", () => { const text = exportRecipesJs(data); qs("#exportText").value = text; downloadText("recipes.js", text); toast("recipes.js downloaded"); });
  qs("#copyExport")?.addEventListener("click", () => copyText(qs("#exportText").value).then(()=>toast("Export copied")));
  qs("#resetLocal")?.addEventListener("click", () => { if(confirm("Reset local changes and reload from recipes.js?")){ localStorage.removeItem(MC_STORE_KEY); localStorage.removeItem(MC_PLAN_KEY); location.reload(); }});
}

function switchAdminView(view){
  qsa(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===view));
  qsa(".view").forEach(v=>v.classList.toggle("active", v.id===`view-${view}`));
}

function renderRecipeList(){
  const wrap = qs("#recipeList");
  if(!wrap) return;
  wrap.innerHTML = (data.recipes||[]).map(r => `<div class="admin-row ${selectedRecipe===r.id?"active":""}" data-id="${r.id}"><div class="admin-row-title">${escapeHtml(r.title)}</div><div class="admin-row-sub">${escapeHtml(r.category)} • ${escapeHtml(r.status||"approved")} • ${r.time||0} min</div></div>`).join("");
  wrap.querySelectorAll(".admin-row").forEach(row => row.addEventListener("click", () => { selectedRecipe = row.dataset.id; renderRecipeList(); renderRecipeEditor(); }));
}

function recipeFormValue(id, value){ const el = qs(id); if(el) el.value = value ?? ""; }
function getRecipeFormValue(id){ return qs(id)?.value ?? ""; }

function renderRecipeEditor(){
  const recipe = getRecipe(data, selectedRecipe);
  if(!recipe){ qs("#recipeEditorEmpty").classList.remove("hidden"); qs("#recipeEditorForm").classList.add("hidden"); return; }
  qs("#recipeEditorEmpty").classList.add("hidden"); qs("#recipeEditorForm").classList.remove("hidden");
  recipeFormValue("#rTitle", recipe.title);
  recipeFormValue("#rAuthor", recipe.author);
  recipeFormValue("#rStatus", recipe.status || "approved");
  recipeFormValue("#rCategory", recipe.category);
  recipeFormValue("#rMealType", recipe.mealType);
  recipeFormValue("#rImage", recipe.imageUrl);
  recipeFormValue("#rTags", (recipe.tags||[]).join(", "));
  recipeFormValue("#rTime", recipe.time);
  recipeFormValue("#rServings", recipe.servings);
  recipeFormValue("#rDifficulty", recipe.difficulty);
  recipeFormValue("#rCalories", recipe.nutrition?.calories || "");
  recipeFormValue("#rProtein", recipe.nutrition?.protein || "");
  recipeFormValue("#rCarbs", recipe.nutrition?.carbs || "");
  recipeFormValue("#rFat", recipe.nutrition?.fat || "");
  recipeFormValue("#rIngredients", (recipe.ingredients||[]).join("\n"));
  recipeFormValue("#rSteps", (recipe.steps||[]).join("\n"));
  recipeFormValue("#rNotes", recipe.notes);
  recipeFormValue("#rVersions", (recipe.versions||[]).map(v=>`${v.label}: ${v.notes}`).join("\n"));
  updateRecipeSafetyPreview();
  qsa("#recipeEditorForm input, #recipeEditorForm textarea, #recipeEditorForm select").forEach(el => el.oninput = updateRecipeSafetyPreview);
}

function getRecipeFromForm(existing={}){
  const title = getRecipeFormValue("#rTitle").trim() || "Untitled Recipe";
  const versionLines = sentenceList(getRecipeFormValue("#rVersions"));
  return {
    ...existing,
    id: existing.id || slugify(title),
    title,
    author: getRecipeFormValue("#rAuthor").trim() || "Friend",
    status: getRecipeFormValue("#rStatus") || "pending",
    category: getRecipeFormValue("#rCategory").trim() || "Other",
    mealType: getRecipeFormValue("#rMealType").trim() || "Dinner",
    imageUrl: getRecipeFormValue("#rImage").trim(),
    tags: splitList(getRecipeFormValue("#rTags")),
    time: Number(getRecipeFormValue("#rTime") || 0),
    servings: Number(getRecipeFormValue("#rServings") || 0),
    difficulty: getRecipeFormValue("#rDifficulty") || "Easy",
    nutrition: {
      calories: Number(getRecipeFormValue("#rCalories") || 0),
      protein: Number(getRecipeFormValue("#rProtein") || 0),
      carbs: Number(getRecipeFormValue("#rCarbs") || 0),
      fat: Number(getRecipeFormValue("#rFat") || 0)
    },
    ingredients: splitList(getRecipeFormValue("#rIngredients")),
    steps: sentenceList(getRecipeFormValue("#rSteps")),
    notes: getRecipeFormValue("#rNotes").trim(),
    versions: versionLines.map(line => {
      const [label,...rest] = line.split(":");
      return { label: label.trim() || "Version", notes: rest.join(":").trim() || line };
    }),
    favorites: existing.favorites || []
  };
}

function updateRecipeSafetyPreview(){
  const fake = getRecipeFromForm(getRecipe(data, selectedRecipe) || {});
  const html = (data.profiles||[]).map(profile => {
    const analysis = analyzeRecipeForProfiles(fake, [profile], data);
    const label = getSafetyLabel(analysis, profile.shortName||profile.name);
    const issues = [...analysis.blocked, ...analysis.caution].map(x=>`<li>${escapeHtml(x.message)}</li>`).join("") || `<li>No issues detected.</li>`;
    return `<div class="preview-card"><div class="preview-title">${escapeHtml(profile.name)}</div><span class="flag ${label.cls.replace("status","flag")}">${escapeHtml(label.text)}</span><ul class="ingredient-list" style="margin-top:10px">${issues}</ul></div>`;
  }).join("");
  qs("#safetyPreview").innerHTML = html;
}

function saveRecipeFromForm(){
  const idx = data.recipes.findIndex(r=>r.id===selectedRecipe);
  const recipe = getRecipeFromForm(idx>=0 ? data.recipes[idx] : {});
  if(idx>=0) data.recipes[idx]=recipe;
  else data.recipes.unshift(recipe);
  if(!data.categories.includes(recipe.category)) data.categories.push(recipe.category);
  saveData(data);
  selectedRecipe = recipe.id;
  renderRecipeList(); renderRecipeEditor(); renderApprovalQueue(); renderExportBox(); toast("Recipe saved");
}
function newRecipe(){
  const id = `new-recipe-${Date.now()}`;
  data.recipes.unshift({ id, status:"pending", title:"New Recipe", author:"Friend", category:"Other", mealType:"Dinner", imageUrl:"", tags:["Needs Review"], time:30, servings:2, difficulty:"Easy", nutrition:{calories:0,protein:0,carbs:0,fat:0}, ingredients:[], steps:[], notes:"", versions:[], favorites:[] });
  selectedRecipe=id; renderRecipeList(); renderRecipeEditor(); toast("New recipe ready");
}
function deleteCurrentRecipe(){
  if(!selectedRecipe || !confirm("Delete this recipe?")) return;
  data.recipes = data.recipes.filter(r=>r.id!==selectedRecipe);
  selectedRecipe = data.recipes?.[0]?.id || null;
  saveData(data); renderRecipeList(); renderRecipeEditor(); renderApprovalQueue(); renderExportBox(); toast("Recipe deleted");
}
function updateCurrentRecipeStatus(status){
  const recipe = getRecipe(data, selectedRecipe); if(!recipe) return;
  recipe.status = status;
  saveData(data); renderRecipeList(); renderRecipeEditor(); renderApprovalQueue(); renderExportBox(); toast(`Recipe marked ${status}`);
}

function renderApprovalQueue(){
  const wrap = qs("#approvalQueue");
  if(!wrap) return;
  const pending = (data.recipes||[]).filter(r=>(r.status||"approved") === "pending");
  if(!pending.length){wrap.innerHTML = `<div class="empty">No recipes are pending review.</div>`; return;}
  wrap.innerHTML = pending.map(r => {
    const tjs = data.profiles.find(p=>p.id==="tjs") || data.profiles[0];
    const analysis = analyzeRecipeForProfiles(r,[tjs],data);
    const label = getSafetyLabel(analysis, tjs.shortName||tjs.name);
    return `<div class="preview-card"><div class="preview-title">${escapeHtml(r.title)}</div><p class="muted">${escapeHtml(r.category)} • ${r.time} min • Added by ${escapeHtml(r.author)}</p><div style="margin:10px 0"><span class="flag ${label.cls.replace("status","flag")}">${escapeHtml(label.text)}</span></div><button class="btn btn-success" onclick="approveFromQueue('${r.id}')">Approve</button> <button class="btn btn-soft" onclick="editFromQueue('${r.id}')">Edit</button></div>`;
  }).join("");
}
function approveFromQueue(id){ const r=getRecipe(data,id); if(r){r.status="approved"; saveData(data); renderApprovalQueue(); renderRecipeList(); toast("Approved");} }
function editFromQueue(id){ selectedRecipe=id; switchAdminView("recipes"); renderRecipeList(); renderRecipeEditor(); }

function renderProfileList(){
  const wrap = qs("#profileList"); if(!wrap) return;
  wrap.innerHTML = (data.profiles||[]).map(p=>`<div class="admin-row ${selectedProfile===p.id?"active":""}" data-id="${p.id}"><div class="admin-row-title">${escapeHtml(p.name)}</div><div class="admin-row-sub">${escapeHtml((p.restrictions||[]).join(", ")||"No restrictions")}</div></div>`).join("");
  wrap.querySelectorAll(".admin-row").forEach(row => row.addEventListener("click", () => { selectedProfile=row.dataset.id; renderProfileList(); renderProfileEditor(); }));
}
function renderProfileEditor(){
  const profile = (data.profiles||[]).find(p=>p.id===selectedProfile);
  if(!profile){qs("#profileEditorEmpty").classList.remove("hidden"); qs("#profileEditorForm").classList.add("hidden"); return;}
  qs("#profileEditorEmpty").classList.add("hidden"); qs("#profileEditorForm").classList.remove("hidden");
  recipeFormValue("#pName", profile.name);
  recipeFormValue("#pShort", profile.shortName);
  recipeFormValue("#pNotes", profile.notes);
  recipeFormValue("#pRestrictions", (profile.restrictions||[]).join(", "));
  recipeFormValue("#pBlocked", (profile.blockedIngredients||[]).join("\n"));
  recipeFormValue("#pWarnings", (profile.warningIngredients||[]).join("\n"));
  recipeFormValue("#pPreferred", (profile.preferredIngredients||[]).join(", "));
  recipeFormValue("#pDisliked", (profile.dislikedIngredients||[]).join(", "));
}
function getProfileFromForm(existing={}){
  const name = getRecipeFormValue("#pName").trim() || "New Friend";
  return { ...existing, id: existing.id || slugify(name), name, shortName: getRecipeFormValue("#pShort").trim() || name, notes: getRecipeFormValue("#pNotes").trim(), restrictions: splitList(getRecipeFormValue("#pRestrictions")), blockedIngredients: splitList(getRecipeFormValue("#pBlocked")), warningIngredients: splitList(getRecipeFormValue("#pWarnings")), preferredIngredients: splitList(getRecipeFormValue("#pPreferred")), dislikedIngredients: splitList(getRecipeFormValue("#pDisliked")) };
}
function saveProfileFromForm(){
  const idx = data.profiles.findIndex(p=>p.id===selectedProfile);
  const profile = getProfileFromForm(idx>=0 ? data.profiles[idx] : {});
  if(idx>=0) data.profiles[idx]=profile; else data.profiles.unshift(profile);
  selectedProfile=profile.id; saveData(data); renderProfileList(); renderProfileEditor(); renderExportBox(); toast("Profile saved");
}
function newProfile(){
  const id = `friend-${Date.now()}`;
  data.profiles.push({id,name:"New Friend",shortName:"Friend",notes:"",restrictions:[],blockedIngredients:[],warningIngredients:[],preferredIngredients:[],dislikedIngredients:[]});
  selectedProfile=id; renderProfileList(); renderProfileEditor();
}
function deleteCurrentProfile(){
  if(!selectedProfile || data.profiles.length<=1){toast("Keep at least one profile"); return;}
  if(!confirm("Delete this profile?")) return;
  data.profiles = data.profiles.filter(p=>p.id!==selectedProfile);
  selectedProfile=data.profiles[0]?.id; saveData(data); renderProfileList(); renderProfileEditor(); renderExportBox(); toast("Profile deleted");
}

function renderExportBox(){
  const el = qs("#exportText"); if(el) el.value = exportRecipesJs(data);
}
