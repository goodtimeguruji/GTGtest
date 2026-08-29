const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");

const mDropBtn = document.getElementById("mDropBtn");
const mDropdown = document.getElementById("mDropdown");
const mChev = document.getElementById("mChev");

function openMenu() {
  drawer.classList.add("open");
  overlay.classList.add("show");
  drawer.setAttribute("aria-hidden", "false");
}

function closeMenu() {
  drawer.classList.remove("open");
  overlay.classList.remove("show");
  drawer.setAttribute("aria-hidden", "true");
}

menuBtn.addEventListener("click", openMenu);
closeBtn.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// mDropBtn.addEventListener("click", () => {
//   mDropdown.classList.toggle("show");
//   mChev.textContent = mDropdown.classList.contains("show") ? "▴" : "▾";
// });

document.querySelectorAll(".nav-mobile a").forEach(a => {
  a.addEventListener("click", closeMenu);
});

let debounceTimer;

const locationInput = document.getElementById("location");
const suggestionBox = document.getElementById("locationSuggestions");

locationInput.addEventListener("input", function () {
  clearTimeout(debounceTimer);
  const query = this.value.trim();

  if (!query) {
    suggestionBox.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(() => {
    fetchLocations(query);
  }, 400);
});

async function fetchLocations(query) {
  suggestionBox.innerHTML = "<div class='af-suggestion-item'>Searching...</div>";

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(query)}`
    );

    const places = await res.json();

    if (!places.length) {
      suggestionBox.innerHTML = "<div class='af-suggestion-item'>No results found</div>";
      return;
    }

    window.locationResults = places;
    suggestionBox.innerHTML = "";

    places.forEach((place, index) => {
      const div = document.createElement("div");
      div.className = "af-suggestion-item";
      div.textContent = place.display_name;

      div.onclick = () => selectLocation(index);

      suggestionBox.appendChild(div);
    });

  } catch (err) {
    suggestionBox.innerHTML = "<div class='af-suggestion-item'>Error loading locations</div>";
  }
}

function selectLocation(index) {
  const place = window.locationResults[index];

  document.getElementById("location").value = place.display_name;
  document.getElementById("lat").value = place.lat;
  document.getElementById("lon").value = place.lon;

  // IST default (can improve later)
  document.getElementById("timezone").value = "5.5";

  suggestionBox.innerHTML = "";
}


//google login Js file 
let authMode = "login";

function toggleAuth(mode) {
  authMode = mode;

  document.getElementById("nameField").style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("confirmPasswordField").style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("submitBtn").textContent = mode === "signup" ? "Sign Up" : "Login";
}

document.getElementById("authForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  if (authMode === "signup") {
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (data.password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
  }

  try {
    const res = await fetch(`http://localhost:3000/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || "Success");

  } catch (err) {
    alert("Error: " + err.message);
  }
});

function handleGoogleLogin(response) {
  const credential = response.credential;

  fetch("http://localhost:3000/google-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: credential })
  })
    .then(res => res.json())
    .then(data => {
      alert("Google login successful");
    })
    .catch(err => {
      console.error(err);
      alert("Google login failed");
    });

}

/// ===== DATE RANGE LOGIC =====

document.addEventListener("DOMContentLoaded", function () {

  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");

  if (!fromDate || !toDate) {
    console.error("Date inputs not found");
    return;
  }

  // ✅ Get today's date
  function getToday() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  // ✅ Add days
  function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  // ✅ 1. Disable past dates
  const today = getToday();
  fromDate.min = today;
  toDate.min = today;

  // ✅ 2. On From Date change
  fromDate.addEventListener("change", function () {
    const selectedFrom = this.value;

    if (!selectedFrom) return;

    // Set min
    toDate.min = selectedFrom;

    // Set max (90 days)
    const maxDate = addDays(selectedFrom, 90);
    toDate.max = maxDate;

    // Auto-fill (optional but recommended)
    toDate.value = selectedFrom;

    // Reset invalid values
    if (toDate.value < selectedFrom || toDate.value > maxDate) {
      toDate.value = "";
    }
  });

});

// ================= AUTH SYSTEM =================

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");

  // Pages that DON'T require login
  const publicPages = ["index.html", "about-us.html", "contact-us.html", "login.html"];
  const currentPage = window.location.pathname.split("/").pop();

  // 🔐 Protect pages
  if (!publicPages.includes(currentPage)) {
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/get-user", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error();
      }

      // ✅ Show username if exists
      const usernameEl = document.getElementById("usernameDisplay");
      const dropdown = document.getElementById("userDropdown");
      const loginBtn = document.getElementById("loginBtn");

      if (usernameEl) usernameEl.innerText = data.username;
      if (dropdown) dropdown.style.display = "block";
      if (loginBtn) loginBtn.style.display = "none";

    } catch (err) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
    }
  }

  // 🚪 Logout (safe binding)
  document.addEventListener("click", function (e) {
    if (e.target.id === "logoutBtn") {
      const token = localStorage.getItem("token");

      fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        }
      }).finally(() => {
        localStorage.removeItem("token");
        window.location.href = "index.html";
      });
    }
  });

});