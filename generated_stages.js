(function () {
    const templates = [
        { label: 'Bootstrap Walk', archetypeId: 'intro-flats', fallbackArchetypeId: 'recovery-floor', mode: 'flow', laneBias: 'mid', onboardingBand: 'intro', remixLevel: 0.14, widthScale: 1.10, gapScale: 0.74, riseScale: 0.72, supportChance: 0.58, connectorChance: 0.08, branchChance: 0.00, routeSplitBias: 0.30, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 0, testerGapBias: 0.92, testerRiseBias: 0.92, testerComboBias: 0.90, notes: 'Wide intro floor with forgiving reads.' },
        { label: 'Gentle Ladder', archetypeId: 'step-up', fallbackArchetypeId: 'intro-flats', mode: 'tower', laneBias: 'mid', onboardingBand: 'intro', remixLevel: 0.16, widthScale: 1.08, gapScale: 0.80, riseScale: 0.76, supportChance: 0.56, connectorChance: 0.10, branchChance: 0.00, routeSplitBias: 0.34, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 0, testerGapBias: 0.94, testerRiseBias: 0.93, testerComboBias: 0.92, notes: 'Teach vertical rhythm without overhead blockers.' },
        { label: 'Bridge Primer', archetypeId: 'dash-bridge', fallbackArchetypeId: 'step-up', mode: 'sprint', laneBias: 'mid', onboardingBand: 'teach', remixLevel: 0.18, widthScale: 1.06, gapScale: 0.84, riseScale: 0.80, supportChance: 0.46, connectorChance: 0.12, branchChance: 0.00, routeSplitBias: 0.38, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 0, testerGapBias: 0.95, testerRiseBias: 0.94, testerComboBias: 0.92, notes: 'Teach horizontal commitment without forced dash chains.' },
        { label: 'Fork Preview', archetypeId: 'split-route', fallbackArchetypeId: 'low-tunnel', mode: 'fork', laneBias: 'mid', onboardingBand: 'teach', remixLevel: 0.22, widthScale: 1.05, gapScale: 0.88, riseScale: 0.82, supportChance: 0.44, connectorChance: 0.14, branchChance: 0.08, routeSplitBias: 0.54, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 0, testerGapBias: 0.96, testerRiseBias: 0.95, testerComboBias: 0.93, notes: 'Early split route with a readable main line.' },
        { label: 'Tunnel Read', archetypeId: 'low-tunnel', fallbackArchetypeId: 'recovery-floor', mode: 'recovery', laneBias: 'low', onboardingBand: 'bridge', remixLevel: 0.24, widthScale: 1.02, gapScale: 0.92, riseScale: 0.86, supportChance: 0.42, connectorChance: 0.14, branchChance: 0.08, routeSplitBias: 0.58, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 1, testerGapBias: 0.96, testerRiseBias: 0.96, testerComboBias: 0.94, notes: 'Low ceiling sections should still preserve a clean main route.' },
        { label: 'Recovery Rail', archetypeId: 'recovery-floor', fallbackArchetypeId: 'intro-flats', mode: 'recovery', laneBias: 'mid', onboardingBand: 'bridge', remixLevel: 0.22, widthScale: 1.04, gapScale: 0.90, riseScale: 0.84, supportChance: 0.48, connectorChance: 0.10, branchChance: 0.06, routeSplitBias: 0.42, timeTrial: false, timeLimit: 0, bugBudgetBias: -1, bugBudgetCap: 1, testerGapBias: 0.95, testerRiseBias: 0.95, testerComboBias: 0.93, notes: 'Recovery stage with cleaner landing zones.' },
        { label: 'Switchback Study', archetypeId: 'alternating-heights', fallbackArchetypeId: 'stagger-jump', mode: 'switchback', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.28, widthScale: 1.00, gapScale: 0.96, riseScale: 0.90, supportChance: 0.34, connectorChance: 0.18, branchChance: 0.10, routeSplitBias: 0.64, timeTrial: false, timeLimit: 0, bugBudgetBias: 0, bugBudgetCap: 2, testerGapBias: 0.98, testerRiseBias: 0.98, testerComboBias: 0.96, notes: 'Alternating high-low rhythm with mild feints.' },
        { label: 'Stagger Sync', archetypeId: 'stagger-jump', fallbackArchetypeId: 'step-up', mode: 'tower', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.30, widthScale: 0.98, gapScale: 0.98, riseScale: 0.94, supportChance: 0.32, connectorChance: 0.18, branchChance: 0.10, routeSplitBias: 0.62, timeTrial: false, timeLimit: 0, bugBudgetBias: 0, bugBudgetCap: 2, testerGapBias: 1.00, testerRiseBias: 0.99, testerComboBias: 0.98, notes: 'Stagger cadence, but keep the main line readable.' },
        { label: 'Watchdog Sprint', archetypeId: 'intro-flats', fallbackArchetypeId: 'recovery-floor', mode: 'sprint', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.24, widthScale: 1.04, gapScale: 0.88, riseScale: 0.82, supportChance: 0.38, connectorChance: 0.14, branchChance: 0.04, routeSplitBias: 0.44, timeTrial: true, timeLimit: 32, bugBudgetBias: -1, bugBudgetCap: 1, testerGapBias: 0.95, testerRiseBias: 0.94, testerComboBias: 0.92, notes: 'Time trial should feel urgent, not unfair.' },
        { label: 'Fork Pressure', archetypeId: 'split-route', fallbackArchetypeId: 'recovery-floor', mode: 'fork', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.34, widthScale: 0.98, gapScale: 1.00, riseScale: 0.94, supportChance: 0.28, connectorChance: 0.20, branchChance: 0.16, routeSplitBias: 0.78, timeTrial: false, timeLimit: 0, bugBudgetBias: 0, bugBudgetCap: 2, testerGapBias: 1.00, testerRiseBias: 1.00, testerComboBias: 0.99, notes: 'Two-route pressure, but punish greed more than baseline progress.' },
        { label: 'Long Line', archetypeId: 'long-traversal', fallbackArchetypeId: 'intro-flats', mode: 'flow', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.36, widthScale: 0.98, gapScale: 1.02, riseScale: 0.94, supportChance: 0.28, connectorChance: 0.18, branchChance: 0.10, routeSplitBias: 0.62, timeTrial: false, timeLimit: 0, bugBudgetBias: 1, bugBudgetCap: 3, testerGapBias: 1.02, testerRiseBias: 1.00, testerComboBias: 1.00, notes: 'Long rhythm stage with no surprise ceiling traps.' },
        { label: 'Tower Filter', archetypeId: 'vertical-ladder', fallbackArchetypeId: 'step-up', mode: 'tower', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.38, widthScale: 0.96, gapScale: 0.98, riseScale: 0.98, supportChance: 0.24, connectorChance: 0.18, branchChance: 0.08, routeSplitBias: 0.58, timeTrial: false, timeLimit: 0, bugBudgetBias: 1, bugBudgetCap: 3, testerGapBias: 0.99, testerRiseBias: 1.02, testerComboBias: 1.00, notes: 'Vertical pressure without blind blockers.' },
        { label: 'Timed Switch', archetypeId: 'alternating-heights', fallbackArchetypeId: 'intro-flats', mode: 'switchback', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.32, widthScale: 1.00, gapScale: 0.94, riseScale: 0.90, supportChance: 0.30, connectorChance: 0.16, branchChance: 0.08, routeSplitBias: 0.58, timeTrial: true, timeLimit: 28, bugBudgetBias: 0, bugBudgetCap: 2, testerGapBias: 0.96, testerRiseBias: 0.96, testerComboBias: 0.94, notes: 'Timer pressure plus readable oscillation.' },
        { label: 'Precision Gate', archetypeId: 'precision-tower', fallbackArchetypeId: 'vertical-ladder', mode: 'tower', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.42, widthScale: 0.94, gapScale: 1.00, riseScale: 1.00, supportChance: 0.22, connectorChance: 0.14, branchChance: 0.10, routeSplitBias: 0.60, timeTrial: false, timeLimit: 0, bugBudgetBias: 1, bugBudgetCap: 3, testerGapBias: 1.00, testerRiseBias: 1.02, testerComboBias: 1.00, notes: 'High precision, but each leap must remain readable.' },
        { label: 'Gauntlet Parse', archetypeId: 'mixed-gauntlet', fallbackArchetypeId: 'long-traversal', mode: 'roller', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.44, widthScale: 0.94, gapScale: 1.02, riseScale: 0.98, supportChance: 0.22, connectorChance: 0.16, branchChance: 0.12, routeSplitBias: 0.72, timeTrial: false, timeLimit: 0, bugBudgetBias: 1, bugBudgetCap: 4, testerGapBias: 1.00, testerRiseBias: 1.00, testerComboBias: 1.00, notes: 'Late-run mixed pressure with no hidden choke points.' },
        { label: 'Watchdog Relay', archetypeId: 'long-traversal', fallbackArchetypeId: 'intro-flats', mode: 'sprint', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.38, widthScale: 1.00, gapScale: 0.96, riseScale: 0.90, supportChance: 0.26, connectorChance: 0.14, branchChance: 0.08, routeSplitBias: 0.56, timeTrial: true, timeLimit: 26, bugBudgetBias: 0, bugBudgetCap: 2, testerGapBias: 0.96, testerRiseBias: 0.96, testerComboBias: 0.94, notes: 'Late timer stage should still read like a fair race line.' },
        // New hard archetypes for late-game variety
        { label: 'Zigzag Blitz', archetypeId: 'zigzag-gauntlet', fallbackArchetypeId: 'alternating-heights', mode: 'switchback', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.50, widthScale: 0.92, gapScale: 1.04, riseScale: 1.02, supportChance: 0.18, connectorChance: 0.16, branchChance: 0.14, routeSplitBias: 0.68, timeTrial: false, timeLimit: 0, bugBudgetBias: 2, bugBudgetCap: 5, testerGapBias: 1.02, testerRiseBias: 1.02, testerComboBias: 1.02, notes: 'Aggressive zigzag with high obstacle density.' },
        { label: 'Skyline Climb', archetypeId: 'skyline-rush', fallbackArchetypeId: 'precision-tower', mode: 'tower', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.52, widthScale: 0.90, gapScale: 1.04, riseScale: 1.04, supportChance: 0.16, connectorChance: 0.14, branchChance: 0.12, routeSplitBias: 0.62, timeTrial: false, timeLimit: 0, bugBudgetBias: 2, bugBudgetCap: 5, testerGapBias: 1.02, testerRiseBias: 1.04, testerComboBias: 1.02, notes: 'Extreme height challenge.' },
        { label: 'Cascade Trial', archetypeId: 'cascade-drop', fallbackArchetypeId: 'mixed-gauntlet', mode: 'roller', laneBias: 'mid', onboardingBand: 'full', remixLevel: 0.48, widthScale: 0.92, gapScale: 1.02, riseScale: 1.00, supportChance: 0.20, connectorChance: 0.16, branchChance: 0.14, routeSplitBias: 0.70, timeTrial: true, timeLimit: 24, bugBudgetBias: 1, bugBudgetCap: 4, testerGapBias: 1.00, testerRiseBias: 1.02, testerComboBias: 1.00, notes: 'Timed cascade with elevation swings.' },
        { label: 'Spine Walker', archetypeId: 'narrow-spine', fallbackArchetypeId: 'zigzag-gauntlet', mode: 'switchback', laneBias: 'high', onboardingBand: 'full', remixLevel: 0.54, widthScale: 0.88, gapScale: 1.06, riseScale: 1.04, supportChance: 0.14, connectorChance: 0.14, branchChance: 0.16, routeSplitBias: 0.72, timeTrial: false, timeLimit: 0, bugBudgetBias: 2, bugBudgetCap: 6, testerGapBias: 1.04, testerRiseBias: 1.04, testerComboBias: 1.04, notes: 'Narrow platforms with dense hazards.' },
    ];

    const blueprints = [];
    const total = 80;

    for (let i = 0; i < total; i++) {
        const stageIndex = i + 1;
        const cycle = Math.floor(i / templates.length);
        const template = templates[i % templates.length];
        const blueprint = {
            ...template,
            id: `seed-${String(stageIndex).padStart(3, '0')}`,
            stageIndex,
            label: cycle > 0 ? `${template.label} Mk.${cycle + 1}` : template.label,
            remixLevel: Number(Math.min(0.92, template.remixLevel + cycle * 0.06).toFixed(3)),
            gapScale: Number(Math.min(1.24, template.gapScale + Math.min(0.28, cycle * 0.05 + Math.floor(i / 5) * 0.004)).toFixed(3)),
            riseScale: Number(Math.min(1.16, template.riseScale + Math.min(0.20, cycle * 0.04 + Math.floor(i / 7) * 0.003)).toFixed(3)),
            widthScale: Number(Math.max(0.82, template.widthScale - Math.min(0.20, cycle * 0.04)).toFixed(3)),
            supportChance: Number(Math.max(0.10, template.supportChance - Math.min(0.24, cycle * 0.04)).toFixed(3)),
            connectorChance: Number(Math.min(0.34, template.connectorChance + Math.min(0.12, cycle * 0.025)).toFixed(3)),
            branchChance: Number(Math.min(0.24, template.branchChance + Math.min(0.12, cycle * 0.025)).toFixed(3)),
            bugBudgetBias: Math.min(4, template.bugBudgetBias + cycle * 2),
            bugBudgetCap: stageIndex <= 4 ? 0 : stageIndex <= 8 ? Math.min(template.bugBudgetCap, 1) : template.bugBudgetCap + cycle,
            timeTrial: stageIndex >= 8 && stageIndex % 4 === 0 ? true : template.timeTrial,
            timeLimit: stageIndex >= 8 && stageIndex % 4 === 0 ? Math.max(18, (template.timeLimit || 32) - cycle * 2) : (template.timeTrial ? Math.max(18, template.timeLimit - cycle * 2) : 0),
        };

        if (!blueprint.timeTrial) {
            blueprint.timeLimit = 0;
        }

        blueprints.push(blueprint);
    }

    window.AI_STAGE_LIBRARY = {
        version: 2,
        provider: 'seeded-fallback',
        model: 'deterministic-template-ring-v2',
        generatedAt: '2026-04-18T00:00:00Z',
        blueprints,
    };
})();
