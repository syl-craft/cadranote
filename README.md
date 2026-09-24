# Cadranote

<img src="src/ui/logo.svg" alt="Cadranote" width="64" height="64" />

Sélectionnez des éléments sur une page et copiez leur contexte pour une IA : sélecteurs, HTML, demande et éléments de référence.

![Une cible en bleu et deux références en vert](docs/images/example-cadranote.png)

## Installer

Avec Node.js 22 et Chrome :

```sh
npm ci
npm run build
```

Dans `chrome://extensions`, activez **Mode développeur**, cliquez sur **Charger l’extension non empaquetée** et sélectionnez le dossier du projet.

## Utiliser

1. Cliquez sur l’extension ou appuyez sur **Alt+Maj+C**.
2. Sélectionnez l’élément principal et rédigez votre demande.
3. Ajoutez des éléments de référence si nécessaire.
4. Cliquez sur **Copier le contexte pour une IA**, puis collez-le dans votre assistant.

**Changer de cible** efface les éléments en conservant la demande. Les copies du contenu, du HTML et du sélecteur concernent uniquement le principal. **Échap** annule un ajout ou ferme le panneau.

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
| `npm run package` | Vérifications et ZIP sous Windows/PowerShell |
| `npm run icons` | Générer les icônes Chrome |
| `npm run docs:capture` | Actualiser les captures |

GitHub Actions vérifie chaque push et fournit le ZIP en artefact. Les bundles générés ne sont pas versionnés.

[Architecture](ARCHITECTURE.md) · [Identité visuelle](docs/IDENTITY.md) · [Page de démonstration](docs/demo.html)
