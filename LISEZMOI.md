# HMZ Launcher 2.0

Tous tes jeux au même endroit : jeux PC (Steam, Epic ou ajoutés à la main), DS, 3DS, Switch et Switch 2.

## Lancer HMZ

1. Installe **Node.js** (version LTS) depuis https://nodejs.org si tu ne l'as pas.
2. Double-clique sur **Lancer.bat**. La première fois, l'installation prend 1 à 2 minutes.

Pour avoir un vrai programme avec un raccourci sur le Bureau, double-clique sur **Creer-le-exe.bat**. Le dossier `dist` contiendra un installateur et une version portable.

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

## Raccourcis

| Bureau | Action |
|--------|--------|
| Ctrl+K | Rechercher un jeu (Entrée pour jouer, Maj+Entrée pour la fiche) |
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
