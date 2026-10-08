# Fiches des stores

Textes et images à saisir à la création des fiches. Les images sont dans [`store/`](store/), régénérées par `node scripts/capture-store.mjs` après `npm run build`. Les archives viennent de `npm run package` (voir [Publication](PUBLICATION.md)).

## Commun

| Champ | Valeur |
| --- | --- |
| Nom | `Cadranote — Cibler pour une IA` (repris du manifeste) |
| Éditeur / développeur | `syl-craft` |
| E-mail de contact | `syl.craft.apps@gmail.com` |
| Site web | `https://github.com/syl-craft/cadranote` |
| Assistance | `https://github.com/syl-craft/cadranote/issues` |
| Règles de confidentialité | `https://github.com/syl-craft/cadranote/blob/main/PRIVACY.md` |
| Catégorie | Outils de développement |
| Langue | Français |
| Prix | Gratuit |

### Résumé (132 caractères au plus)

```text
Sélectionnez un élément et copiez son sélecteur CSS, son chemin HTML et son contexte pour une IA.
```

### Description

```text
Cadranote transforme ce que vous voyez sur une page en consigne précise pour votre assistant IA.

Cliquez sur l’icône ou appuyez sur Alt+C, visez un élément de la page : Cadranote affiche son sélecteur CSS unique, son chemin HTML et un extrait de son code. Décrivez la modification souhaitée, ajoutez si besoin des éléments de référence, puis copiez le tout en un clic pour le coller dans ChatGPT, Claude, Copilot ou tout autre assistant.

Fonctionnalités
• Sélection au survol : chaque élément est encadré avec ses dimensions, un clic le cible.
• Sélecteur CSS unique, chemin HTML et extrait du DOM rendu.
• Votre demande voyage avec l’élément ciblé : l’IA sait exactement de quoi vous parlez.
• Éléments de référence : montrez l’exemple à suivre, numérotés en vert.
• Indices de composants React, Vue et Angular et classes Tailwind, quand la page les expose.
• Panneau déplaçable, thème clair ou sombre selon votre système.

Confidentialité
Tout se passe dans votre navigateur. Cadranote ne collecte aucune donnée, n’envoie rien à un serveur ni à une IA et ne garde aucun historique : le contexte est copié dans votre presse-papiers, et vous choisissez où le coller.

Code source : https://github.com/syl-craft/cadranote
```

### Images

| Image | Fichier | Chrome | Edge | Firefox |
| --- | --- | --- | --- | --- |
| Icône 128 × 128 | `icons/icon128.png` | oui | — | dans le ZIP |
| Logo 300 × 300 | `docs/store/logo-300.png` | — | oui | — |
| Captures 1280 × 800 | `docs/store/screenshot-*.png` | oui | oui | oui |
| Petite vignette 440 × 280 | `docs/store/promo-small.png` | oui | oui | — |
| Grande vignette 1400 × 560 | `docs/store/promo-marquee.png` | facultatif | facultatif | — |

## Chrome Web Store

Chrome interdit aux extensions d’agir sur le Chrome Web Store : cette fiche se remplit à la main.

**Compte** : nom d’éditeur `syl-craft`, e-mail de contact vérifié, statut **non-professionnel** (non-trader) : aucune adresse n’est alors publiée.

**Fiche** : résumé et description ci-dessus, catégorie *Outils de développement*, langue *Français*, images.

**Pratiques de confidentialité** :

| Champ | Valeur |
| --- | --- |
| Objectif unique | `Sélectionner un élément d’une page web et copier son sélecteur, son HTML et une demande sous forme de contexte prêt à coller dans un assistant IA.` |
| Justification `activeTab` | `Accéder à l’onglet actif uniquement lorsque l’utilisateur clique sur l’icône ou appuie sur Alt+C, pour y afficher le panneau de sélection.` |
| Justification `scripting` | `Injecter le panneau de sélection dans l’onglet actif et lire, dans la page, les informations de composants (React, Vue, Angular) de l’élément choisi.` |
| Justification `clipboardWrite` | `Copier le contexte (sélecteur, HTML, demande) dans le presse-papiers lorsque l’utilisateur clique sur un bouton de copie.` |
| Code distant | Non, je n’utilise pas de code distant |
| Données collectées | Aucune case cochée |
| Certifications | Cocher les trois |
| Règles de confidentialité | URL de `PRIVACY.md` |

**Distribution** : gratuite, publique, toutes les régions.

## Firefox (AMO)

| Champ | Valeur |
| --- | --- |
| Archive | `dist/cadranote-firefox.zip`, compatible Firefox pour ordinateur uniquement |
| Code source | Oui : `dist/cadranote-sources.zip` |
| Nom, résumé, description | Communs |
| Catégories | Outils de développement |
| Licence | MIT (fichier `LICENSE`) |
| Notes pour les relecteurs | `Build : Node 22, npm ci, npm run build. Le code bundlé (background.js, content.js, page-inspector.js) est produit par esbuild sans minification à partir de src/. Aucune donnée collectée, aucun code distant.` |

## Edge Add-ons

| Champ | Valeur |
| --- | --- |
| Archive | `dist/cadranote-chrome.zip` |
| Disponibilité | Public, tous les marchés |
| Catégorie | Outils de développement |
| Description | Commune |
| Courte description | Résumé commun |
| Termes de recherche | `sélecteur CSS`, `IA`, `ChatGPT`, `inspecteur`, `HTML`, `développeur`, `prompt` |
| Images | Logo 300 × 300, captures, petite vignette |
| Notes pour la certification | Comme les notes AMO |
