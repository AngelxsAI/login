async function loadProducts() {
  const res = await fetch('/.netlify/functions/getProducts')
  const products = await res.json()

  const container = document.getElementById('products')

  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.image_url || 'https://via.placeholder.com/300'}">
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <b>$${p.price}</b>
      <button onclick="buy('${p.name}', ${p.price})">
        Comprar
      </button>
    </div>
  `).join('')
}

function buy(name, price) {
  const msg = `🛍️ Pedido: ${name} - $${price}`
  window.open(`https://wa.me/50375153192?text=${encodeURIComponent(msg)}`)
}

loadProducts()