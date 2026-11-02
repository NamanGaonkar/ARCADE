!macro customInstall
  Delete "$DESKTOP\ArcadeX.lnk"
  Delete "$SMPROGRAMS\ArcadeX.lnk"
  ${if} ${FileExists} "$INSTDIR\resources\app-icon.ico"
    CreateShortCut "$DESKTOP\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\resources\app-icon.ico" 0
    CreateShortCut "$SMPROGRAMS\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\resources\app-icon.ico" 0
  ${else}
    CreateShortCut "$DESKTOP\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\ArcadeX.exe" 0
    CreateShortCut "$SMPROGRAMS\ArcadeX.lnk" "$INSTDIR\ArcadeX.exe" "" "$INSTDIR\ArcadeX.exe" 0
  ${endIf}
  System::Call 'shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\arcadex-updater"
    RMDir /r "$LOCALAPPDATA\hydralauncher-updater"
  ${endIf}
!macroend
