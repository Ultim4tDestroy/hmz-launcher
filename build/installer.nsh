; Désinstallation : propose de supprimer aussi les données de HMZ.
; Rien n'est demandé pendant une mise à jour ou une désinstallation silencieuse.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    IfSilent hmz_done
    MessageBox MB_YESNO|MB_ICONQUESTION "Supprimer aussi tes réglages et ton temps de jeu ?$\r$\n$\r$\n($APPDATA\HMZ Launcher)" IDNO hmz_skip_settings
      RMDir /r "$APPDATA\HMZ Launcher"
    hmz_skip_settings:
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "Supprimer aussi le dossier $PROFILE\HMZ ?$\r$\n$\r$\nIl contient tes émulateurs, tes clés, tes sauvegardes de parties et les jeux que tu y as rangés. Cette suppression est définitive." IDNO hmz_done
      RMDir /r "$PROFILE\HMZ"
    hmz_done:
  ${endIf}
!macroend
