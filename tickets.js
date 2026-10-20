/**
 * ===================================================
 * AYLOX IOS — TICKET ENGINE & MULTI-ROLE SYSTEM
 * ===================================================
 * Roles:
 * - 'cliente'  : Crea tickets, chatea en vivo, exporta a WhatsApp
 * - 'socio'    : Responde tickets, usa respuestas rápidas, cambia estados
 * - 'dueno'    : Control total, edita teléfonos, cuentas de pago y configuraciones
 */

const ayloxTickets = (function() {
  const STORAGE_KEY_TICKETS = 'aylox_tickets_db';
  const STORAGE_KEY_CONFIG = 'aylox_staff_config';
  const STORAGE_KEY_SESSION = 'aylox_staff_session';

  // Configuración predeterminada de teléfonos y cuentas
  const DEFAULT_CONFIG = {
    owner1Name: 'Dueño 1 — AYLOX IOS',
    owner1Phone: '584124020112',
    owner2Name: 'Dueño 2 — AYLOX IOS',
    owner2Phone: '50232509982',
    owner3Name: 'Línea de Activación Rápida',
    owner3Phone: '50232509982',
    binanceId: '1146199763',
    paypal: 'https://paypal.me/davisiso',
    pinOwner: '1111',
    pinPartner: '2222'
  };

  // Tickets de demostración para que el sistema tenga vida desde el inicio
  const SAMPLE_TICKETS = [
    {
      id: 'AYL-8492',
      customerName: 'Santiago Morales',
      customerPhone: '+58 412 123 4567',
      device: 'iPhone 15 Pro Max',
      plan: 'Certificado VIP + Hack / Mod (Pack Completo)',
      status: 'en_proceso',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      assignedTo: 'Dueño 1 (Venezuela)',
      messages: [
        {
          id: 'm1',
          sender: 'system',
          author: 'AYLOX BOT',
          text: '¡Hola Santiago! Tu ticket fue recibido con éxito. Uno de los dos Dueños tomará tu caso de inmediato.',
          time: 'Hace 45 min'
        },
        {
          id: 'm2',
          sender: 'client',
          author: 'Santiago Morales',
          text: 'Buenas tardes, quiero comprar el certificado con el hack incluido para jugar sin riesgo de baneo en iOS 18.',
          time: 'Hace 43 min'
        },
        {
          id: 'm3',
          sender: 'staff',
          author: 'Dueño 1 (Venezuela)',
          text: '¡Hola Santiago! Sí, nuestro pack completo de Certificado VIP + Hack/Mod incluye soporte antibaneo para iOS 18. Te dejamos los métodos de pago para activarlo de inmediato.',
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
      assignedTo: 'Dueño 2 (Guatemala)',
      messages: [
        {
          id: 'm1',
          sender: 'system',
          author: 'AYLOX BOT',
          text: '¡Hola Mateo! Ticket registrado para Solo Certificado Apple Developer.',
          time: 'Hace 15 min'
        },
        {
          id: 'm2',
          sender: 'client',
          author: 'Mateo Fernández',
          text: 'Hola, solo me interesa el certificado porque ya tengo mis propias aplicaciones IPAs. ¿Cuánto tiempo tarda la activación?',
          time: 'Hace 14 min'
        }
      ]
    }
  ];

  // Estado en memoria
  let currentActiveTicketId = null;
  let currentStaffRole = null; // 'dueno' | 'socio' | null
  let selectedAuthRole = 'dueno';
  let broadcastChannel = null;

  // Inicializar BroadcastChannel para sincronizar en tiempo real entre ventanas
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('aylox_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'TICKETS_UPDATED') {
          renderPublicTickets();
          renderDashTickets();
          if (currentActiveTicketId) {
            renderChatMessages();
          }
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel no soportado, usando sincronización estándar por Storage.', e);
  }

  // Notificar cambios a otras pestañas
  function notifyChange() {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'TICKETS_UPDATED', timestamp: Date.now() });
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
      // Asegurar números y cuentas reales de los dueños
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
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  // Guardar configuración modificada
  function saveStaffConfig() {
    if (currentStaffRole !== 'dueno') {
      ayloxApp.showToast('Solo el Dueño Principal puede editar los números y cuentas', 'error');
      return;
    }

    const cfg = getConfig();
    cfg.owner1Phone = document.getElementById('cfgOwner1Phone').value.trim() || cfg.owner1Phone;
    cfg.owner1Name = document.getElementById('cfgOwner1Name').value.trim() || cfg.owner1Name;
    cfg.owner2Phone = document.getElementById('cfgOwner2Phone').value.trim() || cfg.owner2Phone;
    cfg.owner2Name = document.getElementById('cfgOwner2Name').value.trim() || cfg.owner2Name;
    cfg.owner3Phone = document.getElementById('cfgOwner3Phone').value.trim() || cfg.owner3Phone;
    cfg.owner3Name = document.getElementById('cfgOwner3Name').value.trim() || cfg.owner3Name;
    cfg.binanceId = document.getElementById('cfgBinanceId').value.trim() || cfg.binanceId;
    cfg.paypal = document.getElementById('cfgPaypal').value.trim() || cfg.paypal;

    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
    ayloxApp.applyConfigToUI(cfg);

    ayloxSecurity.logEvent('Configuración de teléfonos y cuentas actualizada por el Dueño Principal.');
    ayloxApp.showToast('¡Configuración guardada correctamente!', 'success');
  }

  // Obtener lista de tickets
  function getTickets() {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(SAMPLE_TICKETS));
      return [...SAMPLE_TICKETS];
    }
    try {
      return JSON.parse(raw);
    } catch {
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

  // Generador de ID amigable (#AYL-XXXX)
  function generateTicketId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `AYL-${num}`;
  }

  // ----------------------------------------------------
  // MANEJO DE MODALES
  // ----------------------------------------------------

  function openNewTicketModal(preselectedPlan = null) {
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
    const plan = ayloxSecurity.sanitize(document.getElementById('ticketSelectedPlan').value);
    const message = ayloxSecurity.sanitize(document.getElementById('ticketCustomerMsg').value.trim());

    if (!name || !phone || !message) {
      ayloxApp.showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    const cleanDevice = device.replace(/&#x2F;/g, '/');
    const cleanPlan = plan.replace(/&#x2F;/g, '/');

    const newTicket = {
      id: generateTicketId(),
      customerName: name,
      customerPhone: phone,
      device: cleanDevice,
      plan: cleanPlan,
      status: 'abierto',
      createdAt: new Date().toISOString(),
      assignedTo: 'Dueño & Socios',
      messages: [
        {
          id: 'm_' + Date.now(),
          sender: 'system',
          author: 'AYLOX BOT OFICIAL',
          text: `¡Hola ${name}! Tu ticket #${newTicket?.id || 'AYL'} ha sido registrado y enviado al WhatsApp del Dueño (+502 3250 9982). Aquí tienes tu sala de chat para seguimiento en tiempo real.`,
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
    
    // Disparar WhatsApp al dueño inmediatamente
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('Popup blocked, available via button', e);
    }

    // Reset form y cerrar modal
    document.getElementById('newTicketForm').reset();
    closeNewTicketModal();

    if (typeof ayloxSound !== 'undefined') ayloxSound.play('success');
    ayloxApp.showToast(`¡Ticket #${newTicket.id} creado! Enviando información a tu WhatsApp...`, 'success');

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

    // Actualizar cabecera del chat
    document.getElementById('chatTicketTitle').textContent = `Ticket #${ticket.id}`;
    document.getElementById('chatPlanInfo').textContent = (ticket.plan || '').replace(/&#x2F;/g, '/');
    document.getElementById('chatDeviceInfo').textContent = (ticket.device || '').replace(/&#x2F;/g, '/');

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

    // Mostrar/Ocultar barra de respuestas rápidas si es staff
    const quickBar = document.getElementById('staffQuickResponsesBar');
    if (quickBar) {
      if (currentStaffRole) {
        quickBar.classList.remove('hidden');
      } else {
        quickBar.classList.add('hidden');
      }
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
  }

  // Renderizar mensajes dentro del modal de chat
  function renderChatMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container || !currentActiveTicketId) return;

    const tickets = getTickets();
    const ticket = tickets.find(t => t.id === currentActiveTicketId);
    if (!ticket) return;

    container.innerHTML = ticket.messages.map(msg => {
      let isSystem = msg.sender === 'system';
      let isStaff = msg.sender === 'staff';
      let isClient = msg.sender === 'client';

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

    // Auto scroll al final
    container.scrollTop = container.scrollHeight;
  }

  // Enviar mensaje en el chat
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
      authorName = '👑 Dueño Principal';
      ticket.status = 'en_proceso';
    } else if (currentStaffRole === 'socio') {
      senderType = 'staff';
      authorName = '🛡️ Socio Autorizado';
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

    input.value = '';
    renderChatMessages();
    if (typeof ayloxSound !== 'undefined') ayloxSound.play('message');

    // Si el mensaje fue enviado por el cliente y no hay staff atendiendo activamente en este instante,
    // generar respuesta automatizada preliminar si es su segunda consulta
    if (senderType === 'client' && ticket.messages.length === 3) {
      setTimeout(() => {
        const autoReply = {
          id: 'm_' + Date.now(),
          sender: 'system',
          author: 'AYLOX NOTIFICACIÓN 24/7',
          text: `Mensaje recibido. Tu ticket #${ticket.id} está en la bandeja prioritaria. Si deseas acelerar la entrega de tu certificado de inmediato, puedes tocar el botón "Pasar a WhatsApp" en la parte superior.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        ticket.messages.push(autoReply);
        saveTickets(tickets);
        renderChatMessages();
        if (typeof ayloxSound !== 'undefined') ayloxSound.play('alert');
      }, 1500);
    }
  }

  // Respuestas rápidas automáticas para el Dueño y Socios
  function insertCannedResponse(type) {
    if (!currentActiveTicketId || !currentStaffRole) return;
    const cfg = getConfig();
    let text = '';

    if (type === 'pagos') {
      text = `💳 *MÉTODOS DE PAGO OFICIALES AYLOX IOS*\n` +
             `• Binance Pay ID: ${cfg.binanceId} (USDT al instante)\n` +
             `• PayPal Oficial: ${cfg.paypal}\n` +
             `• Transferencia Bancaria Directa: Solicita los datos de cuenta.\n` +
             `Una vez realizado tu pago, envía tu comprobante a este chat o al WhatsApp oficial (+${cfg.owner2Phone}) para activar tu certificado de inmediato.`;
    } else if (type === 'whatsapp') {
      text = `📲 *CONTINUEMOS POR WHATSAPP*\n` +
             `Hemos asignado tu ticket #${currentActiveTicketId} al WhatsApp del Dueño.\n` +
             `Haz clic en el botón verde superior "Pasar a WhatsApp" o escríbenos directamente a: +${cfg.owner2Phone}`;
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
  // AUTENTICACIÓN Y PORTAL DE DUEÑO & SOCIOS
  // ----------------------------------------------------

  function openStaffAuthModal() {
    const modal = document.getElementById('staffAuthModal');
    if (modal) modal.classList.remove('hidden');
    selectStaffRole('dueno');
    if (typeof ayloxSound !== 'undefined') ayloxSound.play('beep');
  }

  function closeStaffAuthModal() {
    const modal = document.getElementById('staffAuthModal');
    if (modal) modal.classList.add('hidden');
  }

  function selectStaffRole(role) {
    selectedAuthRole = role;
    const btnOwner = document.getElementById('roleBtnOwner');
    const btnPartner = document.getElementById('roleBtnPartner');

    if (role === 'dueno') {
      btnOwner.className = 'py-2.5 rounded-xl border border-aylox-green bg-aylox-green/20 text-aylox-green text-xs font-bold transition flex items-center justify-center gap-2';
      btnPartner.className = 'py-2.5 rounded-xl border border-aylox-cardborder bg-aylox-card text-gray-400 text-xs font-bold hover:text-white transition flex items-center justify-center gap-2';
    } else {
      btnPartner.className = 'py-2.5 rounded-xl border border-aylox-green bg-aylox-green/20 text-aylox-green text-xs font-bold transition flex items-center justify-center gap-2';
      btnOwner.className = 'py-2.5 rounded-xl border border-aylox-cardborder bg-aylox-card text-gray-400 text-xs font-bold hover:text-white transition flex items-center justify-center gap-2';
    }
  }

  function loginStaff() {
    const pin = document.getElementById('staffPinInput').value.trim();
    const cfg = getConfig();

    let authenticated = false;

    if (selectedAuthRole === 'dueno' && pin === cfg.pinOwner) {
      currentStaffRole = 'dueno';
      authenticated = true;
    } else if (selectedAuthRole === 'socio' && pin === cfg.pinPartner) {
      currentStaffRole = 'socio';
      authenticated = true;
    }

    if (!authenticated) {
      ayloxSecurity.recordBlockedAttempt('Intento fallido de inicio de sesión en Portal Staff');
      ayloxApp.showToast('PIN incorrecto. Acceso denegado.', 'error');
      return;
    }

    closeStaffAuthModal();
    document.getElementById('staffPinInput').value = '';

    openStaffDashboard();
    ayloxSecurity.logEvent(`Sesión iniciada con éxito como: ${currentStaffRole.toUpperCase()}`);
    ayloxApp.showToast(`¡Bienvenido al Panel de Control (${currentStaffRole.toUpperCase()})!`, 'success');
  }

  function openStaffDashboard() {
    const modal = document.getElementById('staffDashboardModal');
    if (!modal) return;

    const badge = document.getElementById('staffRoleBadge');
    if (badge) {
      if (currentStaffRole === 'dueno') {
        badge.textContent = '👑 DUEÑO PRINCIPAL (Acceso Maestro)';
        badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-bold bg-aylox-green text-black';
      } else {
        badge.textContent = '🛡️ SOCIO AUTORIZADO (Gestión & Soporte)';
        badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-bold bg-yellow-400 text-black';
      }
    }

    // Cargar valores de configuración en los inputs
    const cfg = getConfig();
    if (document.getElementById('cfgOwner1Phone')) document.getElementById('cfgOwner1Phone').value = cfg.owner1Phone;
    if (document.getElementById('cfgOwner1Name')) document.getElementById('cfgOwner1Name').value = cfg.owner1Name;
    if (document.getElementById('cfgOwner2Phone')) document.getElementById('cfgOwner2Phone').value = cfg.owner2Phone;
    if (document.getElementById('cfgOwner2Name')) document.getElementById('cfgOwner2Name').value = cfg.owner2Name;
    if (document.getElementById('cfgOwner3Phone')) document.getElementById('cfgOwner3Phone').value = cfg.owner3Phone;
    if (document.getElementById('cfgOwner3Name')) document.getElementById('cfgOwner3Name').value = cfg.owner3Name;
    if (document.getElementById('cfgBinanceId')) document.getElementById('cfgBinanceId').value = cfg.binanceId;
    if (document.getElementById('cfgPaypal')) document.getElementById('cfgPaypal').value = cfg.paypal;

    showDashboardTab('tickets');
    renderDashTickets();

    modal.classList.remove('hidden');
  }

  function logoutStaff() {
    currentStaffRole = null;
    const modal = document.getElementById('staffDashboardModal');
    if (modal) modal.classList.add('hidden');
    ayloxApp.showToast('Sesión de staff cerrada.', 'info');
  }

  function showDashboardTab(tabId) {
    const tabs = ['tickets', 'config', 'security'];
    tabs.forEach(t => {
      const el = document.getElementById(`dashTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (el) {
        if (t === tabId) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    });

    const buttons = document.querySelectorAll('.dash-tab');
    buttons.forEach((btn, index) => {
      if (tabs[index] === tabId) {
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

      return `
        <tr class="hover:bg-aylox-card/40 transition">
          <td class="p-3 font-mono font-bold text-aylox-green">#${t.id}</td>
          <td class="p-3 font-semibold text-white">${ayloxSecurity.sanitize(t.customerName)}</td>
          <td class="p-3 font-mono">${ayloxSecurity.sanitize(t.customerPhone)}</td>
          <td class="p-3"><span class="text-white">${ayloxSecurity.sanitize(t.device)}</span><br><span class="text-[10px] text-gray-400">${ayloxSecurity.sanitize(t.plan)}</span></td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3 text-[10px] text-gray-400 font-mono">${dateStr}</td>
          <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
            <button onclick="ayloxTickets.openChatModal('${t.id}')" class="px-2.5 py-1 rounded bg-aylox-green text-black font-bold text-[11px] hover:bg-aylox-greenhover" title="Atender ticket">
              <i class="fa-solid fa-comments mr-1"></i> Atender
            </button>
            <button onclick="ayloxTickets.updateTicketStatus('${t.id}', 'resuelto')" class="px-2 py-1 rounded bg-aylox-card hover:bg-aylox-green/20 text-aylox-green border border-aylox-green/30 text-[11px]" title="Marcar como resuelto">
              <i class="fa-solid fa-check"></i>
            </button>
            ${currentStaffRole === 'dueno' ? `
              <button onclick="ayloxTickets.deleteTicket('${t.id}')" class="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-[11px]" title="Eliminar">
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

    ayloxSecurity.logEvent(`Ticket ${ticketId} eliminado por el Dueño Principal.`);
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
    ayloxApp.showToast('Respaldo descargado exitosamente', 'success');
  }

  // Inicializar componentes al cargar
  document.addEventListener('DOMContentLoaded', () => {
    renderPublicTickets();
  });

  return {
    getConfig,
    saveStaffConfig,
    openNewTicketModal,
    closeNewTicketModal,
    submitTicket,
    openChatModal,
    closeChatModal,
    renderChatMessages,
    sendChatMessage,
    insertCannedResponse,
    exportCurrentTicketToWhatsapp,
    renderPublicTickets,
    openStaffAuthModal,
    closeStaffAuthModal,
    selectStaffRole,
    loginStaff,
    openStaffDashboard,
    logoutStaff,
    showDashboardTab,
    filterTickets,
    updateTicketStatus,
    deleteTicket,
    exportTicketsJSON
  };
})();
