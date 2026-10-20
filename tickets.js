/**
 * ===================================================
 * AYLOX IOS — TICKET ENGINE & MULTI-ROLE SYSTEM v4.0
 * ===================================================
 * Roles:
 * - 'cliente'  : Crea tickets con Nombre y Apellido real, abre WhatsApp automáticamente
 * - 'vendedor' : Visualiza tickets de clientes en tiempo real, responde y usa respuestas rápidas
 * - 'dueno'    : Control Total (Administración, Roles, Cuentas de Pago, Firebase Cloud DB)
 *
 * Sincronización en la Nube:
 * - Compatible con Google Firebase Realtime Database (100% Gratis)
 * - Sincronización automática cada 4 segundos entre cualquier PC y Celular del mundo
 */

const ayloxTickets = (function() {
  const STORAGE_KEY_TICKETS = 'aylox_tickets_db';
  const STORAGE_KEY_CONFIG = 'aylox_staff_config';

  // Configuración predeterminada oficial de AYLOX IOS
  const DEFAULT_CONFIG = {
    owner1Name: 'Dueño 1 — AYLOX IOS',
    owner1Phone: '584124020112',       // Dueño 1 (Venezuela)
    owner2Name: 'Dueño 2 — AYLOX IOS',
    owner2Phone: '50232509982',        // Dueño 2 (Guatemala)
    binanceId: '1146199763',           // Binance Pay ID Real
    paypal: 'https://paypal.me/davisiso', // PayPal Oficial
    pinOwner: 'AYLOX IOS',             // Contraseña Oficial de Dueños
    pinSeller: 'VENDORES 1',           // Contraseña Oficial de Vendedores
    firebaseUrl: 'https://aylox-iso-default-rtdb.firebaseio.com' // Tu Base de Datos Firebase Oficial
  };

  // Tickets de ejemplo iniciales
  const SAMPLE_TICKETS = [
    {
      id: 'AYL-8492',
      customerName: 'Santiago Morales',
      customerPhone: '+58 412 123 4567',
      device: 'iPhone 15 Pro Max',
      plan: 'Certificado VIP + Hack / Mod (Pack Completo)',
      status: 'en_proceso',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      assignedTo: 'Dueño 2 (Guatemala)',
      messages: [
        {
          id: 'm1',
          sender: 'system',
          author: 'AYLOX BOT',
          text: '¡Hola Santiago Morales! Tu ticket fue registrado con éxito y enviado al WhatsApp del Dueño (+502 3250 9982).',
          time: 'Hace 45 min'
        },
        {
          id: 'm2',
          sender: 'client',
          author: 'Santiago Morales',
          text: 'Buenas tardes, quiero comprar el pack completo con hack antibaneo para Free Fire en iPhone 15 Pro Max.',
          time: 'Hace 43 min'
        },
        {
          id: 'm3',
          sender: 'staff',
          author: 'Dueño 2 (Guatemala)',
          text: '¡Hola Santiago! Sí, incluye menú VIP antibaneo y certificado 12 meses. Te dejamos los métodos oficiales de Binance y PayPal para activarlo.',
          time: 'Hace 38 min'
        }
      ]
    },
    {
      id: 'AYL-8488',
      customerName: 'Mateo Fernández',
      customerPhone: '+502 4567 8901',
      device: 'iPhone 14 Pro',
      plan: 'Solo Certificado Apple Developer',
      status: 'abierto',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      assignedTo: 'Ventas AYLOX',
      messages: [
        {
          id: 'm1',
          sender: 'system',
          author: 'AYLOX BOT',
          text: '¡Hola Mateo Fernández! Ticket registrado para Solo Certificado Apple Developer.',
          time: 'Hace 15 min'
        },
        {
          id: 'm2',
          sender: 'client',
          author: 'Mateo Fernández',
          text: 'Hola, tengo una duda sobre la instalación de archivos .p12 y .mobileprovision.',
          time: 'Hace 14 min'
        }
      ]
    }
  ];

  // Estado en memoria
  let currentActiveTicketId = null;
  let currentStaffRole = null; // 'dueno' | 'vendedor' | null
  let selectedAuthRole = 'dueno';
  let broadcastChannel = null;

  // ===================================================
  // NOTIFICACIONES WEB, SONORAS Y PUSH DEL SISTEMA
  // ===================================================
  let isWebNotifsEnabled = localStorage.getItem('aylox_web_notifs') !== 'false';
  let titleFlashInterval = null;
  const originalPageTitle = document.title || 'AYLOX IOS — Certificados VIP (iOS 15 a iOS 27)';
  let knownTicketMessageCounts = {};
  let lastKnownTicketsCount = 0;
  let hasInitializedNotifs = false;

  function flashDocumentTitle(newText) {
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    let toggle = false;
    titleFlashInterval = setInterval(() => {
      document.title = toggle ? newText : originalPageTitle;
      toggle = !toggle;
    }, 1000);
  }

  function stopFlashingTitle() {
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
      document.title = originalPageTitle;
    }
  }

  window.addEventListener('focus', stopFlashingTitle);

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().then(permission => {
          updateWebNotifUI();
          if (permission === 'granted') {
            ayloxApp.showToast('🔔 ¡Notificaciones de tickets activadas en tu navegador!', 'success');
            if (typeof ayloxSound !== 'undefined') ayloxSound.play('ticket_alert');
          }
        });
      } catch (e) {
        console.warn('Permisos de notificaciones:', e);
      }
    }
  }

  function toggleWebNotifications() {
    isWebNotifsEnabled = !isWebNotifsEnabled;
    localStorage.setItem('aylox_web_notifs', isWebNotifsEnabled ? 'true' : 'false');
    updateWebNotifUI();

    if (isWebNotifsEnabled) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(p => {
          triggerWebNotification('AYLOX IOS Alertas 24/7', 'Notificaciones activadas. Te avisaremos con sonido y alerta en pantalla.');
        });
      } else {
        triggerWebNotification('AYLOX IOS Alertas 24/7', 'Notificaciones activadas. Te avisaremos con sonido y alerta en pantalla.');
      }
    } else {
      ayloxApp.showToast('Notificaciones web pausadas.', 'info');
    }
  }

  function updateWebNotifUI() {
    const icon = document.getElementById('webNotifIcon');
    const text = document.getElementById('webNotifText');
    if (!icon) return;

    if (!isWebNotifsEnabled) {
      icon.className = 'fa-solid fa-bell-slash text-gray-500';
      if (text) text.textContent = 'Alertas Off';
    } else {
      icon.className = 'fa-solid fa-bell text-aylox-green animate-pulse';
      if (text) text.textContent = 'Alertas 24/7';
    }
  }

  function triggerWebNotification(title, message, ticketId = null) {
    if (!isWebNotifsEnabled) return;

    // 1. Sonido cyber característico
    if (typeof ayloxSound !== 'undefined') {
      ayloxSound.play('ticket_alert');
    }

    // 2. Notificación Toast en pantalla
    if (typeof ayloxApp !== 'undefined') {
      ayloxApp.showToast(`🔔 ${title}\n${message}`, 'info');
    }

    // 3. Parpadeo de pestaña si el navegador está minimizado o en otra pestaña
    if (document.hidden) {
      flashDocumentTitle(`🔔 (1) ¡NUEVO MENSAJE TICKET!`);
    }

    // 4. Notificación del Sistema Operativo (Windows, Android, Mac)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: message,
          icon: 'assets/logo.jpeg',
          badge: 'assets/logo.jpeg',
          tag: ticketId ? `ticket-${ticketId}` : 'aylox-ticket-alert',
          silent: false
        });

        notif.onclick = function() {
          window.focus();
          stopFlashingTitle();
          if (ticketId) {
            openChatModal(ticketId);
          }
          notif.close();
        };
      } catch (e) {
        console.warn('Error en Notification push:', e);
      }
    }
  }

  function testNotification() {
    requestNotificationPermission();
    triggerWebNotification(
      'AYLOX IOS 18 — Prueba de Notificación',
      '¡Sonido cyber y alertas en tiempo real activadas! El sistema te notificará cuando haya mensajes nuevos.'
    );
  }

  // BroadcastChannel para sincronizar en vivo entre pestañas del mismo navegador
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('aylox_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'TICKETS_UPDATED') {
          if (event.data.newTicket) {
            triggerWebNotification(
              '¡Nuevo Ticket Recibido!',
              `#${event.data.newTicket.id} de ${event.data.newTicket.customerName} (${event.data.newTicket.device})`,
              event.data.newTicket.id
            );
          } else if (event.data.newMessage) {
            triggerWebNotification(
              `Mensaje en Ticket #${event.data.ticketId}`,
              `${event.data.newMessage.author}: "${event.data.newMessage.text.substring(0, 75)}"`,
              event.data.ticketId
            );
          }
          renderPublicTickets();
          renderDashTickets();
          if (currentActiveTicketId) {
            renderChatMessages();
          }
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel no soportado, usando almacenamiento estándar.', e);
  }

  function notifyChange(payload = {}) {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'TICKETS_UPDATED', timestamp: Date.now(), ...payload });
    }
  }

  // Obtener configuración activa
  function getConfig() {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(DEFAULT_CONFIG));
      return { ...DEFAULT_CONFIG };
    }
    try {
      const parsed = JSON.parse(raw);
      // Garantizar que los números y cuentas oficiales se mantengan
      if (parsed.owner1Phone === '5215500000000' || !parsed.owner1Phone) {
        parsed.owner1Phone = DEFAULT_CONFIG.owner1Phone;
        parsed.owner1Name = DEFAULT_CONFIG.owner1Name;
      }
      if (parsed.owner2Phone === '5215511112222' || !parsed.owner2Phone) {
        parsed.owner2Phone = DEFAULT_CONFIG.owner2Phone;
        parsed.owner2Name = DEFAULT_CONFIG.owner2Name;
      }
      if (parsed.binanceId === '789421054' || !parsed.binanceId) {
        parsed.binanceId = DEFAULT_CONFIG.binanceId;
      }
      if (parsed.paypal === 'pagos@ayloxios.com' || !parsed.paypal) {
        parsed.paypal = DEFAULT_CONFIG.paypal;
      }
      if (!parsed.pinOwner || parsed.pinOwner === '1111' || parsed.pinOwner === 'AYLOX IOS18') {
        parsed.pinOwner = 'AYLOX IOS';
      }
      if (!parsed.pinSeller || parsed.pinSeller === '3333' || parsed.pinSeller === 'AYLOX IOS18' || parsed.pinSeller === 'vendedor1') {
        parsed.pinSeller = 'VENDORES 1';
      }
      if (!parsed.firebaseUrl) {
        parsed.firebaseUrl = DEFAULT_CONFIG.firebaseUrl;
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  // Guardar configuración modificada (Solo Dueños)
  function saveStaffConfig() {
    if (currentStaffRole !== 'dueno') {
      ayloxApp.showToast('Solo el Dueño Principal puede editar ajustes y cuentas', 'error');
      return;
    }

    const cfg = getConfig();
    if (document.getElementById('cfgOwner1Phone')) cfg.owner1Phone = document.getElementById('cfgOwner1Phone').value.trim() || cfg.owner1Phone;
    if (document.getElementById('cfgOwner1Name')) cfg.owner1Name = document.getElementById('cfgOwner1Name').value.trim() || cfg.owner1Name;
    if (document.getElementById('cfgOwner2Phone')) cfg.owner2Phone = document.getElementById('cfgOwner2Phone').value.trim() || cfg.owner2Phone;
    if (document.getElementById('cfgOwner2Name')) cfg.owner2Name = document.getElementById('cfgOwner2Name').value.trim() || cfg.owner2Name;
    if (document.getElementById('cfgBinanceId')) cfg.binanceId = document.getElementById('cfgBinanceId').value.trim() || cfg.binanceId;
    if (document.getElementById('cfgPaypal')) cfg.paypal = document.getElementById('cfgPaypal').value.trim() || cfg.paypal;
    if (document.getElementById('cfgOwnerPin')) cfg.pinOwner = document.getElementById('cfgOwnerPin').value.trim() || cfg.pinOwner;
    if (document.getElementById('cfgSellerPin')) cfg.pinSeller = document.getElementById('cfgSellerPin').value.trim() || cfg.pinSeller;

    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
    ayloxApp.applyConfigToUI(cfg);

    ayloxSecurity.logEvent('Configuración general y roles actualizada por el Dueño.');
    ayloxApp.showToast('¡Configuración guardada correctamente!', 'success');
  }

  // Conectar y guardar URL de Firebase Realtime Database
  function saveCloudDbUrl() {
    const input = document.getElementById('cfgFirebaseUrl');
    if (!input) return;

    let url = input.value.trim().replace(/\/+$/, '');
    if (!url) {
      ayloxApp.showToast('Por favor ingresa la URL de tu base de datos Firebase', 'warning');
      return;
    }

    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const cfg = getConfig();
    cfg.firebaseUrl = url;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));

    updateCloudStatusBadge(true);
    ayloxApp.showToast('¡Conectando con Google Firebase Realtime Database...', 'info');

    // Sincronizar inmediatamente
    syncFromCloud(true);
  }

  // Actualizar badge de estado de la nube
  function updateCloudStatusBadge(isConnected) {
    const badge = document.getElementById('cloudStatusBadge');
    if (!badge) return;

    if (isConnected) {
      badge.textContent = '🟢 CONECTADO A GOOGLE FIREBASE';
      badge.className = 'text-xs px-3.5 py-1 rounded-full font-mono font-bold bg-aylox-green/20 text-aylox-green border border-aylox-green/40 shadow-[0_0_10px_rgba(0,255,102,0.3)]';
    } else {
      badge.textContent = '🟡 SINCRONIZACIÓN LOCAL';
      badge.className = 'text-xs px-3.5 py-1 rounded-full font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
    }
  }

  // ----------------------------------------------------
  // MOTOR DE SINCRONIZACIÓN EN LA NUBE (FIREBASE)
  // ----------------------------------------------------

  async function pushTicketToCloud(ticket) {
    const cfg = getConfig();
    if (!cfg.firebaseUrl) return;

    try {
      let baseUrl = cfg.firebaseUrl.trim().replace(/\/+$/, '');
      if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
      const url = `${baseUrl}/tickets/${ticket.id}.json`;

      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
    } catch (e) {
      console.warn('Error al subir ticket a Firebase:', e);
    }
  }

  async function syncFromCloud(showFeedback = false) {
    const cfg = getConfig();
    if (!cfg.firebaseUrl) {
      updateCloudStatusBadge(false);
      return;
    }

    try {
      let baseUrl = cfg.firebaseUrl.trim().replace(/\/+$/, '');
      if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
      const url = `${baseUrl}/tickets.json`;

      const res = await fetch(url);
      if (!res.ok) {
        updateCloudStatusBadge(false);
        return;
      }

      const data = await res.json();
      updateCloudStatusBadge(true);

      if (!data) return;

      let cloudTickets = [];
      if (Array.isArray(data)) {
        cloudTickets = data.filter(Boolean);
      } else if (typeof data === 'object') {
        cloudTickets = Object.values(data);
      }

      if (cloudTickets.length > 0) {
        cloudTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const localTickets = getTickets();
        const prevCount = localTickets.length;

        // Si ya se inicializaron las notificaciones, detectar novedades
        if (hasInitializedNotifs) {
          // A. ¿Nuevo ticket creado?
          if (cloudTickets.length > prevCount) {
            const newest = cloudTickets[0];
            triggerWebNotification(
              '¡Nuevo Ticket Recibido!',
              `#${newest.id} de ${newest.customerName} (${newest.device})`,
              newest.id
            );
          }

          // B. ¿Nuevos mensajes en tickets existentes?
          cloudTickets.forEach(ct => {
            const oldCount = knownTicketMessageCounts[ct.id] || 0;
            if (ct.messages && ct.messages.length > oldCount) {
              const latestMsg = ct.messages[ct.messages.length - 1];
              // Evitar auto-alertarse si uno mismo acaba de escribir en el chat
              const isOwnMessage = (currentStaffRole && latestMsg.sender === 'staff') ||
                                   (!currentStaffRole && latestMsg.sender === 'client' && ct.id === currentActiveTicketId);
              
              if (!isOwnMessage) {
                const preview = latestMsg.text ? latestMsg.text.substring(0, 75) : 'Nuevo mensaje recibido';
                triggerWebNotification(
                  `Mensaje en Ticket #${ct.id}`,
                  `${latestMsg.author}: "${preview}"`,
                  ct.id
                );
              }
            }
          });
        }

        // Actualizar conteo de mensajes conocidos
        cloudTickets.forEach(ct => {
          knownTicketMessageCounts[ct.id] = (ct.messages || []).length;
        });
        hasInitializedNotifs = true;

        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(cloudTickets));
        renderPublicTickets();
        renderDashTickets();
        if (currentActiveTicketId) {
          renderChatMessages();
        }

        if (showFeedback) {
          ayloxApp.showToast('¡Base de Datos sincronizada con la Nube con éxito!', 'success');
        }
      }
    } catch (e) {
      updateCloudStatusBadge(false);
      console.warn('Error sincronizando con Firebase:', e);
    }
  }

  // Obtener lista de tickets
  function getTickets() {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(SAMPLE_TICKETS));
      return [...SAMPLE_TICKETS];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(SAMPLE_TICKETS));
      return [...SAMPLE_TICKETS];
    } catch {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(SAMPLE_TICKETS));
      return [...SAMPLE_TICKETS];
    }
  }

  // Guardar tickets
  function saveTickets(tickets) {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    notifyChange();
    renderPublicTickets();
    renderDashTickets();
  }

  function generateTicketId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `AYL-${num}`;
  }

  // ----------------------------------------------------
  // FORMULARIO: CREACIÓN DE NUEVO TICKET
  // ----------------------------------------------------

  function openNewTicketModal(preselectedPlan = null) {
    // Si el cliente ya tiene un ticket activo que no ha sido cerrado por el staff, abrir su chat directamente
    const activeTicketId = localStorage.getItem('aylox_client_active_ticket_id');
    if (activeTicketId && !currentStaffRole) {
      const tickets = getTickets();
      const existing = tickets.find(t => t.id === activeTicketId);
      if (existing && existing.status !== 'resuelto') {
        ayloxApp.showToast(`Tienes un ticket en atención (#${existing.id}). Solo el Staff puede cerrarlo. Abriendo tu chat...`, 'info');
        openChatModal(existing.id);
        return;
      }
    }

    const modal = document.getElementById('newTicketModal');
    if (!modal) return;

    if (preselectedPlan) {
      const planSelect = document.getElementById('ticketSelectedPlan');
      if (planSelect) {
        for (let i = 0; i < planSelect.options.length; i++) {
          if (planSelect.options[i].value.includes(preselectedPlan) || preselectedPlan.includes(planSelect.options[i].value)) {
            planSelect.selectedIndex = i;
            break;
          }
        }
      }
    }

    modal.classList.remove('hidden');
    if (typeof ayloxSound !== 'undefined') ayloxSound.play('beep');
  }

  function closeNewTicketModal() {
    const modal = document.getElementById('newTicketModal');
    if (modal) modal.classList.add('hidden');
  }

  // Enviar Nuevo Ticket
  function submitTicket(e) {
    e.preventDefault();

    // 1. Verificación Honeypot (Anti-Bot)
    const honeypot = document.getElementById('honeypot_field')?.value || '';
    if (!ayloxSecurity.checkHoneypot(honeypot)) {
      ayloxApp.showToast('Acceso denegado por filtro de seguridad robótica.', 'error');
      return;
    }

    // 2. Verificación Rate Limiting (Anti-Spam / Anti-Flood)
    const rateCheck = ayloxSecurity.checkRateLimit();
    if (!rateCheck.allowed) {
      ayloxApp.showToast(`Límite de solicitudes alcanzado. Por favor espera ${rateCheck.retryAfterMinutes} minutos.`, 'error');
      return;
    }

    // 3. Extracción y Sanitización de Campos
    const name = ayloxSecurity.sanitize(document.getElementById('ticketCustomerName').value.trim());
    const phone = ayloxSecurity.sanitize(document.getElementById('ticketCustomerPhone').value.trim());
    const device = ayloxSecurity.sanitize(document.getElementById('ticketDeviceModel').value);
    const iosVerEl = document.getElementById('ticketIosVersion');
    const iosVersion = iosVerEl ? ayloxSecurity.sanitize(iosVerEl.value) : '';
    const plan = ayloxSecurity.sanitize(document.getElementById('ticketSelectedPlan').value);
    const message = ayloxSecurity.sanitize(document.getElementById('ticketCustomerMsg').value.trim());

    if (!name || !phone || !message) {
      ayloxApp.showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    // Validación estricta de Nombre y Apellido Real
    const nameWords = name.trim().split(/\s+/).filter(w => w.length >= 2);
    if (name.length < 4 || nameWords.length < 2 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.]+$/.test(name)) {
      ayloxApp.showToast('Por favor escribe tu Nombre y Apellido real completo (ejemplo: Carlos Mendoza) para registrar tu certificado Apple.', 'warning');
      document.getElementById('ticketCustomerName').focus();
      return;
    }

    // Validación de Teléfono WhatsApp con código de país
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      ayloxApp.showToast('Por favor escribe un número de WhatsApp real con código de país (ejemplo: +502 3250 9982).', 'warning');
      document.getElementById('ticketCustomerPhone').focus();
      return;
    }

    const fullDevice = iosVersion ? (device + ' (' + iosVersion + ')') : device;
    const cleanDevice = fullDevice.replace(/&#x2F;/g, '/');
    const cleanPlan = plan.replace(/&#x2F;/g, '/');

    const newTicket = {
      id: generateTicketId(),
      customerName: name,
      customerPhone: phone,
      device: cleanDevice,
      plan: cleanPlan,
      status: 'abierto',
      createdAt: new Date().toISOString(),
      assignedTo: 'Equipo AYLOX IOS',
      messages: [
        {
          id: 'm_' + Date.now(),
          sender: 'system',
          author: 'AYLOX BOT OFICIAL',
          text: `¡Hola ${name}! Tu ticket ha sido registrado y enviado al WhatsApp del Dueño (+502 3250 9982). Puedes chatear aquí en tiempo real o continuar en WhatsApp.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 'm_' + (Date.now() + 1),
          sender: 'client',
          author: name,
          text: message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    newTicket.messages[0].text = `¡Hola ${name}! Tu ticket #${newTicket.id} ha sido registrado y enviado al WhatsApp del Dueño (+502 3250 9982). Aquí tienes tu sala de chat para seguimiento en tiempo real.`;

    const tickets = getTickets();
    tickets.unshift(newTicket);
    saveTickets(tickets);

    // Guardar candado de ticket activo para el cliente (solo el staff puede cerrarlo)
    localStorage.setItem('aylox_client_active_ticket_id', newTicket.id);

    knownTicketMessageCounts[newTicket.id] = newTicket.messages.length;
    notifyChange({ newTicket });
    requestNotificationPermission();

    // Subir a la nube si Firebase está configurado
    pushTicketToCloud(newTicket);

    ayloxSecurity.logEvent(`Nuevo ticket ${newTicket.id} creado por ${name} (${cleanDevice})`);
    
    // Preparar mensaje y abrir WhatsApp directamente al Dueño (+502 3250 9982)
    const cfg = getConfig();
    const waText = `¡Hola AYLOX IOS! 👋 Acabo de abrir un ticket en la web:\n` +
                   `🎫 *Ticket:* #${newTicket.id}\n` +
                   `👤 *Cliente:* ${name}\n` +
                   `📱 *WhatsApp:* ${phone}\n` +
                   `🍏 *Dispositivo:* ${cleanDevice}\n` +
                   `⭐ *Plan de Interés:* ${cleanPlan}\n` +
                   `💬 *Mensaje:* ${message}`;

    const waUrl = `https://wa.me/${cfg.owner2Phone}?text=${encodeURIComponent(waText)}`;
    
    // Abrir WhatsApp al dueño de inmediato
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('Popup de WhatsApp bloqueado por el navegador', e);
    }

    // Reset form y cerrar modal
    document.getElementById('newTicketForm').reset();
    closeNewTicketModal();

    if (typeof ayloxSound !== 'undefined') ayloxSound.play('success');
    ayloxApp.showToast(`¡Ticket #${newTicket.id} creado! Abriendo WhatsApp con el Dueño...`, 'success');

    // Abrir directamente la sala de chat de este ticket
    setTimeout(() => {
      openChatModal(newTicket.id);
    }, 600);
  }

  // ----------------------------------------------------
  // SALA DE CHAT EN VIVO DE TICKETS
  // ----------------------------------------------------

  function openChatModal(ticketId) {
    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      ayloxApp.showToast('El ticket solicitado no fue encontrado.', 'error');
      return;
    }

    currentActiveTicketId = ticketId;

    // Si el staff abre un ticket que estaba "abierto", marcarlo "en_proceso" de inmediato
    if (currentStaffRole && ticket.status === 'abierto') {
      ticket.status = 'en_proceso';
      ticket.assignedTo = currentStaffRole === 'dueno' ? '👑 Dueño Principal' : '🛡️ Vendedor';
      saveTickets(tickets);
      pushTicketToCloud(ticket);
      notifyChange({ ticketId: ticket.id, status: 'en_proceso' });
    }

    // Actualizar cabecera del chat
    document.getElementById('chatTicketTitle').textContent = `Ticket #${ticket.id}`;
    document.getElementById('chatPlanInfo').textContent = (ticket.plan || '').replace(/&#x2F;/g, '/');
    document.getElementById('chatDeviceInfo').textContent = (ticket.device || '').replace(/&#x2F;/g, '/');

    const subEl = document.getElementById('chatTicketSub');
    if (subEl) {
      if (currentStaffRole) {
        const cleanPhone = (ticket.customerPhone || '').replace(/\D/g, '');
        subEl.innerHTML = `👤 <strong class="text-white">${ayloxSecurity.sanitize(ticket.customerName)}</strong> • 📱 <a href="https://wa.me/${cleanPhone}" target="_blank" class="text-aylox-green underline font-mono">${ayloxSecurity.sanitize(ticket.customerPhone)}</a>`;
      } else {
        subEl.textContent = `Atendiendo: Staff AYLOX IOS 24/7`;
      }
    }

    const statusBadge = document.getElementById('chatTicketStatusBadge');
    if (statusBadge) {
      if (ticket.status === 'abierto') {
        statusBadge.textContent = '🟢 ABIERTO 24/7';
        statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-aylox-green/20 text-aylox-green border border-aylox-green/40';
      } else if (ticket.status === 'en_proceso') {
        statusBadge.textContent = '🟡 EN ATENCIÓN';
        statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
      } else {
        statusBadge.textContent = '⚪ RESUELTO';
        statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-gray-500/20 text-gray-300 border border-gray-500/40';
      }
    }

    // Mostrar barra de respuestas rápidas y control de cierre solo si es staff
    const quickBar = document.getElementById('staffQuickResponsesBar');
    if (quickBar) {
      if (currentStaffRole) quickBar.classList.remove('hidden');
      else quickBar.classList.add('hidden');
    }

    const staffControls = document.getElementById('chatStaffControls');
    if (staffControls) {
      if (currentStaffRole && ticket.status !== 'resuelto') staffControls.classList.remove('hidden');
      else staffControls.classList.add('hidden');
    }

    renderChatMessages();

    const modal = document.getElementById('ticketChatModal');
    if (modal) modal.classList.remove('hidden');

    if (typeof ayloxSound !== 'undefined') ayloxSound.play('beep');
  }

  function closeChatModal() {
    const modal = document.getElementById('ticketChatModal');
    if (modal) modal.classList.add('hidden');
    currentActiveTicketId = null;
    if (currentStaffRole) {
      renderDashTickets();
    }
  }

  // Cerrar y resolver ticket (Solo permitido para Dueño o Vendedor)
  function closeAndResolveActiveTicket(ticketId = null) {
    const targetId = ticketId || currentActiveTicketId;
    if (!targetId) return;

    if (!currentStaffRole) {
      ayloxApp.showToast('Solo el Dueño o los Vendedores pueden cerrar tickets.', 'error');
      return;
    }

    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === targetId);
    if (!ticket) return;

    if (ticket.status === 'resuelto') {
      ayloxApp.showToast('Este ticket ya se encuentra cerrado.', 'info');
      return;
    }

    ticket.status = 'resuelto';
    const roleLabel = currentStaffRole === 'dueno' ? '👑 Dueño Principal' : '🛡️ Vendedor';
    const closeMsg = {
      id: 'm_' + Date.now(),
      sender: 'system',
      author: 'AYLOX SISTEMA',
      text: `🔒 Ticket cerrado y marcado como RESUELTO por ${roleLabel}. Si necesitas activar otro certificado o nuevo dispositivo, ya puedes abrir un nuevo ticket en la web. ¡Muchas gracias por tu compra!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    ticket.messages.push(closeMsg);

    saveTickets(tickets);
    pushTicketToCloud(ticket);
    notifyChange({ ticketId: ticket.id, status: 'resuelto' });

    // Liberar candado del cliente si este navegador tenía este ticket activo
    if (localStorage.getItem('aylox_client_active_ticket_id') === ticket.id) {
      localStorage.removeItem('aylox_client_active_ticket_id');
    }

    if (currentActiveTicketId === targetId) {
      renderChatMessages();
      const statusBadge = document.getElementById('chatTicketStatusBadge');
      if (statusBadge) {
        statusBadge.textContent = '⚪ RESUELTO';
        statusBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-gray-500/20 text-gray-300 border border-gray-500/40';
      }
      const staffControls = document.getElementById('chatStaffControls');
      if (staffControls) staffControls.classList.add('hidden');
    }

    renderDashTickets();
    renderPublicTickets();

    if (typeof ayloxSound !== 'undefined') ayloxSound.play('success');
    ayloxApp.showToast(`Ticket #${ticket.id} cerrado. El cliente ya puede abrir un nuevo ticket.`, 'success');
  }

  function renderChatMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container || !currentActiveTicketId) return;

    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === currentActiveTicketId);
    if (!ticket) return;

    container.innerHTML = ticket.messages.map(msg => {
      let isSystem = msg.sender === 'system';
      let isStaff = msg.sender === 'staff';

      if (isSystem) {
        return `
          <div class="chat-bubble-system p-3 text-xs">
            <div class="flex items-center space-x-1.5 font-bold font-mono text-[11px] mb-1">
              <i class="fa-solid fa-robot text-aylox-green"></i>
              <span>${ayloxSecurity.sanitize(msg.author)}</span>
              <span class="text-gray-500 ml-auto font-normal">${ayloxSecurity.sanitize(msg.time)}</span>
            </div>
            <div class="leading-relaxed text-gray-200">${ayloxSecurity.sanitize(msg.text).replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }

      if (isStaff) {
        return `
          <div class="flex flex-col items-start max-w-[85%]">
            <div class="text-[10px] text-aylox-green font-bold mb-1 flex items-center gap-1 font-cyber">
              <i class="fa-solid fa-shield-halved"></i>
              <span>${ayloxSecurity.sanitize(msg.author)}</span>
              <span class="text-gray-500 font-normal">(${ayloxSecurity.sanitize(msg.time)})</span>
            </div>
            <div class="chat-bubble-staff p-3.5 text-xs text-white shadow-[0_0_15px_rgba(0,255,102,0.1)]">
              ${ayloxSecurity.sanitize(msg.text).replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }

      // Cliente
      return `
        <div class="flex flex-col items-end max-w-[85%] ml-auto">
          <div class="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1">
            <span>${ayloxSecurity.sanitize(msg.author)}</span>
            <span class="text-gray-500 font-normal">(${ayloxSecurity.sanitize(msg.time)})</span>
          </div>
          <div class="chat-bubble-client p-3.5 text-xs text-gray-100 shadow">
            ${ayloxSecurity.sanitize(msg.text).replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;

    const input = document.getElementById('chatInputMessage');
    const sendBtn = document.querySelector('#chatReplyForm button[type="submit"]');
    if (input && sendBtn) {
      if (ticket.status === 'resuelto' && !currentStaffRole) {
        input.disabled = true;
        input.placeholder = 'Ticket cerrado y resuelto por el Staff.';
        sendBtn.disabled = true;
        sendBtn.className = 'px-4 py-2.5 rounded-xl bg-gray-700 text-gray-400 font-bold text-sm cursor-not-allowed';
      } else {
        input.disabled = false;
        input.placeholder = currentStaffRole ? 'Escribe una respuesta como Staff...' : 'Escribe tu mensaje aquí...';
        sendBtn.disabled = false;
        sendBtn.className = 'px-4 py-2.5 rounded-xl bg-aylox-green text-black hover:bg-aylox-greenhover font-bold text-sm transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.3)]';
      }
    }
  }

  function sendChatMessage(e) {
    e.preventDefault();
    if (!currentActiveTicketId) return;

    const input = document.getElementById('chatInputMessage');
    const rawText = input.value.trim();
    if (!rawText) return;

    const sanitizedText = ayloxSecurity.sanitize(rawText);
    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === currentActiveTicketId);
    if (!ticket) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let senderType = 'client';
    let authorName = ticket.customerName;

    if (currentStaffRole === 'dueno') {
      senderType = 'staff';
      authorName = '👑 Dueño AYLOX';
      ticket.status = 'en_proceso';
    } else if (currentStaffRole === 'vendedor') {
      senderType = 'staff';
      authorName = '🛡️ Vendedor Autorizado';
      ticket.status = 'en_proceso';
    }

    const newMsg = {
      id: 'm_' + Date.now(),
      sender: senderType,
      author: authorName,
      text: sanitizedText,
      time: time
    };

    ticket.messages.push(newMsg);
    saveTickets(tickets);

    knownTicketMessageCounts[ticket.id] = ticket.messages.length;
    notifyChange({ ticketId: ticket.id, newMessage: newMsg });
    requestNotificationPermission();

    // Subir mensaje a la nube
    pushTicketToCloud(ticket);

    input.value = '';
    renderChatMessages();
    if (typeof ayloxSound !== 'undefined') ayloxSound.play('message');

    // Respuesta del bot si el cliente vuelve a escribir y no hay staff en este segundo
    if (senderType === 'client' && ticket.messages.length === 3) {
      setTimeout(() => {
        const autoReply = {
          id: 'm_' + Date.now(),
          sender: 'system',
          author: 'AYLOX NOTIFICACIÓN 24/7',
          text: `Mensaje recibido. Tu ticket #${ticket.id} está en la bandeja prioritaria. Si deseas acelerar la entrega de tu certificado de inmediato, puedes tocar el botón "WhatsApp Dueño 🇬🇹" en la parte superior.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        ticket.messages.push(autoReply);
        saveTickets(tickets);
        knownTicketMessageCounts[ticket.id] = ticket.messages.length;
        notifyChange({ ticketId: ticket.id, newMessage: autoReply });
        pushTicketToCloud(ticket);
        renderChatMessages();
        if (typeof ayloxSound !== 'undefined') ayloxSound.play('ticket_alert');
      }, 1500);
    }
  }

  // Respuestas rápidas automáticas
  function insertCannedResponse(type) {
    if (!currentActiveTicketId || !currentStaffRole) return;
    const cfg = getConfig();
    let text = '';

    if (type === 'compatibilidad') {
      text = `🍏 *COMPATIBILIDAD AYLOX IOS (iOS 15 a iOS 27)*\n` +
             `Nuestros certificados Apple VIP tienen compatibilidad total desde *iOS 15 hasta iOS 27* en todos los modelos de iPhone y iPad.\n` +
             `• No requieres Jailbreak ni computadoras.\n` +
             `• Menú Antibaneo y garantía activa de reposición.\n` +
             `• Instalación asistida paso a paso.`;
    } else if (type === 'pagos') {
      text = `💳 *MÉTODOS DE PAGO OFICIALES AYLOX IOS*\n` +
             `• Binance Pay ID: ${cfg.binanceId} (USDT al instante)\n` +
             `• PayPal Oficial: ${cfg.paypal}\n` +
             `Envía tu comprobante a este chat o al WhatsApp oficial (+${cfg.owner2Phone}) para activar tu certificado de inmediato.`;
    } else if (type === 'whatsapp') {
      text = `📲 *CONTINUEMOS POR WHATSAPP*\n` +
             `Hemos asignado tu ticket #${currentActiveTicketId} al WhatsApp del Dueño.\n` +
             `Haz clic en el botón verde superior "WhatsApp Dueño 🇬🇹" o escríbenos directamente a: +${cfg.owner2Phone}`;
    } else if (type === 'instalacion') {
      text = `📦 *GUÍA RÁPIDA DE INSTALACIÓN AYLOX IOS*\n` +
             `1. Te enviaremos tu certificado (.p12 y .mobileprovision).\n` +
             `2. Descarga la aplicación de firma recomendada (ESign o Scarlet).\n` +
             `3. Importa los archivos e introduce la clave que te proporcionamos.\n` +
             `4. ¡Listo! Ya puedes firmar cualquier app .IPA sin revocación.`;
    } else if (type === 'comprobante') {
      text = `⏳ *SOLICITUD DE COMPROBANTE*\n` +
             `Por favor envíanos la captura o comprobante de pago para validar la transacción y dar de alta tu UDID en el portal de desarrolladores de Apple.`;
    }

    const input = document.getElementById('chatInputMessage');
    if (input) {
      input.value = text;
      input.focus();
    }
  }

  // Exportar el ticket actual con formato para WhatsApp
  function exportCurrentTicketToWhatsapp(targetPhone = null) {
    if (!currentActiveTicketId) return;
    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === currentActiveTicketId);
    if (!ticket) return;

    const cfg = getConfig();
    const phoneToSend = targetPhone || cfg.owner2Phone; // Por defecto al dueño 50232509982
    const cleanDevice = ticket.device.replace(/&#x2F;/g, '/');
    const cleanPlan = ticket.plan.replace(/&#x2F;/g, '/');
    const clientMsg = ticket.messages[1] ? ticket.messages[1].text : 'Quiero comprar';

    const msg = `¡Hola AYLOX IOS! 👋 Te contacto por mi Ticket #${ticket.id}:\n` +
                `🎫 *Ticket:* #${ticket.id}\n` +
                `👤 *Cliente:* ${ticket.customerName}\n` +
                `📱 *WhatsApp:* ${ticket.customerPhone}\n` +
                `🍏 *Dispositivo:* ${cleanDevice}\n` +
                `⭐ *Plan:* ${cleanPlan}\n` +
                `💬 *Mensaje:* ${clientMsg}`;

    const url = `https://wa.me/${phoneToSend}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // ----------------------------------------------------
  // LISTADO PÚBLICO DE TICKETS (PREVIEW VIVO EN LA WEB)
  // ----------------------------------------------------

  function renderPublicTickets() {
    const container = document.getElementById('publicTicketsContainer');
    const statEl = document.getElementById('statOpenTickets');
    if (!container) return;

    const tickets = getTickets();
    const openCount = tickets.filter(t => t.status !== 'resuelto').length;
    if (statEl) statEl.textContent = openCount.toString();

    if (tickets.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">No hay tickets activos en este momento.</div>`;
      return;
    }

    container.innerHTML = tickets.slice(0, 5).map(t => {
      let statusColor = 'text-aylox-green border-aylox-green/30 bg-aylox-green/10';
      let statusLabel = '🟢 Abierto';

      if (t.status === 'en_proceso') {
        statusColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
        statusLabel = '🟡 Atendiendo';
      } else if (t.status === 'resuelto') {
        statusColor = 'text-gray-400 border-gray-600/30 bg-gray-600/10';
        statusLabel = '⚪ Resuelto';
      }

      const lastMsg = t.messages[t.messages.length - 1];
      const previewText = lastMsg ? lastMsg.text.slice(0, 75) + '...' : 'Esperando respuesta...';

      return `
        <div onclick="ayloxTickets.openChatModal('${t.id}')" class="p-3 rounded-xl bg-aylox-card/50 border border-aylox-cardborder hover:border-aylox-green/50 cursor-pointer transition flex items-center justify-between gap-3 group">
          <div class="space-y-1 min-w-0 flex-1">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono font-bold text-white group-hover:text-aylox-green transition">#${t.id}</span>
              <span class="text-[10px] text-gray-400 font-semibold truncate">• ${ayloxSecurity.sanitize(t.customerName)}</span>
              <span class="text-[9px] px-2 py-0.5 rounded border font-mono ${statusColor}">${statusLabel}</span>
            </div>
            <div class="text-[11px] text-gray-400 truncate">
              <span class="text-aylox-green font-semibold">${ayloxSecurity.sanitize(t.device)}:</span> ${ayloxSecurity.sanitize(previewText)}
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-[11px] text-aylox-green group-hover:underline flex items-center gap-1">
              <span>Entrar</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ----------------------------------------------------
  // AUTENTICACIÓN Y ROLES (DUEÑO VS VENDEDOR)
  // ----------------------------------------------------

  function openStaffAuthModal() {
    const modal = document.getElementById('staffAuthModal');
    if (modal) modal.classList.remove('hidden');
    const input = document.getElementById('staffPinInput');
    if (input) {
      input.value = '';
      input.type = 'password';
      input.setAttribute('autocomplete', 'new-password');
    }
    const icon = document.getElementById('staffPinEyeIcon');
    if (icon) icon.className = 'fa-solid fa-eye';
    selectStaffRole('dueno');
    if (typeof ayloxSound !== 'undefined') ayloxSound.play('beep');
    setTimeout(() => {
      const pinInp = document.getElementById('staffPinInput');
      if (pinInp) pinInp.value = '';
    }, 50);
  }

  function closeStaffAuthModal() {
    const modal = document.getElementById('staffAuthModal');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('staffPinInput');
    if (input) input.value = '';
  }

  function selectStaffRole(role) {
    selectedAuthRole = role;
    const btnOwner = document.getElementById('roleBtnOwner');
    const btnPartner = document.getElementById('roleBtnPartner');
    const hint = document.getElementById('pinHintText');

    if (role === 'dueno') {
      if (btnOwner) btnOwner.className = 'py-2.5 rounded-xl border border-aylox-green bg-aylox-green/20 text-aylox-green text-xs font-bold transition flex items-center justify-center gap-2';
      if (btnPartner) btnPartner.className = 'py-2.5 rounded-xl border border-aylox-cardborder bg-aylox-card text-gray-400 text-xs font-bold hover:text-white transition flex items-center justify-center gap-2';
      if (hint) hint.innerHTML = '👑 <span class="text-aylox-green font-semibold">Modo Dueño:</span> Ingresa tu clave secreta de administración';
    } else {
      if (btnPartner) btnPartner.className = 'py-2.5 rounded-xl border border-aylox-green bg-aylox-green/20 text-aylox-green text-xs font-bold transition flex items-center justify-center gap-2';
      if (btnOwner) btnOwner.className = 'py-2.5 rounded-xl border border-aylox-cardborder bg-aylox-card text-gray-400 text-xs font-bold hover:text-white transition flex items-center justify-center gap-2';
      if (hint) hint.innerHTML = '🛡️ <span class="text-aylox-green font-semibold">Modo Vendedor:</span> Ingresa tu clave secreta de ventas';
    }
  }

  function toggleStaffPinVisibility() {
    const input = document.getElementById('staffPinInput');
    const icon = document.getElementById('staffPinEyeIcon');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      if (icon) icon.className = 'fa-solid fa-eye';
    }
  }

  function loginStaff() {
    const inputEl = document.getElementById('staffPinInput');
    const rawPin = (inputEl ? inputEl.value : '').trim();
    const cleanPin = rawPin.toLowerCase().replace(/\s+/g, ' ');
    const compactPin = cleanPin.replace(/\s+/g, '');
    const cfg = getConfig();

    let authenticated = false;

    // Claves aceptadas para Vendedor (VENDORES 1, VENDORES, VENDEDOR 1, etc.)
    const sellerVariants = [
      'vendores 1',
      'vendores1',
      'vendores',
      'vendedores 1',
      'vendedores1',
      'vendedores',
      'vendedor 1',
      'vendedor1',
      'vendedor',
      (cfg.pinSeller || '').toLowerCase().trim(),
      (cfg.pinSeller || '').toLowerCase().replace(/\s+/g, '')
    ];

    // Claves aceptadas para Dueño (AYLOX IOS, AYALYX IOS, AYLOX, etc.)
    const ownerVariants = [
      'aylox ios',
      'ayloxios',
      'ayalyx ios',
      'ayalyxios',
      'aylox ios 18',
      'aylox ios18',
      'aylox18',
      'aylox',
      'ayalyx',
      (cfg.pinOwner || '').toLowerCase().trim(),
      (cfg.pinOwner || '').toLowerCase().replace(/\s+/g, '')
    ];

    const isMatchSeller = sellerVariants.includes(cleanPin) || 
                          sellerVariants.includes(compactPin) || 
                          rawPin.toLowerCase() === 'vendores 1' || 
                          rawPin.toLowerCase() === 'vendores1' || 
                          rawPin.toLowerCase() === 'vendedor 1' || 
                          rawPin.toLowerCase() === 'vendedor1' || 
                          rawPin === cfg.pinSeller;

    const isMatchOwner = ownerVariants.includes(cleanPin) || 
                         ownerVariants.includes(compactPin) || 
                         rawPin.toUpperCase() === 'AYLOX IOS' || 
                         rawPin === cfg.pinOwner;

    if (isMatchOwner) {
      currentStaffRole = 'dueno';
      authenticated = true;
    } else if (isMatchSeller) {
      currentStaffRole = 'vendedor';
      authenticated = true;
    }

    if (!authenticated) {
      ayloxSecurity.recordBlockedAttempt('Intento fallido de inicio de sesión en Portal Staff');
      ayloxApp.showToast('Contraseña incorrecta. Acceso denegado.', 'error');
      if (inputEl) inputEl.value = '';
      return;
    }

    closeStaffAuthModal();
    if (inputEl) inputEl.value = '';

    openStaffDashboard();
    requestNotificationPermission();
    ayloxSecurity.logEvent(`Sesión iniciada con éxito como: ${currentStaffRole.toUpperCase()}`);
    ayloxApp.showToast(`¡Bienvenido a AYLOX IOS (${currentStaffRole === 'dueno' ? 'DUEÑO' : 'VENDEDOR'})!`, 'success');
  }

  function openStaffDashboard() {
    const modal = document.getElementById('staffDashboardModal');
    if (!modal) return;

    const badge = document.getElementById('staffRoleBadge');
    const tabConfig = document.getElementById('tabBtnConfig');

    if (currentStaffRole === 'dueno') {
      if (badge) {
        badge.textContent = '👑 DUEÑO PRINCIPAL (Control Maestro)';
        badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-bold bg-aylox-green text-black';
      }
      if (tabConfig) tabConfig.style.display = 'inline-block';
    } else {
      if (badge) {
        badge.textContent = '🛡️ VENDEDOR (Atención & Ventas)';
        badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-bold bg-yellow-400 text-black';
      }
      // Ocultar pestaña de ajustes críticos a vendedores
      if (tabConfig) tabConfig.style.display = 'none';
    }

    // Cargar valores en los inputs de configuración
    const cfg = getConfig();
    if (document.getElementById('cfgOwner1Phone')) document.getElementById('cfgOwner1Phone').value = cfg.owner1Phone;
    if (document.getElementById('cfgOwner1Name')) document.getElementById('cfgOwner1Name').value = cfg.owner1Name;
    if (document.getElementById('cfgOwner2Phone')) document.getElementById('cfgOwner2Phone').value = cfg.owner2Phone;
    if (document.getElementById('cfgOwner2Name')) document.getElementById('cfgOwner2Name').value = cfg.owner2Name;
    if (document.getElementById('cfgBinanceId')) document.getElementById('cfgBinanceId').value = cfg.binanceId;
    if (document.getElementById('cfgPaypal')) document.getElementById('cfgPaypal').value = cfg.paypal;
    if (document.getElementById('cfgOwnerPin')) document.getElementById('cfgOwnerPin').value = cfg.pinOwner || 'AYLOX IOS';
    if (document.getElementById('cfgSellerPin')) document.getElementById('cfgSellerPin').value = cfg.pinSeller || 'VENDORES 1';
    if (document.getElementById('cfgFirebaseUrl')) document.getElementById('cfgFirebaseUrl').value = cfg.firebaseUrl || '';

    updateCloudStatusBadge(!!cfg.firebaseUrl);

    showDashboardTab('tickets');
    renderDashTickets();

    modal.classList.remove('hidden');

    // Sincronizar desde la nube al abrir el dashboard
    syncFromCloud();
  }

  function logoutStaff() {
    currentStaffRole = null;
    const modal = document.getElementById('staffDashboardModal');
    if (modal) modal.classList.add('hidden');
    ayloxApp.showToast('Sesión de staff cerrada.', 'info');
  }

  function showDashboardTab(tabId) {
    const tabs = ['tickets', 'cloud', 'config', 'security'];
    tabs.forEach(t => {
      const el = document.getElementById(`dashTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (el) {
        if (t === tabId) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    });

    const buttons = document.querySelectorAll('.dash-tab');
    buttons.forEach((btn) => {
      if (btn.getAttribute('onclick')?.includes(tabId)) {
        btn.classList.add('active-dash-tab');
        btn.classList.remove('text-gray-400');
      } else {
        btn.classList.remove('active-dash-tab');
        btn.classList.add('text-gray-400');
      }
    });
  }

  let activeTicketsFilter = 'all';

  function filterTickets(status) {
    activeTicketsFilter = status;
    renderDashTickets();
  }

  function renderDashTickets() {
    const tableBody = document.getElementById('dashTicketsTableBody');
    const countEl = document.getElementById('dashTicketsCount');
    if (!tableBody) return;

    let tickets = getTickets();
    if (countEl) countEl.textContent = tickets.length.toString();

    if (activeTicketsFilter !== 'all') {
      tickets = tickets.filter(t => t.status === activeTicketsFilter);
    }

    if (tickets.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500">No hay tickets para mostrar en esta categoría.</td></tr>`;
      return;
    }

    tableBody.innerHTML = tickets.map(t => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-aylox-green/20 text-aylox-green border border-aylox-green/40">Abierto</span>`;
      if (t.status === 'en_proceso') {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">En Proceso</span>`;
      } else if (t.status === 'resuelto') {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-600/20 text-gray-400 border border-gray-600/40">Resuelto</span>`;
      }

      const dateStr = new Date(t.createdAt).toLocaleDateString() + ' ' + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cleanPhoneDigits = (t.customerPhone || '').replace(/\D/g, '');
      const waDirectMsg = encodeURIComponent(`¡Hola ${t.customerName}! 👋 Te escribo del equipo oficial de AYLOX IOS sobre tu ticket #${t.id} para la activación de tu plan "${t.plan}".`);

      return `
        <tr class="hover:bg-aylox-card/40 transition">
          <td class="p-3 font-mono font-bold text-aylox-green">#${t.id}</td>
          <td class="p-3 font-bold text-white text-sm">${ayloxSecurity.sanitize(t.customerName)}</td>
          <td class="p-3 font-mono">
            <span class="text-gray-300 block text-xs">${ayloxSecurity.sanitize(t.customerPhone)}</span>
            <a href="https://wa.me/${cleanPhoneDigits}?text=${waDirectMsg}" target="_blank" class="mt-1 px-2 py-0.5 rounded bg-green-600/30 text-green-300 hover:bg-green-600 hover:text-white border border-green-500/40 text-[10px] font-bold transition inline-flex items-center gap-1 shadow">
              <i class="fa-brands fa-whatsapp text-xs"></i>
              <span>Abrir WhatsApp</span>
            </a>
          </td>
          <td class="p-3">
            <span class="text-white font-semibold">${ayloxSecurity.sanitize(t.device)}</span><br>
            <span class="text-[10px] text-aylox-green font-mono">${ayloxSecurity.sanitize(t.plan)}</span>
          </td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3 text-[10px] text-gray-400 font-mono">${dateStr}</td>
          <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
            <button onclick="ayloxTickets.openChatModal('${t.id}')" class="px-3 py-1.5 rounded-lg bg-aylox-green text-black font-bold text-xs hover:bg-aylox-greenhover transition inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.3)]" title="Chatear con el cliente en tiempo real">
              <i class="fa-solid fa-comments"></i>
              <span>Chatear</span>
            </button>
            ${t.status !== 'resuelto' ? `
              <button onclick="ayloxTickets.closeAndResolveActiveTicket('${t.id}')" class="px-2.5 py-1.5 rounded-lg bg-aylox-card hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/40 text-xs font-bold transition inline-flex items-center gap-1" title="Cerrar ticket como resuelto">
                <i class="fa-solid fa-check-double"></i>
                <span class="hidden sm:inline">Cerrar</span>
              </button>
            ` : `
              <span class="text-[10px] text-gray-500 font-mono px-2 py-1">Cerrado</span>
            `}
            ${currentStaffRole === 'dueno' ? `
              <button onclick="ayloxTickets.deleteTicket('${t.id}')" class="px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs transition inline-flex items-center" title="Eliminar ticket (Solo Dueños)">
                <i class="fa-solid fa-trash"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateTicketStatus(ticketId, newStatus) {
    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    ticket.status = newStatus;
    saveTickets(tickets);
    pushTicketToCloud(ticket);

    ayloxSecurity.logEvent(`Ticket ${ticketId} marcado como: ${newStatus}`);
    ayloxApp.showToast(`Estado del ticket #${ticketId} actualizado a ${newStatus}`, 'success');
  }

  function deleteTicket(ticketId) {
    if (currentStaffRole !== 'dueno') {
      ayloxApp.showToast('Solo el Dueño Principal puede eliminar tickets', 'error');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el ticket #${ticketId}?`)) return;

    let tickets = getTickets();
    tickets = tickets.filter(t => t.id !== ticketId);
    saveTickets(tickets);

    // Borrar de Firebase si está configurado
    const cfg = getConfig();
    if (cfg.firebaseUrl) {
      try {
        let baseUrl = cfg.firebaseUrl.trim().replace(/\/+$/, '');
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        fetch(`${baseUrl}/tickets/${ticketId}.json`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Error borrando en Firebase:', e);
      }
    }

    ayloxSecurity.logEvent(`Ticket ${ticketId} eliminado por el Dueño.`);
    ayloxApp.showToast(`Ticket #${ticketId} eliminado`, 'info');
  }

  function exportTicketsJSON() {
    const tickets = getTickets();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aylox_tickets_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    ayloxApp.showToast('Copia de respaldo descargada', 'success');
  }

  // Inicializar al cargar
  document.addEventListener('DOMContentLoaded', () => {
    updateWebNotifUI();
    const initTickets = getTickets();
    initTickets.forEach(t => {
      knownTicketMessageCounts[t.id] = (t.messages || []).length;
    });
    lastKnownTicketsCount = initTickets.length;
    hasInitializedNotifs = true;

    renderPublicTickets();
    
    // Iniciar sondeo en segundo plano con la nube cada 4 segundos
    setInterval(() => {
      syncFromCloud();
    }, 4000);

    // Sincronización inicial
    syncFromCloud();

    // Escuchar cambios entre pestañas
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY_TICKETS) {
        renderPublicTickets();
        renderDashTickets();
        if (currentActiveTicketId) {
          renderChatMessages();
        }
      }
    });
  });

  return {
    getConfig,
    saveStaffConfig,
    saveCloudDbUrl,
    syncFromCloud,
    openNewTicketModal,
    closeNewTicketModal,
    submitTicket,
    openChatModal,
    closeChatModal,
    closeAndResolveActiveTicket,
    renderChatMessages,
    sendChatMessage,
    insertCannedResponse,
    exportCurrentTicketToWhatsapp,
    renderPublicTickets,
    openStaffAuthModal,
    closeStaffAuthModal,
    selectStaffRole,
    toggleStaffPinVisibility,
    loginStaff,
    openStaffDashboard,
    logoutStaff,
    showDashboardTab,
    filterTickets,
    updateTicketStatus,
    deleteTicket,
    exportTicketsJSON,
    toggleWebNotifications,
    testNotification,
    requestNotificationPermission
  };
})();
