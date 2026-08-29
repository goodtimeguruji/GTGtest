// ================= MENU =================

const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");

function openMenu() {
  if (!drawer || !overlay) return;
  drawer.classList.add("open");
  overlay.classList.add("show");
  drawer.setAttribute("aria-hidden", "false");
}

function closeMenu() {
  if (!drawer || !overlay) return;
  drawer.classList.remove("open");
  overlay.classList.remove("show");
  drawer.setAttribute("aria-hidden", "true");
}

if (menuBtn) menuBtn.addEventListener("click", openMenu);
if (closeBtn) closeBtn.addEventListener("click", closeMenu);
if (overlay) overlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

document.querySelectorAll(".nav-mobile a").forEach(a => {
  a.addEventListener("click", closeMenu);
});


// ================= LOCATION SEARCH =================


let debounceTimer;

const locationInput = document.getElementById("locationInput");
const suggestionBox = document.getElementById("locationSuggestions");

if (locationInput && suggestionBox) {
  locationInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    const query = this.value.trim();

    if (!query) {
      suggestionBox.innerHTML = "";
      suggestionBox.classList.remove("visible");
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchLocations(query);
    }, 400);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!locationInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      suggestionBox.innerHTML = "";
      suggestionBox.classList.remove("visible");
    }
  });
}

async function fetchLocations(query) {
  if (!suggestionBox) return;

  suggestionBox.innerHTML =
    "<div class='af-suggestion-item'>Searching...</div>";
  suggestionBox.classList.add("visible");

  try {
    const apiKey = "28c4501555ee44698a1510d3b1a41dce";

    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        query
      )}&limit=10&format=json&apiKey=${apiKey}`
    );

    const data = await res.json();

    const places = data.results || [];

    if (!places.length) {
      suggestionBox.innerHTML =
        "<div class='af-suggestion-item'>No results found</div>";
      suggestionBox.classList.add("visible");
      return;
    }

    window.locationResults = places;

    suggestionBox.innerHTML = "";

    places.forEach((place, index) => {
      const div = document.createElement("div");

      div.className = "af-suggestion-item";

      div.textContent =
        place.formatted ||
        place.city ||
        place.name;

      div.onclick = () => selectLocation(index);

      suggestionBox.appendChild(div);
    });

    suggestionBox.classList.add("visible");

  } catch (err) {
    console.error(err);

    suggestionBox.innerHTML =
      "<div class='af-suggestion-item'>Error loading locations</div>";
    suggestionBox.classList.add("visible");
  }
}

function selectLocation(index) {
  const place = window.locationResults[index];

  document.getElementById("locationInput").value =
    place.formatted;

  document.getElementById("lat").value =
    place.lat;

  document.getElementById("lon").value =
    place.lon;

  // Convert seconds to hours
  const timezoneOffset =
    (place.timezone?.offset_STD_seconds || 0) / 3600;

  document.getElementById("timezone").value =
    timezoneOffset;

  console.log("Selected Location:", {
    place: place.formatted,
    lat: place.lat,
    lon: place.lon,
    timezone: timezoneOffset
  });

  suggestionBox.innerHTML = "";
  suggestionBox.classList.remove("visible");
}




// ================= GOOGLE LOGIN =================

function handleGoogleLogin(response) {
  const credential = response.credential;

  fetch(`${window.location.origin}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: credential })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        const expiry = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
        localStorage.setItem("token", data.token);
        localStorage.setItem("token_expiry", expiry);
        window.location.href = "index.html";
      } else {
        if (window.showToast) showToast("Google login failed. Please try again.", "error"); else console.error("Google login failed");
      }
    })
    .catch(err => {
      console.error(err);
      if (window.showToast) showToast("Google login failed. Please try again.", "error"); else console.error("Google login failed");
    });
}






// ================= USER NAV DROPDOWN =================

document.addEventListener("DOMContentLoaded", function () {
  const userDropdown = document.getElementById("userDropdown");
  const userBtn = userDropdown ? userDropdown.querySelector(".user-nav-btn") : null;

  if (userBtn) {
    // Toggle open on click
    userBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      userDropdown.classList.toggle("open");
    });

    // Close when clicking anywhere outside
    document.addEventListener("click", function () {
      userDropdown.classList.remove("open");
    });

    // Prevent clicks inside the menu from closing it
    const userMenu = userDropdown.querySelector(".user-nav-menu");
    if (userMenu) {
      userMenu.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
  }
});