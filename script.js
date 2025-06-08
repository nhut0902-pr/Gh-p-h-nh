document.addEventListener('DOMContentLoaded', () => {

    // --- CẤU HÌNH GAME ---
    const GRID_SIZE = 9;
    const MAX_LEVEL = 100;

    // --- LƯU TRỮ TRẠNG THÁI GAME ---
    let boardState = []; // 2D array: 0 = empty, 1-4 = color, 5 = crate
    let currentLevel = 1;
    let cratesCollected = 0;
    let cratesRequired = 5;
    let availablePieces = [];
    let isSoundOn = true;
    let isDragging = false;
    let draggedPiece = null;

    // --- CÁC PHẦN TỬ DOM ---
    const gameBoard = document.getElementById('game-board');
    const pieceContainer = document.getElementById('piece-container');
    const levelNumberEl = document.getElementById('level-number');
    const cratesCollectedEl = document.getElementById('crates-collected');
    const cratesRequiredEl = document.getElementById('crates-required');

    // Modals
    const settingsModal = document.getElementById('settings-modal');
    const storeModal = document.getElementById('store-modal');
    const notificationModal = document.getElementById('notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const notificationButton = document.getElementById('notification-button');
    
    // Nút
    const settingsButton = document.getElementById('settings-button');
    const storeButton = document.getElementById('store-button');
    const soundToggleButton = document.getElementById('sound-toggle');
    const closeModalButtons = document.querySelectorAll('.close-modal-button');

    // --- ĐỊNH NGHĨA HÌNH DẠNG KHỐI & MÀU SẮC ---
    const PIECE_SHAPES = {
        // I
        i2: [[0, 0], [1, 0]], i3: [[0, 0], [1, 0], [2, 0]], i4: [[0, 0], [1, 0], [2, 0], [3, 0]],
        // L
        l3: [[0, 0], [1, 0], [1, 1]], l4: [[0, 0], [1, 0], [2, 0], [2, 1]],
        // J
        j3: [[0, 1], [1, 1], [1, 0]], j4: [[0, 1], [1, 1], [2, 1], [2, 0]],
        // T
        t3: [[0, 0], [1, 0], [2, 0], [1, 1]],
        // O
        o4: [[0, 0], [0, 1], [1, 0], [1, 1]],
        // S, Z
        s: [[1, 0], [2, 0], [0, 1], [1, 1]], z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        // Dots
        dot1: [[0, 0]], dot2: [[0,0], [0,1]],
    };
    const COLORS = ['blue', 'orange', 'pink', 'yellow'];
    const COLOR_MAP = { blue: 1, orange: 2, pink: 3, yellow: 4, crate: 5 };
    
    // --- ÂM THANH (sử dụng ZzFX) ---
    // zzfx is loaded from CDN
    const playSound = (sound) => {
        if (!isSoundOn) return;
        switch (sound) {
            case 'place': zzfx(...[, , 90, .01, .03, .06, 1, 1.5, , , , , , , 1, , , .05, .01]); break;
            case 'clear': zzfx(...[1.05, , 224, .04, .13, .23, 4, .8, , , 436, .07, , .1, , .2, , .54, .05]); break;
            case 'win': zzfx(...[1.5, , 440, .1, .2, .3, 1, 1.5, 4, 2, , , , .1, , .1, , .8, .1]); break;
            case 'lose': zzfx(...[, .1, 120, .2, .3, .4, 4, 2, , , , , , .2, , .2, , .8, .1]); break;
            case 'click': zzfx(...[, , 500, .01, .01, .1, 1, 0, , , , , , , , , , .02]); break;
        }
    };

    // --- KHỞI TẠO GAME ---
    function initGame() {
        setupLevel(currentLevel);
        createBoard();
        generateNewPieces();
        updateUI();
    }
    
    function setupLevel(level) {
        currentLevel = level;
        // Công thức tính số rương cần thu thập, tăng dần
        cratesRequired = 4 + Math.floor(level / 2); 
        cratesCollected = 0;
        boardState = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    }

    function createBoard() {
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = Math.floor(i / GRID_SIZE);
            cell.dataset.col = i % GRID_SIZE;
            gameBoard.appendChild(cell);
        }
    }

    // --- LOGIC VỀ KHỐI ---
    function generateNewPieces() {
        availablePieces = [];
        pieceContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const piece = createRandomPiece();
            availablePieces.push(piece);
            pieceContainer.appendChild(renderPiece(piece, i));
        }
    }

    function createRandomPiece() {
        const shapeKeys = Object.keys(PIECE_SHAPES);
        const randomShapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        const shape = PIECE_SHAPES[randomShapeKey];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        // 5% cơ hội có 1 rương trong khối
        let hasCrate = Math.random() < 0.05;
        let crateIndex = -1;
        if (hasCrate && shape.length > 1) {
            crateIndex = Math.floor(Math.random() * shape.length);
        }

        return {
            shape,
            color,
            id: Date.now() + Math.random(),
            crateIndex
        };
    }
    
    function renderPiece(pieceData, index) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        pieceElement.dataset.pieceIndex = index;
        pieceElement.draggable = true;
        
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

    // --- LOGIC KÉO THẢ ---
    
    function handleDragStart(e) {
        isDragging = true;
        const pieceIndex = e.target.dataset.pieceIndex;
        draggedPiece = availablePieces[pieceIndex];
        
        // Dùng setTimeout để tránh lỗi DOM khi thay đổi style ngay lập tức
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
        
        // Chuyển dữ liệu (không cần thiết lắm nhưng là good practice)
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pieceIndex);
    }
    
    function handleDragEnd(e) {
        isDragging = false;
        e.target.classList.remove('dragging');
        clearPreview();
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        const cell = e.target.closest('.grid-cell');
        if (!cell || !draggedPiece) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        clearPreview();
        showPreview(draggedPiece, row, col);
    }
    
    function handleDrop(e) {
        e.preventDefault();
        const cell = e.target.closest('.grid-cell');
        if (!cell || !draggedPiece) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (canPlacePiece(draggedPiece, row, col)) {
            placePiece(draggedPiece, row, col);
            
            const pieceIndex = availablePieces.indexOf(draggedPiece);
            const pieceElement = document.querySelector(`.piece[data-piece-index='${pieceIndex}']`);
            if (pieceElement) pieceElement.remove();
            
            availablePieces[pieceIndex] = null;
            draggedPiece = null;
            
            checkForLineClear();
            
            if (availablePieces.every(p => p === null)) {
                generateNewPieces();
            }
            
            if (checkGameOver()) {
                showNotification('Thua rồi!', 'Không còn nước đi nào. Hãy thử lại nhé!', () => {
                    setupLevel(currentLevel);
                    initGame();
                });
                playSound('lose');
            }

        } else {
            playSound('click'); // Âm thanh báo lỗi
        }
        
        clearPreview();
    }

    // --- LOGIC XỬ LÝ GAME ---
    
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
            
            // Xóa block preview nếu có
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
            
            // Thêm block preview
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
            // Xóa block preview
            if (cell.firstElementChild && !boardState[cell.dataset.row][cell.dataset.col]) {
                cell.innerHTML = '';
            }
        });
    }

    function checkForLineClear() {
        let linesToClear = { rows: [], cols: [] };

        // Check rows
        for (let r = 0; r < GRID_SIZE; r++) {
            if (boardState[r].every(cell => cell !== 0)) {
                linesToClear.rows.push(r);
            }
        }
        // Check columns
        for (let c = 0; c < GRID_SIZE; c++) {
            let fullCol = true;
            for (let r = 0; r < GRID_SIZE; r++) {
                if (boardState[r][c] === 0) {
                    fullCol = false;
                    break;
                }
            }
            if (fullCol) linesToClear.cols.push(c);
        }

        if (linesToClear.rows.length > 0 || linesToClear.cols.length > 0) {
            clearLines(linesToClear);
        }
    }

    function clearLines(lines) {
        let clearedCrates = 0;
        
        lines.rows.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (boardState[r][c] === COLOR_MAP.crate) clearedCrates++;
                boardState[r][c] = 0;
                const cell = gameBoard.children[r * GRID_SIZE + c];
                if(cell.firstElementChild) cell.firstElementChild.classList.add('clearing');
            }
        });

        lines.cols.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) {
                if (boardState[r][c] !== 0) { // Tránh đếm trùng rương ở giao điểm
                    if (boardState[r][c] === COLOR_MAP.crate) clearedCrates++;
                    boardState[r][c] = 0;
                    const cell = gameBoard.children[r * GRID_SIZE + c];
                    if(cell.firstElementChild) cell.firstElementChild.classList.add('clearing');
                }
            }
        });
        
        playSound('clear');
        
        // Đợi hiệu ứng kết thúc rồi mới xóa DOM
        setTimeout(() => {
            document.querySelectorAll('.clearing').forEach(block => block.remove());
            cratesCollected += clearedCrates;
            updateUI();
            checkWinCondition();
        }, 400);
    }
    
    function checkWinCondition() {
        if (cratesCollected >= cratesRequired) {
            playSound('win');
            if (currentLevel < MAX_LEVEL) {
                showNotification('Thắng rồi!', `Bạn đã hoàn thành Level ${currentLevel}. Sẵn sàng cho level tiếp theo?`, () => {
                    currentLevel++;
                    initGame();
                });
            } else {
                showNotification('Chúc mừng!', 'Bạn đã phá đảo game!', () => {
                    currentLevel = 1;
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
                    if (canPlacePiece(piece, r, c)) {
                        return false; // Vẫn còn ít nhất 1 nước đi
                    }
                }
            }
        }
        return true; // Không còn nước đi nào
    }

    // --- GIAO DIỆN & TƯƠNG TÁC ---
    function updateUI() {
        levelNumberEl.textContent = currentLevel;
        cratesCollectedEl.textContent = cratesCollected;
        cratesRequiredEl.textContent = cratesRequired;
    }
    
    function showNotification(title, message, callback) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notificationModal.classList.remove('hidden');
        
        // Gắn listener một lần duy nhất
        const newButton = notificationButton.cloneNode(true);
        notificationButton.parentNode.replaceChild(newButton, notificationButton);
        newButton.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
            if(callback) callback();
        });
    }
    
    // Event Listeners
    pieceContainer.addEventListener('dragstart', handleDragStart);
    gameBoard.addEventListener('dragover', handleDragOver);
    gameBoard.addEventListener('drop', handleDrop);
    // Lắng nghe trên document để bắt dragend dù con trỏ ở đâu
    document.addEventListener('dragend', handleDragEnd);

    settingsButton.addEventListener('click', () => { playSound('click'); settingsModal.classList.remove('hidden'); });
    storeButton.addEventListener('click', () => { playSound('click'); storeModal.classList.remove('hidden'); });

    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            settingsModal.classList.add('hidden');
            storeModal.classList.add('hidden');
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
