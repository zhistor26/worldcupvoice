# Match Context

**One match = one JSON file in this folder.** Each file describes the game in a
clip so the AI commentator can identify teams and players and call the action in
context. This is metadata only — it is sent to the model as a prompt, not shown
to viewers.

**Default booth match (2026 demo):** [`worldcup-demo-2026.json`](./worldcup-demo-2026.json)
— generic red/blue kickaround, no real World Cup final binding. Pair with
`samples/worldcupvoice-demo-kick.mp4` (`node scripts/generate-demo-kick-video.mjs`).

Legacy example (2022 final metadata only): [`argentina-france-2022-final.json`](./argentina-france-2022-final.json).

## Add your own match

1. Copy [`_template.json`](./_template.json) to a new file, e.g.
   `data/matches/my-match.json`. (`_template.json` is a scaffold and is not
   loaded by the app.)
2. Fill in the fields — especially **jersey colors** and **rosters** (shirt
   number → name), which is what lets the AI tell players apart on screen.
3. Register it in [`lib/commentary.ts`](../../lib/commentary.ts): import the JSON
   and add it to `COMMENTARY_MATCHES`. The booth uses `COMMENTARY_MATCHES[0]`,
   so put the match you are streaming first.

## Field reference

| Field | Purpose |
| --- | --- |
| `homeTeam` / `awayTeam` (+ `Abbr`) | Team names. |
| `homeJerseyColor` / `awayJerseyColor` | Kit description — critical for telling teams apart. |
| `homeRoster` / `awayRoster` | Players: `number`, `name`, `shortName`, `role` (`starter`/`bench`/`dnp`), optional `position`, `notes`. |
| `playerIdentificationNotes` | Rules for when to name a player vs. use a generic role. |
| `broadcastNotes` | Vocabulary, cadence, and the situation at clip start. |
| `finalScore` | Private metadata only — instruct the AI not to announce it live. |
| `storyline` | One or two sentences framing the moment. |
| `posterUrl` | Pre-call poster image under `public/`. |

The more accurate this is, the better the AI grounds its commentary in what is
actually on screen.
