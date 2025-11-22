// API key handled server-side (Vercel proxy)

const DEFAULT_QUERY = "";
const PER_PAGE = 20;
const FAVORITES_KEY = "moodboard:favorites";
const COLLECTIONS_KEY = "moodboard:collections";
const DEFAULT_COLLECTION_ID = "collection-default";
const DEFAULT_COLLECTION_NAME = "Par défaut";
const THEME_KEY = "moodboard:theme";
const clientApiKeyPromise = (async () => {
  try {
    const mod = await import("./config.js");
    return mod.API_KEY || null;
  } catch (error) {
    return null;
  }
})();

// Etat applicatif centralise
const state = {
  query: DEFAULT_QUERY,
  results: [],
  collections: [],
  collectionSections: [],
  favorites: [],
  page: 1,
  hasMore: true,
  isLoading: false,
};

// References DOM
const els = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  quickFilters: document.getElementById("quick-filters"),
  resultStatus: document.getElementById("result-status"),
  resultsGrid: document.getElementById("results-grid"),
  collectionList: document.getElementById("collection-list"),
  favoriteList: document.getElementById("favorite-list"),
  menuToggle: document.querySelector("[data-menu-toggle]"),
  nav: document.querySelector(".site-nav"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("menu-overlay"),
  collectionModal: null,
  collectionModalList: null,
  collectionModalSearch: null,
  collectionModalNew: null,
  collectionModalNewInput: null,
  collectionDetailModal: null,
  collectionDetailTitle: null,
  collectionDetailGrid: null,
  themeToggle: document.querySelector("[data-theme-toggle]"),
};

const fontsReady = document.fonts?.ready ?? Promise.resolve();
let activeCollectionPhoto = null;
let activeDetailCollection = null;
let lightboxItems = [];
let lightboxIndex = 0;
const lightboxEls = {};

// Gestion centralisee du stockage local
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
  loadCollections() {
    try {
      const raw = localStorage.getItem(COLLECTIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Impossible de lire les collections", error);
      return [];
    }
  },
  saveCollections(collections) {
    try {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    } catch (error) {
      console.warn("Impossible de sauvegarder les collections", error);
    }
  },
};

function isFavorite(id) {
  return state.favorites.some((fav) => fav.id === id);
}

function toggleFavorite(photo) {
  // Bascule un visuel dans ou hors des favoris
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
          <img src="${item.src}" alt="${item.alt}" loading="lazy" data-lightbox-trigger="${item.id}">
          <div class="card-actions" aria-label="Actions rapides">
            <button type="button" class="icon-btn fav-btn${active}" data-fav-toggle="${item.id}" aria-pressed="${Boolean(active)}" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
              <i class="fa-regular fa-heart" aria-hidden="true"></i>
            </button>
            <button type="button" class="icon-btn" data-collection-add="${item.id}" aria-label="Ajouter a une collection" title="Ajouter a une collection"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${item.avatar}" alt="${item.author}" loading="lazy">
              <div class="meta">
                <strong>${item.author}</strong>
                <span class="muted">${item.followers} followers</span>
              </div>
            </div>
            <button type="button" class="icon-btn ghost" data-download-id="${item.id}" aria-label="Télécharger l'image" title="Télécharger l'image"><i class="fa-solid fa-download" aria-hidden="true"></i></button>
          </div>
        </article>
      `;
    })
    .join("");

  applyMasonry();
  observeImages();
}

function renderSkeletonResults(count = 8) {
  if (!els.resultsGrid) return;
  const placeholders = Array.from({ length: count })
    .map(() => `<div class="skeleton skeleton-card"></div>`)
    .join("");
  els.resultsGrid.innerHTML = `<div class="skeleton-grid" aria-hidden="true">${placeholders}</div>`;
}

function renderCollections(sections) {
  if (!els.collectionList) return;

  const hasItems = sections.some((section) => (section.items || []).length);

  if (!hasItems) {
    els.collectionList.innerHTML = `
      <div class="empty-state">
        <h3>Pas encore de collection</h3>
        <div class="muted">Crée ta première collection pour organiser tes inspirations.</div>
        <button type="button" class="btn" data-collection-create>Créer une collection</button>
      </div>
    `;
    return;
  }

  // Injecte les sections (vos collections + suggestions)
  els.collectionList.innerHTML = sections
    .map(
      (section) => `
        <div class="collection-section">
          ${section.title ? `<h3>${section.title}</h3>` : ""}
          <div class="collection-grid">
            ${section.items
              .map(
                (item) => `
                  <article class="collection-card" data-collection-id="${item.id || item.name}">
                    <img src="${item.cover}" alt="${item.name}" loading="lazy">
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

  applyMasonry();
  observeImages();
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
          <img src="${favorite.src}" alt="${favorite.alt}" loading="lazy" data-lightbox-trigger="${favorite.id}">
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${favorite.avatar || favorite.src}" alt="${favorite.author}" loading="lazy">
              <div class="meta">
                <strong>${favorite.author}</strong>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  applyMasonry();
  observeImages();
}

function updateStatus(text) {
  if (els.resultStatus) {
    els.resultStatus.textContent = text;
    const hasText = Boolean(text);
    const isError = (text || "").toLowerCase().includes("erreur");
    els.resultStatus.classList.toggle("status-hidden", !hasText);
    els.resultStatus.classList.toggle("status-error", isError);
  }
}

function getCollectionCover(name, items = []) {
  // Utilise la premiere image de la collection ou un avatar genere pour l'affichage
  const existingCover = items[0]?.src;
  if (existingCover) return existingCover;
  const seed = encodeURIComponent(name || "collection");
  return `https://source.boringavatars.com/beam/400/${seed}?colors=0f172a,111827,1f2937,111827,0f172a`;
}

function normalizeName(name) {
  return name.trim();
}

function normalizeKey(name) {
  return normalizeName(name).toLowerCase();
}

function isDefaultCollection(collection) {
  return collection?.id === DEFAULT_COLLECTION_ID;
}

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeToggle(theme) {
  if (!els.themeToggle) return;
  const icon = els.themeToggle.querySelector("[data-theme-icon]");
  if (icon) {
    icon.className = theme === "dark" ? "fa-regular fa-moon" : "fa-regular fa-sun";
  }
  els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Mode clair" : "Mode sombre");
}

function applyTheme(theme) {
  const mode = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", mode === "dark");
  document.body.dataset.theme = mode;
  localStorage.setItem(THEME_KEY, mode);
  updateThemeToggle(mode);
}

function toggleTheme() {
  const next = document.body.classList.contains("theme-dark") ? "light" : "dark";
  applyTheme(next);
}

function buildCollectionSections() {
  // Construit la section utilisateur pour la page Collections
  const userItems = state.collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    cover: getCollectionCover(collection.name, collection.items),
  }));

  const userSection = userItems.length
    ? [
        {
          title: "",
          items: userItems,
        },
      ]
    : [];

  return [...userSection, ...state.collectionSections];
}

function addPhotoToCollection(collectionName, photo) {
  // Cree si besoin la collection et y ajoute le visuel (sans doublon)
  const name = normalizeName(collectionName);
  if (!name) return;

  const key = normalizeKey(name);
  let collection = state.collections.find((c) => normalizeKey(c.name) === key);

  if (!collection) {
    collection = { id: `col-${Date.now()}`, name, items: [] };
    state.collections.push(collection);
  }

  const exists = collection.items.some((item) => item.id === photo.id);
  if (!exists) {
    collection.items.push(photo);
  }

  storage.saveCollections(state.collections);
  renderCollections(buildCollectionSections());
  renderCollectionModalList(els.collectionModalSearch?.value || "");
}

function promptCollectionCreation() {
  const input = window.prompt("Nom de la collection :", "");
  const name = normalizeName(input || "");
  if (!name) return;
  const exists = state.collections.some((c) => normalizeKey(c.name) === normalizeKey(name));
  if (exists) return;
  const collection = { id: `col-${Date.now()}`, name, items: [] };
  state.collections.push(collection);
  storage.saveCollections(state.collections);
  renderCollections(buildCollectionSections());
  renderCollectionModalList(els.collectionModalSearch?.value || "");
}

function ensureCollectionModal() {
  // Instancie le menu contextuel de selection/creation de collection (lazy)
  if (els.collectionModal) return;
  const wrapper = document.createElement("div");
  wrapper.className = "collection-modal";
  wrapper.innerHTML = `
    <div class="collection-modal__backdrop" data-col-modal-close></div>
    <div class="collection-modal__panel" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title">
      <h3 id="collection-modal-title" class="sr-only">Ajouter a une collection</h3>
      <div class="collection-modal__search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" placeholder="Trouver une collection" aria-label="Trouver une collection" data-col-modal-search>
      </div>
      <div class="collection-modal__list" data-col-modal-list></div>
      <form class="collection-modal__new" data-col-modal-new>
        <input type="text" placeholder="Nom de la nouvelle collection" aria-label="Nom de la nouvelle collection" data-col-modal-new-input>
        <button type="submit" class="btn">Créer</button>
      </form>
    </div>
  `;
  document.body.appendChild(wrapper);

  els.collectionModal = wrapper;
  els.collectionModalList = wrapper.querySelector("[data-col-modal-list]");
  els.collectionModalSearch = wrapper.querySelector("[data-col-modal-search]");
  els.collectionModalNew = wrapper.querySelector("[data-col-modal-new]");
  els.collectionModalNewInput = wrapper.querySelector("[data-col-modal-new-input]");

  wrapper.addEventListener("click", (event) => {
    if (event.target.closest("[data-col-modal-close]")) {
      closeCollectionModal();
    }
  });

  if (els.collectionModalSearch) {
    els.collectionModalSearch.addEventListener("input", (event) => {
      renderCollectionModalList(event.target.value || "");
    });
  }

  if (els.collectionModalList) {
    els.collectionModalList.addEventListener("click", (event) => {
      const deleteBtn = event.target.closest("[data-col-delete]");
      if (deleteBtn) {
        const id = deleteBtn.getAttribute("data-col-delete");
        deleteCollection(id);
        renderCollectionModalList(els.collectionModalSearch?.value || "");
        renderCollections(buildCollectionSections());
        return;
      }
      const renameBtn = event.target.closest("[data-col-rename]");
      if (renameBtn) {
        const id = renameBtn.getAttribute("data-col-rename");
        const collection = state.collections.find((c) => c.id === id);
        if (collection && !isDefaultCollection(collection)) {
          const input = window.prompt("Nouveau nom de la collection :", collection.name);
          const name = normalizeName(input || "");
          if (name) {
            renameCollection(id, name);
            renderCollectionModalList(els.collectionModalSearch?.value || "");
            renderCollections(buildCollectionSections());
          }
        }
        return;
      }
      const target = event.target.closest("[data-col-select]");
      if (!target) return;
      const id = target.getAttribute("data-col-select");
      const collection = state.collections.find((c) => c.id === id);
      if (collection && activeCollectionPhoto) {
        addPhotoToCollection(collection.name, activeCollectionPhoto);
        closeCollectionModal();
      }
    });
  }

  if (els.collectionModalNew) {
    els.collectionModalNew.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = normalizeName(els.collectionModalNewInput?.value || els.collectionModalSearch?.value || "");
      if (!name || !activeCollectionPhoto) return;
      addPhotoToCollection(name, activeCollectionPhoto);
      if (els.collectionModalNewInput) {
        els.collectionModalNewInput.value = "";
      }
      closeCollectionModal();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && wrapper.classList.contains("open")) {
      closeCollectionModal();
    }
  });
}

function deleteCollection(collectionId) {
  state.collections = state.collections.filter((c) => {
    if (c.id === collectionId && isDefaultCollection(c)) {
      return true; // ignore deletion of default
    }
    return c.id !== collectionId;
  });
  storage.saveCollections(state.collections);
}

function renameCollection(collectionId, newName) {
  const name = normalizeName(newName || "");
  if (!name) return;
  const key = normalizeKey(name);
  const exists = state.collections.some((c) => c.id !== collectionId && normalizeKey(c.name) === key);
  if (exists) return;
  const collection = state.collections.find((c) => c.id === collectionId);
  if (!collection || isDefaultCollection(collection)) return;
  collection.name = name;
  storage.saveCollections(state.collections);
}

function ensureCollectionDetailModal() {
  if (els.collectionDetailModal) return;
  const wrapper = document.createElement("div");
  wrapper.className = "collection-detail-modal";
  wrapper.innerHTML = `
    <div class="collection-modal__backdrop" data-col-detail-close></div>
    <div class="collection-detail__panel" role="dialog" aria-modal="true">
      <header class="collection-detail__header">
        <div>
          <h3 class="collection-detail__title" data-col-detail-title></h3>
          <div class="muted" data-col-detail-count></div>
        </div>
        <button type="button" class="icon-btn" data-col-detail-close aria-label="Fermer">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </header>
      <div class="collection-detail__grid cards-grid" data-col-detail-grid></div>
    </div>
  `;
  document.body.appendChild(wrapper);

  els.collectionDetailModal = wrapper;
  els.collectionDetailTitle = wrapper.querySelector("[data-col-detail-title]");
  els.collectionDetailGrid = wrapper.querySelector("[data-col-detail-grid]");
  els.collectionDetailCount = wrapper.querySelector("[data-col-detail-count]");
  if (els.collectionDetailGrid) {
    els.collectionDetailGrid.addEventListener("click", (event) => {
      const img = event.target.closest("[data-lightbox-trigger]");
      if (!img || !els.collectionDetailGrid?.contains(img)) return;
      const id = img.getAttribute("data-lightbox-trigger");
      openLightbox(activeDetailCollection?.items || [], id);
    });
  }

  wrapper.addEventListener("click", (event) => {
    if (event.target.closest("[data-col-detail-close]")) {
      closeCollectionDetail();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && wrapper.classList.contains("open")) {
      closeCollectionDetail();
    }
  });
}

function renderCollectionDetail(collection) {
  if (!collection || !els.collectionDetailGrid) return;
  const items = collection.items || [];
  if (!items.length) {
    els.collectionDetailGrid.innerHTML = `<div class="collection-detail__empty muted">Aucune image dans cette collection.</div>`;
    return;
  }

  els.collectionDetailGrid.innerHTML = items
    .map(
      (item) => `
        <article class="card collection-detail-card">
          <img src="${item.src}" alt="${item.alt}" loading="lazy" data-lightbox-trigger="${item.id}">
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${item.avatar}" alt="${item.author}" loading="lazy">
              <div class="meta">
                <strong>${item.author}</strong>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
  applyMasonry();
  observeImages();
}

function openCollectionDetail(collectionId) {
  ensureCollectionDetailModal();
  const collection = state.collections.find((c) => c.id === collectionId);
  if (!collection) return;

  activeDetailCollection = collection;
  els.collectionDetailTitle.textContent = collection.name;
  const count = collection.items.length;
  if (els.collectionDetailCount) {
    els.collectionDetailCount.textContent = `${count} image${count > 1 ? "s" : ""}`;
  }
  renderCollectionDetail(collection);
  els.collectionDetailModal.classList.add("open");
  document.body.classList.add("collection-modal-open");
}

function closeCollectionDetail() {
  if (!els.collectionDetailModal) return;
  els.collectionDetailModal.classList.remove("open");
  document.body.classList.remove("collection-modal-open");
  activeDetailCollection = null;
}

function renderCollectionModalList(filterTerm = "") {
  if (!els.collectionModalList) return;
  const term = (filterTerm || "").toLowerCase();
  const list = state.collections.filter((collection) => collection.name.toLowerCase().includes(term));

  if (!list.length) {
    els.collectionModalList.innerHTML = `<div class="collection-modal__empty">Aucune collection.</div>`;
    return;
  }

  els.collectionModalList.innerHTML = list
    .map((collection) => {
      const cover = getCollectionCover(collection.name, collection.items);
      const count = collection.items.length;
      const label = `${count} image${count > 1 ? "s" : ""}`;
      return `
        <div class="collection-option" data-col-select="${collection.id}">
          <div class="collection-option__info">
            <img src="${cover}" alt="" aria-hidden="true" loading="lazy">
            <div class="collection-option__meta">
              <strong>${collection.name}</strong>
              <span class="muted">${label}</span>
            </div>
          </div>
          <div class="collection-option__actions">
            ${
              isDefaultCollection(collection)
                ? ""
                : `<button type="button" class="collection-option__rename" data-col-rename="${collection.id}" aria-label="Renommer la collection">
                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                   </button>
                   <button type="button" class="collection-option__delete" data-col-delete="${collection.id}" aria-label="Supprimer la collection">
                    <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                   </button>`
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function openCollectionModal(photo, clickEvent) {
  // Ouvre le menu contextuel et prepare la liste filtrable
  ensureCollectionModal();
  activeCollectionPhoto = photo;
  els.collectionModal?.classList.add("open");
  document.body.classList.add("collection-modal-open");
  renderCollectionModalList(els.collectionModalSearch?.value || "");
  const panel = els.collectionModal?.querySelector(".collection-modal__panel");
  if (panel && clickEvent?.clientX !== undefined) {
    const { clientX, clientY } = clickEvent;
    const panelWidth = panel.offsetWidth || 360;
    const panelHeight = panel.offsetHeight || 420;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(Math.max(12, clientX - panelWidth / 2), viewportWidth - panelWidth - 12);
    const top = Math.min(Math.max(12, clientY + 12), viewportHeight - panelHeight - 12);
    panel.style.position = "fixed";
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }
  if (els.collectionModalSearch) {
    els.collectionModalSearch.focus();
    els.collectionModalSearch.select();
  }
}

function closeCollectionModal() {
  // Ferme le menu contextuel des collections
  if (!els.collectionModal) return;
  els.collectionModal.classList.remove("open");
  document.body.classList.remove("collection-modal-open");
  const panel = els.collectionModal.querySelector(".collection-modal__panel");
  if (panel) {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.position = "";
  }
  activeCollectionPhoto = null;
}

function promptCollectionName(photo) {
  const existingNames = state.collections.map((c) => c.name).join(", ") || "Aucune";
  const input = window.prompt(
    `Ajouter "${photo.alt}" \u00e0 une collection.\nCollections existantes: ${existingNames}\nNom de la collection :`,
    state.collections[0]?.name || ""
  );
  const name = (input || "").trim();
  if (!name) return;
  addPhotoToCollection(name, photo);
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

function mapUnsplashList(list, isSearch) {
  const items = isSearch ? list.results || [] : list || [];
  return items.map((photo) => ({
    id: photo.id,
    src: photo.urls?.regular || photo.urls?.small,
    alt: photo.alt_description || photo.description || "Visuel Unsplash",
    author: photo.user?.name || "Inconnu",
    avatar:
      photo.user?.profile_image?.medium ||
      `https://source.boringavatars.com/marble/48/${photo.user?.username || photo.id}`,
    followers: photo.user?.total_photos ?? photo.likes ?? 0,
    download: photo.links?.download || photo.urls?.full || photo.urls?.regular,
    downloadLocation: photo.links?.download_location,
  }));
}

async function fetchPhotos(query, page = 1) {
  const term = (query || "").trim();
  const isSearch = Boolean(term);
  const params = new URLSearchParams({ per_page: String(PER_PAGE) });
  if (isSearch) params.set("query", term);
  params.set("page", String(page));

  // Tentative via proxy Vercel
  try {
    const proxyUrl = new URL("/api/unsplash", window.location.origin);
    proxyUrl.search = params.toString();
    const response = await fetch(proxyUrl.toString());
    if (!response.ok) {
      if (response.status !== 404) {
        throw new Error(`Erreur API Unsplash (${response.status})`);
      }
    } else {
      const data = await response.json();
      return mapUnsplashList(data, isSearch);
    }
  } catch (error) {
    console.warn("Proxy indisponible, fallback vers Unsplash direct", error);
  }

  // Fallback direct pour le dev local (requiert config.js non versionné)
  const clientKey = await clientApiKeyPromise;
  if (!clientKey) {
    throw new Error("Proxy Vercel indisponible et clé locale absente.");
  }

  const directUrl = new URL(
    isSearch ? "https://api.unsplash.com/search/photos" : "https://api.unsplash.com/photos"
  );
  directUrl.search = params.toString();

  const fallback = await fetch(directUrl.toString(), {
    headers: {
      Authorization: `Client-ID ${clientKey}`,
    },
  });

  if (!fallback.ok) {
    throw new Error(`Erreur API Unsplash (${fallback.status})`);
  }

  const data = await fallback.json();
  return mapUnsplashList(data, isSearch);
}

function waitForImages(container) {
  // Renvoie une promesse resolue quand toutes les images d'un conteneur sont chargees
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

function applyMasonry(selector = ".cards-grid, .favorite-list, .collection-list") {
  const grids = document.querySelectorAll(selector);
  grids.forEach((grid) => {
    const styles = getComputedStyle(grid);
    const rowHeight = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 10;
    const gap = parseFloat(styles.getPropertyValue("gap")) || 0;
    const items = grid.querySelectorAll(".card, .favorite-card, .collection-card");
    items.forEach((item) => {
      item.style.gridRowEnd = "span 1";
      const height = item.getBoundingClientRect().height;
      const span = Math.ceil((height + gap) / (rowHeight + gap));
      item.style.gridRowEnd = `span ${Math.max(span, 1)}`;
    });
  });
}

function observeImages(selector = ".cards-grid, .favorite-list, .collection-list") {
  const grids = document.querySelectorAll(selector);
  grids.forEach((grid) => {
    grid.querySelectorAll("img").forEach((img) => {
      const onLoad = () => applyMasonry(selector);
      if (img.complete && img.naturalHeight !== 0) {
        onLoad();
      } else {
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true });
      }
    });
  });
}

function syncNavHeight() {
  // Aligne la variable CSS --nav-height sur la hauteur reelle du header
  const nav = els.nav || document.querySelector(".site-nav");
  if (!nav) return;

  const setHeight = () => {
    const height = nav.getBoundingClientRect().height || 0;
    document.documentElement.style.setProperty("--nav-height", `${height}px`);
  };

  setHeight();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(setHeight);
    observer.observe(nav);
  }
  window.addEventListener("resize", setHeight);
}

function updateResultButtons() {
  // Synchronise l'etat des boutons favoris en fonction du store
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

async function triggerDownload(photo) {
  if (!photo) return;

  const link = photo.download || photo.src;
  if (link) {
    window.open(link, "_blank", "noopener");
  }
}

function ensureLightbox() {
  if (lightboxEls.root) return;
  const root = document.createElement("div");
  root.className = "lightbox";
  root.innerHTML = `
    <div class="lightbox__content">
      <button type="button" class="lightbox__close" data-lightbox-close aria-label="Fermer">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <img class="lightbox__img" alt="" />
      <button type="button" class="lightbox__nav lightbox__nav--prev" data-lightbox-prev aria-label="Image précédente">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button type="button" class="lightbox__nav lightbox__nav--next" data-lightbox-next aria-label="Image suivante">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  `;
  document.body.appendChild(root);

  lightboxEls.root = root;
  lightboxEls.img = root.querySelector(".lightbox__img");
  lightboxEls.prev = root.querySelector("[data-lightbox-prev]");
  lightboxEls.next = root.querySelector("[data-lightbox-next]");

  root.addEventListener("click", (event) => {
    if (event.target === root || event.target.closest("[data-lightbox-close]")) {
      closeLightbox();
    }
  });

  lightboxEls.prev?.addEventListener("click", () => stepLightbox(-1));
  lightboxEls.next?.addEventListener("click", () => stepLightbox(1));

  window.addEventListener("keydown", (event) => {
    if (!lightboxEls.root?.classList.contains("open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") stepLightbox(1);
    if (event.key === "ArrowLeft") stepLightbox(-1);
  });
}

function renderLightbox() {
  const current = lightboxItems[lightboxIndex];
  if (!current) return;
  if (lightboxEls.img) {
    lightboxEls.img.src = current.src;
    lightboxEls.img.alt = current.alt || "Aperçu";
  }
  const controlsVisible = lightboxItems.length > 1;
  if (lightboxEls.prev) {
    lightboxEls.prev.style.display = controlsVisible ? "grid" : "none";
  }
  if (lightboxEls.next) {
    lightboxEls.next.style.display = controlsVisible ? "grid" : "none";
  }
}

function openLightbox(items, startId) {
  if (!items || !items.length) return;
  ensureLightbox();
  lightboxItems = items;
  const index = items.findIndex((item) => item.id === startId);
  lightboxIndex = index >= 0 ? index : 0;
  renderLightbox();
  lightboxEls.root?.classList.add("open");
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  lightboxEls.root?.classList.remove("open");
  document.body.classList.remove("lightbox-open");
}

function stepLightbox(delta) {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
  renderLightbox();
}

function onResultsClick(event) {
  // Delegation des clics sur favoris, collection, download et ouverture lightbox
  const actionTarget = event.target.closest("[data-fav-toggle], [data-collection-add], [data-download-id]");
  if (actionTarget && els.resultsGrid?.contains(actionTarget)) {
    const favId = actionTarget.getAttribute("data-fav-toggle");
    const collectionId = actionTarget.getAttribute("data-collection-add");
    const downloadId = actionTarget.getAttribute("data-download-id");

    if (favId) {
      const photo = state.results.find((item) => item.id === favId);
      if (photo) {
        toggleFavorite(photo);
      }
      return;
    }

    if (collectionId) {
      const photo = state.results.find((item) => item.id === collectionId);
      if (photo) {
        openCollectionModal(photo, event);
      }
      return;
    }

    if (downloadId) {
      const photo = state.results.find((item) => item.id === downloadId);
      if (photo) {
        triggerDownload(photo);
      }
      return;
    }
  }

  const imgTarget = event.target.closest("[data-lightbox-trigger]");
  if (imgTarget && els.resultsGrid?.contains(imgTarget)) {
    const card = imgTarget.closest("[data-photo-id]");
    const id = card?.getAttribute("data-photo-id");
    openLightbox(state.results, id);
  }
}

function onFavoritesClick(event) {
  // Retrait d'un favori depuis la page dediee
  const target = event.target.closest("[data-fav-toggle]");
  if (target && els.favoriteList?.contains(target)) {
    const id = target.getAttribute("data-fav-toggle");
    const photo = state.favorites.find((fav) => fav.id === id);
    if (photo) {
      toggleFavorite(photo);
    }
    return;
  }

  const img = event.target.closest("[data-lightbox-trigger]");
  if (img && els.favoriteList?.contains(img)) {
    const card = img.closest("[data-fav-toggle]");
    const id = card?.getAttribute("data-fav-toggle");
    openLightbox(state.favorites, id);
  }
}

function onCollectionsClick(event) {
  const createBtn = event.target.closest("[data-collection-create]");
  if (createBtn && els.collectionList?.contains(createBtn)) {
    promptCollectionCreation();
    return;
  }

  const card = event.target.closest("[data-collection-id]");
  if (!card || !els.collectionList?.contains(card)) return;
  const id = card.getAttribute("data-collection-id");
  openCollectionDetail(id);
}

async function handleSearch(event) {
  // Soumission du formulaire de recherche Unsplash
  event.preventDefault();
  const query = els.searchInput?.value || "";
  await loadResults(query);
}

function handleQuickFilter(event) {
  const target = event.target.closest("[data-quick-query]");
  if (!target) return;
  const term = target.getAttribute("data-quick-query") || "";
  if (els.searchInput) {
    els.searchInput.value = term;
  }
  loadResults(term);
}

async function loadResults(query) {
  // Recupere et affiche les images (page d'accueil)
  if (!els.resultsGrid) return;

  const term = (query || "").trim();
  state.query = term;
  state.page = 1;
  state.hasMore = true;
  state.results = [];
  state.isLoading = false;

  if (!term) {
    updateStatus("Chargement des inspirations...");
  } else {
    updateStatus(`Chargement des images pour "${term}" ...`);
  }

  document.body.classList.add("is-loading");
  renderSkeletonResults();

  try {
    await loadNextPage(true);
  } finally {
    document.body.classList.remove("is-loading");
  }
}

async function loadNextPage(reset = false) {
  if (!els.resultsGrid) return;
  if (state.isLoading) return;
  if (!state.hasMore && !reset) return;

  const nextPage = reset ? 1 : state.page + 1;
  state.isLoading = true;

  try {
    const items = await fetchPhotos(state.query, nextPage);
    if (reset) {
      state.results = items;
    } else {
      state.results = [...state.results, ...items];
    }
    state.page = nextPage;
    state.hasMore = items.length >= PER_PAGE;

    if (!state.results.length) {
      const message = state.query
        ? `Aucun résultat pour "${state.query}".`
        : "Aucun résultat trouvé.";
      updateStatus(message);
      if (els.resultsGrid) {
        els.resultsGrid.innerHTML = "";
      }
    } else {
      updateStatus("");
      renderResults(state.results);
      updateResultButtons();
    }
  } catch (error) {
    console.error(error);
    state.hasMore = false;
    updateStatus("Erreur lors du chargement des images Unsplash.");
  } finally {
    state.isLoading = false;
  }
}

async function init() {
  // Bootstrapping : hydrate l'etat, bind les evenements et charge les donnees
  state.favorites = storage.loadFavorites();
  state.collections = storage.loadCollections();
  const hasDefault = state.collections.some(
    (c) => isDefaultCollection(c) || normalizeKey(c.name) === normalizeKey(DEFAULT_COLLECTION_NAME)
  );
  if (!hasDefault) {
    state.collections.unshift({ id: DEFAULT_COLLECTION_ID, name: DEFAULT_COLLECTION_NAME, items: [] });
    storage.saveCollections(state.collections);
  }
  ensureCollectionModal();
  ensureCollectionDetailModal();
  renderCollectionModalList();

  const isHomePage = Boolean(els.resultsGrid);
  const hasFavoritesSection = Boolean(els.favoriteList);

  renderCollections(buildCollectionSections());
  renderFavorites(state.favorites);

  if (hasFavoritesSection) {
    els.favoriteList.addEventListener("click", onFavoritesClick);
  }
  if (isHomePage) {
    els.resultsGrid.addEventListener("click", onResultsClick);
    if (els.quickFilters) {
      els.quickFilters.addEventListener("click", handleQuickFilter);
    }
  }
  if (els.themeToggle) {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    els.themeToggle.addEventListener("click", toggleTheme);
  } else {
    applyTheme(getInitialTheme());
  }
  if (els.collectionList) {
    els.collectionList.addEventListener("click", onCollectionsClick);
  }
  if (els.searchForm && isHomePage) {
    els.searchForm.addEventListener("submit", handleSearch);
  }
  if (isHomePage) {
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400;
      if (nearBottom) {
        loadNextPage();
      }
    };
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
  }

  bindMenu();
  syncNavHeight();

  window.addEventListener("resize", () => {
    applyMasonry();
  });

  if (isHomePage) {
    await loadResults("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
