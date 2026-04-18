# AI Integration Guide - Hotfix: The Game

## Overview
AI hỗ trợ game này qua việc **sinh ra stage blueprints tuân thủ game design principles**. AI không quản lý gameplay trực tiếp, mà thay vào đó **định hình cấu trúc của mỗi level** để game engine có thể render stages công bằng nhưng thú vị.

---

## 1. Pipeline AI (Backend Python)

### 1.1 Ba Provider AI

#### A) **Fallback Provider** (Deterministic Local)
```python
# tools/ai_stage_pipeline.py
# Không dùng LLM, dùng template cứng + logic toán học

def build_seed_blueprints(count: int) -> list[dict[str, Any]]:
    """Sinh blueprints dựa trên 16 base templates"""
    blueprints: list[dict[str, Any]] = []
    for index in range(count):
        stage_index = index + 1
        template = dict(BASE_TEMPLATES[index % len(BASE_TEMPLATES)])
        cycle = index // len(BASE_TEMPLATES)
        
        # Tăng độ khó dần theo cycle
        template["remixLevel"] += cycle * 0.03
        template["gapScale"] += min(0.18, cycle * 0.03 + tier * 0.01)
        template["riseScale"] += min(0.12, cycle * 0.02 + tier * 0.008)
        template["widthScale"] -= min(0.12, cycle * 0.02)  # Sân chơi hẹp hơn
        ...
    return blueprints
```

**Công dụng**: Tạo levels mà không cần API ngoài. Hoạt động offline.

---

#### B) **Gemini Provider** (REST API)
```python
class GeminiAgent(ProviderAgent):
    ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    def request_adjustments(self, blueprints: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        """Gọi Gemini API để điều chỉnh blueprints"""
        prompt = build_llm_prompt(blueprints)  # Chi tiết blueprint hiện tại
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }
        url = self.ENDPOINT.format(model=parse.quote(self.model, safe=""), 
                                   api_key=parse.quote(self.api_key, safe=""))
        response = http_json(url=url, headers={"Content-Type": "application/json"}, payload=body)
        # Parse JSON response từ Gemini
        text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
        return parse_adjustments(text)
```

**Công dụng**: Gemini 2.5 Flash nhìn vào blueprints candidates và **sửa đổi chúng để cân bằng độ khó hơn**.

**Command**:
```powershell
$env:GEMINI_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider gemini --model gemini-2.5-flash --count 64 --out generated_stages.js
```

---

#### C) **NVIDIA Provider** (OpenAI-Compatible API)
```python
class NvidiaAgent(ProviderAgent):
    ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"

    def request_adjustments(self, blueprints: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        """Dùng NVIDIA NIM (gpt-oss-20b hoặc model khác)"""
        body = {
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 1600,
            "messages": [
                {"role": "system", "content": "You design platformer stage blueprints. Return JSON only."},
                {"role": "user", "content": build_llm_prompt(blueprints)},
            ],
        }
        response = http_json(url=self.ENDPOINT, 
                            headers={
                                "Content-Type": "application/json",
                                "Authorization": f"Bearer {self.api_key}",
                            }, 
                            payload=body)
        text = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        return parse_adjustments(text)
```

**Công dụng**: Dùng NVIDIA NIM hoặc GPT-OSS để sinh blueprint creative hơn.

**Command**:
```powershell
$env:NVIDIA_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider nvidia --model openai/gpt-oss-20b --count 64 --out generated_stages.js
```

---

### 1.2 AI Prompt (LLM Nhận Gì?)

```python
def build_llm_prompt(blueprints: list[dict[str, Any]]) -> str:
    """Hướng dẫn LLM cách sửa blueprints"""
    # Chọn fields cần LLM chú ý
    compact = [
        {
            "stageIndex": blueprint["stageIndex"],
            "label": blueprint["label"],
            "archetypeId": blueprint["archetypeId"],
            "mode": blueprint["mode"],
            "laneBias": blueprint["laneBias"],
            "remixLevel": blueprint["remixLevel"],
            "widthScale": blueprint["widthScale"],
            "gapScale": blueprint["gapScale"],
            "riseScale": blueprint["riseScale"],
            "supportChance": blueprint["supportChance"],
            "connectorChance": blueprint["connectorChance"],
            "branchChance": blueprint["branchChance"],
            "timeTrial": blueprint["timeTrial"],
            "timeLimit": blueprint["timeLimit"],
            "bugBudgetBias": blueprint["bugBudgetBias"],
            "bugBudgetCap": blueprint["bugBudgetCap"],
        }
        for blueprint in blueprints
    ]
    
    return textwrap.dedent(f"""
    You are the Director Agent for an endless 2D platformer.
    Rewrite the candidate stage blueprints so they stay readable and fair.

    Hard constraints:
    - Use only these archetypes: {sorted(ARCHETYPES)}
    - Modes: {sorted(ALLOWED_MODES)}
    - Lanes: {sorted(ALLOWED_LANES)}
    - Onboarding bands: {sorted(ALLOWED_BANDS)}
    - Keep early stages forgiving.
    - Time trial stages should be easier in geometry than normal stages around them.
    - Never add hidden ceiling traps or routes that depend on blind precision.
    - Return JSON only.
    - Return only adjustments for the provided stages.

    Candidate blueprints:
    {json.dumps(compact, ensure_ascii=True)}

    Return this shape:
    {json.dumps(schema_hint, ensure_ascii=True)}
    """).strip()
```

**Công dụng**: LLM nhìn thấy:
- Blueprints hiện tại (candidate stages)
- Hard constraints (rules mà LLM phải tuân thủ)
- Output schema (JSON cần trả về)

LLM sau đó trả về **adjustments** - danh sách các sửa đổi cho từng stage.

---

### 1.3 Tester Agent (Quality Assurance)

```python
class LocalPhysicsTesterAgent:
    """Kiểm tra stage blueprints có hợp lý không"""
    
    def review(self, blueprint: dict[str, Any], stage_index: int) -> ReviewResult:
        issues: list[str] = []
        tier = stage_tier(stage_index)

        # Early stages phải dễ
        if stage_index <= 4:
            if blueprint["branchChance"] > 0.08:
                issues.append("early-branch-overload")
            if blueprint["gapScale"] > 0.92:
                issues.append("early-gap-too-wide")
            if blueprint["riseScale"] > 0.88:
                issues.append("early-rise-too-tall")
            if blueprint["bugBudgetCap"] > 0:
                issues.append("early-bug-cap-too-high")

        # Time trial phải công bằng
        if blueprint["timeTrial"]:
            if blueprint["timeLimit"] < 22 and stage_index <= 20:
                issues.append("watchdog-too-tight")
            if blueprint["gapScale"] > 1.0:
                issues.append("time-trial-gap-too-wide")
            if blueprint["riseScale"] > 0.96:
                issues.append("time-trial-rise-too-tall")

        # Nhận dạng vấn đề khác
        if blueprint["widthScale"] < 0.90 and stage_index <= 20:
            issues.append("landing-width-too-small")
        
        if blueprint["gapScale"] + blueprint["riseScale"] > 2.18:
            issues.append("combo-load-too-high")

        return ReviewResult(passed=not issues, issues=issues)
```

**Công dụng**: Kiểm tra LLM output có tuân thủ game design principles không.

---

### 1.4 Repair Agent (Tự Sửa Lỗi)

```python
class LocalRepairAgent:
    def repair(self, blueprint: dict[str, Any], stage_index: int, issues: list[str]) -> dict[str, Any]:
        """Nếu tester phát hiện vấn đề, tự động sửa"""
        repaired = dict(blueprint)

        for issue in issues:
            if issue == "early-branch-overload":
                repaired["branchChance"] = min(repaired["branchChance"], 0.06)
            elif issue == "early-gap-too-wide":
                repaired["gapScale"] = min(repaired["gapScale"], 0.90)
            elif issue == "early-rise-too-tall":
                repaired["riseScale"] = min(repaired["riseScale"], 0.84)
            elif issue == "early-bug-cap-too-high":
                repaired["bugBudgetCap"] = 0
                repaired["bugBudgetBias"] = min(repaired["bugBudgetBias"], 0)
            elif issue == "watchdog-too-tight":
                repaired["timeLimit"] = max(repaired["timeLimit"], 24)
            elif issue == "time-trial-gap-too-wide":
                repaired["gapScale"] = min(repaired["gapScale"], 0.98)
            elif issue == "time-trial-rise-too-tall":
                repaired["riseScale"] = min(repaired["riseScale"], 0.94)
            elif issue == "landing-width-too-small":
                repaired["widthScale"] = max(repaired["widthScale"], 0.92)
            elif issue == "combo-load-too-high":
                repaired["gapScale"] *= 0.95
                repaired["riseScale"] *= 0.96
            elif issue == "support-too-low":
                repaired["supportChance"] = max(repaired["supportChance"], 0.22)
            # ... và nhiều hơn nữa

        # Clamp tất cả values vào phạm vi an toàn
        repaired["remixLevel"] = clamp(repaired["remixLevel"], 0.12, 0.86)
        repaired["widthScale"] = clamp(repaired["widthScale"], 0.90, 1.14)
        repaired["gapScale"] = clamp(repaired["gapScale"], 0.74, 1.16)
        # ... và các thông số khác

        return repaired
```

**Công dụng**: Nếu Tester phát hiện vấn đề, Repair tự động điều chỉnh blueprints để tuân thủ.

**Flow**: 
```
Build Seed Blueprints 
  → Provider Adjustments (LLM nếu có)
  → Tester Review
  → Repair (nếu cần)
  → Output JS
```

---

### 1.5 Pipeline Output

```python
def render_js_payload(blueprints: list[dict[str, Any]], provider: str, model: str) -> str:
    """Xuất blueprints thành JS"""
    payload = {
        "version": 1,
        "provider": provider,
        "model": model,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "blueprints": blueprints,
    }
    return "(function () {\nwindow.AI_STAGE_LIBRARY = " + json.dumps(payload, ensure_ascii=True, indent=4) + ";\n})();\n"
```

**Output**: `generated_stages.js` - JavaScript file chứa `window.AI_STAGE_LIBRARY` với tất cả blueprints.

---

## 2. Frontend Integration (game.js)

### 2.1 Load AI Stage Library

**[game.js line 93-97]**
```javascript
// Kiểm tra AI stage library từ Python pipeline
const EXTERNAL_STAGE_LIBRARY = window.AI_STAGE_LIBRARY && Array.isArray(window.AI_STAGE_LIBRARY.blueprints)
    ? window.AI_STAGE_LIBRARY
    : null;  // null nếu fallback

const EXTERNAL_STAGE_BLUEPRINTS = EXTERNAL_STAGE_LIBRARY?.blueprints || [];

// Tạo map để lookup nhanh
const EXTERNAL_STAGE_BLUEPRINT_MAP = new Map(
    EXTERNAL_STAGE_BLUEPRINTS.map(blueprint => [blueprint.stageIndex, blueprint])
);
```

**Công dụng**: 
- Nếu `generated_stages.js` được load, `window.AI_STAGE_LIBRARY` tồn tại
- Nếu không, fallback vào `EXTERNAL_STAGE_BLUEPRINTS = []` (rỗng)
- Tạo map để lookup O(1): `EXTERNAL_STAGE_BLUEPRINT_MAP.get(stageIndex)`

---

### 2.2 Get Blueprint từ Library

**[game.js line 423-444]**
```javascript
function getExternalStageBlueprint(stageIndex) {
    // Nếu không có external library, return null → sử dụng built-in director
    if (!EXTERNAL_STAGE_BLUEPRINTS.length || stageIndex <= 0) return null;

    // Lookup exact stage (nếu blueprint được sinh cụ thể cho stage này)
    const exact = EXTERNAL_STAGE_BLUEPRINT_MAP.get(stageIndex);
    
    // Fallback: loop lại 64 blueprints nếu stage index > 64
    const baseBlueprint = exact || EXTERNAL_STAGE_BLUEPRINTS[(stageIndex - 1) % EXTERNAL_STAGE_BLUEPRINTS.length];
    if (!baseBlueprint) return null;

    // Nếu dùng fallback, tính cycle number (lần loop thứ bao nhiêu)
    const cycle = exact ? 0 : Math.floor((stageIndex - 1) / EXTERNAL_STAGE_BLUEPRINTS.length);
    
    // Return blueprint với adjustments cho cycle hiện tại
    return {
        ...baseBlueprint,
        stageIndex,
        cycle,
        // Tăng độ khó dần theo cycle (remix level, gap, rise)
        remixLevel: clamp((baseBlueprint.remixLevel ?? 0.28) + cycle * 0.04, 0.12, 0.96),
        gapScale: clamp((baseBlueprint.gapScale ?? 1) + cycle * 0.035, 0.72, 1.4),
        riseScale: clamp((baseBlueprint.riseScale ?? 1) + cycle * 0.025, 0.74, 1.32),
        widthScale: clamp((baseBlueprint.widthScale ?? 1) - cycle * 0.015, 0.82, 1.2),
        bugBudgetBias: (baseBlueprint.bugBudgetBias ?? 0) + Math.min(cycle, 3),
        timeLimit: baseBlueprint.timeTrial
            ? Math.max(18, (baseBlueprint.timeLimit ?? 32) - cycle)
            : 0,
        label: cycle > 0 ? `${baseBlueprint.label} Mk.${cycle + 1}` : baseBlueprint.label,
    };
}
```

**Công dụng** (Chi tiết):
1. **Lookup exact**: `EXTERNAL_STAGE_BLUEPRINT_MAP.get(stageIndex)` → tìm blueprint cụ thể
2. **Fallback to loop**: Nếu stage index > 64, lặp lại library: `blueprints[(i-1) % 64]`
3. **Scale difficulty**: Tăng `remixLevel`, `gapScale`, `riseScale` dần theo cycle
4. **Label**: Nếu cycle > 0, thêm "Mk.2", "Mk.3", ... để player biết đây là lần loop thứ bao nhiêu

---

### 2.3 Director Agent Sử Dụng Blueprint

**[game.js line 1500+]**
```javascript
function buildStageDirector(stageIndex, aiSummary, limitedTime, fallbackLevel = 0) {
    directorState.buildSerial++;
    
    // 🔑 Lấy blueprint từ AI (nếu có)
    const blueprint = getExternalStageBlueprint(stageIndex);

    // Tạo seed để RNG reproducible
    const seed = hashString([
        directorState.runSerial,
        directorState.buildSerial,
        stageIndex,
        limitedTime ? 'tt' : 'normal',
        fallbackLevel,
        aiSummary.preferredLane,
        blueprint ? blueprint.id : 'runtime',
    ].join('|'));
    
    const rng = createRng(seed);
    const onboardingBand = blueprint?.onboardingBand || (stageIndex <= 2 ? 'intro' : 'teach' : ...);

    // 🔑 Nếu blueprint tồn tại, sử dụng mode từ blueprint
    let mode = weightedPick(rng, [
        { value: 'flow', weight: limitedTime ? 2.6 : 1.6 },
        { value: 'fork', weight: 1.4 + aiSummary.shortcutUsage * 0.3 },
        { value: 'tower', weight: 1.0 + Math.min(aiSummary.jumpRate, 1.2) * 0.8 },
        { value: 'sprint', weight: limitedTime ? 2.8 : 1.0 + Math.min(aiSummary.avgSpeed / PLAYER_SPEED, 1) },
        { value: 'switchback', weight: stageIndex > 3 ? 1.6 : 0.8 },
        { value: 'recovery', weight: recentDeath && recentDeath.cause === 'void' ? 2.1 : 1.0 },
        { value: 'roller', weight: stageIndex > 4 ? 1.7 : 0.7 },
    ], 'flow');
    
    // Overwrite mode nếu blueprint định nghĩa
    if (blueprint?.mode) mode = blueprint.mode;

    // 🔑 Lấy laneBias từ blueprint
    let laneBias = weightedPick(rng, [...], 'mid');
    if (blueprint?.laneBias) laneBias = blueprint.laneBias;

    // 🔑 Lấy remixLevel từ blueprint
    let remixLevel = clamp(...);
    if (blueprint?.remixLevel !== undefined) {
        remixLevel = clamp(blueprint.remixLevel - fallbackLevel * 0.05, 0.12, 0.96);
    }

    return {
        seed,
        variantCode: seed.toString(16).slice(-4).toUpperCase(),
        mode,
        label: blueprint?.label || DIRECTOR_LABELS[mode],  // 🔑 Use AI label
        laneBias,
        onboardingBand,
        remixLevel,
        widthVariance: lerp(0.08, 0.28, remixLevel),
        gapVariance: lerp(10, 54, remixLevel),
        verticalVariance: lerp(8, 62, remixLevel),
        jitter: lerp(10, 34, remixLevel),
        branchChance: ...,
        connectorChance: ...,
        supportChance: ...,
        routeSplitBias: ...,
        blueprint,  // 🔑 Lưu reference đến AI blueprint
        source: blueprint ? 'python-library' : 'runtime',  // 🔑 Track source
    };
}
```

**Công dụng**:
- **Blueprint Override** (`blueprint?.mode`, `blueprint?.laneBias`, `blueprint?.remixLevel`): Nếu AI sinh blueprint, ưu tiên sử dụng values từ AI thay vì RNG local
- **Label**: Dùng AI-generated label (e.g., "Fork Preview", "Long Line") thay vì generic labels
- **Source Tracking**: `source: 'python-library'` vs `'runtime'` → biết stage được sinh bởi AI hay JS local

---

### 2.4 Blueprint Affects Stage Generation

Một khi director có blueprint, nó ảnh hưởng đến:

1. **Gap/Rise Scaling**: `gapVariance`, `verticalVariance` được tính từ `remixLevel`
2. **Platform Variety**: `branchChance`, `connectorChance`, `supportChance` xác định loại platform xuất hiện
3. **Time Trial**: `timeLimit` từ blueprint
4. **Visual Style**: Label cho player biết stage type

---

## 3. Summary: Công Dụng AI

| Công Dụng | Provider | Cách Hoạt Động |
|-----------|----------|----------------|
| **Sinh Stage Blueprints** | Fallback | Template loop + math |
| **Điều chỉnh cân bằng** | Gemini / NVIDIA | LLM điều chỉnh blueprints |
| **Kiểm tra quality** | LocalPhysicsTesterAgent | Rule-based validation |
| **Tự sửa lỗi** | LocalRepairAgent | Clamp values vào phạm vi an toàn |
| **Load vào game** | game.js | `window.AI_STAGE_LIBRARY` |
| **Bias director AI** | buildStageDirector | Override mode, laneBias, remixLevel |

---

## 4. Key Code References

### Python Pipeline
- **Base Templates**: `tools/ai_stage_pipeline.py` line ~100-300
- **Fallback Provider**: `build_seed_blueprints()` line ~800
- **Gemini Provider**: `GeminiAgent.request_adjustments()` line ~720
- **NVIDIA Provider**: `NvidiaAgent.request_adjustments()` line ~740
- **Tester Agent**: `LocalPhysicsTesterAgent.review()` line ~530
- **Repair Agent**: `LocalRepairAgent.repair()` line ~560
- **Output**: `render_js_payload()` line ~960

### Frontend
- **Load Library**: `game.js` line 93-97
- **Get Blueprint**: `getExternalStageBlueprint()` line 423-444
- **Director** uses Blueprint: `buildStageDirector()` line 1503+
- **Fallback/Runtime**: Nếu không có AI library, director dùng pure RNG

---

## 5. Example Flow

```
User runs:
  python tools/ai_stage_pipeline.py --provider gemini --model gemini-2.5-flash --count 64 --out generated_stages.js

Pipeline:
  1. build_seed_blueprints(64)           → 64 vanilla blueprints
  2. GeminiAgent.request_adjustments()   → Gemini sửa chúng
  3. LocalPhysicsTesterAgent.review()    → Kiểm tra mỗi blueprint
  4. LocalRepairAgent.repair()           → Sửa nếu có vấn đề
  5. render_js_payload()                 → Xuất generated_stages.js

Output: generated_stages.js tại project root

Game Runtime:
  1. index.html loads generated_stages.js TRƯỚC game.js
  2. window.AI_STAGE_LIBRARY = {...}
  3. game.js khởi tạo: EXTERNAL_STAGE_BLUEPRINTS = window.AI_STAGE_LIBRARY.blueprints
  4. buildStageDirector(stageIndex) gọi getExternalStageBlueprint(stageIndex)
  5. Blueprint được sử dụng để bias director output
  6. Stage được sinh với AI-guided parameters

Nếu generated_stages.js không tồn tại hoặc window.AI_STAGE_LIBRARY = null:
  → Fallback vào built-in JS director (pure RNG)
```

---

## 6. Benefits

✅ **Procedural Content + AI Curation**: Vô hạn stages, nhưng được AI kiểm tra quality  
✅ **Offline Option**: Fallback provider không cần API  
✅ **LLM Flexibility**: Swap Gemini ↔ NVIDIA mà không thay code  
✅ **Quality Control**: Tester + Repair ensure nothing breaks  
✅ **Reproducible**: Same seed = same stage (RNG deterministic)  
✅ **Fair Difficulty**: Early stages dễ, late stages khó, time trials công bằng  

---

## 7. Commands to Use

```powershell
# Fallback (no API needed, instant)
python tools/ai_stage_pipeline.py --provider fallback --count 64 --out generated_stages.js

# Gemini (cần GEMINI_API_KEY)
$env:GEMINI_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider gemini --model gemini-2.5-flash --count 64 --out generated_stages.js

# NVIDIA (cần NVIDIA_API_KEY)
$env:NVIDIA_API_KEY="your-key"
python tools/ai_stage_pipeline.py --provider nvidia --model openai/gpt-oss-20b --count 64 --out generated_stages.js

# Optional: Export JSON for analysis
python tools/ai_stage_pipeline.py --provider fallback --count 64 --out generated_stages.js --json-out generated_stages.json
```
