// ═══════════════════════════════════════════════
// Admin.js — Subida directa a Supabase
// ═══════════════════════════════════════════════

const API_URL = "https://tu-proyecto.supabase.co/rest/v1/products";
const API_KEY = "TU_SUPABASE_ADMIN_KEY"; // <- PON TU KEY AQUÍ

const form = document.getElementById("product-form");
const statusDiv = document.getElementById("status");
const productsList = document.getElementById("products-list");

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

form.addEventListener("submit", async e => {
  e.preventDefault();

  const product = {
    name: document.getElementById("name").value.trim(),
    category: document.getElementById("category").value.trim() || "General",
    price: parseFloat(document.getElementById("price").value),
    image_url: document.getElementById("image_url").value.trim() || "",
    description: document.getElementById("description").value.trim(),
    active: true
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(product)
    });

    statusDiv.textContent = `✅ Producto "${product.name}" subido con éxito!`;
    form.reset();
    loadProducts();
  } catch (err) {
    console.error(err);
    statusDiv.textContent = `❌ Error subiendo el producto: ${err.message}`;
  }
});

async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}?select=*&order=created_at.desc`, {
      headers: {
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`
      }
    });
    const data = await res.json();
    productsList.innerHTML = data.map(p => `<li>${p.name} - ${p.category} - $${p.price}</li>`).join("");
  } catch (err) {
    console.error(err);
    productsList.innerHTML = `<li>Error cargando productos</li>`;
  }
}