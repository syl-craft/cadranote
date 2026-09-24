# Architecture

Extension Chrome Manifest V3, TypeScript strict et esbuild.

## Organisation

| Dossier dans `src/` | Responsabilité |
| --- | --- |
| `domain/` | Types et machine à états pure |
| `application/` | Coordination et reprise de session |
| `dom/` | Sélecteurs, captures et références DOM |
| `selection/`, `highlights/` | Sélection et surlignage |
| `inspection/` | Adaptateurs React, Vue, Angular et analyse Tailwind |
| `ui/` | Panneau dans un Shadow DOM fermé |
| `export/`, `platform/` | Format du contexte et presse-papiers |
| `entrypoints/` | Activation et injection Chrome |

Point d’entrée métier : [session-machine.ts](src/domain/session-machine.ts). Le [contrôleur](src/application/session-controller.ts) relie les transitions aux adaptateurs ; le domaine ne dépend ni du DOM ni de Chrome.

## Session

États : `selecting-primary`, `editing-request`, `selecting-supplement`, `closed`.

- Un principal, une demande et des compléments sans doublons.
- Ajouter ou retirer un complément conserve le principal et la demande.
- Changer de cible vide les éléments, mais conserve la demande.
- Le contexte IA comprend tous les éléments ; les copies individuelles concernent le principal.

Les instantanés sont sérialisables ; `ElementRegistry` conserve les références DOM séparément. Les compléments restent figés à leur ajout, le HTML du principal est actualisé à la copie. Une réinjection reprend la session ; la fermeture libère ses ressources.

## Inspection et isolation

`content.js` gère le panneau dans le contexte isolé de Chrome. Le service worker injecte `page-inspector.js` dans le monde `MAIN` pour lire les métadonnées des composants.

Les réponses sont validées, bornées et affichées avec `textContent`. Aucun état ou prop de composant n’est extrait. Les réponses tardives ne restaurent pas une cible supprimée. Après 1,8 seconde sans résultat, la copie reste disponible sans inspection.

Les diagnostics restent dans le panneau. L’export IA contient uniquement les composants et classes relevés.

## Conventions

- Noms explicites, fonctions courtes, données partagées en `readonly`.
- Commentaires limités aux informations que le code n’exprime pas déjà.
- Identifiants en anglais ; interface et documentation en français.
- HTML, CSS et logique séparés ; formatage avec Prettier.

Les tests couvrent les transitions et les parcours dans Chrome. Les métadonnées de frameworks sont testées sur des cas représentatifs, sans garantie pour toutes les versions. Le chargement réel de l’extension reste à vérifier manuellement.
