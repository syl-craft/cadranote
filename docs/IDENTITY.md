# Cadranote

**De la page à la consigne.**

Le nom associe le cadrage d’un élément à la note qui décrit le changement attendu. Le produit rassemble une cible, une demande et des références dans un contexte à copier pour une IA.

## Direction visuelle

La référence choisie est [Digital Banking de UI UX Pro Max](https://uupm.cc/demo/digital-banking). Le panneau en reprend les fonds bleu nuit, les surfaces ardoise, les arrondis et les actions bleu vif. La cible apparaît dans un bloc bleu ; les compléments gardent leur code vert.

| Rôle | Couleur |
| --- | --- |
| Fond | `#0b1628` |
| Surface secondaire | `#1d2c43` |
| Texte principal | `#f1f5fc` |
| Texte secondaire | `#b2c1d6` |
| Action principale et cadre de sélection | `#0866eb` |
| Focus et accents | `#72b5ff` |
| Compléments et bouton d’ajout | `#36c88d` |

La typographie utilise la police sans empattement du système. Les sélecteurs et dimensions utilisent une police monospace. Aucune police distante n’est chargée. Le template sert de référence visuelle ; ses données, sa marque et ses fonctionnalités bancaires ne font pas partie de l’extension.

## Logo

Le monogramme C bleu entoure deux lignes de note sur un fond bleu nuit. Il associe le cadrage à la consigne, avec une silhouette lisible aux petites tailles. Le SVG source est dans `src/ui/logo.svg` ; `npm run icons` produit les quatre tailles Chrome.

## Interface

La cible, la demande et l’ajout de références constituent le parcours principal. Les copies spécialisées et le changement de cible sont regroupés dans une section dépliable. La copie du contexte reste visible dans un pied de panneau séparé de la zone défilante.

Les commandes utilisent des SVG au trait. Les contrôles ont une hauteur minimale de 40 pixels, les textes d’aide de 12 pixels. Les interactions clavier et la sélection sont immédiates. Les retours de survol sont réservés aux pointeurs précis ; les mouvements sont supprimés avec la préférence de réduction des animations. Le retrait d’un complément conserve le focus dans la liste, puis sur le bouton d’ajout quand elle est vide.

Les passes de finition s’appuient sur [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Emil Design Engineering](https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng) et [Impeccable](https://github.com/pbakaus/impeccable).

## Nom

Le 24 septembre 2026, les recherches exactes « Cadranote », « Cadranote extension chrome » et `site:chromewebstore.google.com "Cadranote"` n’ont renvoyé aucun résultat. Cette recherche ne constitue pas une vérification de marque ou de disponibilité juridique.
