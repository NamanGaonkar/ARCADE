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

  WriteRegStr HKCU "Software\Classes\hydra" "" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydra" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\hydra" "FriendlyTypeName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydra" "ApplicationName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydra\DefaultIcon" "" '"$INSTDIR\ArcadeX.exe",0'
  WriteRegStr HKCU "Software\Classes\hydra\shell\open\command" "" '"$INSTDIR\ArcadeX.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\hydralauncher" "" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydralauncher" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\hydralauncher" "FriendlyTypeName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydralauncher" "ApplicationName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\hydralauncher\DefaultIcon" "" '"$INSTDIR\ArcadeX.exe",0'
  WriteRegStr HKCU "Software\Classes\hydralauncher\shell\open\command" "" '"$INSTDIR\ArcadeX.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\arcadex" "" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\arcadex" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\arcadex" "FriendlyTypeName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\arcadex" "ApplicationName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\arcadex\DefaultIcon" "" '"$INSTDIR\ArcadeX.exe",0'
  WriteRegStr HKCU "Software\Classes\arcadex\shell\open\command" "" '"$INSTDIR\ArcadeX.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Applications\ArcadeX.exe" "FriendlyAppName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\Applications\ArcadeX.exe" "ApplicationName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\Applications\electron.exe" "FriendlyAppName" "ArcadeX"
  WriteRegStr HKCU "Software\Classes\Applications\electron.exe" "ApplicationName" "ArcadeX"

  System::Call 'shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\arcadex-updater"
    RMDir /r "$LOCALAPPDATA\hydralauncher-updater"
  ${endIf}
!macroend
