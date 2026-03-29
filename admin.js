async function upload() {
  const product = {
    name: document.getElementById('name').value,
    price: parseFloat(document.getElementById('price').value),
    image_url: document.getElementById('image').value,
    description: document.getElementById('desc').value
  }

  const res = await fetch('/.netlify/functions/addProduct', {
    method: 'POST',
    body: JSON.stringify(product)
  })

  const data = await res.json()

  if (data.success) {
    alert('Producto subido 🚀')
  } else {
    alert('Error: ' + data.error)
  }
}