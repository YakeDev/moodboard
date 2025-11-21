import { API_KEY } from "./config.js";

const DEFAULT_QUERY = "";
const PER_PAGE = 20;
const FAVORITES_KEY = "moodboard:favorites";

const state = {
  query: DEFAULT_QUERY,
  results: [],
  collectionSections: [
    {
      title: "Id\u00e9es pour vous",
      items: [
        {
          name: "Pattern art",
          cover: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Vintage recipe",
          cover: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Pattern drawing",
          cover: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Vintage decor",
          cover: "https://images.unsplash.com/photo-1458829267686-67c9c286b0f6?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Retro futurism",
          cover: "https://images.unsplash.com/photo-1522050212171-61b01dd24579?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Cute dessert",
          cover: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Poems",
          cover: "https://images.unsplash.com/photo-1471109880861-75cec67f8b68?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Journaling",
          cover: "https://images.unsplash.com/photo-1473186505569-9c61870c11f9?auto=format&fit=crop&w=1200&q=80",
        },
      ],
    },
    {
      title: "Populaire sur MoodBoard",
      items: [
        {
          name: "Dark wallpaper",
          cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Birthday cake",
          cover: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Caracal",
          cover: "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Architecture",
          cover: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Fashion",
          cover: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Traveling",
          cover: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Arts",
          cover: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        },
        {
          name: "Film photo",
          cover: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
        },
      ],
    },
  ],
  favorites: [],
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

const fontsReady = document.fonts?.ready ?? Promise.resolve();

const storage = {
  loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Impossible de lire les favoris", error);
      return [];
    }
  },
  saveFavorites(favs) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    } catch (error) {
      console.warn("Impossible de sauvegarder les favoris", error);
    }
  },
};

function isFavorite(id) {
  return state.favorites.some((fav) => fav.id === id);
}

function toggleFavorite(photo) {
  if (!photo || !photo.id) return;
  const exists = isFavorite(photo.id);
  state.favorites = exists
    ? state.favorites.filter((fav) => fav.id !== photo.id)
    : [...state.favorites, photo];
  storage.saveFavorites(state.favorites);
  renderFavorites(state.favorites);
  updateResultButtons();
}

function renderResults(items) {
  if (!els.resultsGrid) return;

  if (!items.length) {
    els.resultsGrid.innerHTML = `<p class="muted">Aucun résultat trouvé.</p>`;
    return;
  }

  els.resultsGrid.innerHTML = items
    .map((item) => {
      const active = isFavorite(item.id) ? " active" : "";
      return `
        <article class="card" data-photo-id="${item.id}">
          <img src="${item.src}" alt="${item.alt}">
          <div class="card-actions" aria-label="Actions rapides">
            <button type="button" class="icon-btn fav-btn${active}" data-fav-toggle="${item.id}" aria-pressed="${Boolean(active)}" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
              <i class="fa-regular fa-heart" aria-hidden="true"></i>
            </button>
            <button type="button" class="icon-btn" aria-label="Ajouter à une collection" title="Ajouter à une collection"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${item.avatar}" alt="${item.author}">
              <div class="meta">
                <strong>${item.author}</strong>
                <span class="muted">${item.followers} followers</span>
              </div>
            </div>
            <button type="button" class="icon-btn ghost" aria-label="Télécharger l'image" title="Télécharger l'image"><i class="fa-solid fa-download" aria-hidden="true"></i></button>
          </div>
        </article>
      `;
    })
    .join("");

  layoutAfterImages(els.resultsGrid, ".card");
}

function renderCollections(sections) {
  if (!els.collectionList) return;

  els.collectionList.innerHTML = sections
    .map(
      (section) => `
        <div class="collection-section">
          <h3>${section.title}</h3>
          <div class="collection-grid">
            ${section.items
              .map(
                (item) => `
                  <article class="collection-card">
                    <img src="${item.cover}" alt="${item.name}">
                    <div class="collection-card__overlay"></div>
                    <div class="collection-card__title">${item.name}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function renderFavorites(favorites) {
  if (!els.favoriteList) return;

  if (!favorites.length) {
    els.favoriteList.innerHTML = `<div class="muted">Aucun favori pour l'instant.</div>`;
    return;
  }

  els.favoriteList.innerHTML = favorites
    .map(
      (favorite) => `
        <article class="card favorite-card" data-fav-toggle="${favorite.id}">
          <div class="card-actions">
            <button type="button" class="icon-btn" data-fav-toggle="${favorite.id}" aria-label="Retirer des favoris"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <img src="${favorite.src}" alt="${favorite.alt}">
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${favorite.avatar || favorite.src}" alt="${favorite.author}">
              <div class="meta">
                <strong>${favorite.author}</strong>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  layoutAfterImages(els.favoriteList, ".favorite-card");
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
  if (els.menuToggle) {
    els.menuToggle.addEventListener("click", () => toggleMenu());
  }
  if (els.overlay) {
    els.overlay.addEventListener("click", () => toggleMenu(false));
  }
}

async function fetchPhotos(query) {
  const term = (query || "").trim();
  const isSearch = Boolean(term);
  const url = isSearch
    ? new URL("https://api.unsplash.com/search/photos")
    : new URL("https://api.unsplash.com/photos");

  if (isSearch) {
    url.searchParams.set("query", term);
  }

  url.searchParams.set("per_page", PER_PAGE);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur API Unsplash (${response.status})`);
  }

  const data = await response.json();
  const list = isSearch ? data.results || [] : data || [];

  return list.map((photo) => ({
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

function waitForImages(container) {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll("img"));
  const promises = images.map((img) => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });
  return Promise.all(promises);
}

function applyMasonry(container, selector) {
  if (!container) return;
  const styles = getComputedStyle(container);
  const rowHeight = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 10;
  const gap = parseFloat(styles.getPropertyValue("gap")) || 0;

  const measure = () => {
    container.querySelectorAll(selector).forEach((card) => {
      card.style.gridRowEnd = "span 1";
      const cardHeight = card.getBoundingClientRect().height;
      const span = Math.ceil((cardHeight + gap) / (rowHeight + gap));
      card.style.gridRowEnd = `span ${span}`;
    });
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(measure);
  } else {
    measure();
  }
}

function layoutAfterImages(container, selector) {
  if (!container) return;
  Promise.all([waitForImages(container), fontsReady]).then(() => applyMasonry(container, selector));
}

function updateResultButtons() {
  if (!els.resultsGrid) return;

  els.resultsGrid.querySelectorAll("[data-fav-toggle]").forEach((btn) => {
    const id = btn.getAttribute("data-fav-toggle");
    const active = isFavorite(id);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute("aria-label", active ? "Retirer des favoris" : "Ajouter aux favoris");
    btn.setAttribute("title", active ? "Retirer des favoris" : "Ajouter aux favoris");
  });
}

function onResultsClick(event) {
  const target = event.target.closest("[data-fav-toggle]");
  if (!target || !els.resultsGrid?.contains(target)) return;

  const id = target.getAttribute("data-fav-toggle");
  const photo = state.results.find((item) => item.id === id);

  if (photo) {
    toggleFavorite(photo);
  }
}

function onFavoritesClick(event) {
  const target = event.target.closest("[data-fav-toggle]");
  if (!target || !els.favoriteList?.contains(target)) return;

  const id = target.getAttribute("data-fav-toggle");
  const photo = state.favorites.find((fav) => fav.id === id);

  if (photo) {
    toggleFavorite(photo);
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const query = els.searchInput?.value || "";
  await loadResults(query);
}

async function loadResults(query) {
  if (!els.resultsGrid) return;

  const term = (query || "").trim();
  state.query = term;

  if (!term) {
    updateStatus("Chargement des inspirations...");
  } else {
    updateStatus(`Chargement des images pour « ${term} » ...`);
  }

  document.body.classList.add("is-loading");

  try {
    const items = await fetchPhotos(term);
    state.results = items;
    renderResults(items);
    updateResultButtons();

    updateStatus(
      term
        ? items.length
          ? `Résultats pour « ${term} » (premières ${Math.min(items.length, PER_PAGE)} images).`
          : `Aucun résultat pour « ${term} ».`
        : `Images récentes (premières ${Math.min(items.length, PER_PAGE)} images).`
    );
  } catch (error) {
    console.error(error);
    updateStatus("Erreur lors du chargement des images Unsplash.");
    renderResults([]);
  } finally {
    document.body.classList.remove("is-loading");
  }
}

async function init() {
  state.favorites = storage.loadFavorites();

  const isHomePage = Boolean(els.resultsGrid);
  const hasFavoritesSection = Boolean(els.favoriteList);

  renderCollections(state.collectionSections);
  renderFavorites(state.favorites);

  if (hasFavoritesSection) {
    els.favoriteList.addEventListener("click", onFavoritesClick);
  }
  if (isHomePage) {
    els.resultsGrid.addEventListener("click", onResultsClick);
  }
  if (els.searchForm && isHomePage) {
    els.searchForm.addEventListener("submit", handleSearch);
  }

  bindMenu();

  window.addEventListener("resize", () => {
    layoutAfterImages(els.resultsGrid, ".card");
    layoutAfterImages(els.favoriteList, ".favorite-card");
  });

  if (isHomePage) {
    await loadResults("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
