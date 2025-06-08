document.addEventListener('DOMContentLoaded', () => {

    // --- STATE & CONFIG ---
    const GRID_SIZE = 9;
    let boardState = [];
    let currentLevel = 1, cratesCollected = 0, cratesRequired = 5;
    let coins = 500;
    let availablePieces = [];
    let playerInventory = { hammer: 2, reroll: 1, bomb: 0 };
    let activePowerUp = null; // 'hammer', 'bomb', null
    let isSoundOn = true, audioContextStarted = false;
    let isDragging = false, draggedPieceData = null, draggedElement = null;

    // --- DOM ELEMENTS ---
    const gameBoard = document.getElementById('game-board');
    const pieceContainer = document.getElementById('piece-container');
    const powerUpBar = document.getElementById('power-up-bar');
    const levelEl = document.getElementById('level-number');
    const cratesCollectedEl = document.getElementById('crates-collected');
    const cratesRequiredEl = document.getElementById('crates-required');
    const coinsEl = document.getElementById('coins-amount');
    const storeGrid = document.querySelector('.store-grid');
    const allModals = document.querySelectorAll('.modal-overlay');

    // --- POWER-UPS & STORE ITEMS ---
    const POWER_UP_DATA = {
        hammer: { id: 'hammer', name: 'Búa Phá Ô', icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23eab308'%3E%3Cpath d='M14.5 2.5l-5 5L5 12l-2.5 2.5 5 5L10 22l4.5-4.5 5-5-2.5-2.5-5-5z'/%3E%3C/svg%3E" },
        reroll: { id: 'reroll', name: 'Đổi Khối', icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 24 24'%3E%3Cpath d='M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'/%3E%3C/svg%3E" },
        bomb: { id: 'bomb', name: 'Bom 3x3', icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23ef4444' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E" }
    };

    const STORE_ITEMS = [
        { id: 'hammer_1', name: '1 Búa', cost: 75, grants: { id: 'hammer', amount: 1 } },
        { id: 'hammer_3', name: '3 Búa', cost: 200, grants: { id: 'hammer', amount: 3 } },
        { id: 'reroll_1', name: '1 Lượt Đổi', cost: 50, grants: { id: 'reroll', amount: 1 } },
        { id: 'reroll_5', name: '5 Lượt Đổi', cost: 220, grants: { id: 'reroll', amount: 5 } },
        { id: 'bomb_1', name: '1 Bom', cost: 150, grants: { id: 'bomb', amount: 1 } },
        { id: 'bomb_3', name: '3 Bom', cost: 400, grants: { id: 'bomb', amount: 3 } },
        { id: 'starter_pack', name: 'Gói Khởi Đầu', cost: 300, grants: [{ id: 'hammer', amount: 2 }, { id: 'reroll', amount: 2 }, { id: 'bomb', amount: 1 }] },
        // Thêm 13 vật phẩm "placeholder" nữa để đủ 20, bạn có thể tự định nghĩa chúng
        ...Array.from({ length: 13 }, (_, i) => ({
            id: `coins_${i+1}`, name: `${(i+1)*50} Xu`, cost: (i+1)*25, grants: { id: 'coins', amount: (i+1)*50 }
        }))
    ];

    // --- AUDIO ---
    function startAudioContext() { if (!audioContextStarted && typeof zzfx !== 'function') { zzfx.resume(); audioContextStarted = true; } }
    const playSound = (sound) => {
        if (!isSoundOn) return;
        startAudioContext();
        switch (sound) {
            case 'place': zzfx(...[, , 90, .01, .03, .06, 1, 1.5, , , , , , , 1, , , .05, .01]); break;
            case 'clear': zzfx(...[1.05, , 224, .04, .13, .23, 4, .8, , , 436, .07, , .1, , .2, , .54, .05]); break;
            case 'smash': zzfx(...[,,461,.03,.16,.3,1,1.82,1.7,-1.1,-157,.06,.07,T,,-.1,.02,.62,.02]); break;
            case 'reroll': zzfx(...[1.01,,21,.02,.07,.31,3,.07,,,,,.14,,.1,,.04,.58,.08]); break;
            case 'explode': zzfx(...[1.25,,68,.08,.24,.6,1,1.99,-14.9,3.4,,,,.1,,.1,.27,.82,.07]); break;
            case 'win': zzfx(...[1.5, , 440, .1, .2, .3, 1, 1.5, 4, 2, , , , .1, , .1, , .8, .1]); break;
            case 'lose': zzfx(...[, .1, 120, .2, .3, .4, 4, 2, , , , , , .2, , .2, , .8, .1]); break;
            case 'click': zzfx(...[, , 500, .01, .01, .1, 1, 0, , , , , , , , , , .02]); break;
            case 'purchase': zzfx(...[1.1, , 1046, .02, .04, .17, 1, 1.7, , , , , , .1, , .1, , .4, .03]); break;
            case 'error': zzfx(...[,,200,.02,.02,.1,4,.4,-4.3,,,,,,,.2,,.6,.09]); break;
        }
    };
    
    // --- INITIALIZATION ---
    function initGame() {
        setupLevel(currentLevel);
        createBoard();
        generateNewPieces();
        updateUI();
    }

    function setupLevel(level) {
        currentLevel = level;
        cratesRequired = 4 + Math.floor(level / 2);
        cratesCollected = 0;
        boardState = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    }

    function createBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = Math.floor(i / GRID_SIZE);
            cell.dataset.col = i % GRID_SIZE;
            gameBoard.appendChild(cell);
        }
        gameBoard.addEventListener('click', handleBoardClick);
    }
    
    // --- UI & RENDERING ---
    function updateUI() {
        levelEl.textContent = currentLevel;
        cratesCollectedEl.textContent = cratesCollected;
        cratesRequiredEl.textContent = cratesRequired;
        coinsEl.textContent = coins;
        updatePowerUpUI();
    }

    function updatePowerUpUI() {
        powerUpBar.innerHTML = '';
        Object.keys(playerInventory).forEach(key => {
            if (playerInventory[key] > 0) {
                const data = POWER_UP_DATA[key];
                const btn = document.createElement('button');
                btn.className = 'power-up-btn';
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
    
    function renderPiece(pieceData) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        const bounds = getPieceBounds(pieceData.shape);
        pieceElement.style.gridTemplateColumns = `repeat(${bounds.width}, 1fr)`;
        pieceData.shape.forEach(pos => {
            const cell = document.createElement('div');
            cell.classList.add('piece-cell');
            cell.style.gridRow = pos[1] + 1;
            cell.style.gridColumn = pos[0] + 1;
            const block = document.createElement('div');
            block.classList.add('block');
            block.classList.add(`block-${pieceData.color}`);
            cell.appendChild(block);
            pieceElement.appendChild(cell);
        });
        return pieceElement;
    }

    // --- GAME LOGIC ---
    function generateNewPieces() {
        availablePieces = [];
        pieceContainer.innerHTML = '';
        const pieceKeys = ['i2','i3','i4','l3','j3','o4','dot1','t3'];
        for (let i = 0; i < 3; i++) {
            const shape = PIECE_SHAPES[pieceKeys[Math.floor(Math.random() * pieceKeys.length)]];
            const color = ['blue', 'orange', 'pink', 'yellow'][Math.floor(Math.random() * 4)];
            const piece = { shape, color, id: Date.now() + i };
            availablePieces.push(piece);
            const pieceEl = renderPiece(piece);
            pieceEl.dataset.pieceIndex = i;
            pieceContainer.appendChild(pieceEl);
        }
    }
    
    function canPlacePiece(piece, startRow, startCol) { /* ... Giữ nguyên ... */ }
    function placePiece(piece, startRow, startCol) { /* ... Giữ nguyên ... */ }
    function checkForLineClear() { /* ... Giữ nguyên ... */ }
    function clearLines(lines) { /* ... Giữ nguyên ... */ }
    function checkWinCondition() { /* ... Giữ nguyên ... */ }
    function checkGameOver() { /* ... Giữ nguyên ... */ }
    
    // --- POWER-UP LOGIC ---
    function togglePowerUp(powerUpId) {
        playSound('click');
        if (activePowerUp === powerUpId) {
            activePowerUp = null; // Tắt nếu nhấn lại
        } else {
            activePowerUp = powerUpId;
        }
        document.body.className = activePowerUp ? `${activePowerUp}-active` : '';
        updatePowerUpUI();
    }

    function handleBoardClick(e) {
        if (!activePowerUp) return;
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (activePowerUp === 'hammer') {
            if (boardState[row][col] !== 0) {
                playSound('smash');
                playerInventory.hammer--;
                boardState[row][col] = 0;
                cell.innerHTML = '';
                if(playerInventory.hammer <= 0) activePowerUp = null;
            }
        }
        if (activePowerUp === 'bomb') {
            playSound('explode');
            playerInventory.bomb--;
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && boardState[r][c] !== 0) {
                        boardState[r][c] = 0;
                        const targetCell = gameBoard.children[r * GRID_SIZE + c];
                        if (targetCell.firstElementChild) {
                           targetCell.firstElementChild.classList.add('clearing');
                        }
                    }
                }
            }
            setTimeout(() => document.querySelectorAll('.clearing').forEach(b => b.remove()), 500);
            if(playerInventory.bomb <= 0) activePowerUp = null;
        }
        
        document.body.className = '';
        if (playerInventory[activePowerUp] > 0) {
           // Giữ powerup active nếu vẫn còn
        } else {
            activePowerUp = null;
        }
        updateUI();
    }
    
    // --- DRAG & DROP LOGIC (SNAP-TO-GRID) ---
    function handleDragStart(e) {
        if (activePowerUp) return;
        const targetPiece = e.target.closest('.piece');
        if (!targetPiece) return;
        
        playSound('click');
        e.preventDefault();
        
        const pieceIndex = parseInt(targetPiece.dataset.pieceIndex);
        draggedPieceData = availablePieces[pieceIndex];
        
        draggedElement = targetPiece.cloneNode(true);
        draggedElement.classList.add('dragging');
        document.body.appendChild(draggedElement);
        targetPiece.style.opacity = '0.3';
        
        isDragging = true;
        moveDraggedElement(e); // Move to initial position
        
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
        
        // Di chuyển khối theo tay
        draggedElement.style.left = `${clientX - draggedElement.offsetWidth / 2}px`;
        draggedElement.style.top = `${clientY - draggedElement.offsetHeight / 2}px`;
        
        // Logic snap-to-grid và preview
        const cell = getCellFromPoint(clientX, clientY);
        draggedElement.classList.remove('can-place', 'cannot-place');
        
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (canPlacePiece(draggedPieceData, row, col)) {
                draggedElement.classList.add('can-place');
            } else {
                draggedElement.classList.add('cannot-place');
            }
        }
    }

    function handleDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        
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
        
        document.querySelectorAll('#piece-container .piece').forEach(p => p.style.opacity = '1');

        if(placed) {
            const pieceIndex = availablePieces.indexOf(null);
            const originalPieceEl = pieceContainer.querySelector(`[data-piece-index='${pieceIndex}']`);
            if (originalPieceEl) originalPieceEl.remove();

            checkForLineClear();
            if (availablePieces.every(p => p === null)) {
                generateNewPieces();
            }
            if (checkGameOver()) {
                // Game Over Logic
            }
        }
        
        document.removeEventListener('mousemove', moveDraggedElement);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', moveDraggedElement);
        document.removeEventListener('touchend', handleDragEnd);
    }
    
    // --- EVENT LISTENERS & HELPERS ---
    document.getElementById('settings-button').addEventListener('click', () => { playSound('click'); document.getElementById('settings-modal').classList.remove('hidden'); });
    document.getElementById('store-button').addEventListener('click', () => { playSound('click'); renderStore(); document.getElementById('store-modal').classList.remove('hidden'); });
    document.querySelectorAll('.close-modal-button').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.add('hidden')));
    pieceContainer.addEventListener('mousedown', handleDragStart);
    pieceContainer.addEventListener('touchstart', handleDragStart, { passive: false });

    // --- Các hàm phụ và logic game khác ---
    // ... Bạn có thể copy-paste lại các hàm getPieceBounds, canPlacePiece, placePiece, etc. từ phiên bản trước
    // ... hoặc sử dụng các phiên bản đã được tinh chỉnh ở trên.
    // Dưới đây là các hàm đó để đảm bảo đầy đủ.
    function getPieceBounds(shape) { let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; shape.forEach(pos => { minX = Math.min(minX, pos[0]); maxX = Math.max(maxX, pos[0]); minY = Math.min(minY, pos[1]); maxY = Math.max(maxY, pos[1]); }); return { width: maxX - minX + 1, height: maxY - minY + 1 }; }
    function canPlacePiece(piece, startRow, startCol) { for (const pos of piece.shape) { const r = startRow + pos[1]; const c = startCol + pos[0]; if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || boardState[r][c] !== 0) return false; } return true; }
    function placePiece(piece, startRow, startCol) { piece.shape.forEach(pos => { const r = startRow + pos[1]; const c = startCol + pos[0]; boardState[r][c] = 1; const cell = gameBoard.children[r * GRID_SIZE + c]; const block = document.createElement('div'); block.className = `block block-${piece.color}`; cell.appendChild(block); }); playSound('place'); }
    function checkForLineClear() { let lines = { rows: [], cols: [] }; for (let r = 0; r < GRID_SIZE; r++) { if (boardState[r].every(c => c !== 0)) lines.rows.push(r); } for (let c = 0; c < GRID_SIZE; c++) { if (boardState.every(row => row[c] !== 0)) lines.cols.push(c); } if (lines.rows.length > 0 || lines.cols.length > 0) clearLines(lines); }
    function clearLines(lines) { playSound('clear'); let clearedCrates = 0; const processCell = (r, c) => { if (boardState[r][c] !== 0) { if (boardState[r][c] === 2) clearedCrates++; boardState[r][c] = 0; const cell = gameBoard.children[r * GRID_SIZE + c]; if (cell.firstElementChild) cell.firstElementChild.classList.add('clearing'); } }; lines.rows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) processCell(r, c); }); lines.cols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) processCell(r, c); }); setTimeout(() => { document.querySelectorAll('.clearing').forEach(b => b.remove()); cratesCollected += clearedCrates; coins += (lines.rows.length + lines.cols.length) * 10; updateUI(); checkWinCondition(); }, 500); }
    function checkWinCondition() { if (cratesCollected >= cratesRequired) { playSound('win'); coins += 100; updateUI(); showNotification('Thắng rồi!', `Bạn đã hoàn thành Level ${currentLevel}.`, () => { currentLevel++; initGame(); }); } }
    function checkGameOver() { return availablePieces.filter(p => p).every(piece => { for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (canPlacePiece(piece, r, c)) return false; return true; }); }
    function getCellFromPoint(x, y) { const element = document.elementFromPoint(x, y); return element ? element.closest('.grid-cell') : null; }
    function showNotification(title, message, callback) { const modal = document.getElementById('notification-modal'); modal.querySelector('h2').textContent = title; modal.querySelector('p').textContent = message; const btn = modal.querySelector('button'); const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn); newBtn.addEventListener('click', () => { modal.classList.add('hidden'); if (callback) callback(); }, { once: true }); modal.classList.remove('hidden'); }
    function renderStore() { storeGrid.innerHTML = ''; STORE_ITEMS.forEach(item => { const itemEl = document.createElement('div'); itemEl.className = 'store-item'; if (coins < item.cost) itemEl.classList.add('disabled'); const grants = Array.isArray(item.grants) ? item.grants[0] : item.grants; const icon = POWER_UP_DATA[grants.id]?.icon || "path/to/coin.svg"; itemEl.innerHTML = `<div class="item-icon" style="background-image: url('${icon}')"></div><div class="item-details"><div class="item-name">${item.name}</div><div class="item-cost"><div class="icon coin-icon"></div>${item.cost}</div></div>`; itemEl.addEventListener('click', () => { if (coins >= item.cost) { playSound('purchase'); coins -= item.cost; if (Array.isArray(item.grants)) { item.grants.forEach(g => playerInventory[g.id] += g.amount); } else { playerInventory[item.grants.id] += item.grants.amount; } updateUI(); renderStore(); } else { playSound('error'); } }); storeGrid.appendChild(itemEl); }); }

    initGame();
});
