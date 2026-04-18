#!/usr/bin/env python3
"""Offline AI stage pipeline for Hotfix: The Game.

This script generates `generated_stages.js`, which is loaded by the browser
before `game.js`. The runtime JS consumes the exported stage blueprints to bias
stage archetype selection, spacing, timing, and tester budgets.

Providers:
- fallback: local deterministic generator + local tester/repair agents
- gemini:   REST call to Gemini generateContent, then local tester/repair
- nvidia:   OpenAI-compatible chat completion on NVIDIA NIM, then local tester/repair
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import textwrap
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib import error, parse, request


ARCHETYPES = {
    "intro-flats": {"difficulty": 0, "tags": ["flow", "recovery", "sprint"]},
    "step-up": {"difficulty": 1, "tags": ["tower", "flow"]},
    "dash-bridge": {"difficulty": 2, "tags": ["sprint", "flow"]},
    "split-route": {"difficulty": 3, "tags": ["fork", "switchback"]},
    "low-tunnel": {"difficulty": 3, "tags": ["recovery", "switchback"]},
    "recovery-floor": {"difficulty": 1, "tags": ["recovery", "flow"]},
    "vertical-ladder": {"difficulty": 5, "tags": ["tower", "fork"]},
    "stagger-jump": {"difficulty": 4, "tags": ["switchback", "tower"]},
    "alternating-heights": {"difficulty": 4, "tags": ["roller", "switchback"]},
    "long-traversal": {"difficulty": 5, "tags": ["sprint", "flow"]},
    "precision-tower": {"difficulty": 6, "tags": ["tower", "switchback"]},
    "mixed-gauntlet": {"difficulty": 7, "tags": ["fork", "roller", "tower"]},
}

ALLOWED_MODES = {"flow", "fork", "tower", "sprint", "switchback", "recovery", "roller"}
ALLOWED_LANES = {"low", "mid", "high"}
ALLOWED_BANDS = {"intro", "teach", "bridge", "full"}
ALLOWED_FIELDS = {
    "label",
    "archetypeId",
    "fallbackArchetypeId",
    "mode",
    "laneBias",
    "onboardingBand",
    "remixLevel",
    "widthScale",
    "gapScale",
    "riseScale",
    "supportChance",
    "connectorChance",
    "branchChance",
    "routeSplitBias",
    "timeTrial",
    "timeLimit",
    "bugBudgetBias",
    "bugBudgetCap",
    "testerGapBias",
    "testerRiseBias",
    "testerComboBias",
    "notes",
}

BASE_TEMPLATES: list[dict[str, Any]] = [
    {
        "label": "Bootstrap Walk",
        "archetypeId": "intro-flats",
        "fallbackArchetypeId": "recovery-floor",
        "mode": "flow",
        "laneBias": "mid",
        "onboardingBand": "intro",
        "remixLevel": 0.14,
        "widthScale": 1.10,
        "gapScale": 0.74,
        "riseScale": 0.72,
        "supportChance": 0.58,
        "connectorChance": 0.08,
        "branchChance": 0.0,
        "routeSplitBias": 0.30,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 0,
        "testerGapBias": 0.92,
        "testerRiseBias": 0.92,
        "testerComboBias": 0.90,
        "notes": "Wide intro floor with forgiving reads.",
    },
    {
        "label": "Gentle Ladder",
        "archetypeId": "step-up",
        "fallbackArchetypeId": "intro-flats",
        "mode": "tower",
        "laneBias": "mid",
        "onboardingBand": "intro",
        "remixLevel": 0.16,
        "widthScale": 1.08,
        "gapScale": 0.80,
        "riseScale": 0.76,
        "supportChance": 0.56,
        "connectorChance": 0.10,
        "branchChance": 0.0,
        "routeSplitBias": 0.34,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 0,
        "testerGapBias": 0.94,
        "testerRiseBias": 0.93,
        "testerComboBias": 0.92,
        "notes": "Teach vertical rhythm without overhead blockers.",
    },
    {
        "label": "Bridge Primer",
        "archetypeId": "dash-bridge",
        "fallbackArchetypeId": "step-up",
        "mode": "sprint",
        "laneBias": "mid",
        "onboardingBand": "teach",
        "remixLevel": 0.18,
        "widthScale": 1.06,
        "gapScale": 0.84,
        "riseScale": 0.80,
        "supportChance": 0.46,
        "connectorChance": 0.12,
        "branchChance": 0.0,
        "routeSplitBias": 0.38,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 0,
        "testerGapBias": 0.95,
        "testerRiseBias": 0.94,
        "testerComboBias": 0.92,
        "notes": "Teach horizontal commitment without forced dash chains.",
    },
    {
        "label": "Fork Preview",
        "archetypeId": "split-route",
        "fallbackArchetypeId": "low-tunnel",
        "mode": "fork",
        "laneBias": "mid",
        "onboardingBand": "teach",
        "remixLevel": 0.22,
        "widthScale": 1.05,
        "gapScale": 0.88,
        "riseScale": 0.82,
        "supportChance": 0.44,
        "connectorChance": 0.14,
        "branchChance": 0.08,
        "routeSplitBias": 0.54,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 0,
        "testerGapBias": 0.96,
        "testerRiseBias": 0.95,
        "testerComboBias": 0.93,
        "notes": "Early split route with a readable main line.",
    },
    {
        "label": "Tunnel Read",
        "archetypeId": "low-tunnel",
        "fallbackArchetypeId": "recovery-floor",
        "mode": "recovery",
        "laneBias": "low",
        "onboardingBand": "bridge",
        "remixLevel": 0.24,
        "widthScale": 1.02,
        "gapScale": 0.92,
        "riseScale": 0.86,
        "supportChance": 0.42,
        "connectorChance": 0.14,
        "branchChance": 0.08,
        "routeSplitBias": 0.58,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 1,
        "testerGapBias": 0.96,
        "testerRiseBias": 0.96,
        "testerComboBias": 0.94,
        "notes": "Low ceiling sections should still preserve a clean main route.",
    },
    {
        "label": "Recovery Rail",
        "archetypeId": "recovery-floor",
        "fallbackArchetypeId": "intro-flats",
        "mode": "recovery",
        "laneBias": "mid",
        "onboardingBand": "bridge",
        "remixLevel": 0.22,
        "widthScale": 1.04,
        "gapScale": 0.90,
        "riseScale": 0.84,
        "supportChance": 0.48,
        "connectorChance": 0.10,
        "branchChance": 0.06,
        "routeSplitBias": 0.42,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": -1,
        "bugBudgetCap": 1,
        "testerGapBias": 0.95,
        "testerRiseBias": 0.95,
        "testerComboBias": 0.93,
        "notes": "Recovery stage with cleaner landing zones.",
    },
    {
        "label": "Switchback Study",
        "archetypeId": "alternating-heights",
        "fallbackArchetypeId": "stagger-jump",
        "mode": "switchback",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.28,
        "widthScale": 1.00,
        "gapScale": 0.96,
        "riseScale": 0.90,
        "supportChance": 0.34,
        "connectorChance": 0.18,
        "branchChance": 0.10,
        "routeSplitBias": 0.64,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 0,
        "bugBudgetCap": 2,
        "testerGapBias": 0.98,
        "testerRiseBias": 0.98,
        "testerComboBias": 0.96,
        "notes": "Alternating high-low rhythm with mild feints.",
    },
    {
        "label": "Stagger Sync",
        "archetypeId": "stagger-jump",
        "fallbackArchetypeId": "step-up",
        "mode": "tower",
        "laneBias": "high",
        "onboardingBand": "full",
        "remixLevel": 0.30,
        "widthScale": 0.98,
        "gapScale": 0.98,
        "riseScale": 0.94,
        "supportChance": 0.32,
        "connectorChance": 0.18,
        "branchChance": 0.10,
        "routeSplitBias": 0.62,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 0,
        "bugBudgetCap": 2,
        "testerGapBias": 1.0,
        "testerRiseBias": 0.99,
        "testerComboBias": 0.98,
        "notes": "Stagger cadence, but keep the main line readable.",
    },
    {
        "label": "Watchdog Sprint",
        "archetypeId": "intro-flats",
        "fallbackArchetypeId": "recovery-floor",
        "mode": "sprint",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.24,
        "widthScale": 1.04,
        "gapScale": 0.88,
        "riseScale": 0.82,
        "supportChance": 0.38,
        "connectorChance": 0.14,
        "branchChance": 0.04,
        "routeSplitBias": 0.44,
        "timeTrial": True,
        "timeLimit": 32,
        "bugBudgetBias": -1,
        "bugBudgetCap": 1,
        "testerGapBias": 0.95,
        "testerRiseBias": 0.94,
        "testerComboBias": 0.92,
        "notes": "Time trial should feel urgent, not unfair.",
    },
    {
        "label": "Fork Pressure",
        "archetypeId": "split-route",
        "fallbackArchetypeId": "recovery-floor",
        "mode": "fork",
        "laneBias": "high",
        "onboardingBand": "full",
        "remixLevel": 0.34,
        "widthScale": 0.98,
        "gapScale": 1.00,
        "riseScale": 0.94,
        "supportChance": 0.28,
        "connectorChance": 0.20,
        "branchChance": 0.16,
        "routeSplitBias": 0.78,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 0,
        "bugBudgetCap": 2,
        "testerGapBias": 1.0,
        "testerRiseBias": 1.0,
        "testerComboBias": 0.99,
        "notes": "Two-route pressure, but punish greed more than baseline progress.",
    },
    {
        "label": "Long Line",
        "archetypeId": "long-traversal",
        "fallbackArchetypeId": "intro-flats",
        "mode": "flow",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.36,
        "widthScale": 0.98,
        "gapScale": 1.02,
        "riseScale": 0.94,
        "supportChance": 0.28,
        "connectorChance": 0.18,
        "branchChance": 0.10,
        "routeSplitBias": 0.62,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 1,
        "bugBudgetCap": 3,
        "testerGapBias": 1.02,
        "testerRiseBias": 1.0,
        "testerComboBias": 1.0,
        "notes": "Long rhythm stage with no surprise ceiling traps.",
    },
    {
        "label": "Tower Filter",
        "archetypeId": "vertical-ladder",
        "fallbackArchetypeId": "step-up",
        "mode": "tower",
        "laneBias": "high",
        "onboardingBand": "full",
        "remixLevel": 0.38,
        "widthScale": 0.96,
        "gapScale": 0.98,
        "riseScale": 0.98,
        "supportChance": 0.24,
        "connectorChance": 0.18,
        "branchChance": 0.08,
        "routeSplitBias": 0.58,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 1,
        "bugBudgetCap": 3,
        "testerGapBias": 0.99,
        "testerRiseBias": 1.02,
        "testerComboBias": 1.0,
        "notes": "Vertical pressure without blind blockers.",
    },
    {
        "label": "Timed Switch",
        "archetypeId": "alternating-heights",
        "fallbackArchetypeId": "intro-flats",
        "mode": "switchback",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.32,
        "widthScale": 1.00,
        "gapScale": 0.94,
        "riseScale": 0.90,
        "supportChance": 0.30,
        "connectorChance": 0.16,
        "branchChance": 0.08,
        "routeSplitBias": 0.58,
        "timeTrial": True,
        "timeLimit": 28,
        "bugBudgetBias": 0,
        "bugBudgetCap": 2,
        "testerGapBias": 0.96,
        "testerRiseBias": 0.96,
        "testerComboBias": 0.94,
        "notes": "Timer pressure plus readable oscillation.",
    },
    {
        "label": "Precision Gate",
        "archetypeId": "precision-tower",
        "fallbackArchetypeId": "vertical-ladder",
        "mode": "tower",
        "laneBias": "high",
        "onboardingBand": "full",
        "remixLevel": 0.42,
        "widthScale": 0.94,
        "gapScale": 1.00,
        "riseScale": 1.00,
        "supportChance": 0.22,
        "connectorChance": 0.14,
        "branchChance": 0.10,
        "routeSplitBias": 0.60,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 1,
        "bugBudgetCap": 3,
        "testerGapBias": 1.0,
        "testerRiseBias": 1.02,
        "testerComboBias": 1.0,
        "notes": "High precision, but each leap must remain readable.",
    },
    {
        "label": "Gauntlet Parse",
        "archetypeId": "mixed-gauntlet",
        "fallbackArchetypeId": "long-traversal",
        "mode": "roller",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.44,
        "widthScale": 0.94,
        "gapScale": 1.02,
        "riseScale": 0.98,
        "supportChance": 0.22,
        "connectorChance": 0.16,
        "branchChance": 0.12,
        "routeSplitBias": 0.72,
        "timeTrial": False,
        "timeLimit": 0,
        "bugBudgetBias": 1,
        "bugBudgetCap": 4,
        "testerGapBias": 1.0,
        "testerRiseBias": 1.0,
        "testerComboBias": 1.0,
        "notes": "Late-run mixed pressure with no hidden choke points.",
    },
    {
        "label": "Watchdog Relay",
        "archetypeId": "long-traversal",
        "fallbackArchetypeId": "intro-flats",
        "mode": "sprint",
        "laneBias": "mid",
        "onboardingBand": "full",
        "remixLevel": 0.38,
        "widthScale": 1.00,
        "gapScale": 0.96,
        "riseScale": 0.90,
        "supportChance": 0.26,
        "connectorChance": 0.14,
        "branchChance": 0.08,
        "routeSplitBias": 0.56,
        "timeTrial": True,
        "timeLimit": 26,
        "bugBudgetBias": 0,
        "bugBudgetCap": 2,
        "testerGapBias": 0.96,
        "testerRiseBias": 0.96,
        "testerComboBias": 0.94,
        "notes": "Late timer stage should still read like a fair race line.",
    },
]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def stage_tier(stage_index: int) -> int:
    return (stage_index - 1) // 5


def chunked(values: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for index in range(0, len(values), size):
        yield values[index:index + size]


@dataclass
class ReviewResult:
    passed: bool
    issues: list[str]


class LocalPhysicsTesterAgent:
    def review(self, blueprint: dict[str, Any], stage_index: int) -> ReviewResult:
        issues: list[str] = []
        tier = stage_tier(stage_index)

        if stage_index <= 4:
            if blueprint["branchChance"] > 0.08:
                issues.append("early-branch-overload")
            if blueprint["gapScale"] > 0.92:
                issues.append("early-gap-too-wide")
            if blueprint["riseScale"] > 0.88:
                issues.append("early-rise-too-tall")
            if blueprint["bugBudgetCap"] > 0:
                issues.append("early-bug-cap-too-high")

        if blueprint["timeTrial"]:
            if blueprint["timeLimit"] < 22 and stage_index <= 20:
                issues.append("watchdog-too-tight")
            if blueprint["gapScale"] > 1.0:
                issues.append("time-trial-gap-too-wide")
            if blueprint["riseScale"] > 0.96:
                issues.append("time-trial-rise-too-tall")

        if blueprint["widthScale"] < 0.90 and stage_index <= 20:
            issues.append("landing-width-too-small")

        if blueprint["gapScale"] + blueprint["riseScale"] > 2.18:
            issues.append("combo-load-too-high")

        if blueprint["supportChance"] < 0.18 and stage_index <= 24:
            issues.append("support-too-low")

        max_bug_cap = 1 if stage_index <= 8 else 2 if stage_index <= 18 else 4
        if blueprint["bugBudgetCap"] > max_bug_cap:
            issues.append("bug-cap-too-high")

        if stage_index >= 24 and tier >= 4 and blueprint["gapScale"] < 0.84:
            issues.append("late-stage-undertuned")

        return ReviewResult(passed=not issues, issues=issues)


class LocalRepairAgent:
    def repair(self, blueprint: dict[str, Any], stage_index: int, issues: list[str]) -> dict[str, Any]:
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
            elif issue == "bug-cap-too-high":
                repaired["bugBudgetCap"] = min(repaired["bugBudgetCap"], 2 if stage_index <= 18 else 4)
            elif issue == "late-stage-undertuned":
                repaired["gapScale"] = min(1.02, repaired["gapScale"] + 0.06)

        repaired["remixLevel"] = clamp(repaired["remixLevel"], 0.12, 0.86)
        repaired["widthScale"] = clamp(repaired["widthScale"], 0.90, 1.14)
        repaired["gapScale"] = clamp(repaired["gapScale"], 0.74, 1.16)
        repaired["riseScale"] = clamp(repaired["riseScale"], 0.72, 1.08)
        repaired["supportChance"] = clamp(repaired["supportChance"], 0.18, 0.62)
        repaired["connectorChance"] = clamp(repaired["connectorChance"], 0.06, 0.28)
        repaired["branchChance"] = clamp(repaired["branchChance"], 0.0, 0.18)
        repaired["routeSplitBias"] = clamp(repaired["routeSplitBias"], 0.28, 0.92)
        repaired["bugBudgetBias"] = int(clamp(repaired["bugBudgetBias"], -1, 2))
        repaired["bugBudgetCap"] = int(clamp(repaired["bugBudgetCap"], 0, 4))
        repaired["testerGapBias"] = clamp(repaired["testerGapBias"], 0.9, 1.06)
        repaired["testerRiseBias"] = clamp(repaired["testerRiseBias"], 0.9, 1.06)
        repaired["testerComboBias"] = clamp(repaired["testerComboBias"], 0.88, 1.04)
        if not repaired["timeTrial"]:
            repaired["timeLimit"] = 0
        return repaired


class ProviderAgent:
    def __init__(self, model: str) -> None:
        self.model = model

    def request_adjustments(self, blueprints: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        raise NotImplementedError


class GeminiAgent(ProviderAgent):
    ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    def __init__(self, model: str, api_key: str) -> None:
        super().__init__(model)
        self.api_key = api_key

    def request_adjustments(self, blueprints: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        prompt = build_llm_prompt(blueprints)
        body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
            },
        }
        url = self.ENDPOINT.format(model=parse.quote(self.model, safe=""), api_key=parse.quote(self.api_key, safe=""))
        response = http_json(
            url=url,
            headers={"Content-Type": "application/json"},
            payload=body,
        )
        parts = response.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
        return parse_adjustments(text)


class NvidiaAgent(ProviderAgent):
    ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"

    def __init__(self, model: str, api_key: str) -> None:
        super().__init__(model)
        self.api_key = api_key

    def request_adjustments(self, blueprints: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        body = {
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 1600,
            "messages": [
                {
                    "role": "system",
                    "content": "You design platformer stage blueprints. Return JSON only.",
                },
                {
                    "role": "user",
                    "content": build_llm_prompt(blueprints),
                },
            ],
        }
        response = http_json(
            url=self.ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            payload=body,
        )
        text = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        return parse_adjustments(text)


def http_json(url: str, headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(url=url, data=data, headers=headers, method="POST")
    with request.urlopen(req, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def build_llm_prompt(blueprints: list[dict[str, Any]]) -> str:
    compact = [
        {
            "stageIndex": blueprint["stageIndex"],
            "label": blueprint["label"],
            "archetypeId": blueprint["archetypeId"],
            "fallbackArchetypeId": blueprint["fallbackArchetypeId"],
            "mode": blueprint["mode"],
            "laneBias": blueprint["laneBias"],
            "onboardingBand": blueprint["onboardingBand"],
            "remixLevel": blueprint["remixLevel"],
            "widthScale": blueprint["widthScale"],
            "gapScale": blueprint["gapScale"],
            "riseScale": blueprint["riseScale"],
            "supportChance": blueprint["supportChance"],
            "connectorChance": blueprint["connectorChance"],
            "branchChance": blueprint["branchChance"],
            "routeSplitBias": blueprint["routeSplitBias"],
            "timeTrial": blueprint["timeTrial"],
            "timeLimit": blueprint["timeLimit"],
            "bugBudgetBias": blueprint["bugBudgetBias"],
            "bugBudgetCap": blueprint["bugBudgetCap"],
        }
        for blueprint in blueprints
    ]
    schema_hint = {
        "adjustments": [
            {
                "stageIndex": 1,
                "label": "string",
                "archetypeId": "intro-flats",
                "fallbackArchetypeId": "recovery-floor",
                "mode": "flow",
                "laneBias": "mid",
                "onboardingBand": "intro",
                "remixLevel": 0.18,
                "widthScale": 1.05,
                "gapScale": 0.84,
                "riseScale": 0.82,
                "supportChance": 0.46,
                "connectorChance": 0.12,
                "branchChance": 0.05,
                "routeSplitBias": 0.55,
                "timeTrial": False,
                "timeLimit": 0,
                "bugBudgetBias": 0,
                "bugBudgetCap": 1,
                "testerGapBias": 0.97,
                "testerRiseBias": 0.96,
                "testerComboBias": 0.95,
                "notes": "short reason"
            }
        ]
    }
    return textwrap.dedent(
        f"""
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
        """
    ).strip()


def parse_adjustments(text: str) -> dict[int, dict[str, Any]]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {}
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}

    adjustments: dict[int, dict[str, Any]] = {}
    for item in payload.get("adjustments", []):
        if not isinstance(item, dict):
            continue
        stage_index = item.get("stageIndex")
        if not isinstance(stage_index, int):
            continue
        sanitized: dict[str, Any] = {}
        for key, value in item.items():
            if key not in ALLOWED_FIELDS:
                continue
            sanitized[key] = value
        adjustments[stage_index] = sanitized
    return adjustments


def sanitize_blueprint(blueprint: dict[str, Any], stage_index: int) -> dict[str, Any]:
    sanitized = dict(blueprint)
    sanitized["stageIndex"] = stage_index
    sanitized["label"] = str(sanitized.get("label") or f"Blueprint {stage_index:03d}")[:48]
    sanitized["archetypeId"] = sanitized["archetypeId"] if sanitized.get("archetypeId") in ARCHETYPES else "intro-flats"
    fallback = sanitized.get("fallbackArchetypeId")
    sanitized["fallbackArchetypeId"] = fallback if fallback in ARCHETYPES else "recovery-floor"
    sanitized["mode"] = sanitized.get("mode") if sanitized.get("mode") in ALLOWED_MODES else "flow"
    sanitized["laneBias"] = sanitized.get("laneBias") if sanitized.get("laneBias") in ALLOWED_LANES else "mid"
    sanitized["onboardingBand"] = sanitized.get("onboardingBand") if sanitized.get("onboardingBand") in ALLOWED_BANDS else "full"
    sanitized["remixLevel"] = float(clamp(float(sanitized.get("remixLevel", 0.28)), 0.12, 0.86))
    sanitized["widthScale"] = float(clamp(float(sanitized.get("widthScale", 1.0)), 0.90, 1.14))
    sanitized["gapScale"] = float(clamp(float(sanitized.get("gapScale", 1.0)), 0.74, 1.16))
    sanitized["riseScale"] = float(clamp(float(sanitized.get("riseScale", 1.0)), 0.72, 1.08))
    sanitized["supportChance"] = float(clamp(float(sanitized.get("supportChance", 0.32)), 0.18, 0.62))
    sanitized["connectorChance"] = float(clamp(float(sanitized.get("connectorChance", 0.16)), 0.06, 0.28))
    sanitized["branchChance"] = float(clamp(float(sanitized.get("branchChance", 0.06)), 0.0, 0.18))
    sanitized["routeSplitBias"] = float(clamp(float(sanitized.get("routeSplitBias", 0.5)), 0.28, 0.92))
    sanitized["timeTrial"] = bool(sanitized.get("timeTrial", False))
    sanitized["timeLimit"] = int(max(0, sanitized.get("timeLimit", 0) or 0))
    sanitized["bugBudgetBias"] = int(clamp(int(sanitized.get("bugBudgetBias", 0)), -1, 2))
    sanitized["bugBudgetCap"] = int(clamp(int(sanitized.get("bugBudgetCap", 0)), 0, 4))
    sanitized["testerGapBias"] = float(clamp(float(sanitized.get("testerGapBias", 1.0)), 0.9, 1.06))
    sanitized["testerRiseBias"] = float(clamp(float(sanitized.get("testerRiseBias", 1.0)), 0.9, 1.06))
    sanitized["testerComboBias"] = float(clamp(float(sanitized.get("testerComboBias", 1.0)), 0.88, 1.04))
    sanitized["notes"] = str(sanitized.get("notes", ""))[:120]
    if not sanitized["timeTrial"]:
        sanitized["timeLimit"] = 0
    return sanitized


def build_seed_blueprints(count: int) -> list[dict[str, Any]]:
    blueprints: list[dict[str, Any]] = []
    for index in range(count):
        stage_index = index + 1
        template = dict(BASE_TEMPLATES[index % len(BASE_TEMPLATES)])
        cycle = index // len(BASE_TEMPLATES)
        tier = stage_tier(stage_index)

        template["id"] = f"py-{stage_index:03d}"
        if cycle:
            template["label"] = f"{template['label']} Mk.{cycle + 1}"

        template["remixLevel"] += cycle * 0.03
        template["gapScale"] += min(0.18, cycle * 0.03 + tier * 0.01)
        template["riseScale"] += min(0.12, cycle * 0.02 + tier * 0.008)
        template["widthScale"] -= min(0.12, cycle * 0.02)
        template["supportChance"] -= min(0.12, cycle * 0.02)
        template["connectorChance"] += min(0.08, cycle * 0.015)
        template["branchChance"] += min(0.08, cycle * 0.015)
        template["bugBudgetBias"] += min(cycle, 2)

        if stage_index <= 4:
            template["bugBudgetCap"] = 0
            template["timeTrial"] = False
        elif stage_index <= 8:
            template["bugBudgetCap"] = min(template["bugBudgetCap"], 1)

        if stage_index % 4 == 0 and stage_index >= 8:
            template["timeTrial"] = True
            template["timeLimit"] = max(22, template["timeLimit"] or (32 - stage_index // 6))

        blueprints.append(sanitize_blueprint(template, stage_index))
    return blueprints


def apply_adjustments(
    blueprints: list[dict[str, Any]],
    provider_adjustments: dict[int, dict[str, Any]],
    tester: LocalPhysicsTesterAgent,
    repair: LocalRepairAgent,
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for blueprint in blueprints:
        merged = dict(blueprint)
        adjustment = provider_adjustments.get(blueprint["stageIndex"], {})
        for key, value in adjustment.items():
            if key in ALLOWED_FIELDS:
                merged[key] = value

        merged = sanitize_blueprint(merged, blueprint["stageIndex"])
        for _ in range(3):
            result = tester.review(merged, merged["stageIndex"])
            if result.passed:
                break
            merged = repair.repair(merged, merged["stageIndex"], result.issues)
        enriched.append(merged)
    return enriched


def render_js_payload(blueprints: list[dict[str, Any]], provider: str, model: str) -> str:
    payload = {
        "version": 1,
        "provider": provider,
        "model": model,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "blueprints": blueprints,
    }
    return "(function () {\nwindow.AI_STAGE_LIBRARY = " + json.dumps(payload, ensure_ascii=True, indent=4) + ";\n})();\n"


def create_provider(provider: str, model: str) -> ProviderAgent | None:
    if provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        return GeminiAgent(model=model, api_key=api_key)
    if provider == "nvidia":
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError("NVIDIA_API_KEY is not set.")
        return NvidiaAgent(model=model, api_key=api_key)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate AI stage blueprints for Hotfix.")
    parser.add_argument("--provider", choices=["fallback", "gemini", "nvidia"], default="fallback")
    parser.add_argument("--count", type=int, default=64, help="Number of blueprints to generate.")
    parser.add_argument("--model", default="", help="Provider model identifier.")
    parser.add_argument("--out", default="generated_stages.js", help="Output JS file path.")
    parser.add_argument("--json-out", default="", help="Optional JSON output path.")
    args = parser.parse_args()

    default_models = {
        "fallback": "deterministic-template-ring",
        "gemini": "gemini-2.5-flash",
        "nvidia": "openai/gpt-oss-20b",
    }
    model = args.model or default_models[args.provider]

    blueprints = build_seed_blueprints(args.count)
    tester = LocalPhysicsTesterAgent()
    repair = LocalRepairAgent()

    provider_adjustments: dict[int, dict[str, Any]] = {}
    if args.provider != "fallback":
        try:
            provider = create_provider(args.provider, model)
            assert provider is not None
            for batch in chunked(blueprints, 8):
                provider_adjustments.update(provider.request_adjustments(batch))
        except Exception as exc:  # pragma: no cover - tool fallback path
            print(f"[WARN] Provider request failed ({exc}). Falling back to local blueprints.", file=sys.stderr)
            args.provider = "fallback"
            model = default_models["fallback"]

    blueprints = apply_adjustments(blueprints, provider_adjustments, tester, repair)
    js = render_js_payload(blueprints, provider=args.provider, model=model)

    out_path = Path(args.out)
    out_path.write_text(js, encoding="utf-8")
    print(f"[OK] Wrote {out_path} with {len(blueprints)} blueprints via {args.provider}:{model}")

    if args.json_out:
        json_path = Path(args.json_out)
        json_path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "provider": args.provider,
                    "model": model,
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                    "blueprints": blueprints,
                },
                ensure_ascii=True,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"[OK] Wrote {json_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
