/**
 * toast.js — Good Time Guruji
 * Lightweight toast notification system.
 * Usage: showToast("Your message", "success" | "error" | "warning" | "info")
 */

(function () {
  const COLORS = {
    success: { bg: "#2e7d32", icon: "✔" },
    error:   { bg: "#b71c1c", icon: "✖" },
    warning: { bg: "#8b5a2b", icon: "⚠" },   // matches brand primary
    info:    { bg: "#1565c0", icon: "ℹ" },
  };

  const DURATION  = 4000;   // ms before auto-dismiss
  const ANIM_OUT  = 350;    // ms for slide-out transition

  // Inject container + keyframe CSS once
  function ensureContainer() {
    if (document.getElementById("gtg-toast-container")) return;

    const style = document.createElement("style");
    style.textContent = `
      #gtg-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        pointer-events: none;
      }
      .gtg-toast {
        pointer-events: all;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 280px;
        max-width: 360px;
        padding: 13px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,.28);
        color: #fff;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.45;
        cursor: pointer;
        transform: translateX(0);
        opacity: 1;
        transition: transform ${ANIM_OUT}ms ease, opacity ${ANIM_OUT}ms ease;
      }
      .gtg-toast.gtg-toast--out {
        transform: translateX(110%);
        opacity: 0;
      }
      .gtg-toast-icon {
        font-size: 16px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .gtg-toast-msg {
        flex: 1;
      }
      .gtg-toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: rgba(255,255,255,.75);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
      }
      .gtg-toast-close:hover { color: #fff; }
    `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.id = "gtg-toast-container";
    document.body.appendChild(container);
  }

  function dismiss(toast) {
    toast.classList.add("gtg-toast--out");
    setTimeout(() => toast.remove(), ANIM_OUT);
  }

  window.showToast = function (message, type = "info") {
    const cfg = COLORS[type] || COLORS.info;

    // Wait for DOM if called very early (e.g. before DOMContentLoaded)
    function render() {
      ensureContainer();
      const container = document.getElementById("gtg-toast-container");

      const toast = document.createElement("div");
      toast.className = "gtg-toast";
      toast.style.background = cfg.bg;

      toast.innerHTML = `
        <span class="gtg-toast-icon">${cfg.icon}</span>
        <span class="gtg-toast-msg">${message}</span>
        <button class="gtg-toast-close" aria-label="Dismiss">✕</button>
      `;

      toast.querySelector(".gtg-toast-close")
           .addEventListener("click", () => dismiss(toast));
      toast.addEventListener("click", () => dismiss(toast));

      container.appendChild(toast);

      // Auto-dismiss
      setTimeout(() => dismiss(toast), DURATION);
    }

    if (document.body) {
      render();
    } else {
      document.addEventListener("DOMContentLoaded", render, { once: true });
    }
  };
})();