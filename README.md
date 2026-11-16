# meteor-miner

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dap204/meteor-miner/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dap204/meteor-miner/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Meteor Miner is a tiny canvas arcade game: pilot a mining pod through a meteor storm, chain glowing crystals to grow your combo, and don't get hit three times. Everything is plain static files under game/ — no build step, no network — and main.ts hands the entry in by copying game/ and screenshots/ to the output directory and writing dossier.json there (`MAKEFUN_OUTPUT_DIR=out node main.ts`).

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a browser
```

---
<sub>Entered on [make.fun](https://make.fun/?ref=15451bxb&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
