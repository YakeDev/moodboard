# MoodBoard – Galerie d'inspiration créative

MoodBoard est une application web moderne qui permet de rechercher, organiser et sauvegarder des images inspirantes grâce à l'API Unsplash. Pensée pour les designers, créatifs et étudiants, elle offre une expérience fluide, responsive et agréable, avec un système avancé de favoris et de collections sauvegardés via LocalStorage.

## Objectif du projet
Projet réalisé dans le cadre du TP de Web Avancé (Master 2, UDBL), visant à mettre en pratique :
- L'utilisation d'une API externe (Unsplash API)
- Les fondamentaux front-end modernes (HTML, CSS, JavaScript ES6+)
- Le design responsive (Flexbox / CSS Grid)
- La gestion de données côté navigateur (LocalStorage)
- Le versionnement Git/GitHub et le déploiement sur GitHub Pages

## Fonctionnalités principales
- Recherche d'images via l'API Unsplash
- Affichage en grille responsive et esthétique
- Ajout et suppression des favoris, organisés dans des collections (une collection "Par défaut" fournie)
- Création, renommage et suppression de collections (sauf "Par défaut")
- Sauvegarde automatique des favoris et collections dans LocalStorage
- Lightbox avancée : affichage en grand, navigation clavier (suivant/précédent), fermeture via bouton/ESC/clic en dehors
- Gestion claire des états vides (aucun résultat, aucune collection, aucune image dans une collection)
- Adaptation mobile, tablette et desktop

## Nouveautes v1.2
- Grille des collections corrigee (plus d'affichage en colonne unique) et hauteur de page calee sur 100vh - navigation.
- Lightbox centre l'image en respectant son format (portrait/paysage) avec contraintes max viewport.
- Boutons actions (favoris/collections) masques par defaut et reveles au survol ou focus clavier.
- Barre de recherche mobile forcee a 100% sans scroll horizontal parasite; overflow-x global desactive.
- Synchronisation dynamique de la variable CSS `--nav-height` avec le header; badges followers retires des cartes.

## User stories (vanilla HTML/CSS/JS)
- L'utilisateur saisit un mot-clé et obtient une grille d'images Unsplash (minimum 20 résultats par requête), avec loader et messages d'état.
- L'utilisateur visualise une grille responsive qui conserve les ratios d'image sur tous les écrans.
- L'utilisateur ajoute une image à une collection. Une collection "Par défaut" existe déjà. Il peut choisir ou créer une collection au moment de l'ajout.
- L'utilisateur crée, renomme ou supprime ses collections (sauf "Par défaut"). Les noms doivent être valides et uniques.
- L'utilisateur retrouve ses favoris et collections après rechargement grâce au LocalStorage.
- Un clic sur une image ouvre une lightbox avec navigation au clavier et fermeture accessible.
- Les états vides sont clairs et contextualisés.

## Plan de livraison (ordre recommandé)
1. Structure de base et initialisation LocalStorage (collections/favoris) avec collection "Par défaut".
2. Recherche Unsplash + affichage en grille + loader + gestion des erreurs.
3. Ajout/suppression des favoris par collection avec interface de sélection/création.
4. Vue des favoris par collection + gestion des états vides + gestion complète des collections.
5. Lightbox + navigation clavier.
6. Responsive et finitions visuelles.
7. Défilement infini (infinite scroll) avec protections anti-requêtes concurrentes + fallback "Charger plus".
8. Mode sombre/clair persistant.
9. Collections avancées : multi-collections, vue détaillée.
10. Suggestions automatiques basées sur les collections (optionnel) + Auth Unsplash OAuth (optionnel).

## Stack technique
- HTML5 – Structure sémantique
- CSS3 – Flexbox, CSS Grid, variables CSS, responsive design
- JavaScript ES6+ – Modules, async/await, Fetch API
- Unsplash API – Recherche d'images libres
- LocalStorage – Persistance des données
- GitHub Pages – Déploiement

## Structure du projet
```
/ (racine)
|-- index.html
|-- style.css
|-- script.js
|-- config.js        <- contient la clé API (NE PAS publier)
|-- .gitignore
|-- README.md
```

### Exemple de `.gitignore`
```
config.js
```

## Configuration de l'API Unsplash
1. Créer un compte développeur : https://unsplash.com/developers
2. Créer une nouvelle application
3. Récupérer votre Access Key
4. Créer un fichier `config.js` à la racine :
```js
const UNSPLASH_ACCESS_KEY = "VOTRE_CLE_ICI";
```
Ne jamais commiter ce fichier.

## Lancer l'application en local
1. Cloner le dépôt :
```
git clone https://github.com/votre-nom/moodboard.git
```
2. Ajouter votre fichier `config.js` (non fourni)
3. Ouvrir `index.html` dans un navigateur moderne

## Déploiement sur GitHub Pages
1. Aller dans **Settings > Pages**
2. Choisir la branche `main` et le dossier `/root`
3. Enregistrer
4. L'application sera disponible via :
```
https://ek-moodboard.vercel.app/
```

## Fonctionnement global
### Recherche
- L'utilisateur saisit un mot-clé
- `fetchImages()` interroge l'API Unsplash
- La grille s'affiche, accompagnée du loader ou d'un message d'absence de résultats

### Collections et favoris
- Chaque image peut être ajoutée ou retirée d'une collection
- "Par défaut" est toujours disponible
- Ajout/suppression directe, interface de sélection ou création d'une collection
- Persistance via LocalStorage

### Lightbox
- Clic sur une image → affichage en grand
- Navigation via flèches du clavier
- Fermeture via bouton, ESC ou clic sur le fond

## Améliorations futures (Roadmap)
- Bouton "Charger plus" de secours si l'infinite scroll est bloqué (offline/lent).
- Export/import des collections (JSON) et partage de board en lecture seule.
- Filtres rapides supplémentaires (orientation, couleurs) côté client.
- Optimisation perfs : déduplication de requêtes, gestion fine des loaders.
- Tests d'intégration basiques (render de la grille, lightbox, persistance LocalStorage).

## Auteur
Eric Kayembe (MoodBoard)  
Master 2 Communication & Multimédia – Université Don Bosco de Lubumbashi

## Licence
Projet académique – libre d'utilisation à but éducatif.

## Remerciements
- Unsplash pour son API ouverte et de haute qualité
- UDBL & le cours de Web Avancé pour le cadre pédagogique
