function isTokenValid() {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  if (!token || !expiry) return false;

  return Date.now() < parseInt(expiry);
}



document.addEventListener("DOMContentLoaded", async () => {
  const token = isTokenValid() ? localStorage.getItem("token") : null;
  if (!token) {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
  }

  const loginBtn = document.getElementById("loginBtn");
  const userDropdown = document.getElementById("userDropdown");
  const usernameDisplay = document.getElementById("usernameDisplay");
  const logoutBtn = document.getElementById("logoutBtn");
  const mobileLoginBtn = document.getElementById("mobileLoginBtn");
  const mobileUserMenu = document.getElementById("mobileUserMenu");
  const mobileUsername = document.getElementById("mobileUsername");
  const mobileUsernameInitial = document.getElementById("mobileUsernameInitial");
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

  // Default state: logged out. Set up front so there's no flash of the
  // wrong state while the /get-user request is in flight.
  function showLoggedOut() {
    // Desktop
    if (loginBtn) loginBtn.style.display = "";
    if (userDropdown) userDropdown.style.display = "none";

    // Mobile
    if (mobileLoginBtn) mobileLoginBtn.style.display = "flex";
    if (mobileUserMenu) mobileUserMenu.style.display = "none";
  }

  function showLoggedIn(username) {
    // Desktop
    if (loginBtn) loginBtn.style.display = "none";
    if (userDropdown) userDropdown.style.display = "flex";
    if (usernameDisplay) usernameDisplay.textContent = username;
    const desktopInitial = document.getElementById("usernameInitial");
    if (desktopInitial) desktopInitial.textContent = username ? username.charAt(0).toUpperCase() : "U";

    // Mobile
    if (mobileLoginBtn) mobileLoginBtn.style.display = "none";
    if (mobileUserMenu) mobileUserMenu.style.display = "flex";
    if (mobileUsername) mobileUsername.textContent = username;
    if (mobileUsernameInitial) {
      mobileUsernameInitial.textContent = username ? username.charAt(0).toUpperCase() : "U";
    }
  }

  showLoggedOut();

  if (token) {
    try {
      const res = await fetch(`${window.location.origin}/api/auth/get-user`, {
        headers: {
          Authorization: "Bearer " + token
        }
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

  // logout
  async function doLogout() {
    try {
      await fetch(`${window.location.origin}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        }
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    window.location.href = "index.html";
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doLogout();
    });
  }

  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doLogout();
    });
  }
});
