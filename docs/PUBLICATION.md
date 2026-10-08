# Publication sur les stores

Le workflow [Publication](../.github/workflows/publish.yml) publie Cadranote sur le Chrome Web Store, Firefox Add-ons (AMO) et Edge Add-ons avec [publish-browser-extension](https://github.com/syl-craft/publish-browser-extension). Il utilise le fork `syl-craft`, épinglé sur le commit de `fix/chrome-v2-async-upload` (correctifs de l'API Chrome Web Store v2).

## Archives

`npm run package` vérifie le projet, lance les tests puis écrit dans `dist/` :

| Archive | Store |
| --- | --- |
| `cadranote-chrome.zip` | Chrome Web Store et Edge Add-ons |
| `cadranote-firefox.zip` | Firefox : arrière-plan en `background.scripts`, identifiant `cadranote@syl-craft`, Firefox 140 minimum, aucune collecte de données déclarée |
| `cadranote-sources.zip` | Sources pour la relecture AMO (fichiers suivis par Git, hors captures) |

Pour reconstruire depuis les sources : Node 22, `npm ci`, `npm run build`. Les fichiers générés sont `background.js`, `content.js` et `page-inspector.js`.

## Publier une version

1. Monter la version dans `manifest.json` et `package.json` (elles doivent être identiques).
2. Committer, puis pousser un tag : `git tag v1.2.0 && git push origin v1.2.0`.
3. Le workflow vérifie que le tag correspond à la version, construit les archives, les envoie aux stores configurés et crée la release GitHub avec les trois ZIP.

Lancé à la main (onglet Actions, « Publication »), le workflow fait un essai à blanc : il vérifie l'authentification Chrome et Firefox sans rien envoyer. L'outil ne sait pas encore vérifier la clé Edge à blanc : elle n'est contrôlée qu'au premier envoi réel. Décocher `dry-run` envoie réellement la version.

Un store dont l'identifiant n'est pas renseigné est ignoré : on peut ouvrir les stores un par un.

## Premier envoi, à faire à la main

L'outil ne crée pas les fiches : la première version se dépose à la main sur chaque store, avec les archives de `dist/` (ou celles de l'artefact « Cadranote » de la vérification GitHub).

| Store | Où | Archive |
| --- | --- | --- |
| Chrome | [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) | `cadranote-chrome.zip` |
| Firefox | [Developer Hub AMO](https://addons.mozilla.org/developers/) | `cadranote-firefox.zip`, puis `cadranote-sources.zip` quand AMO demande les sources |
| Edge | [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) | `cadranote-chrome.zip` |

Avant l'envoi Firefox, tester l'extension dans Firefox (`about:debugging` › Ce Firefox › Charger un module temporaire › `manifest.json` de l'archive décompressée) : elle n'est vérifiée que par `web-ext lint`.

## Identifiants

La commande interactive de l'outil guide la création de chaque identifiant :

```sh
cd ../publish-browser-extension   # le fork, branche fix/chrome-v2-async-upload
bun install
bun publish-extension init
```

Choisir l'API Chrome **v2** (compte de service). Les valeurs vont dans l'environnement GitHub `stores` du dépôt (Settings › Environments), ce qui permet d'y ajouter une validation manuelle avant publication.

| Nom | Type | Origine |
| --- | --- | --- |
| `CHROME_EXTENSION_ID` | variable | ID de l'extension dans le tableau de bord Chrome |
| `CHROME_PUBLISHER_ID` | variable | ID d'éditeur du compte Chrome Web Store |
| `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | variable | Compte de service Google Cloud (API Chrome Web Store activée), ajouté au compte Chrome Web Store |
| `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | secret | Clé privée de ce compte de service |
| `FIREFOX_EXTENSION_ID` | variable | `cadranote@syl-craft` |
| `FIREFOX_JWT_ISSUER` | secret | AMO › Gérer les clés d'API |
| `FIREFOX_JWT_SECRET` | secret | AMO › Gérer les clés d'API |
| `EDGE_PRODUCT_ID` | variable | Partner Center, page de l'extension |
| `EDGE_CLIENT_ID` | secret | Partner Center › Publish API |
| `EDGE_API_KEY` | secret | Partner Center › Publish API |

Avec la CLI GitHub :

```sh
gh variable set CHROME_EXTENSION_ID --env stores --body "<id>"
gh secret set CHROME_SERVICE_ACCOUNT_PRIVATE_KEY --env stores < cle-privee.pem
```

Puis lancer le workflow à la main avec `dry-run` coché pour vérifier l'authentification Chrome et Firefox.
