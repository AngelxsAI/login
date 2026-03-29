// ═══════════════════════════════════════════════════════════════
//  ANGELXS — admin.js
// ═══════════════════════════════════════════════════════════════

const EMOJIS = { General:"📦", Ropa:"👗", Calzado:"👟", Electrónica:"📱", Hogar:"🏠", Accesorios:"💎", Belleza:"💄", Otros:"✨" };
const CATS   = ["General","Ropa","Calzado","Electrónica","Hogar","Accesorios","Belleza","Otros"];

let session  = null;
let products = [];
let adminQuery = "";

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  session = loadSession();
  if (session) {
    showAdmin();
  } else {
    showLogin();
  }

  // Login: send OTP
  document.getElementById("btn-send").addEventListener("click", async () => {
    setLoading("btn-send", true);
    setMsg("msg-step1", "", "");
    const ok = await sendOTP();
    setLoading("btn-send", false);
    if (ok) {
      showStep(2);
      setMsg("msg-step2", "✓ Código enviado. Revisa tu bandeja de entrada (y spam).", "ok");
    } else {
      setMsg("msg-step1", "✗ Error al enviar el código. Inténtalo de nuevo.", "err");
    }
  });

  // Login: OTP input
  document.getElementById("otp-input").addEventListener("input", e => {
    const val = e.target.value.replace(/\D/g, "");
    e.target.value = val;
    document.getElementById("btn-verify").disabled = val.length < 6;
  });
  document.getElementById("otp-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.value.length >= 6) verifyCode();
  });

  // Login: verify
  document.getElementById("btn-verify").addEventListener("click", verifyCode);

  // Login: resend
  document.getElementById("btn-resend").addEventListener("click", async () => {
    setMsg("msg-step2", "", "");
    const ok = await sendOTP();
    setMsg("msg-step2", ok ? "✓ Código reenviado." : "✗ Error al reenviar.", ok ? "ok" : "err");
  });

  // Admin: logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    clearSession();
    session = null;
    window.location.reload();
  });

  // Admin: new product
  document.getElementById("btn-new").addEventListener("click", () => openForm(null));

  // Admin: tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Admin: search
  document.getElementById("admin-search").addEventListener("input", e => {
    adminQuery = e.target.value.toLowerCase().trim();
    renderAdminList();
  });

  // Share tab URL & QR
  const storeUrl = window.location.href.replace("admin.html","") + "index.html";
  document.getElementById("share-url").value = storeUrl;
  document.getElementById("qr-big").src = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&bgcolor=FAF7F0&color=1E1208&data=${encodeURIComponent(storeUrl)}`;
  document.getElementById("copy-share").addEventListener("click", () => {
    navigator.clipboard.writeText(storeUrl).then(() => {
      const btn = document.getElementById("copy-share");
      btn.textContent = "¡Copiado!";
      setTimeout(() => { btn.textContent = "Copiar enlace"; }, 2000);
    });
  });
});

// ── LOGIN ────────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById("login-page").style.display = "";
  document.getElementById("admin-page").style.display = "none";
}

function showAdmin() {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("admin-page").style.display = "";
  loadAdminProducts();
}

function showStep(n) {
  document.querySelectorAll(".login-step").forEach(s => s.classList.remove("active"));
  document.getElementById("step-" + n).classList.add("active");
}

async function verifyCode() {
  const code = document.getElementById("otp-input").value.trim();
  if (code.length < 6) return;
  setLoading("btn-verify", true);
  setMsg("msg-step2", "", "");
  const data = await verifyOTP(code);
  setLoading("btn-verify", false);
  if (data?.access_token) {
    session = data;
    saveSession(data);
    showAdmin();
  } else {
    setMsg("msg-step2", "✗ Código incorrecto o expirado. Inténtalo de nuevo.", "err");
  }
}

// ── ADMIN PRODUCTS ────────────────────────────────────────────────────────────
async function loadAdminProducts() {
  document.getElementById("admin-loader").style.display = "";
  document.getElementById("admin-list").innerHTML = "";
  document.getElementById("admin-empty").style.display = "none";
  try {
    // Admin sees ALL products (including inactive) — RLS policy allows this
    const data = await sbGet(
      "/rest/v1/products?select=*&order=created_at.desc",
      session.access_token
    );
    products = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error cargando productos:", e);
    products = [];
  }
  document.getElementById("admin-loader").style.display = "none";
  renderAdminList();
  updateStats();
}

function renderAdminList() {
  const list  = document.getElementById("admin-list");
  const empty = document.getElementById("admin-empty");
  let filtered = products;
  if (adminQuery) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(adminQuery) ||
    (p.description || "").toLowerCase().includes(adminQuery) ||
    (p.category || "").toLowerCase().includes(adminQuery)
  );
  if (!filtered.length) {
    list.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = filtered.map(p => prodItemHTML(p)).join("");

  // Bind events
  list.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = products.find(x => x.id == btn.dataset.edit);
      if (p) openForm(p);
    });
  });
  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.del));
  });
  list.querySelectorAll("[data-toggle]").forEach(el => {
    el.addEventListener("click", () => toggleActive(el.dataset.toggle));
  });
}

function prodItemHTML(p) {
  const active = p.active !== false;
  const emoji  = EMOJIS[p.category] || "📦";
  return `
    <div class="prod-item" id="prod-${p.id}">
      ${p.image_url
        ? `<img src="${p.image_url}" class="prod-thumb" alt="${escHtml(p.name)}" loading="lazy"/>`
        : `<div class="prod-no-thumb">${emoji}</div>`}
      <div>
        <div class="prod-info-name">${escHtml(p.name)}</div>
        <div class="prod-info-cat">${escHtml(p.category || "General")}</div>
        <div class="prod-info-price">${fmt(p.price)}</div>
        ${p.description ? `<div class="prod-info-desc">${escHtml(p.description)}</div>` : ""}
      </div>
      <div class="prod-actions">
        <div class="toggle-wrap" data-toggle="${p.id}" title="${active ? "Desactivar" : "Activar"} producto">
          <div class="toggle-track ${active ? "on" : ""}"><div class="toggle-thumb"></div></div>
          <span class="${active ? "badge-on" : "badge-off"}">${active ? "Activo" : "Inactivo"}</span>
        </div>
        <div class="prod-action-row">
          <button class="btn btn-edit btn-sm" data-edit="${p.id}">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">🗑️</button>
        </div>
      </div>
    </div>`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function toggleActive(id) {
  const p = products.find(x => x.id == id);
  if (!p) return;
  const newVal = p.active === false ? true : false;
  try {
    await sbPatch(
      `/rest/v1/products?id=eq.${id}`,
      { active: newVal },
      session.access_token
    );
    p.active = newVal;
    renderAdminList();
    updateStats();
  } catch (e) { alert("Error al cambiar estado: " + e.message); }
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
  try {
    await sbDelete(`/rest/v1/products?id=eq.${id}`, session.access_token);
    products = products.filter(p => p.id != id);
    renderAdminList();
    updateStats();
  } catch (e) { alert("Error al eliminar: " + e.message); }
}

// ── PRODUCT FORM MODAL ────────────────────────────────────────────────────────
let formImgFile = null;
let formImgPrev = null;

function openForm(product) {
  const editing = !!product;
  const form = {
    name:        product?.name        || "",
    price:       product?.price       || "",
    description: product?.description || "",
    category:    product?.category    || "General",
    active:      product?.active !== false
  };
  formImgFile = null;
  formImgPrev = product?.image_url || null;

  const root = document.getElementById("form-root");
  root.innerHTML = `
    <div class="overlay" id="form-overlay">
      <div class="form-modal">
        <h3>${editing ? "Editar producto" : "Nuevo producto"}</h3>

        <div class="form-grp">
          <label class="form-lbl">Imagen del producto</label>
          <div id="img-zone"></div>
        </div>

        <div class="form-grp">
          <label class="form-lbl">Nombre *</label>
          <input class="inp" id="f-name" type="text" value="${escHtml(form.name)}" placeholder="Ej: Camisa casual azul" maxlength="100"/>
        </div>

        <div class="form-row">
          <div class="form-grp">
            <label class="form-lbl">Precio (USD) *</label>
            <input class="inp" id="f-price" type="number" value="${form.price}" placeholder="0.00" min="0" step="0.01"/>
          </div>
          <div class="form-grp">
            <label class="form-lbl">Categoría</label>
            <select class="inp" id="f-cat">
              ${CATS.map(c => `<option value="${c}" ${form.category === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="form-grp">
          <label class="form-lbl">Descripción</label>
          <textarea class="inp" id="f-desc" placeholder="Describe el producto…" rows="3">${escHtml(form.description)}</textarea>
        </div>

        <div class="form-grp">
          <div class="toggle-wrap" id="f-active-toggle">
            <div class="toggle-track ${form.active ? "on" : ""}" id="f-toggle-track">
              <div class="toggle-thumb"></div>
            </div>
            <span id="f-active-label" style="font-size:.9rem;color:var(--muted)">
              Producto ${form.active ? "visible en tienda" : "oculto en tienda"}
            </span>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-cancel" id="f-cancel">Cancelar</button>
          <button class="btn-save" id="f-save" disabled>
            ${editing ? "Guardar cambios" : "Agregar producto"}
          </button>
        </div>
        <div class="msg" id="f-msg"></div>
      </div>
    </div>`;

  // Render image zone
  renderImgZone();

  // Active toggle
  let activeVal = form.active;
  document.getElementById("f-active-toggle").addEventListener("click", () => {
    activeVal = !activeVal;
    document.getElementById("f-toggle-track").classList.toggle("on", activeVal);
    document.getElementById("f-active-label").textContent = `Producto ${activeVal ? "visible en tienda" : "oculto en tienda"}`;
  });

  // Validate on input
  const validate = () => {
    const n = document.getElementById("f-name").value.trim();
    const pr = document.getElementById("f-price").value;
    document.getElementById("f-save").disabled = !n || !pr || Number(pr) < 0;
  };
  document.getElementById("f-name").addEventListener("input", validate);
  document.getElementById("f-price").addEventListener("input", validate);
  validate(); // initial

  // Close
  document.getElementById("f-cancel").addEventListener("click", closeForm);
  document.getElementById("form-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeForm();
  });

  // Save
  document.getElementById("f-save").addEventListener("click", async () => {
    const name = document.getElementById("f-name").value.trim();
    const price = parseFloat(document.getElementById("f-price").value);
    const desc  = document.getElementById("f-desc").value.trim();
    const cat   = document.getElementById("f-cat").value;

    if (!name || isNaN(price)) return;
    document.getElementById("f-save").disabled = true;
    document.getElementById("f-save").innerHTML = '<div class="spinner"></div> Guardando…';
    setMsg("f-msg", "", "");

    try {
      let imgUrl = product?.image_url || null;
      if (formImgFile) imgUrl = await uploadImage(formImgFile, session.access_token);

      const body = { name, price, description: desc || null, category: cat, active: activeVal, image_url: imgUrl };

      if (editing) {
        await sbPatch(`/rest/v1/products?id=eq.${product.id}`, body, session.access_token);
      } else {
        await sbPost("/rest/v1/products", body, session.access_token);
      }

      closeForm();
      await loadAdminProducts();
    } catch (e) {
      setMsg("f-msg", "✗ Error: " + e.message, "err");
      document.getElementById("f-save").disabled = false;
      document.getElementById("f-save").textContent = editing ? "Guardar cambios" : "Agregar producto";
    }
  });
}

function renderImgZone() {
  const zone = document.getElementById("img-zone");
  if (!zone) return;
  if (formImgPrev) {
    zone.innerHTML = `
      <div class="img-preview-wrap">
        <img src="${formImgPrev}" class="img-preview" alt="Preview"/>
        <button class="img-remove" id="img-remove" type="button">✕</button>
      </div>`;
    zone.querySelector("#img-remove").addEventListener("click", () => {
      formImgFile = null; formImgPrev = null; renderImgZone();
    });
  } else {
    zone.innerHTML = `
      <div class="img-drop" id="img-drop">
        📷 <span>Toca aquí o arrastra una imagen</span>
        <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none"/>
      </div>`;
    const drop = zone.querySelector("#img-drop");
    drop.addEventListener("click", () => zone.querySelector("#file-input").click());
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("drag"); handleImgFile(e.dataTransfer.files[0]); });
    zone.querySelector("#file-input").addEventListener("change", e => handleImgFile(e.target.files[0]));
  }
}

function handleImgFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5MB"); return; }
  formImgFile = file;
  const reader = new FileReader();
  reader.onload = ev => { formImgPrev = ev.target.result; renderImgZone(); };
  reader.readAsDataURL(file);
}

function closeForm() {
  document.getElementById("form-root").innerHTML = "";
  formImgFile = null; formImgPrev = null;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const total    = products.length;
  const active   = products.filter(p => p.active !== false).length;
  const inactive = total - active;
  const prices   = products.map(p => Number(p.price)).filter(n => !isNaN(n));
  const avg      = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
  const min      = prices.length ? Math.min(...prices) : 0;
  const max      = prices.length ? Math.max(...prices) : 0;

  setText("stat-total",    total);
  setText("stat-active",   active);
  setText("stat-inactive", inactive);
  setText("stat-avg",      fmt(avg));
  setText("stat-min",      prices.length ? fmt(min) : "—");
  setText("stat-max",      prices.length ? fmt(max) : "—");

  const cats = {};
  products.forEach(p => { const c = p.category || "General"; cats[c] = (cats[c]||0)+1; });
  const catList = document.getElementById("cat-list");
  catList.innerHTML = Object.entries(cats)
    .sort((a,b) => b[1]-a[1])
    .map(([cat, count]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--border)">
        <span>${EMOJIS[cat]||"📦"} ${cat}</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:700">${count} producto${count!==1?"s":""}</span>
      </div>
    `).join("") || `<p style="color:var(--muted);font-size:.9rem">Sin datos</p>`;
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmt(n) { return `$${Number(n).toFixed(2)}`; }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "msg" + (text ? " show" : "") + (type ? " " + type : "");
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn._origHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Enviando…';
  } else if (btn._origHTML) {
    btn.innerHTML = btn._origHTML;
  }
}
