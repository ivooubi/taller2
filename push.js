/* Avisos (notificaciones push) para el chat del cliente y el panel del taller.
   Necesita: sw.js en la misma carpeta, HTTPS, y vapidPublicKey en config.js. */
(() => {
  'use strict';
  const cfg = window.SUPABASE_CONFIG || {};
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const soportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ETIQUETA = { inactivo: 'Activar avisos', activo: 'Avisos activados', bloqueado: 'Avisos bloqueados', 'ios-instalar': 'Activar avisos', 'no-soportado': 'Avisos no disponibles' };

  let promesaSW = null;
  const registro = () => (promesaSW ??= navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));

  const b64 = s => {
    const r = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(r, c => c.charCodeAt(0));
  };

  // Mensajito flotante (sirve en las dos páginas sin tocar su CSS)
  let toast, tToast;
  function aviso(texto) {
    if (!toast) {
      const st = document.createElement('style');
      st.textContent = '.tp-toast{position:fixed;left:50%;bottom:calc(1.25rem + env(safe-area-inset-bottom,0px));z-index:9999;max-width:min(92vw,26rem);padding:.85rem 1.2rem;border-radius:1rem;background:#1d1d1f;color:#fff;font:500 .9375rem/1.4 system-ui,sans-serif;box-shadow:0 10px 32px rgb(0 0 0/.3);opacity:0;transform:translate(-50%,12px);pointer-events:none;transition:opacity .3s,transform .4s cubic-bezier(.32,.72,0,1)}.tp-toast.on{opacity:1;transform:translate(-50%,0)}';
      document.head.append(st);
      toast = document.createElement('div');
      toast.className = 'tp-toast'; toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.textContent = texto;
    toast.classList.add('on');
    clearTimeout(tToast);
    tToast = setTimeout(() => toast.classList.remove('on'), 7000);
  }

  async function estado() {
    if (esIOS && !instalada) return 'ios-instalar';   // en iPhone solo funciona con la web instalada en la pantalla de inicio
    if (!soportado) return 'no-soportado';
    if (Notification.permission === 'denied') return 'bloqueado';
    if (Notification.permission !== 'granted') return 'inactivo';
    return (await (await registro()).pushManager.getSubscription()) ? 'activo' : 'inactivo';
  }

  async function guardar(db, sub, ctx) {
    const j = sub.toJSON();
    const { error } = await db.rpc('registrar_push', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_rol: ctx.rol, p_conversacion_id: ctx.conversacionId != null ? String(ctx.conversacionId) : null,
      p_url: location.pathname
    });
    if (error) throw error;
  }

  async function activar(db, ctx) {
    if (!cfg.vapidPublicKey) throw new Error('Falta vapidPublicKey en config.js');
    if (await Notification.requestPermission() !== 'granted') return;
    const r = await registro();
    const sub = (await r.pushManager.getSubscription()) ||
      await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.vapidPublicKey) });
    await guardar(db, sub, ctx);
  }

  async function desactivar(db) {
    const sub = await (await registro()).pushManager.getSubscription();
    if (!sub) return;
    await db.rpc('quitar_push', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }

  // Convierte un botón en el interruptor de avisos. getDb/getCtx son funciones para leer siempre el valor actual.
  async function enlazar(boton, getDb, getCtx) {
    if (!boton || boton.dataset.avisos) return;
    boton.dataset.avisos = '1';
    const txt = boton.querySelector('[data-txt]');
    const pintar = async () => {
      const e = await estado();
      boton.dataset.estado = e;
      boton.hidden = e === 'no-soportado';
      boton.setAttribute('aria-pressed', String(e === 'activo'));
      boton.setAttribute('aria-label', ETIQUETA[e]);
      boton.title = ETIQUETA[e];
      if (txt) txt.textContent = ETIQUETA[e];
      return e;
    };
    boton.addEventListener('click', async () => {
      try {
        const e = await estado();
        if (e === 'ios-instalar') aviso('En iPhone: pulsa Compartir y «Añadir a pantalla de inicio», abre la web desde ese icono y vuelve a pulsar aquí.');
        else if (e === 'bloqueado') aviso('Los avisos están bloqueados. Actívalos en los ajustes del navegador para esta web.');
        else if (e === 'activo') { await desactivar(getDb()); aviso('Avisos desactivados.'); }
        else if (e === 'inactivo') { await activar(getDb(), getCtx()); if (await estado() === 'activo') aviso('Avisos activados.'); }
      } catch (err) {
        console.error('Avisos:', err);
        aviso('No se pudieron activar los avisos. Motivo: ' + ((err && err.message) || err));
      }
      pintar();
    });
    if (await pintar() === 'activo') {   // por si el navegador cambió la suscripción: se vuelve a guardar
      try { await guardar(getDb(), await (await registro()).pushManager.getSubscription(), getCtx()); } catch (err) { console.error('Avisos:', err); }
    }
  }

  // Aviso local: para cuando la web está abierta pero en segundo plano. Usa la misma "tag" que el push, así no se duplican.
  async function local(titulo, cuerpo, tag, url) {
    if (!soportado || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      (await registro()).showNotification(titulo, { body: cuerpo, tag, renotify: true, icon: 'icon-192.png', data: { url: url || './' } });
    } catch { /* sin permiso */ }
  }

  registro && soportado && registro().catch(() => {});
  window.TallerPush = { enlazar, local, estado };
})();
