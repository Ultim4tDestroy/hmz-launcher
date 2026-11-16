# Protocole de publication de HMZ

But : **aucune version cassée ne doit arriver sur un PC.** Chaque étape est automatique ; un échec à n'importe laquelle arrête tout.

## Avant d'envoyer une modification

```
npm run verifier
```

Lance, dans l'ordre, et s'arrête au premier échec :

1. **Vérification du code** (ESLint) : nom inconnu, variable utilisée avant d'exister (cause du bug de la 2.11.0), clé en double, code inatteignable…
   Les fichiers de l'interface sont vérifiés **dans l'ordre où le navigateur les charge** : un fichier ne peut pas utiliser au chargement ce qu'un fichier chargé après lui déclare.
2. **Logique** : recherche des jeux, jaquettes, émulateurs, boutiques.
3. **Mises à jour et versions**.
4. **Démarrage** (`boot.js`).
5. **Démarrage simulé du programme principal** : toutes les fonctions doivent être enregistrées, aucun plantage noté, le test doit aller jusqu'au bout (une erreur avalée = échec).
6. **Mode secours** : une version installée qui plante doit chercher, télécharger et installer seule la version corrigée.
7. **Parcours complet de l'interface** dans un vrai navigateur : aucune erreur affichée.

Les mêmes vérifications tournent sur GitHub à **chaque** modification (onglet Actions › Tests), ainsi qu'un vrai démarrage de HMZ sous Windows (Actions › Vérifier le démarrage).

## Publier une version

1. Augmenter le numéro de version avec `npm version X.Y.Z --no-git-tag-version`, jamais à la main ni par rechercher-remplacer (`package-lock.json` contient d'autres paquets qui ont les mêmes numéros). Une version déjà publique n'est jamais republiée.
2. Lancer **Actions › Publier une version**. Le workflow enchaîne :
   1. toutes les vérifications ci-dessus ;
   2. démarrage réel du code sous Windows ;
   3. fabrication de l'installateur, déposé dans une version **brouillon** (invisible : les mises à jour automatiques ne la voient pas) ;
   4. **installation silencieuse de cet installateur précis**, puis lancement du HMZ installé. Il faut, sous 40 secondes :
      - une fenêtre ouverte,
      - « Fenêtre affichée » **et** « Interface prête » dans le journal, avec **le bon numéro de version**,
      - aucune ligne PLANTAGE, SECOURS ou erreur de l'interface ;
   5. seulement alors, la version devient publique.
3. En cas d'échec, le brouillon et son tag sont supprimés : personne ne reçoit rien.

## Si une version cassée passait quand même

- HMZ ne reste jamais ouvert en arrière-plan sans fenêtre : une erreur avant l'ouverture de la fenêtre déclenche le **mode secours**.
- Le mode secours cherche la dernière version sur GitHub, la télécharge et l'installe, puis HMZ redémarre. L'utilisateur n'a rien à faire, il suffit de publier la correction.
- S'il n'existe pas encore de correction, un message clair indique quoi faire et où se trouve le journal.
- Paramètres › Aide › **Signaler un problème** prépare un rapport GitHub avec la version et les dernières erreurs.

## Le journal

`%APPDATA%\HMZ Launcher\hmz.log`, à ouvrir depuis Paramètres › Aide › Journal d'erreurs.
