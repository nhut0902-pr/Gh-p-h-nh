document.addEventListener('DOMContentLoaded', () => {
    // --- ENHANCED STATE & CONFIG ---
    const GRID_SIZE = 9;
    const PIECE_TYPES = ['i2', 'i3', 'i4', 'l3', 'j3', 'o4', 'dot1', 't3', 's', 'z'];
    const PIECE_COLORS = ['blue', 'orange', 'pink', 'yellow', 'green', 'purple'];
    
    let boardState = [];
    let currentLevel = 1;
    let cratesCollected = 0;
    let cratesRequired = 5;
    let coins = 500;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let totalLinesCleared = 0;
    let gamesPlayed = 0;
    
    let playerInventory = { hammer: 2, reroll: 1, bomb: 1, freeze: 0, rainbow: 0 };
    let activePowerUp = null;
    let availablePieces = [];
    let nextPieces = [];
    
    let gameSettings = {
        sound: true,
        vibration: true,
        autoHints: false,
        difficulty: 'normal'
    };
    
    let isDragging = false;
    let draggedPieceData = null;
    let draggedElement = null;
    let audioContextStarted = false;
    let hintTimeout = null;
    let currentTheme = 'default';

    // --- DOM ELEMENTS ---
    const gameBoard = document.getElementById('game-board');
    const piecesGrid = document.getElementById('pieces-grid');
    const powerUpBar = document.getElementById('power-up-bar');
    const previewOverlay = document.getElementById('preview-overlay');
    const comboDisplay = document.getElementById('combo-display');
    const progressFill = document.getElementById('progress-fill');
    const particleContainer = document.getElementById('particle-container');
    
    // UI Elements
    const levelEl = document.getElementById('level-number');
    const scoreEl = document.getElementById('score');
    const cratesCollectedEl = document.getElementById('crates-collected');
    const cratesRequiredEl = document.getElementById('crates-required');
    const coinsEl = document.getElementById('coins-amount');
    const progressPercentageEl = document.getElementById('progress-percentage');
    const comboCountEl = document.getElementById('combo-count');

    // --- ENHANCED DATA ---
    const PIECE_SHAPES = {
        dot1: [[0, 0]],
        i2: [[0, 0], [1, 0]],
        i3: [[0, 0], [1, 0], [2, 0]],
        i4: [[0, 0], [1, 0], [2, 0], [3, 0]],
        l3: [[0, 0], [1, 0], [1, 1]],
        j3: [[0, 1], [1, 1], [1, 0]],
        t3: [[0, 0], [1, 0], [2, 0], [1, 1]],
        o4: [[0, 0], [0, 1], [1, 0], [1, 1]],
        s: [[1, 0], [2, 0], [0, 1], [1, 1]],
        z: [[0, 0], [1, 0], [1, 1], [2, 1]]
    };

    const POWER_UP_DATA = {
        hammer: {
            id: 'hammer',
            name: 'Búa Phá Ô',
            description: 'Phá một ô bất kỳ',
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23eab308'%3E%3Cpath d='M14.5 2.5l-5 5L5 12l-2.5 2.5 5 5L10 22l4.5-4.5 5-5-2.5-2.5-5-5z'/%3E%3C/svg%3E"
        },
        reroll: {
            id: 'reroll',
            name: 'Đổi Khối',
            description: 'Tạo ra 3 khối mới',
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 24 24'%3E%3Cpath d='M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'/%3E%3C/svg%3E"
        },
        bomb: {
            id: 'bomb',
            name: 'Bom 3x3',
            description: 'Phá vùng 3x3',
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23ef4444' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E"
        },
        freeze: {
            id: 'freeze',
            name: 'Đóng Băng',
            description: 'Dừng thời gian 30 giây',
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2306b6d4' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l3.09 6.26L22 9l-5.91 1.74L12 17l-4.09-6.26L2 9l6.91-0.74L12 2z'/%3E%3C/svg%3E"
        },
        rainbow: {
            id: 'rainbow',
            name: 'Khối Cầu Vồng',
            description: 'Khối có thể thay đổi màu',
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23a855f7' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E"
        }
    };

    const STORE_ITEMS = [
        // Power-ups
        { id: 'hammer_1', name: '1 Búa', cost: 75, category: 'powerups', grants: { id: 'hammer', amount: 1 } },
        { id: 'reroll_1', name: '1 Lượt Đổi', cost: 50, category: 'powerups', grants: { id: 'reroll', amount: 1 } },
        { id: 'bomb_1', name: '1 Bom', cost: 150, category: 'powerups', grants: { id: 'bomb', amount: 1 } },
        { id: 'freeze_1', name: '1 Đóng Băng', cost: 200, category: 'powerups', grants: { id: 'freeze', amount: 1 } },
        { id: 'rainbow_1', name: '1 Cầu Vồng', cost: 300, category: 'powerups', grants: { id: 'rainbow', amount: 1 } },
        { id: 'hammer_5', name: '5 Búa', cost: 300, category: 'powerups', grants: { id: 'hammer', amount: 5 } },
        { id: 'bomb_3', name: '3 Bom', cost: 400, category: 'powerups', grants: { id: 'bomb', amount: 3 } },
        { id: 'starter_pack', name: 'Gói Khởi Đầu', cost: 500, category: 'powerups', grants: [
            { id: 'hammer', amount: 3 },
            { id: 'reroll', amount: 3 },
            { id: 'bomb', amount: 2 },
            { id: 'freeze', amount: 1 }
        ]},
        
        // Coins
        ...Array.from({ length: 8 }, (_, i) => ({
            id: `coins_${i+1}`,
            name: `${(i+1)*200} Xu`,
            cost: (i+1)*100,
            category: 'coins',
            grants: { id: 'coin', amount: (i+1)*200 }
        })),
        
        // Themes
        { id: 'theme_neon', name: 'Neon', cost: 1000, category: 'themes', grants: { id: 'theme', value: 'neon' } },
        { id: 'theme_ocean', name: 'Đại Dương', cost: 1200, category: 'themes', grants: { id: 'theme', value: 'ocean' } },
        { id: 'theme_forest', name: 'Rừng Xanh', cost: 1500, category: 'themes', grants: { id: 'theme', value: 'forest' } },
        { id: 'theme_sunset', name: 'Hoàng Hôn', cost: 2000, category: 'themes', grants: { id: 'theme', value: 'sunset' } }
    ];

    const ACHIEVEMENTS = [
        { id: 'first_line', name: 'Dòng Đầu Tiên', description: 'Xóa dòng đầu tiên', reward: 50, condition: () => totalLinesCleared >= 1 },
        { id: 'combo_master', name: 'Bậc Thầy Combo', description: 'Đạt combo x5', reward: 100, condition: () => maxCombo >= 5 },
        { id: 'level_10', name: 'Cấp Độ 10', description: 'Đạt level 10', reward: 200, condition: () => currentLevel >= 10 },
        { id: 'coin_collector', name: 'Thợ Sưu Tập Xu', description: 'Có 5000 xu', reward: 500, condition: () => coins >= 5000 },
        { id: 'persistent', name: 'Kiên Trì', description: 'Chơi 50 ván', reward: 300, condition: () => gamesPlayed >= 50 }
    ];

    let unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');

    // --- ENHANCED AUDIO SYSTEM ---
    function startAudioContext() {
        if (!audioContextStarted && typeof zzfx !== 'undefined') {
            zzfx.resume();
            audioContextStarted = true;
        }
    }

    const SOUNDS = {
        place: [, , 90, .01, .03, .06, 1, 1.5, , , , , , , 1, , , .05, .01],
        clear: [1.05, , 224, .04, .13, .23, 4, .8, , , 436, .07, , .1, , .2, , .54, .05],
        smash: [,,461,.03,.16,.3,1,1.82,1.7,-1.1,-157,.06,.07, ,,-.1,.02,.62,.02],
        reroll: [1.01,,21,.02,.07,.31,3,.07,,,,,.14,,.1,,.04,.58,.08],
        explode: [1.25,,68,.08,.24,.6,1,1.99,-14.9,3.4,,,,.1,,.1,.27,.82,.07],
        win: [1.5, , 440, .1, .2, .3, 1, 1.5, 4, 2, , , , .1, , .1, , .8, .1],
        lose: [, .1, 120, .2, .3, .4, 4, 2, , , , , , .2, , .2, , .8, .1],
        click: [, , 500, .01, .01, .1, 1, 0, , , , , , , , , , .02],
        purchase: [1.1, , 1046, .02, .04, .17, 1, 1.7, , , , , , .1, , .1, , .4, .03],
        error: [,,200,.02,.02,.1,4,.4,-4.3,,,,,,,.2,,.6,.09],
        combo: [1.2, , 800, .02, .1, .2, 1, 2, , , , , , .1, , .1, , .6, .05],
        achievement: [1.5, , 660, .1, .3, .4, 1, 1.8, 5, 3, , , , .2, , .2, , .9, .1]
    };

    function playSound(soundName) {
        if (!gameSettings.sound) return;
        startAudioContext();
        const sound = SOUNDS[soundName];
        if (sound && typeof zzfx !== 'undefined') {
            zzfx(...sound);
        }
    }

    function vibrate(pattern = 100) {
        if (gameSettings.vibration && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // --- PARTICLE SYSTEM ---
    function createParticle(x, y, color = '#fff', type = 'star') {
        const particle = document.createElement('div');
        particle.className = `particle particle-${type}`;
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = color;
        particleContainer.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    }

    function createExplosion(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                createParticle(
                    x + (Math.random() - 0.5) * 100,
                    y + (Math.random() - 0.5) * 100,
                    `hsl(${Math.random() * 360}, 70%, 60%)`,
                    'explosion'
                );
            }, i * 50);
        }
    }

    // --- INITIALIZATION ---
    function initGame() {
        loadGameData();
        setupLevel(currentLevel);
        createBoard();
        generateNewPieces();
        updateUI();
        checkAchievements();
    }

    function loadGameData() {
        const savedData = localStorage.getItem('blockPuzzleGame');
        if (savedData) {
            const data = JSON.parse(savedData);
            currentLevel = data.currentLevel || 1;
            coins = data.coins || 500;
            score = data.score || 0;
            playerInventory = { ...playerInventory, ...data.inventory };
            gameSettings = { ...gameSettings, ...data.settings };
            maxCombo = data.maxCombo || 0;
            totalLinesCleared = data.totalLinesCleared || 0;
            gamesPlayed = data.gamesPlayed || 0;
            currentTheme = data.currentTheme || 'default';
        }
        applyTheme(currentTheme);
    }

    function saveGameData() {
        const data = {
            currentLevel,
            coins,
            score,
            inventory: playerInventory,
            settings: gameSettings,
            maxCombo,
            totalLinesCleared,
            gamesPlayed,
            currentTheme
        };
        localStorage.setItem('blockPuzzleGame', JSON.stringify(data));
    }

    function setupLevel(level) {
        currentLevel = level;
        const difficulty = gameSettings.difficulty;
        const baseRequired = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 5;
        cratesRequired = baseRequired + Math.floor(level / 3);
        cratesCollected = 0;
        combo = 0;
        boardState = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    }

    function createBoard() {
        gameBoard.innerHTML = '';
        previewOverlay.innerHTML = '';
        
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = Math.floor(i / GRID_SIZE);
            cell.dataset.col = i % GRID_SIZE;
            gameBoard.appendChild(cell);
            
            const previewCell = document.createElement('div');
            previewCell.classList.add('preview-cell');
            previewCell.dataset.row = Math.floor(i / GRID_SIZE);
            previewCell.dataset.col = i % GRID_SIZE;
            previewOverlay.appendChild(previewCell);
        }
    }

    // --- UI & RENDERING ---
    function updateUI() {
        levelEl.textContent = currentLevel;
        scoreEl.textContent = score.toLocaleString();
        cratesCollectedEl.textContent = cratesCollected;
        cratesRequiredEl.textContent = cratesRequired;
        coinsEl.textContent = coins.toLocaleString();
        
        const progress = Math.min((cratesCollected / cratesRequired) * 100, 100);
        progressFill.style.width = progress + '%';
        progressPercentageEl.textContent = Math.round(progress) + '%';
        
        updatePowerUpUI();
        updateComboDisplay();
        saveGameData();
    }

    function updatePowerUpUI() {
        powerUpBar.innerHTML = '';
        Object.keys(playerInventory).forEach(key => {
            if (playerInventory[key] > 0) {
                const data = POWER_UP_DATA[key];
                if (!data) return;
                
                const btn = document.createElement('button');
                btn.className = 'power-up-btn';
                btn.title = data.description;
                if (activePowerUp === key) btn.classList.add('active');
                
                btn.innerHTML = `
                    <div class="power-up-icon" style="background-image: url('${data.icon}')"></div>
                    <div class="power-up-count">${playerInventory[key]}</div>
                `;
                
                btn.addEventListener('click', () => togglePowerUp(key));
                powerUpBar.appendChild(btn);
            }
        });
    }

    function updateComboDisplay() {
        if (combo > 1) {
            comboDisplay.classList.remove('hidden');
            comboCountEl.textContent = `x${combo}`;
            comboDisplay.style.animation = 'none';
            comboDisplay.offsetHeight; // Trigger reflow
            comboDisplay.style.animation = 'combo-pulse 0.5s ease-out';
        } else {
            comboDisplay.classList.add('hidden');
        }
    }

    function renderPiece(pieceData, isPreview = false) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        if (isPreview) pieceElement.classList.add('preview-piece');
        
        const bounds = getPieceBounds(pieceData.shape);
        pieceElement.style.gridTemplateColumns = `repeat(${bounds.width}, 1fr)`;
        
        pieceData.shape.forEach(pos => {
            const cell = document.createElement('div');
            cell.classList.add('piece-cell');
            cell.style.gridRow = pos[1] + 1;
            cell.style.gridColumn = pos[0] + 1;
            
            const block = document.createElement('div');
            block.classList.add('block');
            
            if (pieceData.isCrate) {
                block.classList.add('block-crate');
            } else if (pieceData.isRainbow) {
                block.classList.add('block-rainbow');
            } else {
                block.classList.add(`block-${pieceData.color}`);
            }
            
            cell.appendChild(block);
            pieceElement.appendChild(cell);
        });
        
        return pieceElement;
    }

    // --- ENHANCED GAME LOGIC ---
    function generateNewPieces() {
        availablePieces = [];
        piecesGrid.innerHTML = '';
        
        const difficulty = gameSettings.difficulty;
        const pieceCount = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 4 : 3;
        
        for (let i = 0; i < pieceCount; i++) {
            const shape = PIECE_SHAPES[PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]];
            const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
            
            let hasCrate = Math.random() < (0.1 + currentLevel * 0.01);
            let isRainbow = playerInventory.rainbow > 0 && Math.random() < 0.1;
            
            const piece = {
                shape,
                color,
                id: Date.now() + i,
                isCrate: hasCrate,
                isRainbow: isRainbow
            };
            
            if (isRainbow) {
                playerInventory.rainbow--;
            }
            
            availablePieces.push(piece);
            
            const pieceWrapper = document.createElement('div');
            pieceWrapper.className = 'piece-wrapper';
            
            const pieceEl = renderPiece(piece);
            pieceEl.dataset.pieceIndex = i;
            
            if (hasCrate) {
                pieceEl.style.filter = 'saturate(1.5) drop-shadow(0 0 8px #ffd700)';
            }
            if (isRainbow) {
                pieceEl.style.filter = 'saturate(1.8) drop-shadow(0 0 10px #a855f7)';
            }
            
            pieceWrapper.appendChild(pieceEl);
            piecesGrid.appendChild(pieceWrapper);
        }
        
        if (checkGameOver()) {
            setTimeout(() => {
                showNotification('🎮 Hết nước đi!', 'Không thể đặt khối nào. Hãy dùng vật phẩm hoặc bắt đầu lại.', () => {
                    gamesPlayed++;
                    initGame();
                });
            }, 500);
        }
        
        if (gameSettings.autoHints) {
            showHint();
        }
    }

    function getPieceBounds(shape) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        shape.forEach(pos => {
            minX = Math.min(minX, pos[0]);
            maxX = Math.max(maxX, pos[0]);
            minY = Math.min(minY, pos[1]);
            maxY = Math.max(maxY, pos[1]);
        });
        return { width: maxX - minX + 1, height: maxY - minY + 1 };
    }

    function canPlacePiece(piece, startRow, startCol) {
        for (const pos of piece.shape) {
            const r = startRow + pos[1];
            const c = startCol + pos[0];
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || boardState[r][c]) {
                return false;
            }
        }
        return true;
    }

    function placePiece(piece, startRow, startCol) {
        let placedCrates = 0;
        
        piece.shape.forEach(pos => {
            const r = startRow + pos[1];
            const c = startCol + pos[0];
            
            boardState[r][c] = {
                color: piece.color,
                isCrate: piece.isCrate,
                isRainbow: piece.isRainbow
            };
            
            if (piece.isCrate) placedCrates++;
            
            const cell = gameBoard.children[r * GRID_SIZE + c];
            const block = document.createElement('div');
            
            if (piece.isCrate) {
                block.className = 'block block-crate';
            } else if (piece.isRainbow) {
                block.className = 'block block-rainbow';
            } else {
                block.className = `block block-${piece.color}`;
            }
            
            cell.appendChild(block);
            
            // Add placement animation
            block.style.transform = 'scale(0)';
            setTimeout(() => {
                block.style.transform = 'scale(1)';
            }, 50);
        });
        
        playSound('place');
        vibrate(50);
        
        // Add score for placing piece
        const pieceScore = piece.shape.length * 10 * (combo + 1);
        score += pieceScore;
        
        // Create score popup
        createScorePopup(startRow, startCol, pieceScore);
    }

    function createScorePopup(row, col, points) {
        const cell = gameBoard.children[row * GRID_SIZE + col];
        const rect = cell.getBoundingClientRect();
        
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${points}`;
        popup.style.left = rect.left + rect.width / 2 + 'px';
        popup.style.top = rect.top + 'px';
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 1000);
    }

    function checkForLineClear() {
        let lines = { rows: [], cols: [] };
        
        // Check rows
        for (let r = 0; r < GRID_SIZE; r++) {
            if (boardState[r].every(c => c !== null)) {
                lines.rows.push(r);
            }
        }
        
        // Check columns
        for (let c = 0; c < GRID_SIZE; c++) {
            if (boardState.every(row => row[c] !== null)) {
                lines.cols.push(c);
            }
        }
        
        if (lines.rows.length > 0 || lines.cols.length > 0) {
            clearLines(lines);
        } else {
            combo = 0; // Reset combo if no lines cleared
        }
    }

    function clearLines(lines) {
        playSound('clear');
        vibrate([100, 50, 100]);
        
        combo++;
        if (combo > maxCombo) {
            maxCombo = combo;
        }
        
        let clearedCrates = 0;
        const totalLines = lines.rows.length + lines.cols.length;
        totalLinesCleared += totalLines;
        
        const processCell = (r, c) => {
            if (boardState[r][c]) {
                if (boardState[r][c].isCrate) clearedCrates++;
                boardState[r][c] = null;
                
                const cell = gameBoard.children[r * GRID_SIZE + c];
                if (cell.firstElementChild) {
                    cell.firstElementChild.classList.add('clearing');
                    
                    // Create explosion effect
                    const rect = cell.getBoundingClientRect();
                    createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 3);
                }
            }
        };
        
        lines.rows.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) {
                processCell(r, c);
            }
        });
        
        lines.cols.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) {
                processCell(r, c);
            }
        });
        
        setTimeout(() => {
            document.querySelectorAll('.clearing').forEach(b => b.remove());
            
            cratesCollected += clearedCrates;
            
            // Calculate score with combo multiplier
            const lineScore = totalLines * 100 * combo;
            const crateBonus = clearedCrates * 50 * combo;
            score += lineScore + crateBonus;
            coins += totalLines * 15 * combo;
            
            if (combo > 1) {
                playSound('combo');
                createScorePopup(4, 4, lineScore + crateBonus);
            }
            
            updateUI();
            checkWinCondition();
            checkAchievements();
        }, 500);
    }

    function checkWinCondition() {
        if (cratesCollected >= cratesRequired) {
            playSound('win');
            vibrate([200, 100, 200]);
            
            const levelBonus = 200 + currentLevel * 25;
            const comboBonus = maxCombo * 50;
            coins += levelBonus + comboBonus;
            score += levelBonus + comboBonus;
            
            updateUI();
            
            showNotification(
                '🎉 Thắng rồi!',
                `Hoàn thành Level ${currentLevel}!\n+${levelBonus + comboBonus} xu thưởng`,
                () => {
                    currentLevel++;
                    initGame();
                }
            );
        }
    }

    function checkGameOver() {
        return availablePieces.filter(p => p).every(piece => {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (canPlacePiece(piece, r, c)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    // --- ENHANCED POWER-UP LOGIC ---
    function togglePowerUp(powerUpId) {
        playSound('click');
        
        if (powerUpId === 'reroll') {
            if (playerInventory.reroll > 0) {
                playSound('reroll');
                playerInventory.reroll--;
                generateNewPieces();
                updatePowerUpUI();
            }
            return;
        }
        
        activePowerUp = activePowerUp === powerUpId ? null : powerUpId;
        document.body.className = activePowerUp ? `${activePowerUp}-active` : '';
        updatePowerUpUI();
    }

    function handleBoardClick(e) {
        if (!activePowerUp) return;
        
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (activePowerUp === 'hammer' && playerInventory.hammer > 0) {
            if (boardState[row][col]) {
                playSound('smash');
                vibrate(100);
                playerInventory.hammer--;
                
                if (boardState[row][col].isCrate) {
                    cratesCollected++;
                }
                
                boardState[row][col] = null;
                cell.innerHTML = '';
                
                // Create explosion effect
                const rect = cell.getBoundingClientRect();
                createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 5);
                
                updateUI();
            }
        }
        
        if (activePowerUp === 'bomb' && playerInventory.bomb > 0) {
            playSound('explode');
            vibrate([150, 50, 150]);
            playerInventory.bomb--;
            
            let destroyedCrates = 0;
            
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && boardState[r][c]) {
                        if (boardState[r][c].isCrate) {
                            destroyedCrates++;
                        }
                        
                        boardState[r][c] = null;
                        const targetCell = gameBoard.children[r * GRID_SIZE + c];
                        if (targetCell.firstElementChild) {
                            targetCell.firstElementChild.classList.add('clearing');
                        }
                        
                        // Create explosion effect for each cell
                        const rect = targetCell.getBoundingClientRect();
                        setTimeout(() => {
                            createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2, 3);
                        }, Math.random() * 200);
                    }
                }
            }
            
            setTimeout(() => {
                document.querySelectorAll('.clearing').forEach(b => b.remove());
                cratesCollected += destroyedCrates;
                updateUI();
            }, 500);
        }
        
        if (playerInventory[activePowerUp] <= 0) {
            activePowerUp = null;
            document.body.className = '';
            updatePowerUpUI();
        }
    }

    // --- HINT SYSTEM ---
    function showHint() {
        clearTimeout(hintTimeout);
        
        // Find best placement for current pieces
        let bestPlacement = null;
        let bestScore = -1;
        
        availablePieces.forEach((piece, pieceIndex) => {
            if (!piece) return;
            
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (canPlacePiece(piece, r, c)) {
                        const score = calculatePlacementScore(piece, r, c);
                        if (score > bestScore) {
                            bestScore = score;
                            bestPlacement = { piece, row: r, col: c, pieceIndex };
                        }
                    }
                }
            }
        });
        
        if (bestPlacement) {
            showPlacementPreview(bestPlacement.piece, bestPlacement.row, bestPlacement.col);
            
            hintTimeout = setTimeout(() => {
                clearPlacementPreview();
            }, 3000);
        }
    }

    function calculatePlacementScore(piece, row, col) {
        // Simple scoring: prefer placements that complete lines or are near other blocks
        let score = 0;
        
        piece.shape.forEach(pos => {
            const r = row + pos[1];
            const c = col + pos[0];
            
            // Check adjacent cells
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && boardState[nr][nc]) {
                        score += 10;
                    }
                }
            }
        });
        
        return score;
    }

    function showPlacementPreview(piece, row, col) {
        clearPlacementPreview();
        
        piece.shape.forEach(pos => {
            const r = row + pos[1];
            const c = col + pos[0];
            const previewCell = previewOverlay.children[r * GRID_SIZE + c];
            previewCell.classList.add('hint-preview');
        });
    }

    function clearPlacementPreview() {
        document.querySelectorAll('.hint-preview').forEach(cell => {
            cell.classList.remove('hint-preview');
        });
    }

    // --- THEME SYSTEM ---
    function applyTheme(themeName) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
        currentTheme = themeName;
    }

    // --- ACHIEVEMENT SYSTEM ---
    function checkAchievements() {
        ACHIEVEMENTS.forEach(achievement => {
            if (!unlockedAchievements.includes(achievement.id) && achievement.condition()) {
                unlockAchievement(achievement);
            }
        });
    }

    function unlockAchievement(achievement) {
        unlockedAchievements.push(achievement.id);
        localStorage.setItem('achievements', JSON.stringify(unlockedAchievements));
        
        coins += achievement.reward;
        playSound('achievement');
        vibrate([200, 100, 200, 100, 200]);
        
        showAchievement(achievement);
    }

    function showAchievement(achievement) {
        const modal = document.getElementById('achievement-modal');
        modal.querySelector('#achievement-title').textContent = achievement.name;
        modal.querySelector('#achievement-description').textContent = achievement.description;
        modal.querySelector('#achievement-coins').textContent = `+${achievement.reward}`;
        modal.classList.remove('hidden');
        
        document.getElementById('achievement-ok-button').onclick = () => {
            modal.classList.add('hidden');
            updateUI();
        };
    }

    // --- DRAG & DROP LOGIC ---
    function handleDragStart(e) {
        if (activePowerUp) return;
        
        const targetPiece = e.target.closest('.piece');
        if (!targetPiece) return;
        
        playSound('click');
        e.preventDefault();
        
        const pieceIndex = parseInt(targetPiece.dataset.pieceIndex);
        draggedPieceData = availablePieces[pieceIndex];
        
        if (!draggedPieceData) return;
        
        draggedElement = targetPiece.cloneNode(true);
        draggedElement.classList.add('dragging');
        document.body.appendChild(draggedElement);
        
        targetPiece.style.opacity = '0.3';
        isDragging = true;
        
        moveDraggedElement(e);
        
        document.addEventListener('mousemove', moveDraggedElement);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', moveDraggedElement, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    }

    function moveDraggedElement(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        draggedElement.style.left = `${clientX - draggedElement.offsetWidth / 2}px`;
        draggedElement.style.top = `${clientY - draggedElement.offsetHeight / 2}px`;
        
        const cell = getCellFromPoint(clientX, clientY);
        
        // Clear previous preview
        clearPlacementPreview();
        draggedElement.classList.remove('can-place', 'cannot-place');
        
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (canPlacePiece(draggedPieceData, row, col)) {
                draggedElement.classList.add('can-place');
                showPlacementPreview(draggedPieceData, row, col);
            } else {
                draggedElement.classList.add('cannot-place');
            }
        }
    }

    function handleDragEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        clearTimeout(hintTimeout);
        clearPlacementPreview();
        
        const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
        
        const cell = getCellFromPoint(clientX, clientY);
        let placed = false;
        
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (canPlacePiece(draggedPieceData, row, col)) {
                placePiece(draggedPieceData, row, col);
                
                const pieceIndex = availablePieces.indexOf(draggedPieceData);
                availablePieces[pieceIndex] = null;
                placed = true;
            }
        }
        
        document.body.removeChild(draggedElement);
        draggedElement = null;
        
        // Reset piece opacity
        document.querySelectorAll('#pieces-grid .piece').forEach(p => {
            p.style.opacity = '1';
        });
        
        if (placed) {
            const pieceIndex = availablePieces.indexOf(null);
            const originalPieceEl = piecesGrid.querySelector(`[data-piece-index='${pieceIndex}']`);
            if (originalPieceEl && originalPieceEl.parentNode) {
                originalPieceEl.parentNode.remove();
            }
            
            checkForLineClear();
            
            if (availablePieces.every(p => p === null)) {
                setTimeout(() => {
                    generateNewPieces();
                }, 1000);
            }
        }
        
        document.removeEventListener('mousemove', moveDraggedElement);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', moveDraggedElement);
        document.removeEventListener('touchend', handleDragEnd);
    }

    function getCellFromPoint(x, y) {
        const element = document.elementFromPoint(x, y);
        return element ? element.closest('.grid-cell') : null;
    }

    // --- MODAL & UI FUNCTIONS ---
    function showNotification(title, message, callback, icon = 'ℹ️') {
        const modal = document.getElementById('notification-modal');
        modal.querySelector('#notification-icon').textContent = icon;
        modal.querySelector('#notification-title').textContent = title;
        modal.querySelector('#notification-message').textContent = message;
        
        const btn = modal.querySelector('#notification-button');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (callback) callback();
        }, { once: true });
        
        modal.classList.remove('hidden');
    }

    function renderStore() {
        const activeTab = document.querySelector('.store-tab.active').dataset.tab;
        const tabContent = document.getElementById(`${activeTab}-tab`);
        
        tabContent.innerHTML = '';
        
        const items = STORE_ITEMS.filter(item => item.category === activeTab);
        
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'store-item';
            if (coins < item.cost) itemEl.classList.add('disabled');
            
            const grants = Array.isArray(item.grants) ? item.grants[0] : item.grants;
            let icon = '';
            
            if (grants.id === 'coin') {
                icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23eab308'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='14' fill='black' font-weight='bold'%3E$%3C/text%3E%3C/svg%3E";
            } else if (grants.id === 'theme') {
                icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23a855f7' viewBox='0 0 24 24'%3E%3Cpath d='M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z'/%3E%3C/svg%3E";
            } else {
                icon = POWER_UP_DATA[grants.id]?.icon || '';
            }
            
            itemEl.innerHTML = `
                <div class="item-icon" style="background-image: url('${icon}')"></div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-cost">
                        <div class="icon coin-icon"></div>
                        ${item.cost}
                    </div>
                </div>
            `;
            
            itemEl.addEventListener('click', () => {
                if (coins >= item.cost) {
                    playSound('purchase');
                    vibrate(100);
                    coins -= item.cost;
                    
                    if (Array.isArray(item.grants)) {
                        item.grants.forEach(g => {
                            if (g.id === 'coin') {
                                coins += g.amount;
                            } else {
                                playerInventory[g.id] += g.amount;
                            }
                        });
                    } else {
                        if (item.grants.id === 'coin') {
                            coins += item.grants.amount;
                        } else if (item.grants.id === 'theme') {
                            applyTheme(item.grants.value);
                        } else {
                            playerInventory[item.grants.id] += item.grants.amount;
                        }
                    }
                    
                    updateUI();
                    renderStore();
                } else {
                    playSound('error');
                    vibrate(200);
                }
            });
            
            tabContent.appendChild(itemEl);
        });
    }

    // --- EVENT LISTENERS ---
    
    // Settings button
    document.getElementById('settings-button').addEventListener('click', () => {
        playSound('click');
        document.getElementById('settings-modal').classList.remove('hidden');
    });

    // Store button
    document.getElementById('store-button').addEventListener('click', () => {
        playSound('click');
        renderStore();
        document.getElementById('store-modal').classList.remove('hidden');
    });

    // Hint button
    document.getElementById('hint-button').addEventListener('click', () => {
        playSound('click');
        showHint();
    });

    // Store tabs
    document.querySelectorAll('.store-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.store-grid').forEach(g => g.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            
            renderStore();
        });
    });

    // Close modal buttons
    document.querySelectorAll('.close-modal-button').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            btn.closest('.modal-overlay').classList.add('hidden');
        });
    });

    // Settings toggles
    document.getElementById('sound-toggle').addEventListener('click', (e) => {
        gameSettings.sound = !gameSettings.sound;
        e.target.classList.toggle('on', gameSettings.sound);
        e.target.classList.toggle('off', !gameSettings.sound);
        e.target.textContent = gameSettings.sound ? 'Bật' : 'Tắt';
        playSound('click');
    });

    document.getElementById('vibration-toggle').addEventListener('click', (e) => {
        gameSettings.vibration = !gameSettings.vibration;
        e.target.classList.toggle('on', gameSettings.vibration);
        e.target.classList.toggle('off', !gameSettings.vibration);
        e.target.textContent = gameSettings.vibration ? 'Bật' : 'Tắt';
        playSound('click');
    });

    document.getElementById('hints-toggle').addEventListener('click', (e) => {
        gameSettings.autoHints = !gameSettings.autoHints;
        e.target.classList.toggle('on', gameSettings.autoHints);
        e.target.classList.toggle('off', !gameSettings.autoHints);
        e.target.textContent = gameSettings.autoHints ? 'Bật' : 'Tắt';
        playSound('click');
    });

    document.getElementById('difficulty-select').addEventListener('change', (e) => {
        gameSettings.difficulty = e.target.value;
        playSound('click');
    });

    document.getElementById('reset-game-button').addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn khởi động lại game? Tiến trình sẽ bị mất!')) {
            localStorage.removeItem('blockPuzzleGame');
            location.reload();
        }
    });

    // Game board click handler
    gameBoard.addEventListener('click', handleBoardClick);

    // Drag and drop handlers
    piecesGrid.addEventListener('mousedown', handleDragStart);
    piecesGrid.addEventListener('touchstart', handleDragStart, { passive: false });

    // Prevent context menu on long press
    document.addEventListener('contextmenu', e => e.preventDefault());

    // --- START GAME ---
    initGame();
});
