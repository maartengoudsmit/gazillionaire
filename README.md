# Gazillionaire Deluxe — web port

A browser port of **Gazillionaire Deluxe** (LavaMind, 1996), the space-trading management game, rebuilt as a static site that runs on GitHub Pages. No build step, no dependencies: open `index.html` or serve the folder.

## Play

Buy commodities cheap, fly to another planet, sell them dear. Be the first company to reach the target net worth (cash + savings + stock − loans) before the six computer companies do. Pay your crew, buy fuel and insurance, watch the news and weather, use each planet's special, buy bigger ships and faster engines, borrow from the Trader's Union or Mr. Zinn (but never beyond your credit limit).

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy to GitHub Pages

Push this folder to a repository, then **Settings → Pages → Deploy from branch → `main` / root**.

## How it was made

* **Assets** (`assets/`): extracted from the original CD image. Bitmaps → PNG, WAV → MP3, FLC animations → MP4.
* **Text**: planet histories, news, events, special-encounter and hazard text come from strings in the original VB3 executable, which was carved out of the Wise installer.
* **Game logic** (`js/game.js`): the original is Visual Basic 3 p-code and its formulas aren't practical to recover, so the rules follow the user manual and the numbers (prices, supply, interest) are re-tuned and the computer rivals are my own design: six personalities (banker, gambler, hostess, expander, speedster, speculator), with IQ 1-5 changing how well they read prices, manage cash and debt, and heed warnings. Expect similar play, not identical numbers.
* **UI** (`js/ui.js`): fixed 640×480 stage scaled to the window, Windows 3.1-style controls.

Saves go to the browser's `localStorage` (5 slots, plus auto-save once a slot is used).

## Credits & rights

Gazillionaire Deluxe © 1994–1997 LavaMind — produced, designed and programmed by Naomi Kokubo and Steven Hoffman. All original art, sound and text belong to their owners; this repository is a fan preservation project. If you are a rights holder and want it taken down, open an issue.
