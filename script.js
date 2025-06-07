document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const gameWrapper = document.querySelector('.game-wrapper');
    const boardContainer = document.getElementById('game-board-container');
    const boardElement = document.getElementById('game-board');
    const floatingTextContainer = document.getElementById('floating-text-container');
    const piecesContainer = document.getElementById('pieces-container');
    const cratesLeftElement = document.getElementById('crates-left');
    const playerCoinsElement = document.getElementById('player-coins');
    const gameOverScreen = document.getElementById('game-over-screen');
    const playAgainButton = document.getElementById('play-again-button');
    const finalCratesClearedElement = document.getElementById('final-crates-cleared');
    const restartButton = document.getElementById('restart-button');
    const shopButton = document.getElementById('shop-button');
    const shopModal = document.getElementById('shop-modal');
    const closeShopButton = document.getElementById('close-shop-button');
    const shopItemsContainer = document.getElementById('shop-items-container');
    const shopPlayerCoinsElement = document.getElementById('shop-player-coins');

    // ---- Game Constants ----
    const GRID_WIDTH = 8;
    const GRID_HEIGHT = 8;
    const CELL_SIZE_VALUE = 40;
    const GRID_GAP_VALUE = 4;

    // ---- Game State ----
    let grid = [];
    let currentPieces = [];
    let initialCrates = 0;
    let cratesToClear = 0;
    let playerCoins = 0;
    let activeTheme = 'default';
    let purchasedItems = {};
    let isDragging = false;
    let draggedPiece = null;
    let draggedPieceOriginal = null;
    let offset = { x: 0, y: 0 };
    let dragAnchor = {x: 0, y: 0}; // **QUAN TRỌNG: Vị trí neo khi kéo

    // ---- Audio Context for Sound Effects ----
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playSound(type, options = {}) {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

        switch (type) {
            case 'place': oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(261.63, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2); break;
            case 'clear': oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(options.pitch || 440, audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime((options.pitch || 440) * 2, audioCtx.currentTime + 0.3); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3); break;
            case 'crate': oscillator.type = 'square'; oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15); break;
            case 'gameover': oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(200, audioCtx.currentTime); oscillator.frequency.exponentialRmpToValueAtTime(100, audioCtx.currentTime + 0.8); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8); break;
            case 'click': oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1); break;
        }
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    }
    
    // ---- Piece Definitions ----
    const PIECES = [
        { shape: [[1, 1, 1, 1]], color: 'yellow' }, { shape: [[1], [1], [1], [1]], color: 'yellow' },
        { shape: [[1, 0], [1, 0], [1, 1]], color: 'orange' }, { shape: [[0, 1], [0, 1], [1, 1]], color: 'orange' },
        { shape: [[1, 1, 1], [1, 0, 0]], color: 'orange' }, { shape: [[1, 1, 1], [0, 0, 1]], color: 'orange' },
        { shape: [[1, 1, 1], [0, 1, 0]], color: 'pink' }, { shape: [[1, 1], [1, 1]], color: 'blue' },
        { shape: [[1, 1]], color: 'pink' }, { shape: [[1], [1]], color: 'pink' }, { shape: [[1]], color: 'blue' },
        { shape: [[1, 1, 1]], color: 'yellow' },
    ];
    const CRATE_PIECE = { shape: [[2], [1], [1], [1]], color: 'orange' };

    // ---- Game Initialization ----
    function init() {
        loadData();
        createGrid();
        setupLevel();
        generateNewPieces();
        updateUI();
        applyTheme(activeTheme);
        gameOverScreen.classList.add('hidden');
    }

    function createGrid() {
        boardElement.innerHTML = '';
        grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                boardElement.appendChild(cell);
                grid[y][x] = { element: cell, type: 0 };
            }
        }
    }

    function setupLevel() {
        const levelLayout = ['C.B...BC','C.B...BC','.BB.BB..','.BOOB...','.BOOB...','.BB.BB..','C.B...BC','C.B...BC',];
        initialCrates = 0;
        levelLayout.forEach((rowStr, y) => {
            rowStr.split('').forEach((char, x) => {
                let type = 0, color = '';
                if (char === 'C') { type = 2; initialCrates++; }
                if (char === 'B') { type = 1; color = 'blue'; }
                if (char === 'O') { type = 1; color = 'orange'; }
                if (type > 0) {
                    grid[y][x].type = type;
                    grid[y][x].element.appendChild(createBlockElement(type, color));
                }
            });
        });
        cratesToClear = initialCrates;
    }

    function generateNewPieces() {
        piecesContainer.innerHTML = '';
        currentPieces = [];
        const pieceDefs = [ CRATE_PIECE, PIECES[Math.floor(Math.random() * PIECES.length)], PIECES[Math.floor(Math.random() * PIECES.length)] ];
        pieceDefs.forEach((p, i) => {
            const pieceEl = createPieceElement(p, i);
            piecesContainer.appendChild(pieceEl);
            currentPieces.push({ element: pieceEl, definition: p, used: false });
        });
    }

    function createPieceElement(pieceDef, index) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece');
        pieceEl.dataset.index = index;
        const shape = pieceDef.shape;
        const scale = 0.7;
        pieceEl.style.gridTemplateRows = `repeat(${shape.length}, calc(var(--cell-size) * ${scale}))`;
        pieceEl.style.gridTemplateColumns = `repeat(${shape[0].length}, calc(var(--cell-size) * ${scale}))`;
        shape.forEach(row => {
            row.forEach(cell => {
                const blockContainer = document.createElement('div');
                if (cell > 0) {
                    const block = createBlockElement(cell, pieceDef.color);
                    block.style.width = `calc(var(--cell-size) * ${scale})`;
                    block.style.height = `calc(var(--cell-size) * ${scale})`;
                    blockContainer.appendChild(block);
                }
                pieceEl.appendChild(blockContainer);
            });
        });
        pieceEl.addEventListener('mousedown', startDrag);
        pieceEl.addEventListener('touchstart', startDrag, { passive: false });
        return pieceEl;
    }

    function createBlockElement(type, colorClass) {
        const block = document.createElement('div');
        block.classList.add('block');
        block.classList.add(type === 2 ? 'crate' : colorClass);
        return block;
    }

    // ---- DRAG AND DROP LOGIC - FINAL VERSION ----
    function startDrag(e) {
        const targetPiece = e.target.closest('.piece');
        if (!targetPiece || targetPiece.classList.contains('used')) return;
        
        e.preventDefault();
        isDragging = true;
        draggedPieceOriginal = targetPiece;
        
        draggedPiece = targetPiece.cloneNode(true);
        draggedPiece.classList.add('dragging');
        document.body.appendChild(draggedPiece);
        
        const rect = targetPiece.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        // 1. Tính toán offset để hiển thị mảnh ghép đúng dưới con trỏ
        offset.x = clientX - rect.left;
        offset.y = clientY - rect.top;

        // 2. **LOGIC NEO MỚI**: Xác định người dùng đã bấm vào khối con nào trong mảnh ghép
        const pieceScaleInFooter = 0.7;
        const anchorX = Math.floor(offset.x / (CELL_SIZE_VALUE * pieceScaleInFooter));
        const anchorY = Math.floor(offset.y / (CELL_SIZE_VALUE * pieceScaleInFooter));
        dragAnchor = { x: anchorX, y: anchorY };

        draggedPieceOriginal.classList.add('dragging-source');
        
        moveDrag(e);
        
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('touchmove', moveDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }
    
    function moveDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Cập nhật vị trí hiển thị của mảnh ghép
        draggedPiece.style.left = `${clientX - offset.x}px`;
        draggedPiece.style.top = `${clientY - offset.y}px`;
        
        // 3. **LOGIC TÍNH TOÁN MỚI**: Tìm ô lưới dưới con trỏ
        const { x: targetX, y: targetY } = getGridCoordsFromCursor(clientX, clientY);

        // 4. Tính vị trí bắt đầu của mảnh ghép dựa trên điểm neo
        const startX = targetX - dragAnchor.x;
        const startY = targetY - dragAnchor.y;
        
        updateGhostBlocks(startX, startY);
    }

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;

        document.removeEventListener('mousemove', moveDrag);
        document.removeEventListener('touchmove', moveDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);

        clearGhostBlocks();

        const clientX = e.clientX || e.changedTouches[0].clientX;
        const clientY = e.clientY || e.changedTouches[0].clientY;
        
        // Lặp lại logic tính toán vị trí cuối cùng
        const { x: targetX, y: targetY } = getGridCoordsFromCursor(clientX, clientY);
        const startX = targetX - dragAnchor.x;
        const startY = targetY - dragAnchor.y;
        
        const pieceIndex = draggedPieceOriginal.dataset.index;
        const piece = currentPieces[pieceIndex];
        
        if (canPlacePiece(piece.definition, startX, startY)) {
            placePiece(piece.definition, startX, startY);
            piece.used = true;
            piece.element.classList.add('used');
            playSound('place');
            checkLineClears();
            if (currentPieces.every(p => p.used)) {
                setTimeout(generateNewPieces, 300);
            }
            setTimeout(checkGameOver, 350);
        } else {
            draggedPieceOriginal.classList.remove('dragging-source');
        }
        
        document.body.removeChild(draggedPiece);
        draggedPiece = null;
        draggedPieceOriginal = null;
    }
    
    // **Hàm tính toán đã được sửa lại để lấy ô dưới con trỏ**
    function getGridCoordsFromCursor(cursorX, cursorY) {
        const boardRect = boardElement.getBoundingClientRect();
        
        if (cursorX < boardRect.left || cursorX > boardRect.right || cursorY < boardRect.top || cursorY > boardRect.bottom) {
            return { x: -1, y: -1 }; // Con trỏ nằm ngoài bảng
        }
        
        const relativeX = cursorX - boardRect.left;
        const relativeY = cursorY - boardRect.top;

        // Dùng Math.floor để xác định chính xác ô đang ở trên
        const gridX = Math.floor(relativeX / (CELL_SIZE_VALUE + GRID_GAP_VALUE));
        const gridY = Math.floor(relativeY / (CELL_SIZE_VALUE + GRID_GAP_VALUE));

        return { x: gridX, y: gridY };
    }

    function canPlacePiece(pieceDef, startX, startY) {
        const shape = pieceDef.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] > 0) {
                    const gridX = startX + x;
                    const gridY = startY + y;
                    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT || grid[gridY][gridX].type !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function placePiece(pieceDef, startX, startY) {
        const shape = pieceDef.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] > 0) {
                    const gridX = startX + x;
                    const gridY = startY + y;
                    const cell = grid[gridY][gridX];
                    cell.type = shape[y][x];
                    cell.element.appendChild(createBlockElement(cell.type, pieceDef.color));
                }
            }
        }
    }

    function updateGhostBlocks(startX, startY) {
        clearGhostBlocks();
        if (!draggedPieceOriginal) return;
        const pieceIndex = draggedPieceOriginal.dataset.index;
        const pieceDef = currentPieces[pieceIndex].definition;
        
        if (canPlacePiece(pieceDef, startX, startY)) {
            const shape = pieceDef.shape;
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] > 0) {
                        const gridX = startX + x;
                        const gridY = startY + y;
                        if(gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT){
                            const ghostBlock = createBlockElement(shape[y][x], pieceDef.color);
                            ghostBlock.classList.add('ghost');
                            grid[gridY][gridX].element.appendChild(ghostBlock);
                        }
                    }
                }
            }
        }
    }
    
    function clearGhostBlocks() {
        document.querySelectorAll('.ghost').forEach(g => g.remove());
    }

    // ---- Game Logic & Events (No changes needed below this line) ----
    function checkLineClears() {
        let linesToClear = { rows: [], cols: [] };
        for (let i = 0; i < GRID_HEIGHT; i++) {
            if (grid[i].every(cell => cell.type > 0)) linesToClear.rows.push(i);
            let fullCol = true;
            for (let j = 0; j < GRID_WIDTH; j++) if(grid[j][i].type === 0) fullCol = false;
            if (fullCol) linesToClear.cols.push(i);
        }
        const totalLinesCleared = linesToClear.rows.length + linesToClear.cols.length;
        if (totalLinesCleared > 0) clearLines(linesToClear, totalLinesCleared);
    }
    
    function clearLines(lines, totalLinesCleared) {
        let clearedCrates = 0, clearedBlocks = 0;
        let clearedCoords = { x: 0, y: 0, count: 0 };
        const cellsToClear = new Set();
        lines.rows.forEach(y => { for (let x = 0; x < GRID_WIDTH; x++) cellsToClear.add(grid[y][x]); });
        lines.cols.forEach(x => { for (let y = 0; y < GRID_HEIGHT; y++) cellsToClear.add(grid[y][x]); });
        cellsToClear.forEach(cell => {
            if (cell.type === 2) { cratesToClear--; clearedCrates++; playSound('crate'); }
            clearedBlocks++;
            cell.element.classList.add('clearing');
            const cellRect = cell.element.getBoundingClientRect();
            clearedCoords.x += cellRect.left + cellRect.width / 2;
            clearedCoords.y += cellRect.top + cellRect.height / 2;
            clearedCoords.count++;
        });
        if (totalLinesCleared > 1) {
            const comboPitch = 440 + totalLinesCleared * 50;
            playSound('clear', { pitch: comboPitch });
            const comboMessages = ["Combo!", "Tuyệt vời!", "Sạch sành sanh!", "Không thể tin được!"];
            const message = `${comboMessages[Math.min(totalLinesCleared - 2, comboMessages.length - 1)]} x${totalLinesCleared}`;
            showFloatingText(message, clearedCoords.x / clearedCoords.count, clearedCoords.y / clearedCoords.count);
            triggerScreenShake();
        } else { playSound('clear'); }
        const comboBonus = (totalLinesCleared > 1) ? (totalLinesCleared * 10) : 0;
        playerCoins += clearedBlocks + (clearedCrates * 5) + comboBonus;
        setTimeout(() => {
            cellsToClear.forEach(cell => {
                cell.element.classList.remove('clearing');
                cell.element.innerHTML = '';
                cell.type = 0;
            });
            updateUI();
        }, 300);
    }
    
    function checkGameOver() {
        const availablePieces = currentPieces.filter(p => !p.used);
        if (availablePieces.length === 0) return;
        for (const piece of availablePieces) {
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (canPlacePiece(piece.definition, x, y)) return;
                }
            }
        }
        endGame();
    }
    function endGame() { playSound('gameover'); finalCratesClearedElement.textContent = initialCrates - cratesToClear; gameOverScreen.classList.remove('hidden'); saveData(); }
    function showFloatingText(text, x, y) {
        const boardRect = boardContainer.getBoundingClientRect();
        const textEl = document.createElement('div');
        textEl.className = 'floating-text';
        textEl.textContent = text;
        textEl.style.left = `${x - boardRect.left}px`;
        textEl.style.top = `${y - boardRect.top}px`;
        textEl.style.transform = 'translate(-50%, -50%)';
        floatingTextContainer.appendChild(textEl);
        setTimeout(() => textEl.remove(), 1500);
    }
    function triggerScreenShake() { gameWrapper.classList.add('screen-shake'); setTimeout(() => gameWrapper.classList.remove('screen-shake'), 400); }
    function updateUI() { cratesLeftElement.textContent = Math.max(0, cratesToClear); playerCoinsElement.textContent = playerCoins; shopPlayerCoinsElement.textContent = playerCoins; }
    function restartGame() { playSound('click'); init(); }
    function saveData() { localStorage.setItem('blockPuzzle_coins', playerCoins); localStorage.setItem('blockPuzzle_theme', activeTheme); localStorage.setItem('blockPuzzle_purchased', JSON.stringify(purchasedItems)); }
    function loadData() { playerCoins = parseInt(localStorage.getItem('blockPuzzle_coins')) || 0; activeTheme = localStorage.getItem('blockPuzzle_theme') || 'default'; purchasedItems = JSON.parse(localStorage.getItem('blockPuzzle_purchased')) || {}; }
    const SHOP_ITEMS = [
        { id: 'theme_default', name: 'Mặc định', desc: 'Chủ đề màu tím và xanh cổ điển.', price: 0, type: 'theme', icon: '🎨', data: { '--bg-color': '#3a2e7c', '--grid-bg': '#2c215d' } }, { id: 'theme_forest', name: 'Rừng Xanh', desc: 'Tông màu xanh lá cây mát mẻ.', price: 100, type: 'theme', icon: '🌲', data: { '--bg-color': '#2d572c', '--grid-bg': '#1e391d' } }, { id: 'theme_ocean', name: 'Đại Dương', desc: 'Chủ đề xanh dương sâu thẳm.', price: 100, type: 'theme', icon: '🌊', data: { '--bg-color': '#1d4a68', '--grid-bg': '#112d40' } }, { id: 'theme_sunset', name: 'Hoàng Hôn', desc: 'Tông màu cam và đỏ ấm áp.', price: 150, type: 'theme', icon: '🌇', data: { '--bg-color': '#8c3b2a', '--grid-bg': '#6b2c20' } }, { id: 'theme_mono', name: 'Đơn Sắc', desc: 'Giao diện đen trắng tối giản.', price: 200, type: 'theme', icon: '🔳', data: { '--bg-color': '#333333', '--grid-bg': '#1e1e1e' } }, { id: 'theme_candy', name: 'Kẹo Ngọt', desc: 'Màu hồng và tím pastel.', price: 150, type: 'theme', icon: '🍭', data: { '--bg-color': '#d187c0', '--grid-bg': '#a76999' } }, { id: 'theme_space', name: 'Vũ Trụ', desc: 'Màu đen sâu thẳm và các vì sao.', price: 250, type: 'theme', icon: '🚀', data: { '--bg-color': '#0f0f23', '--grid-bg': '#050511' } }, { id: 'theme_desert', name: 'Sa Mạc', desc: 'Tông màu vàng cát.', price: 100, type: 'theme', icon: '🏜️', data: { '--bg-color': '#a88d5e', '--grid-bg': '#846e49' } }, { id: 'theme_lava', name: 'Dung Nham', desc: 'Đỏ rực và đen.', price: 200, type: 'theme', icon: '🌋', data: { '--bg-color': '#6e1409', '--grid-bg': '#410c05' } }, { id: 'theme_ice', name: 'Băng Giá', desc: 'Màu xanh băng lạnh lẽo.', price: 150, type: 'theme', icon: '🧊', data: { '--bg-color': '#6391a8', '--grid-bg': '#486f80' } },
        { id: 'power_bomb', name: 'Bom 3x3', desc: 'Phá một vùng 3x3 trên lưới.', price: 50, type: 'powerup', icon: '💣' }, { id: 'power_hammer', name: 'Búa', desc: 'Phá một ô bất kỳ.', price: 25, type: 'powerup', icon: '🔨' }, { id: 'power_swap', name: 'Đổi Khối', desc: 'Lấy 3 khối mới.', price: 75, type: 'powerup', icon: '🔄' }, { id: 'power_undo', name: 'Hoàn Tác', desc: 'Quay lại bước đi cuối.', price: 100, type: 'powerup', icon: '↩️' }, { id: 'power_rotate', name: 'Xoay Khối', desc: 'Xoay một khối có thể xoay.', price: 40, type: 'powerup', icon: '🔃' },
        { id: 'cosmetic_sparkle', name: 'Hiệu ứng Lấp Lánh', desc: 'Thêm hiệu ứng khi phá hàng.', price: 300, type: 'cosmetic', icon: '✨' }, { id: 'cosmetic_sound_8bit', name: 'Âm thanh 8-bit', desc: 'Đổi âm thanh thành kiểu retro.', price: 200, type: 'cosmetic', icon: '👾' }, { id: 'cosmetic_neon', name: 'Khối Neon', desc: 'Làm cho các khối phát sáng.', price: 400, type: 'cosmetic', icon: '💡' }, { id: 'cosmetic_cat', name: 'Dấu chân Mèo', desc: 'Thay con trỏ bằng dấu chân mèo.', price: 150, type: 'cosmetic', icon: '🐾' }, { id: 'cosmetic_gold', name: 'Tiền Vàng Rơi', desc: 'Hiệu ứng tiền vàng rơi khi phá hàng.', price: 500, type: 'cosmetic', icon: '💰' },
    ];
    function openShop() { playSound('click'); renderShop(); shopModal.classList.remove('hidden'); }
    function closeShop() { playSound('click'); shopModal.classList.add('hidden'); saveData(); }
    function renderShop() {
        shopItemsContainer.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            const isPurchased = purchasedItems[item.id];
            const isActive = item.type === 'theme' && activeTheme === item.id;
            itemEl.innerHTML = `<div class="shop-item-icon">${item.icon}</div><div class="shop-item-details"><h4>${item.name}</h4><p>${item.desc}</p></div><button class="shop-item-buy-button" data-id="${item.id}" ${playerCoins < item.price && !isPurchased ? 'disabled' : ''}>${isActive ? 'Đang dùng' : isPurchased ? 'Sử dụng' : `${item.price} 🪙`}</button>`;
            const button = itemEl.querySelector('button');
            if (isActive) { button.disabled = true; button.classList.add('purchased'); } else if (isPurchased) { button.classList.add('purchased'); }
            button.addEventListener('click', () => buyItem(item));
            shopItemsContainer.appendChild(itemEl);
        });
    }
    function buyItem(item) {
        playSound('click');
        if (purchasedItems[item.id]) {
            if (item.type === 'theme') { activeTheme = item.id; applyTheme(item.id); renderShop(); }
        } else {
            if (playerCoins >= item.price) {
                playerCoins -= item.price;
                purchasedItems[item.id] = true;
                if (item.type === 'theme') { activeTheme = item.id; applyTheme(item.id); }
                updateUI(); renderShop();
            }
        }
    }
    function applyTheme(themeId) {
        const theme = SHOP_ITEMS.find(item => item.id === themeId);
        if (theme && theme.type === 'theme') { for (const [key, value] of Object.entries(theme.data)) document.documentElement.style.setProperty(key, value); }
    }
    playAgainButton.addEventListener('click', restartGame);
    restartButton.addEventListener('click', restartGame);
    shopButton.addEventListener('click', openShop);
    closeShopButton.addEventListener('click', closeShop);
    init();
});