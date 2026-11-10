# Würfelbox

Web-App (PWA) fürs iPhone mit drei Modi:

- **Würfel** – W6, W8, W10, W12, W20, 1–6 Würfel gleichzeitig, mit Summe und Verlauf
- **Würfelpoker** – 5 Würfel (9, 10, Bube, Dame, König, Ass), 1–8 Spieler, 1–14 Runden,
  bis zu 3 Würfe pro Zug mit Festhalten, Kniffel-Zettel mit automatischer Punktezählung
- **Glücksrad** – eigene Einträge, wird gespeichert; optional wird der gezogene Eintrag aus dem Rad entfernt

Alles läuft offline und speichert Einstellungen, Glücksrad-Einträge und ein laufendes Pokerspiel auf dem Gerät.

## Aufs iPhone bringen

1. Die App muss über **https** erreichbar sein, z. B. mit GitHub Pages:
   Repository → *Settings* → *Pages* → Source „Deploy from a branch“ → Branch wählen, Ordner `/ (root)` → *Save*.
   (Bei privaten Repos braucht GitHub Pages ein bezahltes Konto – alternativ Repo öffentlich machen
   oder den Ordner z. B. bei Netlify Drop hochladen.)
2. Die Pages-Adresse in **Safari** auf dem iPhone öffnen.
3. Teilen-Symbol → **„Zum Home-Bildschirm“**.
4. Ab jetzt startet die Würfelbox wie eine normale App im Vollbild – auch ohne Internet.

## Würfelpoker – Punkte

Würfelwerte: 9 = 1, 10 = 2, Bube = 3, Dame = 4, König = 5, Ass = 6

| Feld | Punkte |
|---|---|
| Neuner … Asse | Summe der passenden Würfel |
| Bonus | +35, wenn oben ≥ 63 |
| Paar | Summe des höchsten Paars |
| Zwei Paar | Summe beider Paare |
| Drilling, Vierling | Summe aller Würfel |
| Full House | 25 |
| Straße (9–K oder 10–A) | 40 |
| Poker (5 gleiche) | 50 |
| Chance | Summe aller Würfel |

Passt nichts, muss ein Feld mit 0 gestrichen werden. Gewinner ist, wer nach den gewählten Runden die meisten Punkte hat.

## Entwicklung

Lokal starten: `python3 -m http.server` und http://localhost:8000 öffnen.
Tests der Punktewertung: `node --test tests/*.test.js`

Bei jeder neuen Version die Versionsnummer an **drei Stellen** gleich erhöhen:
`?v=` an den Skripten/CSS in `index.html`, das Label „Version …“ in `index.html` und `CACHE`/`V` in `sw.js`.
Installierte Apps laden das Update dann beim nächsten Öffnen bzw. wenn sie in den Vordergrund kommen.

## Update kommt nicht an?

Unten auf der Würfel-Seite steht die laufende Version. Ist sie alt:
1. App komplett schließen (vom unteren Rand hochwischen, App nach oben wegwischen) und neu öffnen.
2. Hilft das nicht: Einstellungen → Safari → Erweitert → Website-Daten → `github.io` löschen,
   App-Symbol vom Home-Bildschirm entfernen und über Safari neu hinzufügen.
