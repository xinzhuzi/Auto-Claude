; Custom NSIS installer script
; Fixes: 1) Long path deletion  2) Incomplete uninstall causing reinstall loop

; customInit runs in .onInit BEFORE any electron-builder install logic
!macro customInit
  ; Get the target install directory
  ; $INSTDIR is already set at this point based on registry or default

  ; Force clean the install directory BEFORE electron-builder does anything
  IfFileExists "$INSTDIR\*.*" 0 skipClean

    DetailPrint "Cleaning previous installation..."

    ; Create temp empty dir for robocopy trick
    CreateDirectory "$TEMP\__clean_install__"

    ; Clean deep directories first (long paths)
    IfFileExists "$INSTDIR\resources\code-server" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources\code-server" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\resources\backend" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources\backend" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\resources\python-site-packages" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources\python-site-packages" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\resources\python" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources\python" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\resources\app.asar.unpacked" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources\app.asar.unpacked" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\resources" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\resources" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    IfFileExists "$INSTDIR\locales" 0 +2
      nsExec::ExecToLog 'robocopy "$TEMP\__clean_install__" "$INSTDIR\locales" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

    ; Clean temp
    RMDir "$TEMP\__clean_install__"

    ; Force remove entire directory
    RMDir /r "$INSTDIR"

    DetailPrint "Previous installation cleaned."

  skipClean:
!macroend

!macro customInstall
  ; Nothing needed - directory already cleaned in customInit
!macroend

!macro customUnInstall
  ; Create temp empty directory for robocopy
  CreateDirectory "$TEMP\__empty_dir__"

  ; Clean deep directories with long paths
  IfFileExists "$INSTDIR\resources\code-server" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources\code-server" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\resources\backend" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources\backend" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\resources\python-site-packages" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources\python-site-packages" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\resources\python" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources\python" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\resources\app.asar.unpacked" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources\app.asar.unpacked" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\resources" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\resources" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  IfFileExists "$INSTDIR\locales" 0 +2
    nsExec::ExecToLog 'robocopy "$TEMP\__empty_dir__" "$INSTDIR\locales" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP'

  ; Clean temp
  RMDir "$TEMP\__empty_dir__"

  ; Force delete entire install directory
  RMDir /r "$INSTDIR"
!macroend
