# Gameplay Mechanics & Code Analysis

## Overview
Game chạy theo vòng lặp: **Input → Physics Update → Render → Loop**. Mỗi frame (60fps) thực hiện tất cả hành động của player.

---

## 1. PHYSICS & PLAYER MOVEMENT

### 1.1 Constants (game.js line 7-17)
```javascript
const GRAVITY = 0.65;           // Lực kéo xuống mỗi frame
const PLAYER_SPEED = 4.5;       // Tốc độ tối đa di chuyển ngang
const PLAYER_ACCEL = 0.6;       // Gia tốc khi nhấn phím
const PLAYER_DECEL = 0.4;       // Giảm tốc khi thả phím
const JUMP_FORCE = -13;         // Lực nhảy (âm = hướng lên)
const DASH_SPEED = 15;          // Tốc độ khi dash
const DASH_DURATION = 6;        // Số frame dash kéo dài
const DASH_COOLDOWN = 40;       // Thời gian chờ dash
const MAX_FALL_SPEED = 14;      // Tốc độ rơi tối đa
const COYOTE_TIME = 6;          // Frame có thể nhảy sau rời mặt đất
const JUMP_BUFFER = 8;          // Frame lưu lệnh nhảy trước (e.g., nhấn sớm hơi)
```

**Công dụng**: Định nghĩa mô phỏng vật lý 2D kiểu platformer.

### 1.2 Player Object (game.js line 295-304)
```javascript
const player = {
    x: 0,                   // Position X (pixel)
    y: 0,                   // Position Y (pixel)
    vx: 0,                  // Velocity X (pixel/frame)
    vy: 0,                  // Velocity Y (pixel/frame) - âm = lên, dương = xuống
    width: 16,              // Player hitbox width
    height: 20,             // Player hitbox height
    onGround: false,        // Có đứng trên platform?
    coyoteCounter: 6,       // Frame còn lại có thể nhảy
    dashTimer: 0,           // Frame còn lại dash
    dashCooldown: 0,        // Frame chờ dash tiếp theo
    dashDirX: 0,            // Hướng dash (1 hoặc -1)
    facingRight: true,      // Hướng nhìn
    airJumpsRemaining: 0,   // Nhảy không khí còn lại (double jump)
    trail: [],              // Đường đi cho visual effect
};
```

### 1.3 Main Update Loop - updatePlayer() (game.js line 3366)
```javascript
function updatePlayer() {
    if (gameState !== 'playing') return;  // Chỉ update khi đang chơi

    const wasOnGround = player.onGround;  // Lưu trạng thái trước
    const verticalSpeedBeforeStep = player.vy;
    updateDynamicObstacles();
```

---

## 2. INPUT HANDLING

### 2.1 Key Tracking (game.js line 247-249)
```javascript
const keys = {};

window.addEventListener('keydown', event => {
    if (document.activeElement === playerNameInput) return;  // Ignore nếu nhập tên
    
    keys[event.key.toLowerCase()] = true;  // 'a', 'd', 'w', ' ', 'shift'
    keys[event.code] = true;                // 'ArrowLeft', 'ArrowRight', 'ShiftLeft'
    
    if (event.key === 'Enter' && gameState === 'title') startGame();
    if ((event.key === 'r' || event.key === 'R') && (gameState === 'dead' || gameState === 'won')) handleRespawn();
    if ((event.key === 'w' || event.key === ' ') && gameState === 'playing') jumpBufferCounter = JUMP_BUFFER;  // Jump buffer
});

window.addEventListener('keyup', event => {
    keys[event.key.toLowerCase()] = false;
    keys[event.code] = false;
});
```

### 2.2 Horizontal Movement (game.js line 3374-3387)
```javascript
// 🎮 INPUT
let inputX = 0;
if (keys.a || keys.arrowleft) inputX -= 1;  // A = -1
if (keys.d || keys.arrowright) inputX += 1; // D = +1

// 🎮 DASH (ghi đè hết)
if (player.dashTimer > 0) {
    player.vx = player.dashDirX * DASH_SPEED;  // Lock vx = 15 (tốc độ dash)
    player.vy = 0;                             // Buộc không rơi
    player.dashTimer--;                        // Count down dash
    
    if (frameCount % 2 === 0) {                // Mỗi 2 frame vẽ hạt
        spawnParticle(...);  // Tạo hiệu ứng dash
    }
} else {
    // 🎮 NORMAL MOVEMENT
    if (inputX !== 0) {
        player.vx += inputX * PLAYER_ACCEL;              // Cộng 0.6 hoặc -0.6
        player.vx = clamp(player.vx, -PLAYER_SPEED, PLAYER_SPEED);  // Giới hạn ±4.5
        player.facingRight = inputX > 0;                 // Update hướng
    } else if (Math.abs(player.vx) < PLAYER_DECEL) {
        player.vx = 0;                                   // Dừng hoàn toàn nếu chậm
    } else {
        player.vx -= Math.sign(player.vx) * PLAYER_DECEL;  // Giảm dần 0.4
    }
}
```

**Chi tiết**:
- **Input A/D hoặc Mũi tên**: Tăng vx (+0.6 hoặc -0.6 mỗi frame)
- **Không input**: Giảm vx dần (deceleration -0.4)
- **Dash**: Vx = 15 ngay lập tức, vy = 0

### 2.3 Jump & Air Jump (game.js line 3391-3415)
```javascript
// 🎮 COYOTE TIME - cho phép nhảy 6 frame sau rời platform
if (player.onGround) player.coyoteCounter = COYOTE_TIME;  // Reset nếu đứng
else player.coyoteCounter--;                               // Countdown nếu bay

// 🎮 JUMP BUFFER & EXECUTION
if (jumpBufferCounter > 0) {
    jumpBufferCounter--;  // Countdown buffer
    
    if (player.coyoteCounter > 0 || player.airJumpsRemaining > 0) {
        const usingAirJump = player.coyoteCounter <= 0;  // True nếu dùng double jump
        
        player.vy = JUMP_FORCE;  // vy = -13 (lên)
        if (usingAirJump) {
            player.vy *= 0.96;                      // Air jump yếu hơn 4%
            player.airJumpsRemaining--;             // Trừ 1 double jump
        }
        
        player.onGround = false;
        player.coyoteCounter = 0;                   // Consume coyote
        jumpBufferCounter = 0;                      // Consume buffer
        
        audioManager.playJump();                    // Sound
        
        // Vẽ hạt
        for (let i = 0; i < 6; i++) {
            spawnParticle(
                player.x + player.width / 2 + (Math.random() - 0.5) * 14,
                player.y + player.height,
                (Math.random() - 0.5) * 3,
                -Math.random() * 2,
                usingAirJump ? COLORS.playerDash : COLORS.playerGlow,
                15, 2
            );
        }
    }
}
```

**Chi tiết**:
- **Coyote Time**: Cho phép nhảy trong 6 frame sau khi rời platform
- **Jump Buffer**: Lưu lệnh nhảy trước 8 frame
- **Max 1 Air Jump**: Khi double jump unlock, được nhảy 1 lần không trên platform

### 2.4 Dash Activation (game.js line 3419-3433)
```javascript
// 🎮 DASH INPUT (SHIFT)
if ((keys.shift || keys.ShiftLeft || keys.ShiftRight) && 
    player.dashCooldown <= 0 &&            // Dash cooldown xong?
    player.dashTimer <= 0) {               // Không đang dash?
    
    player.dashTimer = DASH_DURATION;      // Set timer = 6 frame
    player.dashCooldown = DASH_COOLDOWN;   // Set cooldown = 40 frame
    player.dashDirX = inputX !== 0 ? inputX : (player.facingRight ? 1 : -1);  // Hướng
    player.vy = 0;                         // Bắt buộc không rơi
    
    audioManager.playDash();                // Sound
    spawnExplosion(...);                    // Visual
}

// 🎮 COOLDOWN COUNTDOWN
if (player.dashCooldown > 0) player.dashCooldown--;
```

**Chi tiết**:
- Dash kéo 6 frame ở tốc độ 15
- Phải chờ 40 frame trước dash tiếp theo
- Hướng = input hoặc facing direction

### 2.5 Jump Cut (Early Release) (game.js line 3435-3437)
```javascript
// 🎮 JUMP CUT - Thả phím = giảm jump height
if (keys.w !== true && keys[' '] !== true && keys.Space !== true) {
    if (player.vy < -3) player.vy *= 0.85;  // Nhân 0.85 = giảm 15% độ cao peak
}
```

**Công dụng**: Player có thể nhảy thấp hoặc cao bằng cách thả phím sớm.

---

## 3. GRAVITY & FALLING

### 3.1 Apply Gravity (game.js line 3437-3441)
```javascript
// 🎮 GRAVITY (không apply khi dash)
if (player.dashTimer <= 0) {
    player.vy += GRAVITY;                    // Cộng 0.65 mỗi frame
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;  // Cap ở 14
}
```

---

## 4. COLLISION DETECTION

### 4.1 AABB (Axis-Aligned Bounding Box) (game.js line 630-636)
```javascript
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
}
```

**Công dụng**: Kiểm tra 2 hộp (player & platform) có chạm không.

### 4.2 Horizontal Collision (game.js line 3442-3452)
```javascript
// 🔄 UPDATE X
player.x += player.vx;  // Cập nhật position

// 🛑 CHECK COLLISION (ngang)
for (const platform of platforms) {
    if (aabb(player.x, player.y, player.width, player.height, 
             platform.x, platform.y, platform.w, platform.h)) {
        if (player.vx > 0) player.x = platform.x - player.width;  // Chạm phải
        else if (player.vx < 0) player.x = platform.x + platform.w;  // Chạm trái
        player.vx = 0;  // Dừng di chuyển ngang
    }
}
```

### 4.3 Vertical Collision (game.js line 3454-3470)
```javascript
// 🔄 UPDATE Y
player.y += player.vy;  // Cập nhật vị trí rơi/nhảy
player.onGround = false;  // Reset (sẽ set lại nếu chạm platform)

// 🛑 CHECK COLLISION (dọc)
for (const platform of platforms) {
    if (aabb(player.x, player.y, player.width, player.height, 
             platform.x, platform.y, platform.w, platform.h)) {
        if (player.vy > 0) {  // Rơi xuống
            player.y = platform.y - player.height;  // Đứng trên platform
            player.vy = 0;
            player.onGround = true;  // ✅ Landing!
        } else if (player.vy < 0) {  // Nhảy lên, chạm ceiling
            player.y = platform.y + platform.h;
            player.vy = 0;
        }
    }
}
```

### 4.4 Landing Audio (game.js line 3472-3474)
```javascript
// 🔊 LAND SOUND - chỉ khi rơi từ cao
if (!wasOnGround && player.onGround && verticalSpeedBeforeStep > 4) {
    audioManager.playLand(clamp(verticalSpeedBeforeStep / MAX_FALL_SPEED, 0.6, 1.2));
}
```

---

## 5. HAZARD COLLISION & DEATH

### 5.1 Obstacle Types (game.js line 2058-2140)
```javascript
function buildObstacleFromSlot(slot, type, stageData) {
    if (type === 'laser') {
        return {
            x: slot.x - 3,
            y: slot.y - 92,
            w: 6,
            h: 92,           // Vertical laser
            type: 'laser',
            phase: Math.random() * Math.PI * 2,
            threat: slot.threat,
        };
    }
    
    if (type === 'turret') {
        return {
            x: bodyX,
            y: slot.y - 24,
            w: 22,
            h: 24,           // Turret phóng đạn
            type: 'turret',
            fireDir: slot.align >= 0.5 ? -1 : 1,
            fireRate: stageData.stageIndex <= 6 ? 102 : 82,  // Frame giữa phát
            bulletSpeed: 5.2 + stageData.stageIndex * 0.1,
            bulletRange: 210 + stageData.stageIndex * 5,
        };
    }
    
    if (type === 'spike') {
        return {
            x: slot.x - 12,
            y: slot.y - 16,
            w: 24,
            h: 16,           // Spike tĩnh
            type: 'spike',
        };
    }
    
    if (type === 'crawler') {
        return {
            x: slot.x - 12,
            y: slot.y - 18,
            w: 24,
            h: 18,           // Crawler di chuyển
            type: 'crawler',
            range: Math.max(18, Math.min(46, slot.platform.w * 0.22)),
            moveSpeed: 0.045 + stageData.stageIndex * 0.002,
            sweepMin, sweepMax,  // Phạm vi di chuyển
        };
    }
    
    // Default: bug
    return {
        x: slot.x - 15,
        y: slot.y - 30,
        w: 30,
        h: 30,               // Bug tĩnh
        type: 'bug',
    };
}
```

### 5.2 Hazard Hitbox (game.js line 3488-3497)
```javascript
// 🛑 CHECK HAZARD COLLISION
for (const obstacle of aiObstacles) {
    if (aabb(player.x + 2, player.y + 2,           // Player shrink hitbox 2px
             player.width - 4, player.height - 4,
             obstacle.x, obstacle.y, obstacle.w, obstacle.h)) {
        playerDeath(obstacle.type);  // Type: 'bug'|'laser'|'spike'|'turret'|'crawler'
        return;
    }
}

// 🛑 CHECK PROJECTILE (từ turret)
for (const projectile of obstacleProjectiles) {
    if (aabb(player.x + 2, player.y + 2, player.width - 4, player.height - 4,
             projectile.x, projectile.y, projectile.w, projectile.h)) {
        playerDeath('projectile');
        return;
    }
}
```

### 5.3 Death Handler (game.js line 3600-3630)
```javascript
function playerDeath(cause) {
    currentTime = performance.now() - runStartTime;
    gameState = 'dead';
    audioManager.syncMix();
    
    analytics.stageDeaths++;
    analytics.totalRuns++;
    
    // 📊 Học hỏi từ cái chết
    aiProfile.recentDeaths.push({
        stageIndex: currentStage,
        cause,  // Nguyên nhân: bug|laser|spike|turret|crawler|void|timeout
        archetypeId: currentStageData?.archetypeId,
    });
    if (aiProfile.recentDeaths.length > 6) aiProfile.recentDeaths.shift();
    
    // 🎨 Visual effect
    spawnExplosion(player.x + player.width / 2, 
                   player.y + player.height / 2, 
                   COLORS.deathZone, 20);
    
    // 🔊 Sound
    audioManager.playDeath(cause);
    
    // 📝 Message
    const messages = {
        bug: 'Caught by a Bug patch. Exception thrown.',
        laser: 'Terminated by Laser firewall. Access denied.',
        spike: 'Impaled on Spike assertion. Stack trace lost.',
        turret: 'Tagged by a Sentry Turret. Runtime punctured.',
        crawler: 'Pinned by a Moving Crawler. Route collapsed.',
        void: 'Segmentation fault. Player fell out of scope.',
        timeout: `Process timed out after ${timeLimit}s. Killed by watchdog.`,
    };
    
    deathMessage.textContent = messages[cause] || 'Process terminated unexpectedly.';
    deathOverlay.classList.remove('hidden');
    
    logConsole(`[ERROR]: ${messages[cause]}`, 'error');
}
```

---

## 6. WIN CONDITION

### 6.1 Goal Detection & Win (game.js line 3501-3505)
```javascript
// 🎯 CHECK GOAL COLLISION
if (aabb(player.x, player.y, player.width, player.height, 
         goal.x, goal.y, goal.w, goal.h)) {
    playerWin();
    return;
}

// ⏰ CHECK VOID DEATH
if (player.y > canvas.height + 60) {
    playerDeath('void');
    return;
}

// ⏱️ CHECK TIME TRIAL TIMEOUT
if (isTimeTrial && timeLimit > 0 && currentTime / 1000 > timeLimit) {
    playerDeath('timeout');
}
```

### 6.2 Win Handler (game.js line 3632-3662)
```javascript
function playerWin() {
    currentTime = performance.now() - runStartTime;
    gameState = 'won';
    audioManager.syncMix();
    
    analytics.totalRuns++;
    analytics.stagesCompleted++;
    
    // 🏆 Best time tracking
    if (currentTime < bestTime) {
        bestTime = currentTime;
        hudBest.textContent = formatTime(bestTime);
        logConsole(`[SYSTEM]: New best split: ${formatTime(bestTime)}`, 'success');
    }
    
    // 📊 AI Learning - phân tích đường đi
    learnFromClearedStage(currentStageData, currentPath);
    
    // 🔊 Sound & effects
    spawnExplosion(goal.x + goal.w / 2, goal.y + goal.h / 2, COLORS.goal, 24);
    audioManager.playWin();
    
    // 📝 UI
    winOverlay.classList.remove('hidden');
    winTime.textContent = formatTime(currentTime);
    
    logConsole(`[SYSTEM]: Stage ${currentStage} cleared in ${formatTime(currentTime)}.`, 'success');
}
```

---

## 7. PLATFORM DYNAMICS

### 7.1 Platform Generation (game.js line 1261-1288)
```javascript
function buildIntroFlats(archetype) {
    const ground = canvas.height - 56;      // Y cho spawn
    const floorY = canvas.height - 34;      // Y cho safety floor
    
    // 📐 Tạo platforms
    const spawn = createPlatform(30, ground, 220, 'spawn', 'mid');
    const p1 = createPlatform(320, ground - 8, 170, 'main', 'mid');      // X, Y, Width
    const p2 = createPlatform(590, ground - 16, 160, 'main', 'mid');
    const p3 = createPlatform(850, ground - 4, 170, 'main', 'mid');
    const goalPlat = createPlatform(1110, ground - 12, 220, 'goal', 'mid');
    const floor = createPlatform(720, floorY, 120, 'floor', 'low', FLOOR_HEIGHT);
    
    // 🎯 Hazard slots
    const bugSlots = [
        makeSurfaceSlot(p1, 0.74, 'mid', ['speed'], 0.9, ['bug'], 1),
        // Platform, alignment (0-1), lane, tags, threat level, types, min stage
        makeSurfaceSlot(p2, 0.28, 'mid', ['jump'], 1.0, ['spike', 'bug'], 2),
        makeSurfaceSlot(p3, 0.58, 'mid', ['speed', 'hesitation'], 1.15, ['bug', 'spike'], 3),
    ];
    
    return finishStage(archetype, 
                       [spawn, p1, p2, floor, p3, goalPlat],  // All platforms
                       spawn,                                  // Spawn point
                       goalPlat,                               // Goal point
                       bugSlots);                              // Hazard slots
}
```

**Công dụng**: Hardcode 12+ archetype layout. Ví dụ intro-flats có 5-6 platforms trên 1 đường thẳng.

### 7.2 Route Validation (game.js line 2282-2330)
```javascript
function getReachMetrics(from, to, stagePlatforms = [from, to]) {
    // 📏 Tính khoảng cách
    const rise = from.y - to.y;      // Bao nhiêu pixel lên
    const gap = platformGap(from, to); // Khoảng các ngang
    
    // ❌ Fail nếu quá cao hoặc quá xa
    if (rise > MAX_JUMP_V + 14) return null;  // Cao hơn max jump height
    if (gap > MAX_DASH_H + 24) return null;   // Xa hơn max dash distance
    
    // ✅ Nếu trên cùng X, dễ
    if (gap === 0 && to.y >= from.y) {
        const centerDistance = Math.abs((to.x + to.w / 2) - (from.x + from.w / 2));
        return {
            eta: Math.max(0.16, centerDistance / (PLAYER_SPEED * 60)),
            dashRequired: false,
        };
    }
    
    // 🔄 Simulate traverse (không dash)
    const direction = to.x + to.w / 2 >= from.x + from.w / 2 ? 1 : -1;
    const noDash = simulateTraversePattern(from, to, stagePlatforms, direction, null);
    let bestDash = null;
    
    // 🔄 Simulate với dash ở frame khác nhau
    for (const dashStartFrame of REACH_DASH_STARTS) {  // [6, 8, 10, 12]
        const candidate = simulateTraversePattern(from, to, stagePlatforms, direction, dashStartFrame);
        if (!candidate) continue;
        if (!bestDash || candidate.eta < bestDash.eta) bestDash = candidate;
    }
    
    // 📊 Return best route
    if (noDash) {
        return {
            eta: noDash.eta,
            optimalEta: Math.min(noDash.eta, bestDash ? bestDash.eta : Infinity),
            dashRequired: false,
        };
    }
    if (bestDash) {
        return {
            eta: bestDash.eta,
            optimalEta: bestDash.eta,
            dashRequired: true,
        };
    }
    return null;
}
```

**Công dụng**: Kiểm tra platform A → B có đạt được không bằng cách simulate gameplay.

### 7.3 Simulation (game.js line 2241-2280)
```javascript
function simulateTraversePattern(from, to, stagePlatforms, direction, dashStartFrame = null) {
    // 🎮 Simulate player chạy từ platform A sang B
    const startX = direction > 0
        ? from.x + from.w - player.width - 1   // Position cuối platform
        : from.x + 1;                          // Position đầu
    
    let x = startX, y = from.y - player.height, vx = estimateTakeoffSpeed(from) * direction, vy = JUMP_FORCE;
    let dashFrames = 0, usedDash = false;
    
    // 🔄 Frame  by frame
    for (let frame = 1; frame <= REACH_SIM_FRAMES; frame++) {  // 72 frames = 1.2 giây
        // 🔄 Check dash activation
        if (dashStartFrame !== null && !usedDash && frame >= dashStartFrame) {
            dashFrames = DASH_DURATION;  // 6
            usedDash = true;
            vy = 0;
        }
        
        // 🎬 Physics
        if (dashFrames > 0) {
            vx = direction * DASH_SPEED;  // 15
            vy = 0;
            dashFrames--;
        } else {
            vx = clamp(vx + direction * PLAYER_ACCEL, -PLAYER_SPEED, PLAYER_SPEED);  // 4.5
            vy = Math.min(vy + GRAVITY, MAX_FALL_SPEED);  // 0.65
        }
        
        // 🛑 Horizontal collision
        x += vx;
        for (const platform of stagePlatforms) {
            if (!aabb(x, y, player.width, player.height, 
                     platform.x, platform.y, platform.w, platform.h)) continue;
            if (vx > 0) x = platform.x - player.width;
            else if (vx < 0) x = platform.x + platform.w;
            vx = 0;
        }
        
        // 🛑 Vertical collision
        y += vy;
        let landedPlatform = null;
        for (const platform of stagePlatforms) {
            if (!aabb(x, y, player.width, player.height, 
                     platform.x, platform.y, platform.w, platform.h)) continue;
            if (vy > 0) {
                y = platform.y - player.height;
                vy = 0;
                landedPlatform = platform;
            } else if (vy < 0) {
                y = platform.y + platform.h;
                vy = 0;
            }
        }
        
        // ✅ Landing check
        if (landedPlatform) {
            if (landedPlatform !== to) return null;  // Sai platform
            
            const center = x + player.width / 2;
            const safeCenterMin = to.x + 8 + player.width / 2;
            const safeCenterMax = to.x + to.w - 8 - player.width / 2;
            
            if (center >= safeCenterMin && center <= safeCenterMax) {
                return {
                    eta: frame / 60,         // Thời gian (giây)
                    dashRequired: usedDash,
                };
            }
            return null;  // Landing sai vị trí
        }
        
        // ❌ Timeout hoặc ra ngoài
        if (y > canvas.height + 180) break;
        if (direction > 0 && x > to.x + to.w + MAX_DASH_H) break;
        if (direction < 0 && x + player.width < to.x - MAX_DASH_H) break;
    }
    return null;
}
```

---

## 8. MAIN GAME LOOP

### 8.1 Tick Function (game.js line 3341-3353)
```javascript
function tick() {
    frameCount++;
    
    // 🎮 UPDATE
    if (gameState === 'playing') {
        updatePlayer();      // Physics, input, collision
        updateCamera();      // Scroll camera (follow player)
        updateParticles();   // Vẽ hiệu ứng
    } else if (gameState === 'dead' || gameState === 'won') {
        updateParticles();   // Vẽ overlay effects
    }
    
    // 🎨 RENDER
    if (!gameScreen.classList.contains('hidden')) {
        draw();              // Vẽ canvas
    }
    
    // 🔄 NEXT FRAME
    requestAnimationFrame(gameLoop);
}
```

### 8.2 Main Game Loop (game.js line 4602-4614)
```javascript
function gameLoop() {
    frameCount++;
    
    if (gameState === 'playing') {
        updatePlayer();        // Input + Physics + Collision
        updateCamera();        // Follow player
        updateParticles();     // Tính animation hạt
    } else if (gameState === 'dead' || gameState === 'won') {
        updateParticles();
    }
    
    if (!gameScreen.classList.contains('hidden')) {
        draw();                // Vẽ canvas
    }
    
    requestAnimationFrame(gameLoop);  // 60 FPS
}
```

---

## 9. STAGE GENERATION FLOW

### 9.1 Build Stage (game.js line 3038-3048)
```javascript
function buildValidatedStage(stageIndex) {
    const limitedTime = isLimitedTimeStage(stageIndex);
    const aiSummary = computeAIProfileSummary();  // Phân tích player style
    
    // 🎯 Build primary stage
    const primaryDirector = buildStageDirector(stageIndex, aiSummary, limitedTime, 0);
    const primaryArchetype = selectArchetypeForStage(stageIndex, limitedTime, primaryDirector);
    let stageData = createStageCandidate(stageIndex, primaryArchetype, aiSummary, 
                                        { director: primaryDirector });
    let fitted = fitValidatedVariant(stageData);  // Validate + repair
    
    if (fitted.valid) {
        // ✅ Primary passed
        stageData.validation = fitted.validation;
        stageData.obstacles = fitted.obstacles;
        return stageData;
    }
    
    // 🔄 FALLBACK 1: Dễ hơn
    const fallbackDirector = buildStageDirector(stageIndex, aiSummary, limitedTime, 1);
    const fallbackArchetype = pickFallbackArchetype(stageIndex, primaryArchetype, limitedTime, fallbackDirector);
    stageData = createStageCandidate(stageIndex, fallbackArchetype, aiSummary, 
                                    { director: fallbackDirector, fallbackLevel: 1 });
    fitted = fitValidatedVariant(stageData);
    
    if (fitted.valid) {
        return stageData;
    }
    
    // 🔄 FALLBACK 2: Dễ nhất
    const safeFallback = buildSafeFallbackStage(stageIndex, aiSummary);
    if (!safeFallback.validation.valid) {
        logConsole(`[ERROR]: Safe fallback failed for stage ${stageIndex}.`, 'error');
    }
    return safeFallback;
}
```

### 9.2 Tester Squad (game.js line 1813-1890)
```javascript
function runTesterSquad(stageData, validation) {
    // 👥 3 tester profiles: scout, runner, architect
    const results = TESTER_PROFILES.map(profile => {
        const budgets = getTesterBudgets(stageData, profile);
        const reasons = [];
        
        // 🎯 Test từng edge
        for (let i = 0; i < route.length - 1; i++) {
            const from = route[i];
            const to = route[i + 1];
            const move = getReachMetrics(from, to, stageData.platforms);
            
            const gap = platformGap(from, to);
            const rise = Math.max(0, from.y - to.y);
            const comboLoad = gap + rise * 0.78 + (move.dashRequired ? 30 : 0);
            
            // ❌ Check fail conditions
            if (gap > budgets.gapBudget) reasons.push(`edge-gap`);
            if (rise > budgets.riseBudget) reasons.push(`edge-rise`);
            if (comboLoad > budgets.comboBudget) reasons.push(`edge-combo`);
            if (move.dashRequired && dashStreak > budgets.maxDashStreak) reasons.push('dash-streak');
        }
        
        return {
            id: profile.id,
            label: profile.label,
            pass: reasons.length === 0,  // ✅ hoặc ❌
            reasons,
        };
    });
    
    const passCount = results.filter(r => r.pass).length;
    const requiredPasses = stageData.isTimeTrial ? 3 : 2;  // Architect + 1 nữa
    
    return {
        ok: passCount >= requiredPasses,
        passCount,
        results,
    };
}
```

---

## 10. QUICK REFERENCE FLOW

```
┌─────────────────────────────────────────────────┐
│ GAME LOOP (60 FPS)                               │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. INPUT: keys.a/d → inputX, keys.shift → dash │
│     keys.w → jumpBuffer                          │
│                                                   │
│  2. PHYSICS:                                      │
│     a) Dash check + timer countdown             │
│     b) Acceleration/deceleration (inputX)       │
│     c) Coyote time countdown                    │
│     d) Jump buffer + air jump check             │
│     e) Gravity += 0.65                          │
│     f) Cap velocity                             │
│                                                   │
│  3. COLLISION:                                    │
│     a) X += vx; check platform X collision     │
│     b) Y += vy; check platform Y collision     │
│     c) Check onGround → coyote reset            │
│     d) Check hazard collision → death           │
│     e) Check goal collision → win               │
│                                                   │
│  4. CAMERA: follow player.x * 0.3 offset       │
│                                                   │
│  5. RENDER: draw() all sprites, HUD             │
│                                                   │
│  6. NEXT FRAME: requestAnimationFrame()         │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 11. KEY CODE SNIPPETS

### Velocity Formula
```javascript
// Horizontal
vx += inputX * PLAYER_ACCEL;           // +0.6 hoặc -0.6 mỗi input frame
vx = clamp(vx, -PLAYER_SPEED, PLAYER_SPEED);  // Max ±4.5

// Vertical (gravity)
vy += GRAVITY;                         // +0.65 mỗi frame (không dash)
vy = Math.min(vy, MAX_FALL_SPEED);     // Cap ở 14
```

### Jump Physics
```javascript
vy = JUMP_FORCE;                       // -13 (up)
if (usingAirJump) vy *= 0.96;          // Air jump 4% weaker
```

### Collision Resolution
```javascript
// Horizontal
player.x += player.vx;
if (collides) {
    player.x = (vx > 0) ? platform.x - player.width : platform.x + platform.w;
    player.vx = 0;
}

// Vertical
player.y += player.vy;
if (collides) {
    if (vy > 0) {
        player.y = platform.y - player.height;
        player.onGround = true;
    } else {
        player.y = platform.y + platform.h;
    }
    player.vy = 0;
}
```

---

## 12. Stage Index to Difficulty Mapping

```javascript
isLimitedTimeStage(stageIndex) = stageIndex >= 8 && stageIndex % 4 === 0
// Stages 8, 12, 16, 20, ... có timer

stageTier(stageIndex) = (stageIndex - 1) // 5
// Tier 0 = stages 1-5
// Tier 1 = stages 6-10
// Tier 2 = stages 11-15

DOUBLE_JUMP_UNLOCK_STAGE = 10
// Stage 10+ unlock double jump
```

---

## 13. Performance Notes

- **60 FPS target**: requestAnimationFrame every frame
- **Collision checks**: O(n²) per platform vs obstacles (small n, acceptable)
- **Pathfinding**: Dijkstra pre-computed at stage generation (not runtime)
- **Audio**: Web Audio API synthesis (no MP3s, small file size)
- **Canvas rendering**: 2D context, optimized draw order (back to front)
