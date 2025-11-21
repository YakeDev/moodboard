import { API_KEY } from "./config.js";

const DEFAULT_QUERY = "inspiration";
const PER_PAGE = 20;

const state = {
  query: DEFAULT_QUERY,
  results: [],
  collections: [
    { name: "Par défaut", count: 6 },
    { name: "Couleurs vives", count: 3 },
    { name: "Portraits", count: 4 },
  ],
  favorites: [
    { name: "Vue inspiration", meta: "Ajouté aujourd'hui", count: 2 },
    { name: "Mesh & gradients", meta: "Ajouté cette semaine", count: 5 },
  ],
};

const els = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  resultStatus: document.getElementById("result-status"),
  resultsGrid: document.getElementById("results-grid"),
  collectionList: document.getElementById("collection-list"),
  favoriteList: document.getElementById("favorite-list"),
  menuToggle: document.querySelector("[data-menu-toggle]"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("menu-overlay"),
};

function renderResults(items) {
  if (!items.length) {
    els.resultsGrid.innerHTML = `<p class="muted">Aucun résultat trouvé.</p>`;
    return;
  }

  els.resultsGrid.innerHTML = items
    .map(
      (item) => `
        <article class="card">
          <img src="${item.src}" alt="${item.alt}">
          <div class="card-actions" aria-label="Actions rapides">
            <button type="button" class="icon-btn" aria-label="Ajouter aux favoris" title="Ajouter aux favoris"><i class="fa-regular fa-heart" aria-hidden="true"></i></button>
            <button type="button" class="icon-btn" aria-label="Ajouter à une collection" title="Ajouter à une collection"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${item.avatar}" alt="${item.author}">
              <div class="meta">
                <strong>${item.author}</strong>
                <span>${item.followers} abonnés</span>
              </div>
            </div>
            <button type="button" class="icon-btn ghost" aria-label="Télécharger l'image" title="Télécharger l'image"><i class="fa-solid fa-download" aria-hidden="true"></i></button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCollections(collections) {
  els.collectionList.innerHTML = collections
    .map(
      (collection) => `
        <li class="collection-item">
          <span>${collection.name}</span>
          <span class="badge">${collection.count} visuels</span>
        </li>
      `
    )
    .join("");
}

function renderFavorites(favorites) {
  els.favoriteList.innerHTML = favorites
    .map(
      (favorite) => `
        <li class="favorite-item">
          <div>
            <strong>${favorite.name}</strong>
            <div class="muted">${favorite.meta}</div>
          </div>
          <span class="badge">${favorite.count}</span>
        </li>
      `
    )
    .join("");
}

function updateStatus(text) {
  if (els.resultStatus) {
    els.resultStatus.textContent = text;
  }
}

function toggleMenu(force) {
  const shouldOpen = typeof force === "boolean" ? force : !document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", shouldOpen);
  if (els.menuToggle) {
    els.menuToggle.setAttribute("aria-expanded", String(shouldOpen));
  }
}

function bindMenu() {
  if (!els.menuToggle || !els.sidebar) return;
  els.menuToggle.addEventListener("click", () => toggleMenu());
  if (els.overlay) {
    els.overlay.addEventListener("click", () => toggleMenu(false));
  }
}

async function fetchPhotos(query) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query || DEFAULT_QUERY);
  url.searchParams.set("per_page", PER_PAGE);
  url.searchParams.set("orientation", "portrait");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur API Unsplash (${response.status})`);
  }

  const data = await response.json();
  return (data.results || []).map((photo) => ({
    id: photo.id,
    src: photo.urls?.regular || photo.urls?.small,
    alt: photo.alt_description || photo.description || "Visuel Unsplash",
    author: photo.user?.name || "Inconnu",
    avatar:
      photo.user?.profile_image?.medium ||
      `https://source.boringavatars.com/marble/48/${photo.user?.username || photo.id}`,
    followers: photo.user?.total_photos ?? photo.likes ?? 0,
  }));
}

async function loadResults(query) {
  const term = query?.trim() || DEFAULT_QUERY;
  state.query = term;
  updateStatus(`Chargement des images pour « ${term} » ...`);
  document.body.classList.add("is-loading");

  try {
    const items = await fetchPhotos(term);
    state.results = items;
    renderResults(items);
    updateStatus(
      items.length
        ? `Résultats pour « ${term} » (premières ${Math.min(items.length, PER_PAGE)} images).`
        : `Aucun résultat pour « ${term} ».`
    );
  } catch (error) {
    console.error(error);
    updateStatus("Erreur lors du chargement des images Unsplash.");
    renderResults([]);
  } finally {
    document.body.classList.remove("is-loading");
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const query = els.searchInput?.value || "";
  await loadResults(query);
}

async function init() {
  updateStatus("Chargement des inspirations...");
  renderCollections(state.collections);
  renderFavorites(state.favorites);
  if (els.searchForm) {
    els.searchForm.addEventListener("submit", handleSearch);
  }
  bindMenu();
  await loadResults(DEFAULT_QUERY);
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
