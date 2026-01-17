// Game configuration
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const CELL_SIZE = 20;

// Game state
let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let pacman = { x: 1, y: 1, direction: 'right', nextDirection: 'right' };
let ghosts = [];
let powerMode = false;
let powerModeTimer = null;

// Game board layout (0 = pellet, 1 = wall, 2 = power pellet, 3 = empty)
const board = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,2,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,1,3,3,1,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,1,3,3,3,3,1,0,0,0,0,0,0,1],
    [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
    [1,2,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Create a copy for resetting
let initialBoard = board.map(row => [...row]);

// DOM elements
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const gameMessage = document.getElementById('game-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

// Initialize game
function initGame() {
    gameBoard.innerHTML = '';

    // Create board
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${x}-${y}`;

            if (board[y][x] === 1) {
                cell.classList.add('wall');
            } else if (board[y][x] === 0) {
                cell.classList.add('pellet');
            } else if (board[y][x] === 2) {
                cell.classList.add('power-pellet');
            }

            gameBoard.appendChild(cell);
        }
    }

    // Initialize ghosts
    ghosts = [
        { x: 9, y: 9, direction: 'up', name: 'blinky', color: 'ghost-blinky', scared: false },
        { x: 10, y: 9, direction: 'up', name: 'pinky', color: 'ghost-pinky', scared: false },
        { x: 9, y: 10, direction: 'down', name: 'inky', color: 'ghost-inky', scared: false },
        { x: 10, y: 10, direction: 'down', name: 'clyde', color: 'ghost-clyde', scared: false }
    ];

    // Reset pacman position
    pacman = { x: 1, y: 1, direction: 'right', nextDirection: 'right' };

    updateDisplay();
    drawPacman();
    drawGhosts();
}

function drawPacman() {
    // Remove old pacman
    document.querySelectorAll('.pacman').forEach(el => el.classList.remove('pacman', 'right', 'left', 'up', 'down'));

    // Draw new pacman
    const cell = document.getElementById(`cell-${pacman.x}-${pacman.y}`);
    if (cell) {
        cell.classList.add('pacman', pacman.direction);
    }
}

function drawGhosts() {
    // Remove old ghosts
    document.querySelectorAll('.ghost').forEach(el => {
        el.className = el.className.replace(/ghost[^\s]*/g, '').trim();
    });

    // Draw new ghosts
    ghosts.forEach(ghost => {
        const cell = document.getElementById(`cell-${ghost.x}-${ghost.y}`);
        if (cell) {
            cell.classList.add('ghost');
            if (ghost.scared) {
                cell.classList.add('ghost-scared');
            } else {
                cell.classList.add(ghost.color);
            }
        }
    });
}

function movePacman() {
    // Try to change direction
    const nextX = pacman.x + getDirectionOffset(pacman.nextDirection).x;
    const nextY = pacman.y + getDirectionOffset(pacman.nextDirection).y;

    if (isValidMove(nextX, nextY)) {
        pacman.direction = pacman.nextDirection;
    }

    // Move in current direction
    const offset = getDirectionOffset(pacman.direction);
    const newX = pacman.x + offset.x;
    const newY = pacman.y + offset.y;

    if (isValidMove(newX, newY)) {
        pacman.x = newX;
        pacman.y = newY;

        // Check for pellets
        if (board[pacman.y][pacman.x] === 0) {
            score += 10;
            board[pacman.y][pacman.x] = 3;
            const cell = document.getElementById(`cell-${pacman.x}-${pacman.y}`);
            cell.classList.remove('pellet');
            checkWin();
        } else if (board[pacman.y][pacman.x] === 2) {
            score += 50;
            board[pacman.y][pacman.x] = 3;
            const cell = document.getElementById(`cell-${pacman.x}-${pacman.y}`);
            cell.classList.remove('power-pellet');
            activatePowerMode();
            checkWin();
        }

        updateDisplay();
    }
}

function getDirectionOffset(direction) {
    const offsets = {
        'up': { x: 0, y: -1 },
        'down': { x: 0, y: 1 },
        'left': { x: -1, y: 0 },
        'right': { x: 1, y: 0 }
    };
    return offsets[direction];
}

function isValidMove(x, y) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
        return false;
    }
    return board[y][x] !== 1;
}

function moveGhosts() {
    ghosts.forEach(ghost => {
        // Simple AI: random movement with occasional chase behavior
        let possibleMoves = [];
        const directions = ['up', 'down', 'left', 'right'];

        directions.forEach(dir => {
            const offset = getDirectionOffset(dir);
            const newX = ghost.x + offset.x;
            const newY = ghost.y + offset.y;

            if (isValidMove(newX, newY)) {
                possibleMoves.push({ dir, x: newX, y: newY });
            }
        });

        if (possibleMoves.length > 0) {
            let chosenMove;

            if (ghost.scared) {
                // Run away from pacman
                possibleMoves.sort((a, b) => {
                    const distA = Math.abs(a.x - pacman.x) + Math.abs(a.y - pacman.y);
                    const distB = Math.abs(b.x - pacman.x) + Math.abs(b.y - pacman.y);
                    return distB - distA;
                });
                chosenMove = possibleMoves[0];
            } else if (Math.random() < 0.5) {
                // Chase pacman
                possibleMoves.sort((a, b) => {
                    const distA = Math.abs(a.x - pacman.x) + Math.abs(a.y - pacman.y);
                    const distB = Math.abs(b.x - pacman.x) + Math.abs(b.y - pacman.y);
                    return distA - distB;
                });
                chosenMove = possibleMoves[0];
            } else {
                // Random movement
                chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }

            ghost.direction = chosenMove.dir;
            ghost.x = chosenMove.x;
            ghost.y = chosenMove.y;
        }
    });
}

function checkCollisions() {
    ghosts.forEach(ghost => {
        if (ghost.x === pacman.x && ghost.y === pacman.y) {
            if (ghost.scared) {
                // Eat ghost
                score += 200;
                ghost.x = 9;
                ghost.y = 9;
                ghost.scared = false;
                updateDisplay();
            } else {
                // Lose life
                loseLife();
            }
        }
    });
}

function activatePowerMode() {
    powerMode = true;
    ghosts.forEach(ghost => ghost.scared = true);

    if (powerModeTimer) {
        clearTimeout(powerModeTimer);
    }

    powerModeTimer = setTimeout(() => {
        powerMode = false;
        ghosts.forEach(ghost => ghost.scared = false);
    }, 7000);
}

function loseLife() {
    lives--;
    updateDisplay();

    if (lives <= 0) {
        gameOver();
    } else {
        // Reset positions
        pacman.x = 1;
        pacman.y = 1;
        pacman.direction = 'right';
        pacman.nextDirection = 'right';

        ghosts.forEach((ghost, index) => {
            ghost.x = 9 + (index % 2);
            ghost.y = 9 + Math.floor(index / 2);
        });

        gameMessage.textContent = 'Life Lost!';
        setTimeout(() => {
            gameMessage.textContent = '';
        }, 1500);
    }
}

function checkWin() {
    // Check if all pellets are eaten
    let pelletsLeft = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (board[y][x] === 0 || board[y][x] === 2) {
                pelletsLeft++;
            }
        }
    }

    if (pelletsLeft === 0) {
        level++;
        score += 500;
        updateDisplay();
        gameMessage.textContent = 'Level Complete!';

        setTimeout(() => {
            // Reset board
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    board[y][x] = initialBoard[y][x];
                }
            }
            initGame();
            gameMessage.textContent = '';
        }, 2000);
    }
}

function gameOver() {
    gameRunning = false;
    gameMessage.textContent = 'GAME OVER!';
    startBtn.textContent = 'Start Game';

    setTimeout(() => {
        if (!gameRunning) {
            score = 0;
            lives = 3;
            level = 1;

            // Reset board
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    board[y][x] = initialBoard[y][x];
                }
            }

            initGame();
            gameMessage.textContent = 'Press Start to Play';
        }
    }, 3000);
}

function updateDisplay() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    levelElement.textContent = level;
}

// Game loop
let gameInterval;

function gameLoop() {
    if (!gameRunning || gamePaused) return;

    movePacman();
    moveGhosts();
    checkCollisions();
    drawPacman();
    drawGhosts();
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        startBtn.textContent = 'Restart';
        gameMessage.textContent = '';

        if (gameInterval) {
            clearInterval(gameInterval);
        }

        gameInterval = setInterval(gameLoop, 200);
    } else {
        // Restart
        gameRunning = false;
        clearInterval(gameInterval);
        score = 0;
        lives = 3;
        level = 1;

        // Reset board
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                board[y][x] = initialBoard[y][x];
            }
        }

        initGame();
        startGame();
    }
}

function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
    gameMessage.textContent = gamePaused ? 'PAUSED' : '';
}

// Event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);

document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;

    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            pacman.nextDirection = 'up';
            break;
        case 'ArrowDown':
            e.preventDefault();
            pacman.nextDirection = 'down';
            break;
        case 'ArrowLeft':
            e.preventDefault();
            pacman.nextDirection = 'left';
            break;
        case 'ArrowRight':
            e.preventDefault();
            pacman.nextDirection = 'right';
            break;
    }
});

// Initialize on load
initGame();
gameMessage.textContent = 'Press Start to Play';
