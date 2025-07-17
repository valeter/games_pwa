// Set up canvas to fill the screen and handle resize
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Star parameters
const STAR_COLORS = [
    '#ffffff', // white
    '#ffe9c4', // warm white
    '#d4fbff', // blueish
    '#ffd700', // yellow
    '#ffb6c1', // pink
    '#b0e0e6', // pale blue
];
const STAR_MIN_RADIUS = 0.5;
const STAR_MAX_RADIUS = 2.2;
const STAR_DENSITY = 0.00018; // stars per pixel
let stars = [];

function generateStars() {
    const area = canvas.width * canvas.height;
    const starCount = Math.floor(area * STAR_DENSITY);
    stars = [];
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS),
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
        });
    }
}

function drawStars() {
    for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

let scale = 1;
if (window.innerWidth < 500) {
    scale = 0.7;
}

// Ship parameters
const SHIP_WIDTH = 100 * scale;
const SHIP_HEIGHT = 100 * scale;
const SHIP_MARGIN = 50 * scale;
let shipX = 0;
let shipY = 0;

function resetShipPosition() {
    shipX = canvas.width / 2;
    shipY = canvas.height * 0.6;
}

function drawShip() {
    if (shipImg.complete && shipImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(shipX, shipY);
        ctx.drawImage(
            shipImg,
            -SHIP_WIDTH / 2,
            -SHIP_HEIGHT / 2,
            SHIP_WIDTH,
            SHIP_HEIGHT
        );
        ctx.restore();
    } else {
        // fallback: draw triangle if image not loaded
        ctx.save();
        ctx.translate(shipX, shipY);
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_HEIGHT / 2);
        ctx.lineTo(-SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.closePath();
        ctx.fillStyle = '#00eaff';
        ctx.shadowColor = '#00eaff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
    }
}

function clampShipX(x) {
    return Math.max(SHIP_MARGIN + SHIP_WIDTH / 2, Math.min(canvas.width - SHIP_MARGIN - SHIP_WIDTH / 2, x));
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars();
    resetShipPosition();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let isMoving = false;
let speed = 300; // pixels per second
let lastFrameTime = performance.now();

function updateStars(delta) {
    if (!isMoving) return;
    for (const star of stars) {
        star.y += speed * (delta / 1000);
        if (star.y - star.r > canvas.height) {
            // Star goes out of screen, respawn at top
            star.y = -star.r;
            star.x = Math.random() * canvas.width;
            star.r = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
            star.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        }
    }
}

// Управление кораблем с ускорением
let isControllingShip = false;
let targetShipX = null;
let shipVX = 0;
// --- CONTROL TUNING ---
// Уменьшаем ускорение и максимальную скорость, увеличиваем демпфирование, уменьшаем дистанцию остановки
const SHIP_ACCEL = 1800; // px/s^2 (было 3000)
const SHIP_MAX_SPEED = 500; // px/s (было 900)
const SHIP_STOP_DIST = 1.5; // px (было 4)
const SHIP_DAMPING = 0.85; // (было 0.97)

function onPointerDown(e) {
    if (isGameOver) {
        resetGame();
        return;
    }
    isMoving = true;
    isControllingShip = true;
    targetShipX = clampShipX(e.touches ? e.touches[0].clientX : e.clientX);
    updateBackgroundMusic();
}

function onPointerUp() {
    isMoving = false;
    isControllingShip = false;
    targetShipX = null; // Останавливаем слежение за целью, но не сбрасываем скорость
    updateBackgroundMusic();
}

function onPointerMove(e) {
    if (!isControllingShip) return;
    targetShipX = clampShipX(e.touches ? e.touches[0].clientX : e.clientX);
}

function updateShip(delta) {
    if (!isMoving) return;
    if (targetShipX !== null) {
        const dx = targetShipX - shipX;
        if (Math.abs(dx) > SHIP_STOP_DIST) {
            // Ускорение к цели
            const dir = Math.sign(dx);
            shipVX += dir * SHIP_ACCEL * (delta / 1000);
            // Ограничение максимальной скорости
            if (Math.abs(shipVX) > SHIP_MAX_SPEED) {
                shipVX = dir * SHIP_MAX_SPEED;
            }
        } else {
            // Близко к цели — быстро гасим скорость и фиксируем позицию
            shipVX *= 0.3; // Сильное демпфирование
            if (Math.abs(shipVX) < 2) {
                shipVX = 0;
                shipX = targetShipX;
            }
        }
    } else {
        // Нет цели — замедляемся
        shipVX *= SHIP_DAMPING;
        if (Math.abs(shipVX) < 2) shipVX = 0;
    }
    shipX += shipVX * (delta / 1000);
    shipX = clampShipX(shipX);
}

// Coin animation frames
const COIN_FRAME_FILES = [
    'assets/coin/coin1.png',
    'assets/coin/coin2.png',
    'assets/coin/coin3.png',
    'assets/coin/coin4.png',
    'assets/coin/coin5.png',
    'assets/coin/coin6.png',
];
const COIN_FRAME_COUNT = COIN_FRAME_FILES.length;
const COIN_ANIMATION_SPEED = 10; // frames per second
const COIN_WIDTH = 48 * scale;
const COIN_HEIGHT = 48 * scale;
const COIN_MARGIN = 50 * scale;
const COIN_MIN_DIST = 100 * scale;
const COIN_SPAWN_INTERVAL = 500; // ms
const COIN_MAX_ON_SCREEN = 5;

let coins = [];
let lastCoinSpawn = 0;
let coinFrameIndex = 0;
let coinFrameTimer = 0;


function playCoinSound() {
    // Play sound from start, even if already playing
    coinSound.currentTime = 0;
    coinSound.play();
}

function canSpawnCoin(newX) {
    // Проверка на минимальное расстояние между монетами и до краёв
    if (newX < COIN_MARGIN || newX > canvas.width - COIN_MARGIN) return false;
    for (const coin of coins) {
        if (Math.abs(coin.x - newX) < COIN_MIN_DIST) return false;
    }
    return true;
}

function spawnCoin() {
    if (coins.length >= COIN_MAX_ON_SCREEN) return;
    let attempts = 0;
    let x;
    do {
        x = COIN_MARGIN + Math.random() * (canvas.width - 2 * COIN_MARGIN);
        attempts++;
    } while (!canSpawnCoin(x) && attempts < 10);
    if (canSpawnCoin(x)) {
        coins.push({
            x: x,
            y: -COIN_HEIGHT,
            frame: Math.floor(Math.random() * COIN_FRAME_COUNT),
        });
    }
}

let coinsCollected = 0;
let maxCoins = Number(localStorage.getItem('maxCoins') || 0);

function saveMaxCoins() {
    localStorage.setItem('maxCoins', String(maxCoins));
}

function drawCoinCounter() {
    ctx.save();
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText(`Coins: ${coinsCollected}. Max coins: ${maxCoins}`, canvas.width / 2, canvas.height - 24);
    ctx.restore();
}

// Bomb parameters
const BOMB_WIDTH = 64 * scale;
const BOMB_HEIGHT = 64 * scale;
const BOMB_MARGIN = 50;
let bomb = null;
let bombAngle = 0;

function canSpawnBomb(newX) {
    if (newX < BOMB_MARGIN || newX > canvas.width - BOMB_MARGIN) return false;
    for (const coin of coins) {
        if (Math.abs(coin.x - newX) < COIN_MIN_DIST) return false;
    }
    if (bomb && Math.abs(bomb.x - newX) < COIN_MIN_DIST) return false;
    return true;
}

function spawnBomb() {
    let attempts = 0;
    let x;
    do {
        x = BOMB_MARGIN + Math.random() * (canvas.width - 2 * BOMB_MARGIN);
        attempts++;
    } while (!canSpawnBomb(x) && attempts < 10);
    if (canSpawnBomb(x)) {
        bomb = {
            x: x,
            y: -BOMB_HEIGHT,
            angle: Math.random() * Math.PI * 2
        };
    }
}

function playBombSound() {
    bombSound.currentTime = 0;
    bombSound.play();
}

// Explosion parameters
const EXPLOSION_SPRITE = 'assets/bomb/explosion.png';
const EXPLOSION_FRAME_SIZE = 400;
const EXPLOSION_FRAMES = 16;
const EXPLOSION_COLS = 4;
const EXPLOSION_ROWS = 4;
const EXPLOSION_DRAW_SIZE = 120; // Размер отрисовки на экране
const EXPLOSION_ANIMATION_SPEED = 40; // ms на кадр
let explosions = [];

function spawnExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        frame: 0,
        timer: 0,
        done: false
    });
}

function updateExplosions(delta) {
    for (const exp of explosions) {
        if (exp.done) continue;
        exp.timer += delta;
        if (exp.timer > EXPLOSION_ANIMATION_SPEED) {
            exp.frame++;
            exp.timer = 0;
            if (exp.frame >= EXPLOSION_FRAMES) {
                exp.done = true;
            }
        }
        // Движение вниз вместе с фоном
        if (isMoving) {
            exp.y += speed * (delta / 1000);
        }
    }
    // Удаляем завершённые
    explosions = explosions.filter(exp => !exp.done && exp.y - EXPLOSION_DRAW_SIZE / 2 < canvas.height);
}

function drawExplosions() {
    for (const exp of explosions) {
        if (exp.frame >= EXPLOSION_FRAMES) continue;
        const col = exp.frame % EXPLOSION_COLS;
        const row = Math.floor(exp.frame / EXPLOSION_COLS);
        ctx.save();
        ctx.translate(exp.x, exp.y);
        ctx.drawImage(
            explosionImg,
            col * EXPLOSION_FRAME_SIZE,
            row * EXPLOSION_FRAME_SIZE,
            EXPLOSION_FRAME_SIZE,
            EXPLOSION_FRAME_SIZE,
            -EXPLOSION_DRAW_SIZE / 2,
            -EXPLOSION_DRAW_SIZE / 2,
            EXPLOSION_DRAW_SIZE,
            EXPLOSION_DRAW_SIZE
        );
        ctx.restore();
    }
}

function checkCollisionBomb(bomb, sx, sy) {
    // Simple circle-rectangle collision
    const dx = Math.abs(bomb.x - sx);
    const dy = Math.abs(bomb.y - sy);
    return dx < (BOMB_WIDTH / 2 + SHIP_WIDTH / 2 - 10) && dy < (BOMB_HEIGHT / 2 + SHIP_HEIGHT / 2 - 10);
}

// Модифицируем spawnCoin для генерации бомбы
function spawnCoinOrBomb() {
    if (bomb === null && Math.random() < 0.2) {
        spawnBomb();
    } else {
        spawnCoin();
    }
}

function updateCoins(delta) {
    // Анимация монет
    coinFrameTimer += delta;
    if (coinFrameTimer > 1000 / COIN_ANIMATION_SPEED) {
        coinFrameIndex = (coinFrameIndex + 1) % COIN_FRAME_COUNT;
        coinFrameTimer = 0;
    }

    if (!isMoving) return;
    // Движение монет
    for (const coin of coins) {
        coin.y += speed * (delta / 1000);
    }
    // Удаление монет, вышедших за экран или столкнувшихся с кораблём
    coins = coins.filter(coin => {
        if (coin.y - COIN_HEIGHT / 2 > canvas.height) return false;
        if (checkCollision(coin, shipX, shipY)) {
            playCoinSound();
            coinsCollected++;
            return false;
        }
        return true;
    });
    // Спавн новых монет или бомбы только при движении
    if (isMoving && coins.length < COIN_MAX_ON_SCREEN) {
        if (performance.now() - lastCoinSpawn > COIN_SPAWN_INTERVAL) {
            spawnCoinOrBomb();
            lastCoinSpawn = performance.now();
        }
    }
}

function drawCoins() {
    for (const coin of coins) {
        const frame = coinFrames[(coin.frame + coinFrameIndex) % COIN_FRAME_COUNT];
        if (frame.complete && frame.naturalWidth > 0) {
            ctx.drawImage(
                frame,
                coin.x - COIN_WIDTH / 2,
                coin.y - COIN_HEIGHT / 2,
                COIN_WIDTH,
                COIN_HEIGHT
            );
        }
    }
}

function checkCollision(coin, sx, sy) {
    // Simple circle-rectangle collision
    const dx = Math.abs(coin.x - sx);
    const dy = Math.abs(coin.y - sy);
    return dx < (COIN_WIDTH / 2 + SHIP_WIDTH / 2 - 10) && dy < (COIN_HEIGHT / 2 + SHIP_HEIGHT / 2 - 10);
}

// Health (lives) parameters
const HEART_SPRITE = 'assets/health.png';
const HEART_FRAME_WIDTH = 675;
const HEART_FRAME_HEIGHT = 603;
const HEART_DRAW_SIZE_W = 40;
const HEART_DRAW_SIZE_H = 35;
const HEART_FRAMES = 2; // 0 - full, 1 - empty
const MAX_LIVES = 3;
let lives = MAX_LIVES;
let isGameOver = false;

function drawHearts() {
    const totalWidth = HEART_DRAW_SIZE_W * MAX_LIVES + 16 * (MAX_LIVES - 1);
    const startX = canvas.width / 2 - totalWidth / 2;
    for (let i = 0; i < MAX_LIVES; i++) {
        const frame = i < lives ? 0 : 1;
        ctx.save();
        ctx.drawImage(
            heartImg,
            frame * HEART_FRAME_WIDTH, 0,
            HEART_FRAME_WIDTH, HEART_FRAME_HEIGHT,
            startX + i * (HEART_DRAW_SIZE_W + 16), 24,
            HEART_DRAW_SIZE_W, HEART_DRAW_SIZE_H
        );
        ctx.restore();
    }
}

function handleBombCollision() {
    playBombSound();
    spawnExplosion(bomb.x, bomb.y);
    bomb = null;
    lives--;
    if (lives <= 0) {
        if (coinsCollected > maxCoins) {
            maxCoins = coinsCollected;
            saveMaxCoins();
        }
        isGameOver = true;
    }
}

function updateBomb(delta) {
    if (!bomb) return;
    bomb.angle += 2 * Math.PI * (delta / 1000); // 1 оборот в секунду
    if (!isMoving) return;
    bomb.y += speed * (delta / 1000);
    if (bomb.y - BOMB_HEIGHT / 2 > canvas.height) bomb = null;
    if (bomb && checkCollisionBomb(bomb, shipX, shipY)) {
        handleBombCollision();
    }
}

function drawBomb() {
    if (!bomb) return;
    if (bombImg.complete && bombImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(bomb.x, bomb.y);
        ctx.rotate(bomb.angle);
        ctx.drawImage(
            bombImg,
            -BOMB_WIDTH / 2,
            -BOMB_HEIGHT / 2,
            BOMB_WIDTH,
            BOMB_HEIGHT
        );
        ctx.restore();
    }
}

function drawGameOver() {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fillText(`GAME OVER`, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function gameLoop(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const delta = now - lastFrameTime;
    if (!isGameOver) {
        updateStars(delta);
        drawStars();
        updateCoins(delta);
        drawCoins();
        updateBomb(delta);
        drawBomb();
        updateExplosions(delta);
        drawExplosions();
        updateShip(delta);
        drawShip();
        drawHearts();
        drawCoinCounter();
    } else {
        drawStars();
        drawExplosions();
        drawGameOver();
    }
    lastFrameTime = now;
    requestAnimationFrame(gameLoop);
}

let isLoaded = false;

// === Глобальные переменные, инициализируемые после загрузки ===
let coinFrames = [];
let shipImg = null;
let bombImg = null;
let explosionImg = null;
let heartImg = null;
let coinSound = null;
let bombSound = null;
let bgMusic = null;

// === Загрузка ресурсов ===
const imageResources = [
    ...COIN_FRAME_FILES,
    'assets/spaceship.png',
    'assets/bomb/bomb100.png',
    'assets/bomb/explosion.png',
    'assets/health.png'
];
const soundResources = [
    'sounds/coin.wav',
    'sounds/bomb.wav',
    'sounds/background.ogg'
];

// === Progress bar state ===
let loadingProgress = 0; // 0..1
let loadingTotal = imageResources.length + soundResources.length;
let loadingLoaded = 0;

function updateLoadingProgress() {
    loadingProgress = loadingLoaded / loadingTotal;
}

function loadImageWithProgress(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            loadingLoaded++;
            updateLoadingProgress();
            resolve({src, img});
        };
        img.onerror = () => {
            loadingLoaded++;
            updateLoadingProgress();
            resolve({src, img: null});
        };
        img.src = src;
    });
}

function loadSoundWithProgress(src) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => {
            loadingLoaded++;
            updateLoadingProgress();
            resolve({src, audio});
        };
        audio.onerror = () => {
            loadingLoaded++;
            updateLoadingProgress();
            resolve({src, audio: null});
        };
        audio.src = src;
        audio.load();
    });
}

async function preloadResources() {
    const imgPromises = imageResources.map(loadImageWithProgress);
    const sndPromises = soundResources.map(loadSoundWithProgress);
    const imgResults = await Promise.all(imgPromises);
    const sndResults = await Promise.all(sndPromises);
    // Присваиваем загруженные объекты в игровые переменные
    coinFrames = COIN_FRAME_FILES.map(f => imgResults.find(r => r.src === f).img);
    shipImg = imgResults.find(r => r.src === 'assets/spaceship.png').img;
    bombImg = imgResults.find(r => r.src === 'assets/bomb/bomb100.png').img;
    explosionImg = imgResults.find(r => r.src === 'assets/bomb/explosion.png').img;
    heartImg = imgResults.find(r => r.src === 'assets/health.png').img;
    coinSound = sndResults.find(r => r.src === 'sounds/coin.wav').audio;
    bombSound = sndResults.find(r => r.src === 'sounds/bomb.wav').audio;
    bgMusic = sndResults.find(r => r.src === 'sounds/background.ogg').audio;
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    isLoaded = true;

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('touchstart', onPointerDown);
    canvas.addEventListener('touchend', onPointerUp);
    canvas.addEventListener('touchcancel', onPointerUp);
    canvas.addEventListener('touchmove', onPointerMove);
}

function drawLoading() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading', canvas.width / 2, canvas.height / 2);
    // Draw progress bar
    const barWidth = Math.min(canvas.width * 0.5, 400);
    const barHeight = 18;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2 + 40;
    // Bar background
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    // Bar progress (white)
    ctx.fillStyle = '#fff';
    ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);
    // Bar border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.restore();
}

function loadingLoop() {
    if (!isLoaded) {
        drawLoading();
        requestAnimationFrame(loadingLoop);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаем canvas после загрузки
        requestAnimationFrame(gameLoop);
    }
}

window.addEventListener('load', () => {
    resizeCanvas();
    preloadResources();
    loadingLoop();
});

// Touch and mouse event handlers
function startMoving() { isMoving = true; }
function stopMoving() { isMoving = false; }

function updateBackgroundMusic() {
    if (!isLoaded || !bgMusic) return;
    if (isMoving) {
        if (bgMusic.paused) {
            bgMusic.play();
        }
    } else {
        if (!bgMusic.paused) {
            bgMusic.pause();
        }
    }
}