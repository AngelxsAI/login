// ═══════════════════════════════════════════════════════════════
//  ANGELXS — store.js  (index.html logic)
// ═══════════════════════════════════════════════════════════════

const EMOJIS = { General:"📦", Ropa:"👗", Calzado:"👟", Electrónica:"📱", Hogar:"🏠", Accesorios:"💎", Belleza:"💄", Otros:"✨" };

let allProducts = [];
let activeCat   = "Todos";
let query       = "";

// Secret logo tap counter (5 taps → admin)
let tapCount = 0, tapTimer = null;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  document.getElementById("search").addEventListener("input", e => {
    query = e.target.value.toLowerCase().trim();
    renderProducts();
  });

  document.getElementById("btn-share").addEventListener("click", openQR);

  document.getElementById("logo").addEventListener("click", () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 3000);
    if (tapCount >= 5) {
      tapCount = 0;
      window.location.href = "admin.html";
    }
  });
});

// ── API ───────────────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const data = await sbGet("/rest/v1/products?select=*&active=eq.true&order=created_at.desc");
    allProducts = Array.isArray(data) ? data : [];
  } catch (e) {
    allProducts = [];
    console.error("Error cargando productos:", e);
  }
  buildCategoryTabs();
  renderProducts();
  document.getElementById("loader").style.display  = "none";
  document.getElementById("products-grid").style.display = "";
}

// ── Categories ────────────────────────────────────────────────────────────────
function buildCategoryTabs() {
  const cats = ["Todos", ...new Set(allProducts.map(p => p.category || "General"))];
  const bar  = document.getElementById("cats-bar");
  bar.innerHTML = cats.map(c => `<button class="cat-btn${c === activeCat ? " active" : ""}" data-cat="${c}">${c === "Todos" ? "✦ Todos" : c}</button>`).join("");
  bar.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCat = btn.dataset.cat;
      bar.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts();
    });
  });
}

// ── Render products ───────────────────────────────────────────────────────────
function renderProducts() {
  let filtered = allProducts;
  if (activeCat !== "Todos") filtered = filtered.filter(p => (p.category || "General") === activeCat);
  if (query) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.description || "").toLowerCase().includes(query)
  );

  const grid  = document.getElementById("products-grid");
  const empty = document.getElementById("empty");
  const badge = document.getElementById("count-badge");

  badge.textContent = filtered.length
    ? `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`
    : "";

  if (!filtered.length) {
    grid.style.display  = "none";
    empty.style.display = "";
    return;
  }

  empty.style.display = "none";
  grid.style.display  = "";
  grid.innerHTML = filtered.map(p => cardHTML(p)).join("");

  grid.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    card.addEventListener("click", e => {
      if (e.target.closest(".btn-wa")) return;
      const p = allProducts.find(x => x.id == id);
      if (p) openProductModal(p);
    });
    card.querySelector(".btn-wa").addEventListener("click", e => {
      e.stopPropagation();
      const p = allProducts.find(x => x.id == id);
      if (p) buyWhatsApp(p);
    });
  });
}

function cardHTML(p) {
  const emoji = EMOJIS[p.category] || "📦";
  const imgBlock = p.image_url
    ? `<div class="card-img-wrap"><img src="${p.image_url}" class="card-img" alt="${escHtml(p.name)}" loading="lazy"/><span class="card-cat-badge">${escHtml(p.category || "General")}</span></div>`
    : `<div class="card-no-img">${emoji}</div>`;
  return `
    <article class="card" data-id="${p.id}">
      ${imgBlock}
      <div class="card-body">
        <div class="card-category">${escHtml(p.category || "General")}</div>
        <div class="card-name">${escHtml(p.name)}</div>
        <div class="card-desc">${escHtml(p.description || "Toca para ver detalles")}</div>
        <div class="card-foot">
          <span class="card-price">${fmt(p.price)}</span>
          <button class="btn btn-wa" aria-label="Comprar por WhatsApp">
            ${waIcon(16)} Comprar
          </button>
        </div>
      </div>
    </article>`;
}

// ── Product modal ─────────────────────────────────────────────────────────────
function openProductModal(p) {
  const emoji = EMOJIS[p.category] || "📦";
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="overlay" id="product-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escHtml(p.name)}">
        <button class="modal-close" id="close-product" aria-label="Cerrar">✕</button>
        <div class="modal-hero">
          ${p.image_url
            ? `<img src="${p.image_url}" class="modal-hero-img" alt="${escHtml(p.name)}"/>`
            : `<div class="modal-hero-no-img">${emoji}</div>`}
        </div>
        <div class="modal-body">
          <div class="modal-category">${escHtml(p.category || "General")}</div>
          <h2 class="modal-name">${escHtml(p.name)}</h2>
          <div class="modal-price">${fmt(p.price)}</div>
          ${p.description ? `<p class="modal-desc">${escHtml(p.description)}</p>` : ""}
          <button class="btn-wa-full">
            ${waIcon(22)} Escribir por WhatsApp
          </button>
        </div>
      </div>
    </div>`;
  root.querySelector("#close-product").addEventListener("click", closeModal);
  root.querySelector("#product-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  root.querySelector(".btn-wa-full").addEventListener("click", () => buyWhatsApp(p));
  document.addEventListener("keydown", onEsc);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  document.removeEventListener("keydown", onEsc);
}
function onEsc(e) { if (e.key === "Escape") closeModal(); }

// ── QR Share ─────────────────────────────────────────────────────────────────
function openQR() {
  const url = window.location.href.split("?")[0].split("#")[0];
  const qr  = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&bgcolor=FAF7F0&color=1E1208&data=${encodeURIComponent(url)}`;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="overlay" id="qr-overlay">
      <div class="qr-box">
        <h3>Compartir tienda</h3>
        <p>Escanea el QR o copia el enlace</p>
        <img src="${qr}" class="qr-img" alt="QR Code"/>
        <div class="copy-row">
          <input class="copy-url" id="copy-url" value="${url}" readonly/>
          <button class="copy-btn" id="copy-btn">Copiar</button>
        </div>
        <br/>
        <button class="btn btn-outline" style="width:100%;margin-top:.7rem;justify-content:center" id="close-qr">Cerrar</button>
      </div>
    </div>`;
  root.querySelector("#close-qr").addEventListener("click", closeModal);
  root.querySelector("#qr-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
  root.querySelector("#copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(url).then(() => {
      const btn = root.querySelector("#copy-btn");
      btn.textContent = "¡Copiado!";
      setTimeout(() => { btn.textContent = "Copiar"; }, 2000);
    });
  });
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────
function buyWhatsApp(p) {
  const msg = `¡Hola! Me interesa comprar:\n\n*${p.name}*\nPrecio: ${fmt(p.price)}\n\n¿Está disponible?`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return `$${Number(n).toFixed(2)}`; }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function waIcon(s) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
}
