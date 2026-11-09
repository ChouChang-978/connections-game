# Connections Game

A personal Connections-style word game.

## Run locally

Double-click `Start Connections Game.command`.

## Dictionary

For local Merriam-Webster lookup, add `MW_COLLEGIATE_API_KEY` to `.env.local`. GitHub Pages uses Wiktionary.

## Activity log

Events are saved in this browser. Click **Download Log** in the game to save a JSON file with UTC timestamps and time since **Start Game**. The log records page and game actions without identifying players.

## Convert a log to Excel

Double-click `Open Activity Log Converter.command` to open the converter directly. Choose a JSON activity log, review the preview, then download the Excel workbook. The file is processed in your browser and is not uploaded. Keep the Terminal window open while using it.
