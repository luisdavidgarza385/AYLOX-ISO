/**
 * ===================================================
 * AYLOX IOS — MAIN APPLICATION & INTERACTIVE ENGINE
 * ===================================================
 * Componentes:
 * - Sintetizador de audio cyber nativo (Web Audio API)
 * - Canvas interactivo de partículas verdes en constelación
 * - Convertidor de divisas en tiempo real
 * - Formateador dinámico de enlaces de WhatsApp
 * - Notificaciones Cyber Toast
 * - Control de acordeón y widgets
 */

// 1. SINTETIZADOR DE SONIDO CYBER NATIVO (Sin dependencias externas)
const ayloxSound = (function() {
  let audioCtx = null;
  let isMuted = localStorage.getItem('aylox_sound_muted') === 'true';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function play(type) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'message') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.07);
        osc.frequency.setValueAtTime(783.99, now + 0.14);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(280, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'ticket_alert') {
        // Melodía cibernética nítida para nuevos tickets y mensajes
        const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + i * 0.07);
          g.gain.setValueAtTime(0.12, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.07);
          o.stop(now + i * 0.07 + 0.18);
        });
      }
    } catch (e) {
      console.warn('Audio synthesis not supported or prevented by policy', e);
    }
  }

  function toggle() {
    isMuted = !isMuted;
    localStorage.setItem('aylox_sound_muted', isMuted ? 'true' : 'false');
    updateSoundUI();
    if (!isMuted) play('success');
  }

  function updateSoundUI() {
    const icon = document.getElementById('soundIcon');
    const text = document.getElementById('soundText');
    if (!icon) return;

    if (isMuted) {
      icon.className = 'fa-solid fa-volume-xmark text-gray-500';
      if (text) text.textContent = 'Mute';
    } else {
      icon.className = 'fa-solid fa-volume-high text-aylox-green';
      if (text) text.textContent = 'Sonido Cyber';
    }
  }

  return { play, toggle, updateSoundUI };
})();

// 2. CANVAS DE PARTÍCULAS INTERACTIVAS
const ayloxCanvas = (function() {
  let canvas, ctx;
  let particles = [];
  let mouse = { x: null, y: null, radius: 120 };
  let animationFrameId;

  function init() {
    canvas = document.getElementById('cyberCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });
    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    createParticles();
    animate();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  }

  function createParticles() {
    particles = [];
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 75);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // Dibujar partícula
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 102, ${p.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff66';
      ctx.fill();

      // Conexión con el cursor
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(0, 255, 102, ${0.35 * (1 - dist / mouse.radius)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Conexión de constelación entre partículas
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 255, 102, ${0.18 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  return { init };
})();

// 3. APLICACIÓN PRINCIPAL AYLOX
const ayloxApp = (function() {
  let activeCurrency = 'USD';

  function init() {
    ayloxSound.updateSoundUI();
    ayloxCanvas.init();
    applyConfigToUI(ayloxTickets.getConfig());
    initCounters();
    initSecretShortcut();
  }

  // Atajo de teclado secreto (Ctrl + Shift + A) para abrir el portal staff
  function initSecretShortcut() {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        ayloxTickets.openStaffAuthModal();
      }
    });
  }

  // Aplicar configuración de teléfonos y cuentas en la interfaz
  function applyConfigToUI(cfg) {
    if (!cfg) return;

    // Actualizar nombres y teléfonos de tarjetas de contacto
    const o1Name = document.getElementById('owner1Name');
    const o1PhoneDisp = document.getElementById('owner1PhoneDisplay');
    const o1Btn = document.getElementById('owner1WhatsappBtn');
    if (o1Name) o1Name.textContent = cfg.owner1Name;
    if (o1PhoneDisp) o1PhoneDisp.textContent = '+' + cfg.owner1Phone;
    if (o1Btn) {
      o1Btn.href = `https://wa.me/${cfg.owner1Phone}?text=${encodeURIComponent('Hola ' + cfg.owner1Name + ', te escribo desde la web oficial de AYLOX IOS.')}`;
    }

    const o2Name = document.getElementById('owner2Name');
    const o2PhoneDisp = document.getElementById('owner2PhoneDisplay');
    const o2Btn = document.getElementById('owner2WhatsappBtn');
    if (o2Name) o2Name.textContent = cfg.owner2Name;
    if (o2PhoneDisp) o2PhoneDisp.textContent = '+' + cfg.owner2Phone;
    if (o2Btn) {
      o2Btn.href = `https://wa.me/${cfg.owner2Phone}?text=${encodeURIComponent('Hola ' + cfg.owner2Name + ', necesito asistencia técnica con un certificado.')}`;
    }

    const o3Name = document.getElementById('owner3Name');
    const o3PhoneDisp = document.getElementById('owner3PhoneDisplay');
    const o3Btn = document.getElementById('owner3WhatsappBtn');
    if (o3Name) o3Name.textContent = cfg.owner3Name;
    if (o3PhoneDisp) o3PhoneDisp.textContent = '+' + cfg.owner3Phone;
    if (o3Btn) {
      o3Btn.href = `https://wa.me/${cfg.owner3Phone}?text=${encodeURIComponent('Hola ' + cfg.owner3Name + ', quiero activar mi certificado AYLOX IOS.')}`;
    }

    // Botones de cabecera y flotante
    const navWaBtn = document.getElementById('navWhatsappBtn');
    if (navWaBtn) {
      navWaBtn.href = `https://wa.me/${cfg.owner1Phone}?text=${encodeURIComponent('Hola AYLOX IOS, quiero información para comprar un certificado.')}`;
    }

    const floatOwnerBtn = document.getElementById('floatOwnerBtn');
    if (floatOwnerBtn) {
      floatOwnerBtn.href = `https://wa.me/${cfg.owner1Phone}?text=${encodeURIComponent('Hola Dueño AYLOX IOS, quiero comprar un certificado.')}`;
    }

    const floatSupportBtn = document.getElementById('floatSupportBtn');
    if (floatSupportBtn) {
      floatSupportBtn.href = `https://wa.me/${cfg.owner2Phone}?text=${encodeURIComponent('Hola Soporte AYLOX IOS, requiero asistencia.')}`;
    }

    // Cuentas de pago
    const dispBinance = document.getElementById('displayBinanceId');
    if (dispBinance) dispBinance.textContent = `Pay ID: ${cfg.binanceId}`;

    const dispPaypal = document.getElementById('displayPaypal');
    if (dispPaypal) dispPaypal.textContent = cfg.paypal;
  }

  // Cambio de divisa
  function setCurrency(curr) {
    activeCurrency = curr;
    const priceElements = document.querySelectorAll('.plan-price');

    priceElements.forEach(el => {
      const usd = el.getAttribute('data-usd');
      const mxn = el.getAttribute('data-mxn');
      const cop = el.getAttribute('data-cop');
      const eur = el.getAttribute('data-eur');

      if (curr === 'USD') el.textContent = `$${usd}`;
      else if (curr === 'MXN') el.textContent = `$${mxn} MXN`;
      else if (curr === 'COP') el.textContent = `$${Number(cop).toLocaleString()} COP`;
      else if (curr === 'EUR') el.textContent = `€${eur}`;
    });

    const buttons = document.querySelectorAll('.currency-btn');
    buttons.forEach(btn => {
      if (btn.textContent.includes(curr)) {
        btn.classList.add('active-currency');
        btn.classList.remove('text-gray-400');
      } else {
        btn.classList.remove('active-currency');
        btn.classList.add('text-gray-400');
      }
    });

    ayloxSound.play('beep');
  }

  // Comprar Plan directamente por WhatsApp
  function buyPlan(planName) {
    const cfg = ayloxTickets.getConfig();
    const message = `¡Hola AYLOX IOS! 👋\nQuiero adquirir el plan: *${planName}*.\nPor favor envíame los métodos de pago disponibles y los pasos a seguir.`;
    const url = `https://wa.me/${cfg.owner1Phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  // Copiar texto al portapapeles
  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`¡${label} copiado al portapapeles!`, 'success');
        ayloxSound.play('success');
      }).catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`¡${label} copiado!`, 'success');
    ayloxSound.play('success');
  }

  // Mostrar Notificación Cyber Toast
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-cyber pointer-events-auto max-w-sm w-full p-4 rounded-2xl border shadow-2xl flex items-center space-x-3 text-xs backdrop-blur-xl transition-all duration-300';

    let iconHtml = '<i class="fa-solid fa-circle-info text-aylox-green text-base"></i>';
    toast.classList.add('bg-aylox-dark/95', 'border-aylox-green/50', 'text-white');

    if (type === 'success') {
      iconHtml = '<i class="fa-solid fa-circle-check text-aylox-green text-base"></i>';
      toast.classList.add('shadow-[0_0_20px_rgba(0,255,102,0.3)]');
    } else if (type === 'error') {
      iconHtml = '<i class="fa-solid fa-triangle-exclamation text-red-400 text-base"></i>';
      toast.classList.remove('border-aylox-green/50');
      toast.classList.add('border-red-500/50');
    } else if (type === 'warning') {
      iconHtml = '<i class="fa-solid fa-shield text-yellow-400 text-base"></i>';
      toast.classList.remove('border-aylox-green/50');
      toast.classList.add('border-yellow-500/50');
    }

    toast.innerHTML = `
      <div class="flex-shrink-0">${iconHtml}</div>
      <div class="flex-1 font-medium">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Menú móvil
  function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
  }

  // Card flotante de WhatsApp
  function toggleQuickCard() {
    const card = document.getElementById('floatingQuickCard');
    if (card) {
      card.classList.toggle('hidden');
      if (!card.classList.contains('hidden')) {
        ayloxSound.play('beep');
      }
    }
  }

  // Preguntas Frecuentes Acordeón
  function toggleFaq(btn) {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    if (!content) return;

    const isOpen = !content.classList.contains('hidden');
    if (isOpen) {
      content.classList.add('hidden');
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
      content.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(180deg)';
      ayloxSound.play('beep');
    }
  }

  // Contadores animados en el Hero
  function initCounters() {
    const counters = document.querySelectorAll('.counter-value');
    counters.forEach(c => {
      const target = +c.getAttribute('data-target') || 15200;
      let count = 0;
      const step = Math.ceil(target / 40);
      const timer = setInterval(() => {
        count += step;
        if (count >= target) {
          c.textContent = `+${target.toLocaleString()}`;
          clearInterval(timer);
        } else {
          c.textContent = `+${count.toLocaleString()}`;
        }
      }, 30);
    });
  }

  return {
    init,
    applyConfigToUI,
    setCurrency,
    buyPlan,
    copyText,
    showToast,
    toggleMobileMenu,
    toggleQuickCard,
    toggleFaq
  };
})();

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  ayloxApp.init();

  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', ayloxApp.toggleMobileMenu);
  }
});
