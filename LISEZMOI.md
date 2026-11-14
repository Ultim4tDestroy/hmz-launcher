# HMZ Launcher

Tous tes jeux au même endroit : jeux PC (Steam, Epic ou ajoutés à la main), DS, 3DS, Switch et Switch 2.

## Installer HMZ

Télécharge `HMZ-Launcher-Setup-x.y.z.exe` depuis la page [Releases](../../releases/latest) et lance-le. HMZ se met ensuite à jour tout seul.

## Mise en route

1. **Émulateurs** : ouvre la page Émulateurs et clique sur Installer pour chaque console. HMZ télécharge la dernière version depuis la page officielle et l'installe dans `C:\Users\<toi>\HMZ\Emulateurs`.

   | Console  | Émulateur | Remarque |
   |----------|-----------|----------|
   | DS       | melonDS   | Aucun fichier système nécessaire. |
   | 3DS      | Azahar    | Les jeux doivent être déchiffrés. |
   | Switch   | Eden      | Demande tes clés (prod.keys) et ton firmware. |
   | Switch 2 | Lichii    | Très expérimental. Demande aussi tes clés et ton firmware. |

2. **Clés et firmware Switch** : sur la carte d'Eden ou de Lichii, utilise « Ajouter prod.keys » et « Installer » (firmware). Ces fichiers doivent être extraits de ta propre console.
3. **Tes jeux** : dépose-les dans les dossiers de `C:\Users\<toi>\HMZ\Jeux` (DS, 3DS, Switch, Switch 2). Les sous-dossiers sont aussi parcourus. Tu peux ajouter d'autres dossiers depuis la page Émulateurs.

Les jeux, les clés et le firmware ne sont pas fournis. Télécharge les émulateurs uniquement depuis HMZ ou leurs pages officielles : de faux sites « Lichii » ont déjà distribué des virus.

## Ce que fait HMZ

- **Accueil** : la grande image du jeu choisi, avec Jouer. Clique sur un jeu dans une rangée pour l'afficher en grand, double-clique pour le lancer.
- **Bibliothèque** : tous tes jeux, avec filtres par console, tri et recherche.
- **Fiche d'un jeu** : temps de jeu, dernière partie, sessions, graphique des 30 derniers jours. Pour les jeux Switch, choisis l'émulateur (Eden ou Lichii).
- **Statistiques** : aujourd'hui, 7 jours, 30 jours, série de jours, top du mois et temps par console.
- **Mode TV** : plein écran à la manette, dans le style d'une console. Bouton **Mode TV**, touche **F11** ou bouton **Start** de la manette.
- **Temps de jeu automatique** : compté pour les jeux émulés et pour les jeux Steam ou Epic, même lancés depuis leur launcher, tant que HMZ est ouvert. Le temps de jeu Steam existant est repris.

## Manette

Toutes les manettes marchent : Xbox, PlayStation (DualShock 4, DualSense), Switch Pro et manettes génériques.

- **Quitter un jeu** : maintiens Select + Start 1 seconde (Xbox : View + Menu · PlayStation : Share/Create + Options · Switch : − et +). HMZ revient tout seul.
- **Bouton Xbox / PS / Home** : quand aucun jeu ne tourne, ouvre HMZ en mode TV.
- **Dans les émulateurs** : la manette est réglée automatiquement dans melonDS. Pour Eden, Lichii et Azahar, clique une fois sur « Configurer la manette » sur leur carte.

## Réglages automatiques

À l'installation, chaque émulateur reçoit des réglages adaptés à ta carte graphique (Vulkan, résolution), se ferme sans demander de confirmation, et Eden/Lichii connaissent tes dossiers de jeux (pour trouver les mises à jour et DLC rangés à côté). Bouton « Réglages conseillés » pour les réappliquer.

## Sauvegardes

Après chaque partie, tes sauvegardes sont copiées dans `HMZ\Sauvegardes` (15 dernières par émulateur). Tu peux choisir un dossier OneDrive dans Paramètres.

## Étagère

Tes jeux sont rangés comme de vrais boîtiers : rouge pour la Switch et la Switch 2, blanc pour la 3DS, noir pour la DS, métal avec la couleur du launcher pour le PC. Survole un boîtier pour le sortir de l'étagère, clique pour le retourner et voir tes stats au dos, double-clique pour jouer. La bibliothèque propose aussi une grille et une liste.

## Raccourcis

| Bureau | Action |
|--------|--------|
| Ctrl+K | Rechercher un jeu ou une action (thème, mode TV, pages…) |
| Ctrl+1 à 5 | Accueil, Bibliothèque, Émulateurs, Statistiques, Paramètres |
| ? | Liste des raccourcis |
| Espace | Retourner le boîtier sélectionné |
| ← → puis Entrée | Choisir et lancer un jeu sur l'accueil |
| Clic droit | Options du jeu |
| F11 | Mode TV |

| Mode TV | Manette | Clavier |
|---------|---------|---------|
| Choisir | Croix ou stick gauche | ← → |
| Catégorie | LB / RB | ↑ ↓ ou Page préc. / Page suiv. |
| Jouer | A | Entrée |
| Favori | Y | F |
| Options | X ou Start | M |
| Quitter | B | Échap |

## Images

Les jeux Steam utilisent les images de Steam, les jeux DS et 3DS celles de la base libretro. Pour de belles jaquettes, fonds et logos sur les jeux Switch et Switch 2, ajoute une clé **SteamGridDB** gratuite dans Paramètres (https://www.steamgriddb.com/profile/preferences/api). Clic droit sur un jeu pour choisir ta propre image.
