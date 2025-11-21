const state = {
  query: "",
  results: [
    {
      id: "cup",
      src: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=600&q=80",
      alt: "Personne tenant une tasse fumante",
      author: "Walter Brown",
      followers: 102,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "watermelon",
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
      alt: "Fille avec pastèque",
      author: "Sonia Narang",
      followers: 210,
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "bottle",
      src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
      alt: "Bouteille d'eau sur fond turquoise",
      author: "Skyler White",
      followers: 480,
      avatar: "https://randomuser.me/api/portraits/men/28.jpg",
    },
  ],
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
};

function renderResults(items) {
  els.resultsGrid.innerHTML = items
    .map(
      (item) => `
        <article class="card" role="listitem">
          <img src="${item.src}" alt="${item.alt}">
          <div class="card-footer">
            <img class="avatar" src="${item.avatar}" alt="${item.author}">
            <div class="meta">
              <strong>${item.author}</strong>
              <span>${item.followers} abonnés</span>
            </div>
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
        <div class="collection-item">
          <span>${collection.name}</span>
          <span class="badge">${collection.count} visuels</span>
        </div>
      `
    )
    .join("");
}

function renderFavorites(favorites) {
  els.favoriteList.innerHTML = favorites
    .map(
      (favorite) => `
        <div class="favorite-item">
          <div>
            <strong>${favorite.name}</strong>
            <div class="muted">${favorite.meta}</div>
          </div>
          <span class="badge">${favorite.count}</span>
        </div>
      `
    )
    .join("");
}

function updateStatus(text) {
  els.resultStatus.textContent = text;
}

function handleSearch(event) {
  event.preventDefault();
  state.query = els.searchInput.value.trim();
  const text = state.query
    ? `Résultats pour « ${state.query} » (données statiques pour le moment).`
    : "Tapez un mot-clé pour lancer une recherche.";
  updateStatus(text);
  renderResults(state.results);
}

function init() {
  updateStatus("Tapez un mot-clé pour lancer une recherche.");
  renderResults(state.results);
  renderCollections(state.collections);
  renderFavorites(state.favorites);
  els.searchForm.addEventListener("submit", handleSearch);
}

document.addEventListener("DOMContentLoaded", init);
