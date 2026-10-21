- URL site WEB : https://sae303-groupe5.maman-sambe.fr/ (secours : https://calm-klepon-d01d8b.netlify.app/)
- URL Notebook Observable : https://observablehq.com/@mmi-montbeliard/sae-303-gr-05
- Nom : Sambe
- Prénom : Maman Thilor
- Nom binome : Budniak
- Prénom binome : Ruslana

# Remarques :

**Récit** : une seule page en quatre temps ([`src/pages/index.astro`](src/pages/index.astro)) — contexte (V1), exploration (V2 carte régionale et V3 saisons), révélation (V4), ouverture et conclusion (V5) — et une page [Méthode](src/pages/methode.astro) (sources, calculs, routes d'export, limites, données téléchargeables, lien vers le notebook).

**Routes d'export** :
- V1, V2, V3, V5 → **route A (au build)** : le graphique répond à une question fixe, il est dessiné une fois par Observable Plot côté serveur ([`PlotFigure.astro`](src/components/PlotFigure.astro)) et livré en SVG, sans JavaScript.
- V4 → **route B (chez le lecteur)** : le lecteur choisit une année, le graphique se redessine dans le navigateur ([`VisualisationV4.astro`](src/components/VisualisationV4.astro)).

**Visualisations écrites en fonctions** : chaque composant (`graphiqueV2(stations, contours)`, `graphiqueV3(donnees)`…) reçoit ses données en paramètre, comme dans le notebook. Titres et sous-titres sont calculés à partir des données (aucun chiffre écrit à la main).

**Données préfiltrées** ([`src/assets/data/`](src/assets/data/)) : uniquement les colonnes utiles, valeurs arrondies à deux décimales, dénominateur conservé ; aucun fichier brut du défi dans le dépôt. Les contours de la carte sont limités aux 8 départements de Bourgogne-Franche-Comté avec des coordonnées arrondies (≈ 26 Ko).

**Carte V2** : carte de points (une station = un point, pas de valeur inventée entre les stations), palette séquentielle en 4 classes de 0,1 °C, AERO-MTBL et DORANS mises en évidence, infobulle native au survol.

**Accessibilité et responsive** : `<figure>`/`<figcaption>` générés par Plot, `ariaLabel` sur chaque graphique, lien d'évitement, navigation adaptée au mobile, thème clair/sombre, graphiques qui s'adaptent à la largeur de l'écran.
