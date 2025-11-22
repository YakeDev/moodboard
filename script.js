import { API_KEY } from "./config.js";

const DEFAULT_QUERY = "";
const PER_PAGE = 20;
const FAVORITES_KEY = "moodboard:favorites";
const COLLECTIONS_KEY = "moodboard:collections";

// Etat applicatif centralise
const state = {
  query: DEFAULT_QUERY,
  results: [],
  collections: [],
  collectionSections: [],
  favorites: [],
};

// References DOM
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
  collectionModal: null,
  collectionModalList: null,
  collectionModalSearch: null,
  collectionModalNew: null,
  collectionModalNewInput: null,
  collectionDetailModal: null,
  collectionDetailTitle: null,
  collectionDetailGrid: null,
};

const fontsReady = document.fonts?.ready ?? Promise.resolve();
let activeCollectionPhoto = null;

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
          <img src="${item.src}" alt="${item.alt}">
          <div class="card-actions" aria-label="Actions rapides">
            <button type="button" class="icon-btn fav-btn${active}" data-fav-toggle="${item.id}" aria-pressed="${Boolean(active)}" aria-label="Ajouter aux favoris" title="Ajouter aux favoris">
              <i class="fa-regular fa-heart" aria-hidden="true"></i>
            </button>
            <button type="button" class="icon-btn" data-collection-add="${item.id}" aria-label="Ajouter a une collection" title="Ajouter a une collection"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
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

  let collection = state.collections.find((c) => c.name.toLowerCase() === name.toLowerCase());

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
  state.collections = state.collections.filter((c) => c.id !== collectionId);
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
          <img src="${item.src}" alt="${item.alt}">
          <div class="card-footer">
            <div class="author">
              <img class="avatar" src="${item.avatar}" alt="${item.author}">
              <div class="meta">
                <strong>${item.author}</strong>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
  layoutAfterImages(els.collectionDetailGrid, ".collection-detail-card");
}

function openCollectionDetail(collectionId) {
  ensureCollectionDetailModal();
  const collection = state.collections.find((c) => c.id === collectionId);
  if (!collection) return;

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
            <img src="${cover}" alt="" aria-hidden="true">
            <div class="collection-option__meta">
              <strong>${collection.name}</strong>
              <span class="muted">${label}</span>
            </div>
          </div>
          <button type="button" class="collection-option__delete" data-col-delete="${collection.id}" aria-label="Supprimer la collection">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
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

function applyMasonry(container, selector) {
  // Calcule dynamiquement la hauteur de row-span pour un effet masonry fluide
  if (!container) return;
  if (container.clientWidth < 640) return; // evite le masonry sur mobile et petit ecran
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
  // Recalcule la grille apres chargement des images et des fontes
  if (!container) return;
  const isSmall = container.clientWidth < 640;
  container.classList.toggle("no-masonry", isSmall);
  if (isSmall) return;
  Promise.all([waitForImages(container), fontsReady]).then(() => applyMasonry(container, selector));
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

function onResultsClick(event) {
  // Delegation des clics sur favoris et ajout en collection
  const target = event.target.closest("[data-fav-toggle], [data-collection-add]");
  if (!target || !els.resultsGrid?.contains(target)) return;

  const favId = target.getAttribute("data-fav-toggle");
  const collectionId = target.getAttribute("data-collection-add");

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
  }
}

function onFavoritesClick(event) {
  // Retrait d'un favori depuis la page dediee
  const target = event.target.closest("[data-fav-toggle]");
  if (!target || !els.favoriteList?.contains(target)) return;

  const id = target.getAttribute("data-fav-toggle");
  const photo = state.favorites.find((fav) => fav.id === id);

  if (photo) {
    toggleFavorite(photo);
  }
}

function onCollectionsClick(event) {
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

async function loadResults(query) {
  // Recupere et affiche les images (page d'accueil)
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
  // Bootstrapping : hydrate l'etat, bind les evenements et charge les donnees
  state.favorites = storage.loadFavorites();
  state.collections = storage.loadCollections();
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
  }
  if (els.collectionList) {
    els.collectionList.addEventListener("click", onCollectionsClick);
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
