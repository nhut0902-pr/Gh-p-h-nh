document.addEventListener('DOMContentLoaded', () => {
    // ---- CÁC BIẾN VÀ HẰNG SỐ ---- //
    const COLS = 10;
    const ROWS = 10; // Bảng vuông 10x10 phổ biến hơn
    
    // DOM Elements
    const boardWrapper = document.getElementById('game-board-wrapper');
    const board = document.getElementById('game-board');
    const scoreEl = document.getElementById('score');
    const coinsEl = document.getElementById('coins');
    const availableBlocksEl = document.querySelector('.available-blocks-container');
    const inventoryEl = document.getElementById('inventory');
    
    // Modals & Shop
    const shopOpenBtn = document.getElementById('shop-open-btn');
    const shopModal = document.getElementById('shop-modal');
    const shopCloseBtn = document.getElementById('shop-close-btn');
    const shopCoinsEl = document.getElementById('shop-coins');
    const shopItemsEl = document.getElementById('shop-items');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-btn');

    // Game State
    let grid = [];
    let score = 0;
    let coins = 0;
    let inventory = {};
    let activeItem = null;
    let availableBlocks = [];
    
    // Drag State
    let draggedBlock = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Hình dạng các khối (Tetrominos) + Khối 1x1
    const SHAPES = {
        'T': { matrix: [[1, 1, 1], [0, 1, 0]], name: 'T' },
        'O': { matrix: [[1, 1], [1, 1]], name: 'O' },
        'L': { matrix: [[1, 0], [1, 0], [1, 1]], name: 'L' },
        'J': { matrix: [[0, 1], [0, 1], [1, 1]], name: 'J' },
        'I': { matrix: [[1], [1], [1], [1]], name: 'I' },
        'S': { matrix: [[0, 1, 1], [1, 1, 0]], name: 'S' },
        'Z': { matrix: [[1, 1, 0], [0, 1, 1]], name: 'Z' },
        'X': { matrix: [[1]], name: 'X' } // Khối 1x1
    };
    const SHAPE_KEYS = Object.keys(SHAPES);

    // Cửa hàng vật phẩm
    const SHOP_ITEMS = [
        { id: 'hammer', name: 'Búa Phá Khối', desc: 'Phá hủy 1 khối bất kỳ.', price: 50, icon: '🔨' },
        { id: 'row_rocket', name: 'Tên Lửa Hàng', desc: 'Xóa 1 hàng ngang.', price: 75, icon: '🚀' }
    ];

    // ---- ÂM THANH (WEB AUDIO API) ---- //
    let audioCtx;
    function playSound(type) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0.5, now);

        switch (type) {
            case 'place':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(261.63, now); // C4
                gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
                break;
            case 'clear':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.2);
                break;
            case 'click':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(440.00, now); // A4
                gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
                break;
            case 'gameOver':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(164.81, now); // E3
                oscillator.frequency.exponentialRampToValueAtTime(130.81, now + 0.5);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
                break;
        }
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
    
    // ---- LOGIC GAME ---- //

    function startGame() {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0;
        loadData(); // Load coins & inventory
        activeItem = null;
        gameOverModal.style.display = 'none';

        generateNewBlocks();
        drawBoard();
        updateUI();
    }

    function createBlockElement(blockData) {
        const container = document.createElement('div');
        container.className = 'block-container';
        container.draggable = true;
        
        const gridEl = document.createElement('div');
        gridEl.className = 'mini-grid';
        gridEl.style.gridTemplateColumns = `repeat(${blockData.matrix[0].length}, 12px)`;
        
        blockData.matrix.forEach(row => {
            row.forEach(cell => {
                const cellEl = document.createElement('div');
                cellEl.className = 'mini-cell';
                if (cell) {
                    cellEl.classList.add(blockData.name);
                }
                gridEl.appendChild(cellEl);
            });
        });
        container.appendChild(gridEl);
        container.dataset.blockIndex = availableBlocks.indexOf(blockData);
        return container;
    }

    function generateNewBlocks() {
        availableBlocks = [];
        for (let i = 0; i < 3; i++) {
            const randomKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
            availableBlocks.push(SHAPES[randomKey]);
        }
        drawAvailableBlocks();
    }

    function drawAvailableBlocks() {
        availableBlocksEl.innerHTML = '';
        availableBlocks.forEach(block => {
            if (block) {
                const blockEl = createBlockElement(block);
                availableBlocksEl.appendChild(blockEl);
            }
        });
    }

    function drawBoard() {
        board.innerHTML = '';
        grid.forEach(row => {
            row.forEach(cellValue => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (cellValue) {
                    cell.classList.add(cellValue); // Add class for color
                }
                board.appendChild(cell);
            });
        });
    }

    function checkPlacement(block, startRow, startCol) {
        for (let r = 0; r < block.matrix.length; r++) {
            for (let c = 0; c < block.matrix[r].length; c++) {
                if (block.matrix[r][c]) {
                    const gridRow = startRow + r;
                    const gridCol = startCol + c;
                    if (gridRow >= ROWS || gridCol >= COLS || gridRow < 0 || gridCol < 0 || grid[gridRow][gridCol]) {
                        return false; // Out of bounds or overlaps
                    }
                }
            }
        }
        return true;
    }

    function placeBlock(block, startRow, startCol) {
        block.matrix.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    grid[startRow + r][startCol + c] = block.name;
                    score += 1; // 1 điểm cho mỗi ô
                }
            });
        });
    }

    function clearLines() {
        let linesToClear = { rows: [], cols: [] };
        // Check rows
        for (let r = 0; r < ROWS; r++) {
            if (grid[r].every(cell => cell)) linesToClear.rows.push(r);
        }
        // Check columns
        for (let c = 0; c < COLS; c++) {
            if (grid.every(row => row[c])) linesToClear.cols.push(c);
        }

        if(linesToClear.rows.length === 0 && linesToClear.cols.length === 0) return;

        playSound('clear');
        let clearedCount = linesToClear.rows.length + linesToClear.cols.length;
        score += clearedCount * 10 * clearedCount; // Thưởng lớn khi xóa nhiều hàng
        coins += clearedCount * 5;

        // Clear rows
        linesToClear.rows.forEach(r => {
            for (let c = 0; c < COLS; c++) grid[r][c] = null;
        });
        // Clear columns
        linesToClear.cols.forEach(c => {
            for (let r = 0; r < ROWS; r++) grid[r][c] = null;
        });

        drawBoard();
        updateUI();
    }
    
    function checkGameOver() {
        if (availableBlocks.every(block => block === null)) return; // If all blocks are used, not game over

        for (const block of availableBlocks) {
            if (block) {
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (checkPlacement(block, r, c)) {
                            return; // Found a valid move, not game over
                        }
                    }
                }
            }
        }

        // If loop finishes, no block has a valid move
        playSound('gameOver');
        finalScoreEl.innerText = score;
        gameOverModal.style.display = 'flex';
        saveData(); // Save final coins
    }

    // ---- LOGIC KÉO THẢ VÀ BÓNG MỜ ---- //

    function getGridCoordsFromEvent(e) {
        const rect = board.getBoundingClientRect();
        // Dùng e.touches[0] cho mobile, hoặc e cho desktop
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const col = Math.floor(x / (rect.width / COLS));
        const row = Math.floor(y / (rect.height / ROWS));
        return { row, col };
    }

    function clearShadow() {
        document.querySelectorAll('.cell.shadow, .cell.invalid-shadow').forEach(c => {
            c.classList.remove('shadow', 'invalid-shadow');
        });
    }

    function drawShadow(block, startRow, startCol) {
        clearShadow();
        const isValid = checkPlacement(block, startRow, startCol);
        
        block.matrix.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    const gridRow = startRow + r;
                    const gridCol = startCol + c;
                    if (gridRow < ROWS && gridCol < COLS && gridRow >= 0 && gridCol >= 0) {
                        const cellIndex = gridRow * COLS + gridCol;
                        board.children[cellIndex]?.classList.add(isValid ? 'shadow' : 'invalid-shadow');
                    }
                }
            });
        });
    }
    
    // Handlers
    function handleDragStart(e) {
        const target = e.target.closest('.block-container');
        if (!target) return;
        playSound('click');

        const blockIndex = parseInt(target.dataset.blockIndex);
        draggedBlock = {
            data: availableBlocks[blockIndex],
            element: target
        };

        // Tính toán offset để khối không bị "nhảy" về góc khi kéo
        const rect = target.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        setTimeout(() => target.style.visibility = 'hidden', 0); // Ẩn khối gốc
        
        // Clone khối để kéo
        const clone = target.cloneNode(true);
        clone.classList.add('dragging');
        document.body.appendChild(clone);
        draggedBlock.clone = clone;
        
        moveDraggedElement(e); // Cập nhật vị trí ngay lập tức
    }

    function moveDraggedElement(e) {
        if (!draggedBlock) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        draggedBlock.clone.style.left = `${clientX - dragOffsetX}px`;
        draggedBlock.clone.style.top = `${clientY - dragOffsetY}px`;
    }

    function handleDragMove(e) {
        if (!draggedBlock) return;
        e.preventDefault();
        moveDraggedElement(e);
        
        const { row, col } = getGridCoordsFromEvent(e);
        drawShadow(draggedBlock.data, row, col);
    }

    function handleDragEnd(e) {
        if (!draggedBlock) return;

        const { row, col } = getGridCoordsFromEvent(e);
        
        if (checkPlacement(draggedBlock.data, row, col)) {
            placeBlock(draggedBlock.data, row, col);
            playSound('place');
            
            // Xóa khối đã dùng khỏi mảng
            const blockIndex = availableBlocks.indexOf(draggedBlock.data);
            availableBlocks[blockIndex] = null;
            
            clearLines();
            drawBoard();
            updateUI();

            // Nếu đã dùng hết 3 khối, tạo 3 khối mới
            if (availableBlocks.every(b => b === null)) {
                generateNewBlocks();
            }
            checkGameOver();
        } else {
            // Trả khối về vị trí cũ nếu đặt không hợp lệ
            draggedBlock.element.style.visibility = 'visible';
        }

        clearShadow();
        document.body.removeChild(draggedBlock.clone);
        draggedBlock = null;
    }

    // ---- CỬA HÀNG VÀ DỮ LIỆU ---- //
    // Code cửa hàng và vật phẩm giữ nguyên từ phiên bản trước
    // ... (Phần code này bạn có thể copy từ phiên bản trước, mình sẽ rút gọn ở đây)
    function updateUI() {
        scoreEl.textContent = score;
        coinsEl.innerHTML = `${coins} 💰`;
        drawInventory();
        drawAvailableBlocks();
    }
    //... Các hàm khác của cửa hàng: openShop, buyItem, drawInventory, saveData, loadData...
    
    // ---- GẮN CÁC SỰ KIỆN ---- //
    function addAllEventListeners() {
        // Drag events cho desktop
        document.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        // Touch events cho mobile
        document.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);

        restartBtn.addEventListener('click', () => { playSound('click'); startGame(); });
        shopOpenBtn.addEventListener('click', () => { playSound('click'); openShop(); });
        shopCloseBtn.addEventListener('click', () => { playSound('click'); shopModal.style.display = 'none'; });
        //... Các event listener khác của shop
    }

    // ---- KHỞI CHẠY ---- //
    startGame();
    addAllEventListeners();

    // Dưới đây là các hàm shop để game chạy được, bạn có thể copy-paste từ lần trước nếu muốn
    function saveData() {
        localStorage.setItem('block_coins', coins);
        localStorage.setItem('block_inventory', JSON.stringify(inventory));
    }
    function loadData() {
        coins = parseInt(localStorage.getItem('block_coins')) || 100;
        inventory = JSON.parse(localStorage.getItem('block_inventory')) || {};
    }
    function openShop() { /* ... */ }
    function buyItem(e) { /* ... */ }
    function drawInventory() { /* ... */ }
});
