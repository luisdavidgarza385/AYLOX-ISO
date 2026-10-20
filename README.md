# 🍏 AYLOX IOS — Plataforma Web de Certificados VIP & Sistema de Tickets 24/7

Bienvenido al repositorio oficial del sitio web **AYLOX IOS**. Esta plataforma ha sido diseñada con una estética cibernética en tonos verde neón / esmeralda, súper animaciones fluidas, arquitectura de seguridad contra ataques informáticos, y un completo sistema de tickets con roles para el **Dueño** y sus **Socios**.

---

## 🚀 Características Principales

### 1. 🎨 Diseño Visual & Súper Animaciones
- **Colores Oficiales**: Verde Neón (`#00ff66`), Esmeralda (`#10b981`), Fondos ultra oscuros (`#050a07`).
- **Logo Oficial Integrado**: La imagen oficial de AYLOX IOS (`assets/logo.jpeg`) se encuentra destacada en el navbar, hero, cards y el emblema central 3D con escáner láser animado.
- **Canvas de Partículas Interactivo**: Fondo dinámico de nodos y constelaciones verdes que reaccionan al cursor del ratón.
- **Sintetizador de Sonido Cyber**: Sonidos interactivos generados en tiempo real con Web Audio API (sin descargas de archivos mp3 pesados, 100% offline).
- **Convertidor de Monedas**: Selector instantáneo de precios en USD ($), MXN ($), COP ($) y EUR (€).

### 2. 🛡️ Protección Anti-Hack & Seguridad Sentinel v3.4
- **Anti-XSS & Sanitización Criptográfica**: Todos los datos que ingresan los clientes en los formularios y chats se desinfectan para evitar inyecciones de código malicioso (`<script>`, SQLi, atributos manipulados).
- **Honeypot Bot Trap**: Campo trampa invisible que detecta e intercepta bots y scrapers automáticamente.
- **Token Bucket Rate Limiting**: Previene saturaciones DDoS y flooding de tickets limitando las solicitudes por cliente.
- **Aviso en Consola DevTools**: Banner de advertencia de seguridad para disuadir intentos de inspección no autorizados.
- **Test de Diagnóstico Interactivo**: Botón en la sección de seguridad que audita y reporta el estado de los filtros en tiempo real.

### 3. 🎫 Sistema de Tickets con Roles (Dueño & Socios)
- **Creación de Tickets para Clientes**: Nombre, WhatsApp, modelo de iPhone/iPad y motivo de compra o soporte.
- **Sala de Chat en Vivo**: Mensajes instantáneos entre el cliente y el staff de AYLOX IOS.
- **Respuestas Rápidas (Canned Responses) con 1 Clic**:
  - 💳 **Métodos de Pago**: Envía cuentas de Binance Pay, PayPal y transferencias locales.
  - 📲 **Pasar a WhatsApp**: Transfiere al cliente al WhatsApp oficial con el reporte del ticket prellenado.
  - 📦 **Guía de Instalación**: Envía los pasos para Scarlet, ESign y perfiles Apple Developer.
  - ⏳ **Pedir Comprobante**: Solicita captura de pago para dar de alta el UDID.
- **Roles y Acceso Protegido por PIN**:
  - 👑 **Dueño Principal** (`PIN: 1111`): Acceso total, puede editar números de teléfono de todos, modificar cuentas de pago, borrar tickets y descargar copias de seguridad.
  - 🛡️ **Socio Autorizado** (`PIN: 2222`): Atención de clientes, respuestas rápidas y resolución de tickets.

### 4. 📞 Configuración de Teléfonos de Contacto
Los números de WhatsApp del Dueño y los Socios se pueden actualizar en cualquier momento desde el **Portal de Control Staff** sin tocar una sola línea de código.

---

## 💻 Cómo Iniciar y Probar la Web

### Opción A (La más fácil):
Haz doble clic en el archivo `index.html` en tu carpeta:
`C:\Users\david\.gemini\antigravity\scratch\aylox-ios\index.html`
Se abrirá inmediatamente en Microsoft Edge o tu navegador favorito.

### Opción B (Con Servidor Local en PowerShell):
1. Abre PowerShell en la carpeta del proyecto:
   ```powershell
   cd "C:\Users\david\.gemini\antigravity\scratch\aylox-ios"
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```
2. El servidor iniciará en `http://localhost:8080` y abrirá la página automáticamente.

---

## 🔐 Claves de Acceso Staff (Por Defecto)

| Rol | PIN por Defecto | Permisos |
| :--- | :---: | :--- |
| **Dueño Principal** | `1111` | Acceso Total, Modificar Teléfonos, Cuentas de Pago y Borrar Tickets |
| **Socio de Soporte** | `2222` | Atender Tickets, Respuestas Rápidas, Enviar Pagos y Guías |

> **Atajo rápido para entrar al panel**: Presiona `Ctrl + Shift + A` en cualquier parte de la web.

---

## 🌐 Cómo Publicar la Web en Internet (100% Gratis con Anti-DDoS)

Puedes subir esta web a internet en menos de 2 minutos para que tus clientes la visiten desde su iPhone:

1. **Vercel / Netlify / GitHub Pages**:
   - Solo arrastra la carpeta `aylox-ios` a [app.netlify.com/drop](https://app.netlify.com/drop) o súbela a un repositorio de GitHub.
2. **Protección Cloudflare (Recomendado para evitar hackeos y ataques DDoS)**:
   - Conecta tu dominio (por ejemplo `ayloxios.com`) a Cloudflare (Plan Gratuito).
   - Activa el modo **Proxy (Nube Naranja)**.
   - Activa **Under Attack Mode** o **WAF** en el panel de Cloudflare si detectas ataques.
