# hackathon184

Hotfix: The Game is a static HTML/CSS/JS platformer. Runtime gameplay still runs in the browser, but stage design can now be biased by an offline Python AI pipeline that exports `generated_stages.js`.

## Python AI Stage Pipeline

The pipeline lives at [tools/ai_stage_pipeline.py](/d:/Documents/GitHub/hackathon184/tools/ai_stage_pipeline.py). It builds a stage blueprint library and writes `generated_stages.js`, which is loaded before [game.js](/d:/Documents/GitHub/hackathon184/game.js).

Supported providers:

- `fallback`: local deterministic generator + local tester/repair agents
- `gemini`: Gemini API over REST
- `nvidia`: NVIDIA NIM OpenAI-compatible chat completions API

### Output

- [generated_stages.js](/d:/Documents/GitHub/hackathon184/generated_stages.js): loaded by the game at runtime

### Commands

Fallback only:

```powershell
python tools/ai_stage_pipeline.py --provider fallback --count 64 --out generated_stages.js
```

Gemini:

```powershell
$env:GEMINI_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider gemini --model gemini-2.5-flash --count 64 --out generated_stages.js
```

NVIDIA:

```powershell
$env:NVIDIA_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider nvidia --model openai/gpt-oss-20b --count 64 --out generated_stages.js
```

Optional JSON mirror:

```powershell
python tools/ai_stage_pipeline.py --provider fallback --count 64 --out generated_stages.js --json-out generated_stages.json
```

## Runtime Integration

- [index.html](/d:/Documents/GitHub/hackathon184/index.html) now loads `generated_stages.js` before `game.js`.
- If `window.AI_STAGE_LIBRARY` exists, [game.js](/d:/Documents/GitHub/hackathon184/game.js) uses its blueprints to bias:
  - archetype selection
  - time-trial scheduling and time limits
  - gap/rise/width tuning
  - support/connector/branch injection
  - bug budget
  - tester squad budgets
- If the external library is missing or invalid, runtime AI falls back to the built-in JS director.

## Notes

- The checked-in `generated_stages.js` is a seeded fallback library so the project works immediately.
- Running the Python pipeline overwrites that file with a fresh library.
- The current environment for this repo may not have a working Python launcher, so you may need a local Python install to run the generator.

