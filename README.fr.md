# Cadranote

<img src="src/ui/logo.svg" alt="Cadranote" width="64" height="64" />

[English](README.md) · Français

Sélectionnez des éléments sur une page et copiez leur contexte pour une IA : sélecteurs, HTML, demande et éléments de référence.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/01-target-fr.gif" alt="Démonstration : Alt+C ouvre le panneau, le survol encadre les éléments, un clic sélectionne le bouton et affiche son sélecteur CSS unique" width="960">

## Installer

Avec Node.js 22 et Chrome :

```sh
npm ci
npm run build
```

Dans `chrome://extensions`, activez **Mode développeur**, cliquez sur **Charger l’extension non empaquetée** et sélectionnez le dossier du projet.

## Utiliser

1. Cliquez sur l’extension ou appuyez sur **Alt+C**.
2. Sélectionnez l’élément principal et rédigez votre demande.
3. Ajoutez des éléments de référence si nécessaire.
4. Cliquez sur **Copier le contexte pour une IA**, puis collez-le dans votre assistant.

**Changer de cible** efface les éléments en conservant la demande. Les copies du contenu, du HTML et du sélecteur concernent uniquement le principal. **Échap** annule un ajout ou ferme le panneau.

Pour atteindre un élément masqué par le panneau, faites glisser son en-tête. Le bouton à double flèche permet aussi de le replacer en haut ou en bas à droite.

Extension déjà installée : si Chrome conserve l’ancien raccourci, attribuez **Alt+C** dans `chrome://extensions/shortcuts`.

## En images

**Décrire** — la demande accompagne l’élément ciblé.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/02-describe-fr.gif" alt="Démonstration : la demande est saisie dans le champ Votre demande du panneau" width="960">

**Référencer** — **Ajouter un élément** numérote les références en vert.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/03-reference-fr.gif" alt="Démonstration : deux boutons sont ajoutés comme éléments supplémentaires, encadrés en vert et numérotés 1 et 2" width="960">

**Copier** — un seul message à coller dans votre assistant.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/04-copy-fr.gif" alt="Démonstration : Copier le contexte pour une IA, puis collage du contexte complet dans un assistant IA" width="960">

**Inspecter** — composants et classes, quand la page les expose.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/05-inspect-fr.gif" alt="Démonstration : la section Composants et styles affiche la hiérarchie de composants et les classes Tailwind" width="960">

**Garder la main** — le panneau se déplace, rien ne quitte le navigateur.

<img src="https://raw.githubusercontent.com/syl-craft/cadranote-media/main/videos/06-panel-fr.gif" alt="Démonstration : le panneau est glissé par son en-tête pour découvrir une carte masquée, puis mention Copie locale, aucun envoi" width="960">

## À savoir

- React, Vue et Angular : informations de composants lorsqu’elles sont accessibles. Tailwind : indices basés sur les classes. La détection reste limitée en production.
- Shadow DOM ouvert pris en charge ; contenu des iframes et pages protégées de Chrome exclus.
- Traitement local, sans envoi à une IA ni historique. Fermer le panneau ou recharger la page efface la session.
- Le contenu copié provient de la page : vérifiez-le avant de le partager.

## Développer

Sources en TypeScript dans `src/`. Après modification : `npm run build`, puis actualisez l’extension et rechargez la page.

| Commande | Usage |
| --- | --- |
| `npm run check` | Types et formatage |
| `npm test` | Tests de session et navigateur |
| `npm run package` | Vérifications, puis ZIP Chrome/Edge, Firefox et sources dans `dist/` |
| `npm run icons` | Générer les icônes Chrome |
| `npm run docs:capture` | Actualiser les captures |
| `node tools/motion-demo/render.mjs` | Rendre les démonstrations animées |

GitHub Actions vérifie chaque push et fournit les ZIP en artefact. Un tag `vX.Y.Z` publie sur les stores Chrome, Firefox et Edge : voir [Publication](docs/PUBLICATION.md). Les bundles générés ne sont pas versionnés. Les démonstrations sont rendues dans le dépôt [cadranote-media](https://github.com/syl-craft/cadranote-media), cloné à côté de celui-ci.

[Architecture](ARCHITECTURE.md) · [Identité visuelle](docs/IDENTITY.md) · [Page de démonstration](docs/demo.html)
