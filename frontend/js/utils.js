/* ============================================================
   PLATFORM SHARED UTILITIES
   ============================================================ */

const API_BASE = '/api';

// ---- TOKEN MANAGEMENT ----
const Auth = {
  getToken: () => localStorage.getItem('platform_token'),
  setToken: (t) => localStorage.setItem('platform_token', t),
  removeToken: () => localStorage.removeItem('platform_token'),
  getUser: () => { try { return JSON.parse(localStorage.getItem('platform_user')); } catch { return null; } },
  setUser: (u) => localStorage.setItem('platform_user', JSON.stringify(u)),
  removeUser: () => localStorage.removeItem('platform_user'),
  isLoggedIn: () => !!localStorage.getItem('platform_token'),
  isAdmin: () => { const u = Auth.getUser(); return u && u.is_admin; },
  logout: () => {
    Auth.removeToken();
    Auth.removeUser();
    window.location.href = '/login.html';
  },
  requireAuth: () => {
    if (!Auth.isLoggedIn()) { window.location.href = '/login.html'; return false; }
    return true;
  },
  requireAdmin: () => {
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) { window.location.href = '/login.html'; return false; }
    return true;
  },
  requireGuest: () => {
    if (Auth.isLoggedIn()) { window.location.href = Auth.isAdmin() ? '/admin/dashboard.html' : '/dashboard.html'; return false; }
    return true;
  }
};

// ---- API HELPER ----
const api = {
  _request: async (method, path, data = null, isForm = false) => {
    const headers = {};
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (data) opts.body = isForm ? data : JSON.stringify(data);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const json = await res.json();

    if (res.status === 401) {
      Auth.logout();
      throw new Error('Session expired');
    }

    return { ok: res.ok, status: res.status, ...json };
  },
  get: (path) => api._request('GET', path),
  post: (path, data, isForm) => api._request('POST', path, data, isForm),
  put: (path, data) => api._request('PUT', path, data),
  patch: (path, data) => api._request('PATCH', path, data),
  del: (path) => api._request('DELETE', path),
};

// ---- TOAST NOTIFICATIONS ----
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error: (msg, dur) => Toast.show(msg, 'error', dur),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
  info: (msg, dur) => Toast.show(msg, 'info', dur),
};

// ---- FORMATTERS ----
const fmt = {
  money: (n, decimals = 2) => {
    const num = parseFloat(n) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },
  date: (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  datetime: (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  percent: (n) => (parseFloat(n) || 0).toFixed(2) + '%',
  badge: (status) => `<span class="badge badge-${status}">${status}</span>`,
  timeAgo: (d) => {
    const seconds = Math.floor((Date.now() - new Date(d)) / 1000);
    if (seconds < 60) return 'just now';
    const intervals = [[31536000,'y'],[2592000,'mo'],[86400,'d'],[3600,'h'],[60,'m']];
    for (const [s, l] of intervals) {
      const n = Math.floor(seconds / s);
      if (n >= 1) return `${n}${l} ago`;
    }
    return 'just now';
  },
  progress: (start, end) => {
    const total = new Date(end) - new Date(start);
    const elapsed = Date.now() - new Date(start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  },
  daysLeft: (end) => {
    const ms = new Date(end) - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }
};

// ---- UI HELPERS ----
const UI = {
  setLoading: (btn, loading, text = 'Loading...') => {
    if (!btn) return;
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span> ${text}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._origText || text;
      btn.disabled = false;
    }
  },
  showAlert: (container, message, type = 'error') => {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    container.innerHTML = `<div class="alert alert-${type}">${icons[type]} ${message}</div>`;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  openModal: (id) => { const m = document.getElementById(id); if (m) m.classList.add('open'); },
  closeModal: (id) => { const m = document.getElementById(id); if (m) m.classList.remove('open'); },
  copyText: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success('Copied to clipboard!', 2000);
    } catch {
      Toast.error('Copy failed');
    }
  },
  initSidebar: () => {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      });
      if (overlay) {
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        });
      }
    }
  },
  initNavbar: () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 30);
      });
    }
  },
  setActiveNav: (path) => {
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === path);
    });
  },
  populateSidebarUser: () => {
    const user = Auth.getUser();
    if (!user) return;
    const nameEl = document.getElementById('sidebarUserName');
    const emailEl = document.getElementById('sidebarUserEmail');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = (user.first_name[0] + (user.last_name[0] || '')).toUpperCase();
  }
};

// ---- CLOSE MODALS ON OVERLAY CLICK ----
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ---- INIT TOAST ----
document.addEventListener('DOMContentLoaded', () => Toast.init());

// ---- GOOGLE TRANSLATE AUTO-INJECT ----
// Injects the translate widget into any page that has a #translateTarget element
(function(){
  if(document.getElementById('translateTarget')){
    const s=document.createElement('script');
    s.src='//translate.google.com/translate_a/element.js?cb=_initGT';
    window._initGT=function(){
      new google.translate.TranslateElement({
        pageLanguage:'en',
        includedLanguages:'en,fr,es,de,pt,zh-CN,ar,ru,it,ja,ko,hi,sw,yo,ha,ig',
        layout:google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay:false
      },'translateTarget');
    };
    document.head.appendChild(s);
  }
})();
