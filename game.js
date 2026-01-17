// Pac-Man 2026 - Ultra Smooth Edition
// Advanced Graphics & Animation Engine

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance

// Game constants
const TILE_SIZE = 30;
const GRID_WIDTH = 19;
const GRID_HEIGHT = 21;
canvas.width = GRID_WIDTH * TILE_SIZE;
canvas.height = GRID_HEIGHT * TILE_SIZE;

// Game state
let gameState = 'ready'; // ready, playing, paused, gameover
let score = 0;
let highScore = localStorage.getItem('pacmanHighScore') || 0;
let level = 1;
let lives = 3;
let powerPelletActive = false;
let powerPelletTimer = 0;
let animationFrame = 0;
let lastTime = 0;
let particles = [];
let scorePopups = [];

// Smooth movement interpolation
const MOVE_SPEED = 0.08; // Tiles per frame at 60fps
const GHOST_SPEED = 0.06;
const FRIGHTENED_SPEED = 0.04;

// Maze layout (1 = wall, 0 = empty, 2 = pellet, 3 = power pellet)
const maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Clone maze for pellet tracking
let currentMaze = maze.map(row => [...row]);

// Pac-Man entity with smooth interpolation
const pacman = {
    x: 9,
    y: 15,
    renderX: 9,
    renderY: 15,
    targetX: 9,
    targetY: 15,
    direction: 0, // 0: right, 1: down, 2: left, 3: up
    nextDirection: 0,
    mouthOpen: 0,
    mouthSpeed: 0.15,
    speed: MOVE_SPEED
};

// Ghost entities with AI and smooth movement
const ghosts = [
    { name: 'Blinky', x: 9, y: 9, renderX: 9, renderY: 9, targetX: 9, targetY: 9, color: '#FF0000', direction: 0, mode: 'chase', scatterTarget: {x: 17, y: 0} },
    { name: 'Pinky', x: 8, y: 9, renderX: 8, renderY: 9, targetX: 8, targetY: 9, color: '#FFB8FF', direction: 2, mode: 'chase', scatterTarget: {x: 1, y: 0} },
    { name: 'Inky', x: 10, y: 9, renderX: 10, renderY: 9, targetX: 10, targetY: 9, color: '#00FFFF', direction: 2, mode: 'chase', scatterTarget: {x: 17, y: 20} },
    { name: 'Clyde', x: 9, y: 10, renderX: 9, renderY: 10, targetX: 9, targetY: 10, color: '#FFB851', direction: 0, mode: 'chase', scatterTarget: {x: 1, y: 20} }
];

// Particle system for visual effects
class Particle {
    constructor(x, y, color, velocityX, velocityY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = velocityX;
        this.vy = velocityY;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Score popup animation
class ScorePopup {
    constructor(x, y, points) {
        this.x = x;
        this.y = y;
        this.points = points;
        this.life = 60;
        this.maxLife = 60;
    }

    update() {
        this.y -= 1;
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+${this.points}`, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// Initialize game
function initGame() {
    currentMaze = maze.map(row => [...row]);
    pacman.x = pacman.renderX = pacman.targetX = 9;
    pacman.y = pacman.renderY = pacman.targetY = 15;
    pacman.direction = 0;
    pacman.nextDirection = 0;

    ghosts.forEach((ghost, i) => {
        const startX = [9, 8, 10, 9][i];
        const startY = [9, 9, 9, 10][i];
        ghost.x = ghost.renderX = ghost.targetX = startX;
        ghost.y = ghost.renderY = ghost.targetY = startY;
        ghost.direction = [0, 2, 2, 0][i];
        ghost.mode = 'chase';
    });

    particles = [];
    scorePopups = [];
    powerPelletActive = false;
    powerPelletTimer = 0;

    updateLivesDisplay();
    updateScoreDisplay();
}

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (gameState === 'playing') {
        if (e.key === 'ArrowRight' || e.key === 'd') pacman.nextDirection = 0;
        if (e.key === 'ArrowDown' || e.key === 's') pacman.nextDirection = 1;
        if (e.key === 'ArrowLeft' || e.key === 'a') pacman.nextDirection = 2;
        if (e.key === 'ArrowUp' || e.key === 'w') pacman.nextDirection = 3;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Smooth Pac-Man movement
function updatePacman() {
    // Try to change direction
    const nextDirs = [
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 0, dy: -1 }  // up
    ];

    // Check if we're close enough to grid to change direction
    const closeToGrid = Math.abs(pacman.renderX - Math.round(pacman.renderX)) < 0.3 &&
                        Math.abs(pacman.renderY - Math.round(pacman.renderY)) < 0.3;

    if (closeToGrid) {
        const gridX = Math.round(pacman.renderX);
        const gridY = Math.round(pacman.renderY);
        pacman.x = gridX;
        pacman.y = gridY;

        // Try next direction
        const nextDir = nextDirs[pacman.nextDirection];
        const nextX = gridX + nextDir.dx;
        const nextY = gridY + nextDir.dy;

        if (canMove(nextX, nextY)) {
            pacman.direction = pacman.nextDirection;
            pacman.targetX = nextX;
            pacman.targetY = nextY;
        } else {
            // Try current direction
            const curDir = nextDirs[pacman.direction];
            const curX = gridX + curDir.dx;
            const curY = gridY + curDir.dy;

            if (canMove(curX, curY)) {
                pacman.targetX = curX;
                pacman.targetY = curY;
            }
        }
    }

    // Smooth interpolation to target
    const dir = nextDirs[pacman.direction];
    pacman.renderX += dir.dx * pacman.speed;
    pacman.renderY += dir.dy * pacman.speed;

    // Wrap around tunnel
    if (pacman.renderX < 0) pacman.renderX = GRID_WIDTH - 1;
    if (pacman.renderX >= GRID_WIDTH) pacman.renderX = 0;

    // Animate mouth
    pacman.mouthOpen += pacman.mouthSpeed;
    if (pacman.mouthOpen > 1 || pacman.mouthOpen < 0) {
        pacman.mouthSpeed *= -1;
    }

    // Collect pellets
    const gridX = Math.round(pacman.renderX);
    const gridY = Math.round(pacman.renderY);

    if (currentMaze[gridY] && currentMaze[gridY][gridX] === 2) {
        currentMaze[gridY][gridX] = 0;
        score += 10;
        createParticles(gridX * TILE_SIZE + TILE_SIZE / 2, gridY * TILE_SIZE + TILE_SIZE / 2, '#FFD700', 5);
        updateScoreDisplay();
    } else if (currentMaze[gridY] && currentMaze[gridY][gridX] === 3) {
        currentMaze[gridY][gridX] = 0;
        score += 50;
        powerPelletActive = true;
        powerPelletTimer = 300; // 5 seconds at 60fps
        ghosts.forEach(ghost => ghost.mode = 'frightened');
        createParticles(gridX * TILE_SIZE + TILE_SIZE / 2, gridY * TILE_SIZE + TILE_SIZE / 2, '#00FFFF', 15);
        scorePopups.push(new ScorePopup(gridX * TILE_SIZE + TILE_SIZE / 2, gridY * TILE_SIZE + TILE_SIZE / 2, 50));
        updateScoreDisplay();
    }

    // Check for level completion
    if (!hasRemainingPellets()) {
        level++;
        initGame();
        document.getElementById('level').textContent = level;
    }
}

// Ghost AI and movement
function updateGhosts() {
    ghosts.forEach(ghost => {
        const closeToGrid = Math.abs(ghost.renderX - Math.round(ghost.renderX)) < 0.3 &&
                            Math.abs(ghost.renderY - Math.round(ghost.renderY)) < 0.3;

        if (closeToGrid) {
            const gridX = Math.round(ghost.renderX);
            const gridY = Math.round(ghost.renderY);
            ghost.x = gridX;
            ghost.y = gridY;

            // AI decision making
            let targetX, targetY;

            if (ghost.mode === 'frightened') {
                // Random movement when frightened
                const possibleDirs = getPossibleDirections(gridX, gridY, ghost.direction);
                ghost.direction = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            } else if (ghost.mode === 'scatter') {
                targetX = ghost.scatterTarget.x;
                targetY = ghost.scatterTarget.y;
                ghost.direction = getDirectionToTarget(gridX, gridY, targetX, targetY, ghost.direction);
            } else {
                // Chase Pac-Man
                targetX = Math.round(pacman.renderX);
                targetY = Math.round(pacman.renderY);

                // Different targeting for each ghost
                if (ghost.name === 'Pinky') {
                    const dirs = [{ dx: 4, dy: 0 }, { dx: 0, dy: 4 }, { dx: -4, dy: 0 }, { dx: 0, dy: -4 }];
                    targetX += dirs[pacman.direction].dx;
                    targetY += dirs[pacman.direction].dy;
                } else if (ghost.name === 'Inky') {
                    targetX = Math.round(pacman.renderX) + Math.round((pacman.renderX - ghosts[0].renderX) / 2);
                    targetY = Math.round(pacman.renderY) + Math.round((pacman.renderY - ghosts[0].renderY) / 2);
                } else if (ghost.name === 'Clyde') {
                    const dist = Math.sqrt((gridX - targetX) ** 2 + (gridY - targetY) ** 2);
                    if (dist < 8) {
                        targetX = ghost.scatterTarget.x;
                        targetY = ghost.scatterTarget.y;
                    }
                }

                ghost.direction = getDirectionToTarget(gridX, gridY, targetX, targetY, ghost.direction);
            }

            const dirs = [
                { dx: 1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: -1 }
            ];

            const dir = dirs[ghost.direction];
            ghost.targetX = gridX + dir.dx;
            ghost.targetY = gridY + dir.dy;
        }

        // Smooth movement
        const dirs = [
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: -1 }
        ];
        const dir = dirs[ghost.direction];
        const speed = ghost.mode === 'frightened' ? FRIGHTENED_SPEED : GHOST_SPEED;

        ghost.renderX += dir.dx * speed;
        ghost.renderY += dir.dy * speed;

        // Wrap around
        if (ghost.renderX < 0) ghost.renderX = GRID_WIDTH - 1;
        if (ghost.renderX >= GRID_WIDTH) ghost.renderX = 0;

        // Check collision with Pac-Man
        const dist = Math.sqrt(
            (ghost.renderX - pacman.renderX) ** 2 +
            (ghost.renderY - pacman.renderY) ** 2
        );

        if (dist < 0.5) {
            if (powerPelletActive) {
                // Eat ghost
                score += 200;
                ghost.x = ghost.renderX = ghost.targetX = 9;
                ghost.y = ghost.renderY = ghost.targetY = 9;
                createParticles(ghost.renderX * TILE_SIZE, ghost.renderY * TILE_SIZE, ghost.color, 20);
                scorePopups.push(new ScorePopup(ghost.renderX * TILE_SIZE, ghost.renderY * TILE_SIZE, 200));
                updateScoreDisplay();
            } else {
                // Lose life
                lives--;
                updateLivesDisplay();

                if (lives <= 0) {
                    gameOver();
                } else {
                    resetPositions();
                }
            }
        }
    });

    // Update power pellet timer
    if (powerPelletActive) {
        powerPelletTimer--;
        if (powerPelletTimer <= 0) {
            powerPelletActive = false;
            ghosts.forEach(ghost => ghost.mode = 'chase');
        }
    }
}

// Helper functions
function canMove(x, y) {
    if (y < 0 || y >= GRID_HEIGHT || x < 0 || x >= GRID_WIDTH) return true; // Tunnels
    if (!maze[y] || maze[y][x] === undefined) return true;
    return maze[y][x] !== 1;
}

function getPossibleDirections(x, y, currentDir) {
    const dirs = [0, 1, 2, 3];
    const opposite = (currentDir + 2) % 4;
    const moves = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 }
    ];

    return dirs.filter(dir => {
        if (dir === opposite) return false; // Don't reverse
        const move = moves[dir];
        return canMove(x + move.dx, y + move.dy);
    });
}

function getDirectionToTarget(x, y, targetX, targetY, currentDir) {
    const possible = getPossibleDirections(x, y, currentDir);
    if (possible.length === 0) return currentDir;

    const moves = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 }
    ];

    let bestDir = possible[0];
    let bestDist = Infinity;

    possible.forEach(dir => {
        const move = moves[dir];
        const newX = x + move.dx;
        const newY = y + move.dy;
        const dist = (newX - targetX) ** 2 + (newY - targetY) ** 2;

        if (dist < bestDist) {
            bestDist = dist;
            bestDir = dir;
        }
    });

    return bestDir;
}

function hasRemainingPellets() {
    return currentMaze.some(row => row.some(cell => cell === 2 || cell === 3));
}

function resetPositions() {
    pacman.x = pacman.renderX = pacman.targetX = 9;
    pacman.y = pacman.renderY = pacman.targetY = 15;

    ghosts.forEach((ghost, i) => {
        const startX = [9, 8, 10, 9][i];
        const startY = [9, 9, 9, 10][i];
        ghost.x = ghost.renderX = ghost.targetX = startX;
        ghost.y = ghost.renderY = ghost.targetY = startY;
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push(new Particle(
            x,
            y,
            color,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            30 + Math.random() * 30
        ));
    }
}

// Rendering
function render() {
    // Clear with smooth gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze with glow effects
    drawMaze();

    // Draw pellets with animation
    drawPellets();

    // Draw Pac-Man with smooth animation
    drawPacman();

    // Draw ghosts with smooth movement
    drawGhosts();

    // Draw particles
    particles.forEach(p => p.draw());

    // Draw score popups
    scorePopups.forEach(sp => sp.draw());
}

function drawMaze() {
    ctx.strokeStyle = '#2E5EFF';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#2E5EFF';

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (maze[y][x] === 1) {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;

                // Draw wall with gradient
                const wallGradient = ctx.createLinearGradient(px, py, px + TILE_SIZE, py + TILE_SIZE);
                wallGradient.addColorStop(0, '#1E3EFF');
                wallGradient.addColorStop(1, '#0E2EDF');

                ctx.fillStyle = wallGradient;
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

                // Draw border
                ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
        }
    }

    ctx.shadowBlur = 0;
}

function drawPellets() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const px = x * TILE_SIZE + TILE_SIZE / 2;
            const py = y * TILE_SIZE + TILE_SIZE / 2;

            if (currentMaze[y][x] === 2) {
                // Regular pellet with glow
                ctx.fillStyle = '#FFD700';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#FFD700';
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (currentMaze[y][x] === 3) {
                // Power pellet with pulsing animation
                const pulse = Math.sin(animationFrame * 0.1) * 0.3 + 0.7;
                ctx.fillStyle = '#00FFFF';
                ctx.shadowBlur = 15 * pulse;
                ctx.shadowColor = '#00FFFF';
                ctx.beginPath();
                ctx.arc(px, py, 6 * pulse, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.shadowBlur = 0;
}

function drawPacman() {
    const px = pacman.renderX * TILE_SIZE + TILE_SIZE / 2;
    const py = pacman.renderY * TILE_SIZE + TILE_SIZE / 2;
    const radius = TILE_SIZE / 2 - 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pacman.direction * Math.PI / 2);

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFFF00';

    // Pac-Man body with gradient
    const pacGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    pacGradient.addColorStop(0, '#FFFF00');
    pacGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = pacGradient;

    ctx.beginPath();
    const mouthAngle = pacman.mouthOpen * 0.5;
    ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGhosts() {
    ghosts.forEach(ghost => {
        const px = ghost.renderX * TILE_SIZE + TILE_SIZE / 2;
        const py = ghost.renderY * TILE_SIZE + TILE_SIZE / 2;
        const radius = TILE_SIZE / 2 - 2;

        let color = ghost.color;
        if (ghost.mode === 'frightened') {
            // Flash blue when frightened
            color = powerPelletTimer > 120 ? '#2020FF' : (animationFrame % 20 < 10 ? '#2020FF' : '#FFFFFF');
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Ghost body
        const ghostGradient = ctx.createRadialGradient(px, py - radius / 2, 0, px, py, radius);
        ghostGradient.addColorStop(0, color);
        ghostGradient.addColorStop(1, shadeColor(color, -40));
        ctx.fillStyle = ghostGradient;

        ctx.beginPath();
        ctx.arc(px, py - radius / 3, radius, Math.PI, 0);
        ctx.lineTo(px + radius, py + radius);

        // Wavy bottom
        const wave = Math.sin(animationFrame * 0.2 + ghost.renderX) * 3;
        for (let i = 0; i < 3; i++) {
            const wx = px + radius - (i * radius * 2 / 3);
            const wy = py + radius + wave;
            ctx.lineTo(wx, wy);
            ctx.lineTo(wx - radius / 3, py + radius);
        }

        ctx.closePath();
        ctx.fill();

        // Eyes
        if (ghost.mode !== 'frightened') {
            const eyeOffsets = [
                { x: -radius / 3, y: -radius / 3 },
                { x: radius / 3, y: -radius / 3 }
            ];

            eyeOffsets.forEach(offset => {
                // White of eye
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(px + offset.x, py + offset.y, radius / 3, 0, Math.PI * 2);
                ctx.fill();

                // Pupil (looks at Pac-Man)
                const dx = pacman.renderX - ghost.renderX;
                const dy = pacman.renderY - ghost.renderY;
                const angle = Math.atan2(dy, dx);
                const pupilDist = radius / 6;

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(
                    px + offset.x + Math.cos(angle) * pupilDist,
                    py + offset.y + Math.sin(angle) * pupilDist,
                    radius / 6,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });
        } else {
            // Frightened face
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('• •', px, py - 2);
        }

        ctx.shadowBlur = 0;
    });
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Game loop with smooth timing
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState === 'playing') {
        updatePacman();
        updateGhosts();

        // Update particles
        particles = particles.filter(p => {
            p.update();
            return p.life > 0;
        });

        // Update score popups
        scorePopups = scorePopups.filter(sp => {
            sp.update();
            return sp.life > 0;
        });

        animationFrame++;
    }

    render();
    requestAnimationFrame(gameLoop);
}

// UI functions
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacmanHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
}

function updateLivesDisplay() {
    const livesDisplay = document.getElementById('livesDisplay');
    livesDisplay.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('div');
        life.className = 'life-icon';
        life.style.animationDelay = `${i * 0.2}s`;
        livesDisplay.appendChild(life);
    }
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

// Event listeners
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startOverlay').classList.add('hidden');
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = 3;
    initGame();
});

document.getElementById('restartButton').addEventListener('click', () => {
    document.getElementById('gameOverOverlay').classList.add('hidden');
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = 3;
    initGame();
});

// Initialize
document.getElementById('highScore').textContent = highScore;
initGame();
requestAnimationFrame(gameLoop);
