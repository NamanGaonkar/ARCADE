!macro customInstall
  ${if} ${FileExists} "$INSTDIR\resources\app-icon.ico"
    CreateShortCut "$DESKTOP\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\resources\app-icon.ico" 0
    CreateShortCut "$SMPROGRAMS\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\resources\app-icon.ico" 0
  ${else}
    CreateShortCut "$DESKTOP\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\ArcadeX.exe" 0
    CreateShortCut "$SMPROGRAMS\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\ArcadeX.exe" 0
  ${endIf}
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\arcadex-updater"
    RMDir /r "$LOCALAPPDATA\hydralauncher-updater"
  ${endIf}
!macroend
