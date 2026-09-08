Set objShell = CreateObject("WScript.Shell")
Dim projectPath
projectPath = "c:\Users\ADMIN\Documents\trae_projects\GARAGE"

' Commandes pour le backend et le frontend
' On utilise /c pour que la fenêtre cmd se ferme après avoir lancé la commande
Dim backendCommand
backendCommand = "cmd.exe /c cd /d " & projectPath & " && npm run server:dev"

Dim frontendCommand
frontendCommand = "cmd.exe /c cd /d " & projectPath & " && npm install && npm run client:dev"

' Exécute les commandes en arrière-plan (le '0' cache la fenêtre)
' Le 'False' indique au script de ne pas attendre la fin de la commande
objShell.Run backendCommand, 0, False
objShell.Run frontendCommand, 0, False

' Pause de 10 secondes pour laisser le temps aux serveurs de démarrer
WScript.Sleep 10000

' Lance le navigateur une fois que les serveurs sont probablement prêts
objShell.Run "http://localhost:5173"

Set objShell = Nothing