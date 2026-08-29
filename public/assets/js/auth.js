// ── Token validity check ─────────────────────────────────────────────────────
function isTokenValid() {
  const token  = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

// ── Session timeout watcher ──────────────────────────────────────────────────
// Polls every 60s. Shows a warning 5 min before expiry. Auto-logs out on expiry.
(function startSessionWatcher() {
  const WARN_BEFORE_MS = 5 * 60 * 1000;
  const POLL_INTERVAL  = 60 * 1000;
  let warningShown = false;

  function tick() {
    const expiry = parseInt(localStorage.getItem("token_expiry") || "0", 10);
    if (!expiry) return;
    const msLeft = expiry - Date.now();
    if (msLeft <= 0) {
      localStorage.removeItem("token");
      localStorage.removeItem("token_expiry");
      window.location.href = "login.html";
      return;
    }
    if (msLeft <= WARN_BEFORE_MS && !warningShown) {
      warningShown = true;
      const mins   = Math.ceil(msLeft / 60000);
      const banner = document.createElement("div");
      banner.id = "session-timeout-banner";
      banner.style.cssText = [
        "position:fixed","top:0","left:0","right:0","z-index:99999",
        "background:#7b3f00","color:#fff","text-align:center",
        "padding:10px 16px","font-size:0.93rem","font-weight:500",
        "box-shadow:0 2px 8px rgba(0,0,0,.35)"
      ].join(";");
      banner.innerHTML =
        `⏳ Your session expires in <strong>${mins} minute${mins !== 1 ? "s" : ""}</strong>. ` +
        `<a href="login.html" style="color:#ffd580;text-decoration:underline;margin-left:8px;">Log in again</a>`;
      if (document.body) document.body.prepend(banner);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setInterval(tick, POLL_INTERVAL));
  } else {
    setInterval(tick, POLL_INTERVAL);
  }
})();

// ── Main auth / nav logic ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = isTokenValid() ? localStorage.getItem("token") : null;
  if (!token) {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
  }

  const loginBtn            = document.getElementById("loginBtn");
  const userDropdown        = document.getElementById("userDropdown");
  const usernameDisplay     = document.getElementById("usernameDisplay");
  const logoutBtn           = document.getElementById("logoutBtn");
  const mobileLoginBtn      = document.getElementById("mobileLoginBtn");
  const mobileUserMenu      = document.getElementById("mobileUserMenu");
  const mobileUsername      = document.getElementById("mobileUsername");
  const mobileUsernameInitial = document.getElementById("mobileUsernameInitial");
  const mobileLogoutBtn     = document.getElementById("mobileLogoutBtn");

  // Inject Profile + Search History into the desktop dropdown (above Logout)
  function ensureDesktopAccountLinks() {
    if (!logoutBtn || document.getElementById("desktopProfileLink")) return;

    const profileLink = document.createElement("a");
    profileLink.id        = "desktopProfileLink";
    profileLink.href      = "profile.html";
    profileLink.innerHTML = `<i class="bi bi-person-circle"></i> My Profile`;

    const historyLink = document.createElement("a");
    historyLink.id        = "desktopHistoryLink";
    historyLink.href      = "search-history.html";
    historyLink.innerHTML = `<i class="bi bi-clock-history"></i> Search History`;

    logoutBtn.parentNode.insertBefore(profileLink, logoutBtn);
    logoutBtn.parentNode.insertBefore(historyLink, logoutBtn);
  }

  // Inject Profile + History links in mobile drawer (above Logout)
  function ensureMobileAccountLinks() {
    if (document.getElementById("mobileProfileLink")) return;

    const profileLink = document.createElement("a");
    profileLink.id        = "mobileProfileLink";
    profileLink.href      = "profile.html";
    profileLink.className = "m-link drawer-extra-link";
    profileLink.innerHTML = `<i class="bi bi-person-circle me-2"></i>My Profile`;
    profileLink.style.display = "flex";

    const historyLink = document.createElement("a");
    historyLink.id        = "mobileHistoryLink";
    historyLink.href      = "search-history.html";
    historyLink.className = "m-link drawer-extra-link";
    historyLink.innerHTML = `<i class="bi bi-clock-history me-2"></i>Search History`;
    historyLink.style.display = "flex";

    // Insert before Logout in the drawer nav
    const navMobile = document.querySelector(".nav-mobile");
    if (navMobile) {
      navMobile.appendChild(profileLink);
      navMobile.appendChild(historyLink);
    }
  }

  function showLoggedOut() {
    if (loginBtn)       loginBtn.style.display      = "";
    if (userDropdown)   userDropdown.style.display   = "none";
    if (mobileLoginBtn) mobileLoginBtn.style.display = "flex";
    if (mobileUserMenu) mobileUserMenu.style.display = "none";

    // Hide injected mobile links when logged out
    ["mobileProfileLink","mobileHistoryLink"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }

  function showLoggedIn(username) {
    if (loginBtn)      loginBtn.style.display     = "none";
    if (userDropdown)  userDropdown.style.display  = "flex";
    if (usernameDisplay) usernameDisplay.textContent = username;
    const desktopInitial = document.getElementById("usernameInitial");
    if (desktopInitial) desktopInitial.textContent = username ? username.charAt(0).toUpperCase() : "U";

    if (mobileLoginBtn)        mobileLoginBtn.style.display        = "none";
    if (mobileUserMenu)        mobileUserMenu.style.display         = "flex";
    if (mobileUsername)        mobileUsername.textContent           = username;
    if (mobileUsernameInitial) mobileUsernameInitial.textContent    = username ? username.charAt(0).toUpperCase() : "U";

    
    ensureMobileAccountLinks();

    // Show injected mobile links
    ["mobileProfileLink","mobileHistoryLink"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "flex";
    });
  }

  showLoggedOut();

  if (token) {
    try {
      const res  = await fetch(`${window.location.origin}/api/auth/get-user`, {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      if (data.success) {
        showLoggedIn(data.username);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("token_expiry");
        showLoggedOut();
      }
    } catch (err) {
      console.error("Auth error:", err);
      showLoggedOut();
    }
  }

  async function doLogout() {
    try {
      await fetch(`${window.location.origin}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });
    } catch (err) { console.error("Logout error:", err); }
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    window.location.href = "index.html";
  }

  if (logoutBtn)      logoutBtn.addEventListener("click",      e => { e.preventDefault(); doLogout(); });
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", e => { e.preventDefault(); doLogout(); });
});