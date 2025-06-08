document.addEventListener('DOMContentLoaded', () => {

    // --- CẤU HÌNH GAME ---
    const GRID_SIZE = 9;
    const MAX_LEVEL = 100;

    // --- LƯU TRỮ TRẠNG THÁI GAME ---
    let boardState = [];
    let currentLevel = 1;
    let cratesCollected = 0;
    let cratesRequired = 5;
    let coins = 200; // Bắt đầu với một ít xu để thử
    let availablePieces = [];
    let isSoundOn = true;

    // --- TRẠNG THÁI KÉO THẢ & MUA HÀNG ---
    let isDragging = false;
    let draggedPieceData = null;
    let draggedElement = null;
    let offsetX, offsetY;
    let replacementState = { active: false, item: null }; // Trạng thái thay thế

    // --- CÁC PHẦN TỬ DOM ---
    const gameBoard = document.getElementById('game-board');
    const pieceContainer = document.getElementById('piece-container');
    const levelNumberEl = document.getElementById('level-number');
    const cratesCollectedEl = document.getElementById('crates-collected');
    const cratesRequiredEl = document.getElementById('crates-required');
    const coinsAmountEl = document.getElementById('coins-amount');
    const storeGrid = document.querySelector('.store-grid');

    const settingsModal = document.getElementById('settings-modal');
    const storeModal = document.getElementById('store-modal');
    const notificationModal = document.getElementById('notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const notificationButton = document.getElementById('notification-button');
    
    const settingsButton = document.getElementById('settings-button');
    const storeButton = document.getElementById('store-button');
    const soundToggleButton = document.getElementById('sound-toggle');
    const closeModalButtons = document.querySelectorAll('.close-modal-button');

    // --- ĐỊNH NGHĨA HÌNH DẠNG KHỐI & MÀU SẮC ---
    const PIECE_SHAPES = {
        dot1: [[0, 0]],
        i2: [[0, 0], [1, 0]], i3: [[0, 0], [1, 0], [2, 0]], i4: [[0, 0], [1, 0], [2, 0], [3, 0]],
        i2v: [[0, 0], [0, 1]], i3v: [[0, 0], [0, 1], [0, 2]], i4v: [[0, 0], [0, 1], [0, 2], [0, 3]],
        l3: [[0, 0], [1, 0], [1, 1]], l4: [[0, 0], [1, 0], [2, 0], [2, 1]],
        j3: [[0, 1], [1, 1], [1, 0]], j4: [[0, 1], [1, 1], [2, 1], [2, 0]],
        t3: [[0, 0], [1, 0], [2, 0], [1, 1]],
        o4: [[0, 0], [0, 1], [1, 0], [1, 1]],
        s: [[1, 0], [2, 0], [0, 1], [1, 1]], z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        c5: [[0,1], [1,0], [1,1], [1,2], [2,1]], // Chữ thập
        u5: [[0,0], [0,2], [1,0], [1,1], [1,2]], // Chữ U
        f5: [[0,1],[1,0],[1,1],[1,2],[2,1]],
        p5: [[0,0],[0,1],[0,2],[1,1],[1,2]],
    };
    const COLORS = ['blue', 'orange', 'pink', 'yellow', 'special'];
    const COLOR_MAP = { blue: 1, orange: 2, pink: 3, yellow: 4, crate: 5, special: 6 };
    
    // --- DANH SÁCH VẬT PHẨM CỬA HÀNG ---
    const STORE_ITEMS = [
        { name: "Đơn", cost: 15, piece: { shape: PIECE_SHAPES.dot1, color: 'special' }},
        { name: "Thanh 2", cost: 25, piece: { shape: PIECE_SHAPES.i2, color: 'special' }},
        { name: "Thanh 3", cost: 40, piece: { shape: PIECE_SHAPES.i3, color: 'special' }},
        { name: "Thanh 4", cost: 60, piece: { shape: PIECE_SHAPES.i4, color: 'special' }},
        { name: "Thanh 4 Dọc", cost: 60, piece: { shape: PIECE_SHAPES.i4v, color: 'special' }},
        { name: "Góc 3", cost: 35, piece: { shape: PIECE_SHAPES.l3, color: 'special' }},
        { name: "Góc 4", cost: 55, piece: { shape: PIECE_SHAPES.l4, color: 'special' }},
        { name: "Vuông", cost: 50, piece: { shape: PIECE_SHAPES.o4, color: 'special' }},
        { name: "Chữ T", cost: 45, piece: { shape: PIECE_SHAPES.t3, color: 'special' }},
        { name: "Chữ Z", cost: 50, piece: { shape: PIECE_SHAPES.z, color: 'special' }},
        { name: "Chữ S", cost: 50, piece: { shape: PIECE_SHAPES.s, color: 'special' }},
        { name: "Chữ J Ngược", cost: 55, piece: { shape: PIECE_SHAPES.j4, color: 'special' }},
        { name: "Thanh 2 Dọc", cost: 25, piece: { shape: PIECE_SHAPES.i2v, color: 'special' }},
        { name: "Thanh 3 Dọc", cost: 40, piece: { shape: PIECE_SHAPES.i3v, color: 'special' }},
        { name: "Góc 3 Ngược", cost: 35, piece: { shape: PIECE_SHAPES.j3, color: 'special' }},
        { name: "Chữ Thập", cost: 80, piece: { shape: PIECE_SHAPES.c5, color: 'special' }},
        { name: "Chữ U", cost: 80, piece: { shape: PIECE_SHAPES.u5, color: 'special' }},
        { name: "Khối F", cost: 85, piece: { shape: PIECE_SHAPES.f5, color: 'special' }},
        { name: "Khối P", cost: 85, piece: { shape: PIECE_SHAPES.p5, color: 'special' }},
        { name: "Rương Gỗ", cost: 100, piece: { shape: PIECE_SHAPES.dot1, color: 'special', crateIndex: 0 }},
    ];

    // --- ÂM THANH ---
    const playSound = (sound) => {
        if (!isSoundOn || typeof zzfx !== 'function') return;
        switch (sound) {
            case 'place': zzfx(...[,,90,.01,.03,.06,1,1.5,,,,,,,1,,,.05,.01]); break;
            case 'clear': zzfx(...[1.05,,224,.04,.13,.23,4,.8,,436,.07,,.1,,.2,,.54,.05]); break;
            case 'win': zzfx(...[1.5,,440,.1,.2,.3,1,1.5,4,2,,,.1,,.1,,.8,.1]); break;
            case 'lose': zzfx(...[,,120,.2,.3,.4,4,2,,,,,.2,,.2,,.8,.1]); break;
            case 'click': zzfx(...[,,500,.01,.01,.1,1,0,,,,,,,,,.02]); break;
            case 'purchase': zzfx(...[1.1,,1046,.02,.04,.17,1,1.7,,,,,,.1,,.1,,.4,.03]); break;
            case 'error': zzfx(...[,,200,.02,.02,.1,4,.4,-4.3,,,,,,,.2,,.6,.09]); break;
        }
    };
    
    // --- CÁC HÀM KHỞI TẠO & VẼ ---
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
        boardState = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
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
    }

    function generateNewPieces() {
        availablePieces = [];
        pieceContainer.innerHTML = '';
        const pieceKeys = Object.keys(PIECE_SHAPES);

        for (let i = 0; i < 3; i++) {
            const randomShapeKey = pieceKeys[Math.floor(Math.random() * pieceKeys.length)];
            const shape = PIECE_SHAPES[randomShapeKey];
            const color = ['blue', 'orange', 'pink', 'yellow'][Math.floor(Math.random() * 4)];
            let hasCrate = Math.random() < 0.1;
            let crateIndex = -1;
            if (hasCrate && shape.length > 0) {
                crateIndex = Math.floor(Math.random() * shape.length);
            }
            const piece = { shape, color, id: Date.now() + Math.random() + i, crateIndex };
            availablePieces.push(piece);
            pieceContainer.appendChild(renderPiece(piece, i));
        }
    }

    function renderPiece(pieceData, index, isPreview = false) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        if (isPreview) {
            pieceElement.classList.add('item-preview');
        } else {
            pieceElement.dataset.pieceIndex = index;
        }

        const bounds = getPieceBounds(pieceData.shape);
        pieceElement.style.gridTemplateColumns = `repeat(${bounds.width}, 1fr)`;
        
        pieceData.shape.forEach((pos, i) => {
            const cell = document.createElement('div');
            cell.classList.add('piece-cell');
            cell.style.gridRow = pos[1] + 1;
            cell.style.gridColumn = pos[0] + 1;

            const block = document.createElement('div');
            block.classList.add('block');
            if(pieceData.crateIndex === i) {
                block.classList.add('crate');
            } else {
                block.classList.add(`block-${pieceData.color}`);
            }
            cell.appendChild(block);
            pieceElement.appendChild(cell);
        });
        return pieceElement;
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
    
    // --- LOGIC CỬA HÀNG ---
    function renderStore() {
        storeGrid.innerHTML = '';
        STORE_ITEMS.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('store-item');
            if (coins < item.cost) {
                itemEl.classList.add('disabled');
            }
            
            const previewEl = renderPiece(item.piece, -1, true);
            const costEl = document.createElement('div');
            costEl.classList.add('item-cost');
            costEl.innerHTML = `<div class="coin-icon"></div>${item.cost}`;

            itemEl.appendChild(previewEl);
            itemEl.appendChild(costEl);

            itemEl.addEventListener('click', () => handleStoreItemClick(item));
            storeGrid.appendChild(itemEl);
        });
    }

    function handleStoreItemClick(item) {
        if (coins < item.cost) {
            playSound('error');
            return;
        }
        playSound('purchase');
        coins -= item.cost;
        updateUI();
        storeModal.classList.add('hidden');
        
        replacementState = { active: true, item: item };
        activatePieceReplacementMode();
    }

    function activatePieceReplacementMode() {
        document.querySelectorAll('#piece-container .piece').forEach(p => {
            p.classList.add('selectable-for-replacement');
        });
        document.body.addEventListener('click', cancelReplacementOnClickOutside, true);
    }
    
    function deactivatePieceReplacementMode() {
        document.querySelectorAll('#piece-container .piece').forEach(p => {
            p.classList.remove('selectable-for-replacement');
        });
        replacementState = { active: false, item: null };
        document.body.removeEventListener('click', cancelReplacementOnClickOutside, true);
    }
    
    function handlePieceReplacementClick(e) {
        const targetPiece = e.target.closest('.piece.selectable-for-replacement');
        if (!targetPiece) return;

        const pieceIndex = parseInt(targetPiece.dataset.pieceIndex);
        
        // Thay thế khối
        availablePieces[pieceIndex] = replacementState.item.piece;
        
        // Vẽ lại container khối
        pieceContainer.innerHTML = '';
        availablePieces.forEach((p, i) => {
            if (p) pieceContainer.appendChild(renderPiece(p, i));
        });
        
        deactivatePieceReplacementMode();
    }
    
    function cancelReplacementOnClickOutside(e) {
        if (!e.target.closest('.selectable-for-replacement')) {
            coins += replacementState.item.cost; // Hoàn tiền
            updateUI();
            deactivatePieceReplacementMode();
            playSound('click');
        }
    }


    // --- LOGIC KÉO THẢ ---
    function handleDragStart(e) {
        if (replacementState.active) {
            handlePieceReplacementClick(e);
            return;
        }

        const targetPiece = e.target.closest('.piece');
        if (!targetPiece) return;
        
        e.preventDefault();

        isDragging = true;
        draggedElement = targetPiece;
        const pieceIndex = parseInt(draggedElement.dataset.pieceIndex);
        draggedPieceData = availablePieces[pieceIndex];
        
        const rect = draggedElement.getBoundingClientRect();
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        
        document.body.appendChild(draggedElement);
        draggedElement.classList.add('dragging');
        draggedElement.style.transform = `translate(${clientX - offsetX}px, ${clientY - offsetY}px) scale(1.2)`;

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    }

    function handleDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        draggedElement.style.transform = `translate(${clientX - offsetX}px, ${clientY - offsetY}px) scale(1.2)`;
        
        const targetCell = getCellFromPoint(clientX, clientY);
        clearPreview();
        if (targetCell) {
            const row = parseInt(targetCell.dataset.row);
            const col = parseInt(targetCell.dataset.col);
            showPreview(draggedPieceData, row, col);
        }
    }

    function handleDragEnd(e) {
        if (!isDragging) return;

        isDragging = false;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);

        const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
        
        const targetCell = getCellFromPoint(clientX, clientY);
        clearPreview();

        let placed = false;
        if (targetCell) {
            const row = parseInt(targetCell.dataset.row);
            const col = parseInt(targetCell.dataset.col);
            if (canPlacePiece(draggedPieceData, row, col)) {
                placePiece(draggedPieceData, row, col);
                const pieceIndex = availablePieces.indexOf(draggedPieceData);
                availablePieces[pieceIndex] = null;
                placed = true;
            }
        }
        
        draggedElement.remove();
        draggedElement = null;
        draggedPieceData = null;

        pieceContainer.innerHTML = '';
        availablePieces.forEach((p, i) => {
            if(p) pieceContainer.appendChild(renderPiece(p, i));
        });

        if (placed) {
            checkForLineClear();
            if (availablePieces.every(p => p === null)) {
                generateNewPieces();
            }
            if (checkGameOver()) {
                showNotification('Thua rồi!', 'Không còn nước đi nào. Hãy thử lại nhé!', () => { initGame(); });
                playSound('lose');
            }
        }
    }

    function getCellFromPoint(x, y) {
        const element = document.elementFromPoint(x, y);
        return element ? element.closest('.grid-cell') : null;
    }


    // --- LOGIC GAMEPLAY ---
    function canPlacePiece(piece, startRow, startCol) {
        for (const pos of piece.shape) {
            const r = startRow + pos[1];
            const c = startCol + pos[0];
            if (r >= GRID_SIZE || c >= GRID_SIZE || r < 0 || c < 0 || boardState[r][c] !== 0) {
                return false;
            }
        }
        return true;
    }
    
    function placePiece(piece, startRow, startCol) {
        piece.shape.forEach((pos, i) => {
            const r = startRow + pos[1];
            const c = startCol + pos[0];
            const cell = gameBoard.children[r * GRID_SIZE + c];
            const block = document.createElement('div');
            block.classList.add('block');
            
            if (piece.crateIndex === i) {
                boardState[r][c] = COLOR_MAP.crate;
                block.classList.add('crate');
            } else {
                boardState[r][c] = COLOR_MAP[piece.color];
                block.classList.add(`block-${piece.color}`);
            }
            if(cell.firstElementChild) cell.firstElementChild.remove();
            cell.appendChild(block);
        });
        playSound('place');
    }
    
    function showPreview(piece, startRow, startCol) {
        if (!canPlacePiece(piece, startRow, startCol)) return;
        
        piece.shape.forEach((pos, i) => {
            const r = startRow + pos[1];
            const c = startCol + pos[0];
            const cell = gameBoard.children[r * GRID_SIZE + c];
            cell.classList.add('preview');
            const block = document.createElement('div');
            block.classList.add('block');
            if (piece.crateIndex === i) {
                block.classList.add('crate');
            } else {
                block.classList.add(`block-${piece.color}`);
            }
            cell.appendChild(block);
        });
    }
    
    function clearPreview() {
        document.querySelectorAll('.grid-cell.preview').forEach(cell => {
            cell.classList.remove('preview');
            if (cell.firstElementChild && !boardState[cell.dataset.row][cell.dataset.col]) {
                cell.innerHTML = '';
            }
        });
    }

    function checkForLineClear() {
        let linesToClear = { rows: [], cols: [] };
        for (let r = 0; r < GRID_SIZE; r++) {
            if (boardState[r].every(cell => cell !== 0)) linesToClear.rows.push(r);
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            if (boardState.every(row => row[c] !== 0)) linesToClear.cols.push(c);
        }

        if (linesToClear.rows.length > 0 || linesToClear.cols.length > 0) {
            clearLines(linesToClear);
        }
    }

    function clearLines(lines) {
        let clearedCrates = 0;
        let lineCount = lines.rows.length + lines.cols.length;
        let points = lineCount * 10 * lineCount; // Thưởng combo
        
        const processCell = (r, c) => {
            if (boardState[r][c] !== 0) {
                if (boardState[r][c] === COLOR_MAP.crate) clearedCrates++;
                boardState[r][c] = 0;
                const cell = gameBoard.children[r * GRID_SIZE + c];
                if(cell.firstElementChild) cell.firstElementChild.classList.add('clearing');
            }
        };

        lines.rows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) processCell(r, c); });
        lines.cols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) processCell(r, c); });
        
        playSound('clear');
        
        setTimeout(() => {
            document.querySelectorAll('.clearing').forEach(block => block.remove());
            cratesCollected += clearedCrates;
            coins += points;
            updateUI();
            checkWinCondition();
        }, 400);
    }
    
    function checkWinCondition() {
        if (cratesCollected >= cratesRequired) {
            playSound('win');
            let coinBonus = 50 + currentLevel * 5;
            coins += coinBonus;
            updateUI();
            
            if (currentLevel < MAX_LEVEL) {
                showNotification('Thắng rồi!', `Bạn nhận được ${coinBonus} xu. Sẵn sàng cho level tiếp theo?`, () => {
                    currentLevel++;
                    initGame();
                });
            } else {
                showNotification('Chúc mừng!', 'Bạn đã phá đảo game!', () => {
                    currentLevel = 1;
                    coins = 0;
                    initGame();
                });
            }
        }
    }

    function checkGameOver() {
        const activePieces = availablePieces.filter(p => p !== null);
        if (activePieces.length === 0) return false;

        for (const piece of activePieces) {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (canPlacePiece(piece, r, c)) return false;
                }
            }
        }
        return true;
    }

    // --- GIAO DIỆN & TƯƠNG TÁC ---
    function updateUI() {
        levelNumberEl.textContent = currentLevel;
        cratesCollectedEl.textContent = cratesCollected;
        cratesRequiredEl.textContent = cratesRequired;
        coinsAmountEl.textContent = coins;
    }
    
    function showNotification(title, message, callback) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notificationModal.classList.remove('hidden');
        
        const newButton = notificationButton.cloneNode(true);
        notificationButton.parentNode.replaceChild(newButton, notificationButton);
        newButton.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
            if(callback) callback();
        }, { once: true });
    }
    
    // Event Listeners
    pieceContainer.addEventListener('mousedown', handleDragStart);
    pieceContainer.addEventListener('touchstart', handleDragStart, { passive: false });

    settingsButton.addEventListener('click', () => { playSound('click'); settingsModal.classList.remove('hidden'); });
    storeButton.addEventListener('click', () => {
        playSound('click');
        renderStore();
        storeModal.classList.remove('hidden');
    });

    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            playSound('click');
            e.target.closest('.modal-overlay').classList.add('hidden');
        });
    });
    
    soundToggleButton.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        soundToggleButton.classList.toggle('on', isSoundOn);
        soundToggleButton.textContent = isSoundOn ? 'Bật' : 'Tắt';
        playSound('click');
    });

    // --- BẮT ĐẦU GAME ---
    initGame();
});
