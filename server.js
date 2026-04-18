const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── JSON File Database ──────────────────────────────────────
const DB_PATH = path.join(__dirname, 'leaderboard.json');
const LB_MAX = 20;

function readDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        }
    } catch (err) {
        console.error('Error reading database:', err.message);
    }
    return [];
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing database:', err.message);
    }
}

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    writeDB([]);
}

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname, {
    index: 'index.html',
    extensions: ['html', 'js', 'css'],
}));

// ── API Routes ──────────────────────────────────────────────

// GET /api/leaderboard - Retrieve top scores
app.get('/api/leaderboard', (req, res) => {
    try {
        const scores = readDB();
        res.json({ success: true, leaderboard: scores });
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
});

// POST /api/leaderboard - Save a new score
app.post('/api/leaderboard', (req, res) => {
    try {
        const { name, stage, dist, score } = req.body;

        if (typeof score !== 'number' || typeof stage !== 'number') {
            return res.status(400).json({ success: false, error: 'Invalid score data' });
        }

        const playerName = (name || 'anonymous').slice(0, 16);
        const now = Date.now();

        const leaderboard = readDB();
        leaderboard.push({
            name: playerName,
            stage,
            dist: dist || 0,
            score,
            time: now,
        });

        // Sort by score descending, keep top N
        leaderboard.sort((a, b) => b.score - a.score);
        while (leaderboard.length > LB_MAX) leaderboard.pop();

        writeDB(leaderboard);
        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error('Error saving score:', err);
        res.status(500).json({ success: false, error: 'Failed to save score' });
    }
});

// DELETE /api/leaderboard - Clear all scores
app.delete('/api/leaderboard', (req, res) => {
    try {
        writeDB([]);
        res.json({ success: true, leaderboard: [] });
    } catch (err) {
        console.error('Error clearing leaderboard:', err);
        res.status(500).json({ success: false, error: 'Failed to clear leaderboard' });
    }
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
    const count = readDB().length;
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║   HOTFIX: THE GAME — Server Running          ║');
    console.log(`  ║   http://localhost:${PORT}                       ║`);
    console.log(`  ║   Database: leaderboard.json (${count} scores)     ║`);
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
});
