Set objShell = CreateObject("WScript.Shell")

' Get the directory of the script
Dim scriptDir
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Change to the script's directory
objShell.CurrentDirectory = scriptDir

' Install dependencies
objShell.Run "npm install", 1, True

' Start the development server
objShell.Run "npm run dev", 1, False

' Wait for the server to start
WScript.Sleep 5000

' Open the application in the default browser
objShell.Run "http://localhost:5173/"
