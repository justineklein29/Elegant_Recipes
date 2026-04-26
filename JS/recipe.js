// Wait until the full HTML page is loaded before running any code.
document.addEventListener("DOMContentLoaded", async () => {

  // Grab the two main elements on recipe.html:
  // loadingState = the "Loading recipe..." text shown while fetching
  // recipeContent = the hidden section that shows the full recipe once loaded
  const loadingState  = document.getElementById("loadingState");
  const recipeContent = document.getElementById("recipeContent");

  // ── GET MEAL ID ──────────────────────────────────────────
  // When the user clicked a card on index.html, we saved the meal's ID
  // into localStorage (the browser's temporary memory).
  // Now we read that ID back so we know which recipe to fetch.
  const mealId = localStorage.getItem("selectedMealId");

  // If there's no saved ID (e.g. user opened this page directly), show an error and stop.
  if (!mealId) {
    loadingState.innerHTML = `
      <p style="font-size:1.1rem; color:#6b5c4e;">No recipe selected.</p>
      <a href="index.html" style="display:inline-block;margin-top:1rem;color:#c8621a;font-weight:500;">← Go back home</a>`;
    return;
  }

  // ── FETCH FULL MEAL ──────────────────────────────────────
  // The "lookup" endpoint returns ALL details for one meal using its ID.
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
    const data = await res.json(); // convert the raw response to a JS object
    const meal = data.meals?.[0];  // ?. means "only access [0] if data.meals exists"

    // Safety check: if the meal doesn't exist, throw an error to jump to catch block
    if (!meal) throw new Error("Meal not found");

    // ── INGREDIENTS ─────────────────────────────────────────
    // The API stores ingredients in a quirky way:
    // strIngredient1, strIngredient2 ... strIngredient20
    // strMeasure1,    strMeasure2    ... strMeasure20
    // We loop from 1 to 20 and collect only the non-empty ones.
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const name    = meal[`strIngredient${i}`]?.trim(); // e.g. "Chicken", ?. skips if null
      const measure = meal[`strMeasure${i}`]?.trim();    // e.g. "500g"
      if (name) ingredients.push({ name, measure: measure || "" }); // only add if name exists
    }

    // ── STEPS ───────────────────────────────────────────────
    // The API gives us the full instructions as one big block of text.
    // We split it into individual steps so we can number them nicely.
    const rawInstructions = (meal.strInstructions || "").trim();

    // Split on newlines or numbered patterns
    // .map removes leading numbers like "1." or "1)" from each line
    // .filter removes very short/empty lines (less than 10 characters)
    let steps = rawInstructions
      .split(/\r?\n+/)
      .map(s => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(s => s.length > 10);

    // Fallback: if there were no newlines, split by sentence endings instead
    if (steps.length <= 1) {
      steps = rawInstructions
        .split(/(?<=[.!?])\s+(?=[A-Z])/) // split after . ! ? when followed by a capital letter
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }

    // ── RENDER ───────────────────────────────────────────────
    // Update the browser tab title to the meal name
    document.title = `${meal.strMeal} — Recipe Studio`;

    // Build the full HTML and inject it into the page.
    // Template literals (backticks) let us write HTML with variables inside ${}
    recipeContent.innerHTML = `
      <!-- HERO IMAGE -->
      <div class="recipe-hero">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <div class="recipe-hero-text">
          <!-- Show the cuisine area and category as a small tag -->
          <span class="cuisine-tag">${meal.strArea || ""} ${meal.strCategory || ""}</span>
          <h1>${meal.strMeal}</h1>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="content-wrap">

        <!-- INGREDIENTS (sticky sidebar) -->
        <aside class="ingredients-box">
          <h2>🧂 Ingredients</h2>
          <!-- Loop through ingredients array and build one row per ingredient -->
          ${ingredients.map((ing, i) => `
            <div class="ingredient-row" style="animation-delay:${i * 30}ms">
              <span class="ingredient-name">${ing.name}</span>
              <span class="ingredient-measure">${ing.measure}</span>
            </div>`).join("")}
        </aside>

        <!-- INSTRUCTIONS -->
        <section class="instructions">
          <h2>👨‍🍳 Step-by-Step Instructions</h2>

          <!-- Loop through steps array and build one numbered block per step -->
          ${steps.map((step, i) => `
            <div class="step" style="animation-delay:${i * 50}ms">
              <div class="step-num">${i + 1}</div>
              <p class="step-text">${step}</p>
            </div>`).join("")}

          <!-- Only show YouTube button if the meal has a YouTube link -->
          ${meal.strYoutube ? `
            <a class="video-link" href="${meal.strYoutube}" target="_blank" rel="noopener">
              ▶ Watch on YouTube
            </a>` : ""}
        </section>
      </div>`;

    // Hide the "Loading..." text and reveal the recipe content
    loadingState.style.display  = "none";
    recipeContent.style.display = "block";

  } catch (err) {
    // If anything above fails (bad network, missing meal, etc.), show an error
    loadingState.innerHTML = `
      <p style="font-size:1rem;color:#6b5c4e;">Failed to load recipe. Please try again.</p>
      <a href="index.html" style="display:inline-block;margin-top:1rem;color:#c8621a;font-weight:500;">← Go back home</a>`;
  }

});