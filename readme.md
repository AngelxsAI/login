# ANGELXS — Tienda Online

Tienda online conectada a Supabase, con panel de administración privado y compra por WhatsApp.

## Estructura del proyecto

```
tienda/
├── index.html          ← Catálogo público (lo ven tus clientes)
├── admin.html          ← Panel de administración (solo tú)
├── netlify.toml        ← Configuración de Netlify
└── assets/
    ├── config.js       ← Config de Supabase (compartido)
    ├── style.css       ← Estilos globales
    ├── store.js        ← Lógica del catálogo
    └── admin.js        ← Lógica del admin
```

## Cómo desplegar en Netlify

1. Sube esta carpeta a un repositorio GitHub (público o privado).
2. Ve a https://app.netlify.com → "Add new site" → "Import from Git".
3. Selecciona tu repositorio.
4. En "Publish directory" deja el punto: `.`
5. Haz clic en **Deploy site**.

¡Listo! En minutos tendrás tu tienda en vivo con una URL de Netlify.

## Cómo acceder al panel de administrador

1. Ve a `tu-sitio.netlify.app/admin.html`
2. Haz clic en **"Enviar código de acceso"**
3. Revisa tu correo y copia el código de 6 dígitos
4. Ingrésalo en el campo OTP → accedes al panel

**Acceso secreto alternativo:** En el catálogo (`index.html`), toca el logo **ANGELXS ●** exactamente 5 veces → te redirige al admin.

## Panel de administración — Funciones

- **Agregar productos** con foto, nombre, precio, categoría y descripción
- **Editar** cualquier producto
- **Eliminar** productos
- **Activar/desactivar** con un toggle (sin borrar)
- **Estadísticas** de inventario por categoría
- **QR + enlace** para compartir la tienda con clientes

## Catálogo público — Funciones

- Filtro por categorías
- Búsqueda en tiempo real
- Ver detalle de producto
- Comprar vía WhatsApp (mensaje automático al +503 7515 3192)
- Compartir tienda con QR

## Seguridad

- El correo de admin nunca aparece en el frontend (está codificado en base64)
- El acceso al admin requiere OTP enviado al correo registrado
- Las políticas RLS de Supabase garantizan que solo el admin autenticado puede modificar productos
- Los clientes solo ven productos marcados como "activos"
- No se usa la service_role key en el frontend (solo anon key + RLS)
