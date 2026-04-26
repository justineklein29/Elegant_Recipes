// Wait until the full HTML page is loaded before running any code.
// Without this, the code might run before the buttons and divs exist.
document.addEventListener("DOMContentLoaded", () => {

  // List of countries shown in the dropdown menu.
  // You can add or remove countries here.
  // ── CONFIG ──────────────────────────────────────────────
  const countries = [
    "Philippines","United States","United Kingdom","Japan","China","India",
    "Italy","France","Spain","Germany","Mexico","Canada","Brazil"
  ];

  // The API doesn't accept country names like "Philippines".
  // It only accepts cuisine names like "Filipino".
  // This object translates country → cuisine name for the API.
  const countryMap = {
    "Philippines":   "Filipino",
    "United States": "American",
    "United Kingdom":"British",
    "Japan":         "Japanese",
    "China":         "Chinese",
    "India":         "Indian",
    "Italy":         "Italian",
    "France":        "French",
    "Spain":         "Spanish",
    "Germany":       "German",
    "Mexico":        "Mexican",
    "Canada":        "Canadian",
    "Brazil":        "Brazilian"
  };

  // ── ELEMENTS ────────────────────────────────────────────
  // Grab the HTML elements we need and save them as variables.
  // This way we don't have to type getElementById() every single time.
  const list          = document.getElementById("countryList");   // the dropdown list container
  const container     = document.getElementById("recipes");        // the grid where cards appear
  const sectionTitle  = document.getElementById("sectionTitle");  // the heading above the cards
  const dropdown      = document.getElementById("countryDropdown");// the whole dropdown wrapper
  const dropdownToggle= document.getElementById("dropdownToggle"); // the "Country ▼" button

  // ── DROPDOWN TOGGLE ─────────────────────────────────────
  // When the user clicks the "Country" button, open or close the dropdown.
  // e.stopPropagation() prevents this click from also firing the
  // document listener below (which would immediately close it again).
  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open"); // adds "open" if missing, removes it if present
  });

  // When the user clicks anywhere else on the page, close the dropdown.
  document.addEventListener("click", () => dropdown.classList.remove("open"));

  // ── BUILD DROPDOWN ──────────────────────────────────────
  // Loop through every country and create one button for it automatically.
  // This saves us from writing a button for each country manually in HTML.
  countries.forEach(country => {
    const btn = document.createElement("button"); // create a <button> element
    btn.textContent = country;                     // set the button label to the country name
    btn.addEventListener("click", () => {
      dropdown.classList.remove("open");  // close the dropdown when a country is picked
      getCountryFood(country);            // fetch food for the selected country
    });
    list.appendChild(btn); // add the button into the dropdown menu in the HTML
  });

  // ── HELPERS ─────────────────────────────────────────────

  // Shows placeholder "skeleton" boxes while the real cards are loading.
  // count = how many skeletons to show (default is 15).
  function showSkeletons(count = 15) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      container.innerHTML += `
        <div class="skeleton">
          <div class="skeleton-img"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>`;
    }
  }

  // Updates the heading and subtitle text above the recipe grid.
  function setSectionTitle(heading) {
    sectionTitle.querySelector("h2").textContent = heading;
  }

  // ── CARD FACTORY ────────────────────────────────────────
  // Receives one meal object from the API and returns a clickable card element.
  // delay = how long to wait before the card animates in (staggered effect).
  function createCard(meal, delay = 0) {
    const card = document.createElement("div");
    card.className = "meal-card";
    card.style.animationDelay = `${delay}ms`; // stagger the card animations

    // Build a small tag like "Filipino · Chicken" from the meal's area and category.
    // .filter(Boolean) removes any empty/null values before joining.
    const category = meal.strCategory || "";
    const area     = meal.strArea     || "";
    const tagText  = [area, category].filter(Boolean).join(" · ");

    // Inject the image, name, and tag into the card using a template literal.
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
      <div class="card-body">
        <h6>${meal.strMeal}</h6>
        ${tagText ? `<span class="tag">${tagText}</span>` : ""}
      </div>`;

    // When the user clicks this card:
    // 1. Save the meal's ID to localStorage (browser's temporary memory).
    // 2. Navigate to recipe.html — that page reads the ID and shows full details.
    card.addEventListener("click", () => {
      localStorage.setItem("selectedMealId", meal.idMeal);
      window.location.href = "recipe.html";
    });

    return card; // return the finished card so it can be added to the page
  }

  // ── RANDOM RECIPES ───────────────────────────────────────
  // Fetches 20 random meals from the API at the same time using Promise.all.
  // This is faster than fetching them one by one.
  async function getRandomRecipes() {
    setSectionTitle("Today's Random Picks", "15 dishes from around the world, refreshed just for you");
    showSkeletons(15); // show placeholders while loading

    // Create 15 fetch requests at once. Promise.all waits for ALL of them to finish.
    const promises = Array.from({ length: 20 }, () =>
      fetch("https://www.themealdb.com/api/json/v1/1/random.php") // sends the request
                               
                                // returns a Response object
        .then(r => r.json())   // convert response to JS object
        .then(d => d.meals[0]) // grab the first (only) meal from the array
    );

    try {
      const meals = await Promise.all(promises); // wait for all 15 fetches to complete
      container.innerHTML = ""; // clear the skeletons
      meals.forEach((meal, i) => {
        if (meal) container.appendChild(createCard(meal, i * 40)); // add each card with a staggered delay
      });
    } catch {
      // If any fetch fails, show an error message instead
      container.innerHTML = `
        <div class="state-msg">
          <span class="emoji">😕</span>
          Could not load recipes. Check your connection and try again.
        </div>`;
    }
  }

  // ── COUNTRY RECIPES ──────────────────────────────────────
  // Fetches all meals for a specific country using the area filter endpoint.
  async function getCountryFood(country) {
    // Translate "Philippines" → "Filipino" using countryMap.
    // If the country isn't in the map, use the name as-is.
    const query = countryMap[country] || country;

    setSectionTitle(
      `${country} Cuisine`,
      `Browsing traditional dishes from ${country}`
    );
    showSkeletons(8); // show placeholders while loading

    try {
      // Call the API with ?a= (area filter) to get meals from that cuisine
      const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${query}`);
      const data = await res.json();
      container.innerHTML = ""; // clear the skeletons

      // If the API returns null for meals, that country has no results
      if (!data.meals) {
        container.innerHTML = `
          <div class="state-msg">
            <span class="emoji">🍽️</span>
            No dishes found for ${country}. Try another country!
          </div>`;
        return; // stop here, don't run the code below
      }

      // Loop through all returned meals and add a card for each one
      data.meals.forEach((meal, i) => {
        container.appendChild(createCard(meal, i * 35));
      });

    } catch {
      // If the fetch fails entirely, show an error
      container.innerHTML = `
        <div class="state-msg">
          <span class="emoji">⚠️</span>
          Error loading data. Please try again.
        </div>`;
    }
  }

  // ── SEARCH BAR ──────────────────────────────────────────
  // Grab the search form and the text input from the HTML.
  const searchForm  = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  // Listen for when the user submits the form (clicks Search or presses Enter).
  // e.preventDefault() stops the page from refreshing, which is default form behavior.
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim(); // get typed text and remove extra spaces
    if (query === "") return;               // if empty, do nothing
    searchMeals(query);
  });

  // Fetch meals from the API that match the search keyword.
  // The API's search endpoint: ?s= means search by meal name.
  async function searchMeals(query) {
    setSectionTitle(`Results for "${query}"`, `Showing meals that match "${query}"`);
    showSkeletons(8); // show placeholders while loading

    try {
      const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
      const data = await res.json();
      container.innerHTML = ""; // clear the skeletons

      // If no meals match the search, show a message
      if (!data.meals) {
        container.innerHTML = `
          <div class="state-msg">
            <span class="emoji">🔍</span>
            No results found for "${query}". Try another keyword!
          </div>`;
        return;
      }

      // Loop through results and add a card for each meal
      data.meals.forEach((meal, i) => {
        container.appendChild(createCard(meal, i * 35));
      });

    } catch {
      // If the fetch fails, show an error
      container.innerHTML = `
        <div class="state-msg">
          <span class="emoji">⚠️</span>
          Error searching. Please try again.
        </div>`;
    }
  }

  // ── INIT ────────────────────────────────────────────────
  // This runs immediately when the page loads — shows the 15 random recipes.
  getRandomRecipes();

});