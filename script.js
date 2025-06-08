document.addEventListener('DOMContentLoaded', () => {
    // ---- KIỂM TRA CÁC THÀNH PHẦN QUAN TRỌNG ---- //
    // Bước này đảm bảo HTML và JS khớp nhau, nếu không sẽ báo lỗi rõ ràng.
    const requiredIds = ['game-board', 'score', 'coins', 'shop-open-btn', 'shop-modal', 'game-over-modal'];
    const requiredSelectors = ['.available-blocks-container', '#inventory'];
    for (const id of requiredIds) {
        if (!document.getElementById(id)) {
            console.error(`Lỗi nghiêm trọng: Thiếu phần tử với ID #${id} trong file HTML.`);
            alert(`Lỗi nghiêm trọng: Thiếu phần tử #${id}. Game không thể chạy. Vui lòng kiểm tra lại file index.html.`);
            return;
        }
    }
     for (const selector of requiredSelectors) {
        if (!document.querySelector(selector)) {
            console.error(`Lỗi nghiêm trọng: Thiếu phần tử với selector ${selector} trong file HTML.`);
            alert(`Lỗi nghiêm trọng: Thiếu phần tử ${selector}. Game không thể chạy. Vui lòng kiểm tra lại file index.html.`);
            return;
        }
    }

    // ---- CÁC BIẾN VÀ HẰNG SỐ ---- //
    const COLS = 10;
    const ROWS = 10;
    const board = document.getElementById('game-board');
    const scoreEl = document.getElementById('score');
    const coinsEl = document.getElementById('coins');
    const availableBlocksEl = document.querySelector('.available-blocks-container');
    const inventoryEl = document.getElementById('inventory');
    const shopOpenBtn = document.getElementById('shop-open-btn');
    const shopModal = document.getElementById('shop-modal');
    const shopCloseBtn = document.getElementById('shop-close-btn');
    const shopCoinsEl = document.getElementById('shop-coins');
    const shopItemsEl = document.getElementById('shop-items');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-btn');

    let grid = [], score = 0, coins = 0, inventory = {}, activeItem = null, availableBlocks = [];
    let draggedBlock = null, dragOffsetX = 0, dragOffsetY = 0;

    const SHAPES = {
        'T': { matrix: [[1, 1, 1], [0, 1, 0]], name: 'T' }, 'O': { matrix: [[1, 1], [1, 1]], name: 'O' },
        'L': { matrix: [[1, 0], [1, 0], [1, 1]], name: 'L' }, 'J': { matrix: [[0, 1], [0, 1], [1, 1]], name: 'J' },
        'I': { matrix: [[1], [1], [1], [1]], name: 'I' }, 'S': { matrix: [[0, 1, 1], [1, 1, 0]], name: 'S' },
        'Z': { matrix: [[1, 1, 0], [0, 1, 1]], name: 'Z' }, 'X': { matrix: [[1]], name: 'X' }
    };
    const SHAPE_KEYS = Object.keys(SHAPES);

    const SHOP_ITEMS = [
        { id: 'hammer', name: 'Búa Phá Khối', desc: 'Phá hủy 1 khối bất kỳ.', price: 50, icon: '🔨' },
        { id: 'row_rocket', name: 'Tên Lửa Hàng', desc: 'Xóa 1 hàng ngang.', price: 75, icon: '🚀' },
        { id: 'col_rocket', name: 'Tên Lửa Cột', desc: 'Xóa 1 hàng dọc.', price: 75, icon: '🚦' },
        { id: 'small_bomb', name: 'Bom Nhỏ', desc: 'Phá hủy khu vực 3x3.', price: 100, icon: '💣' },
        { id: 'large_bomb', name: 'Bom Lớn', desc: 'Phá hủy khu vực 5x5.', price: 200, icon: '💥' },
        { id: 'random_dynamite', name: 'Thuốc Nổ', desc: 'Phá hủy 10 khối ngẫu nhiên.', price: 150, icon: '🧨' },
        { id: 'undo', name: 'Hoàn Tác', desc: 'Quay lại nước đi cuối.', price: 120, icon: '↩️' },
        { id: 'trash_can', name: 'Thùng Rác', desc: 'Vứt bỏ 1 khối bạn chọn.', price: 40, icon: '🗑️' },
        { id: 'reroll', name: 'Làm Mới', desc: 'Đổi 3 khối đang chờ.', price: 60, icon: '🔄' },
        { id: 'single_block', name: 'Khối Đơn', desc: 'Lấy 1 khối 1x1.', price: 30, icon: '🧱' },
        { id: 'i_block', name: 'Gạch Vàng', desc: 'Lấy 1 khối I (thanh dài).', price: 80, icon: '📏' },
        { id: 'theme_beach', name: 'Chủ đề Biển', desc: 'Giao diện bãi biển.', price: 500, icon: '🏖️', type: 'theme' },
        { id: 'theme_space', name: 'Chủ đề Vũ Trụ', desc: 'Giao diện không gian.', price: 500, icon: '🌌', type: 'theme' },
        { id: 'skin_candy', name: 'Skin Kẹo Ngọt', desc: 'Các khối hình kẹo.', price: 750, icon: '🍬', type: 'skin' },
        { id: 'skin_metal', name: 'Skin Kim Loại', desc: 'Các khối hiệu ứng kim loại.', price: 750, icon: '🔩', type: 'skin' },
        { id: 'score_boost', name: 'x2 Điểm', desc: 'Nhân đôi điểm trong 30 giây.', price: 250, icon: '✨' },
        { id: 'coin_magnet', name: 'Nam châm tiền', desc: 'Nhận thêm tiền khi xóa hàng.', price: 300, icon: '🧲' },
        { id: 'clear_color', name: 'Bom Màu', desc: 'Xóa tất cả khối cùng màu.', price: 400, icon: '🎨' },
        { id: 'line_placer', name: 'Thả Dây', desc: 'Tạo 1 hàng khối ở dưới cùng.', price: 180, icon: '⚓' },
        { id: 'block_shuffle', name: 'Xáo Trộn', desc: 'Xáo trộn vị trí các khối trên bảng.', price: 220, icon: '🔀' },
    ];
    
    let audioCtx;

    function playSound(type) {
        if (typeof(AudioContext) === 'undefined' && typeof(webkitAudioContext) === 'undefined') return;
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e) { console.error("Web Audio API is not supported in this browser"); return; }
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0.3, now);
        switch (type) {
            case 'place': oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(261.63, now); break;
            case 'clear': oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(523.25, now); oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); break;
            case 'click': oscillator.type = 'square'; oscillator.frequency.setValueAtTime(440.00, now); break;
            case 'gameOver': oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(164.81, now); oscillator.frequency.exponentialRampToValueAtTime(130.81, now + 0.5); break;
        }
        gainNode.gain.exponentialRampToValueAtTime(0.00001, now + (type === 'clear' ? 0.2 : 0.3));
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
    
    function startGame() {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0;
        loadData();
        activeItem = null;
        gameOverModal.style.display = 'none';
        generateNewBlocks();
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
                if (cell) cellEl.classList.add(blockData.name);
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
    }

    function drawAvailableBlocks() {
        availableBlocksEl.innerHTML = '';
        availableBlocks.forEach(block => {
            if (block) availableBlocksEl.appendChild(createBlockElement(block));
        });
    }

    function drawBoard() {
        board.innerHTML = '';
        grid.forEach(row => {
            row.forEach(cellValue => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (cellValue) cell.classList.add(cellValue);
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
                    if (gridRow >= ROWS || gridCol >= COLS || gridRow < 0 || gridCol < 0 || grid[gridRow][gridCol]) return false;
                }
            }
        }
        return true;
    }

    function placeBlock(block, startRow, startCol) {
        block.matrix.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) { grid[startRow + r][startCol + c] = block.name; score += 1; }
            });
        });
    }

    function clearLines() {
        let rowsToClear = [], colsToClear = [];
        for (let r = 0; r < ROWS; r++) if (grid[r].every(cell => cell)) rowsToClear.push(r);
        for (let c = 0; c < COLS; c++) if (grid.every(row => row[c])) colsToClear.push(c);
        const clearedCount = rowsToClear.length + colsToClear.length;
        if (clearedCount === 0) return;
        playSound('clear');
        score += clearedCount * 10 * clearedCount;
        coins += clearedCount * 5;
        rowsToClear.forEach(r => { for(let c=0; c < COLS; c++) board.children[r * COLS + c].style.transform = 'scale(0)'; });
        colsToClear.forEach(c => { for(let r=0; r < ROWS; r++) board.children[r * COLS + c].style.transform = 'scale(0)'; });
        setTimeout(() => {
            rowsToClear.forEach(r => grid[r].fill(null));
            colsToClear.forEach(c => grid.forEach(row => row[c] = null));
            updateUI();
        }, 200);
    }
    
    function checkGameOver() {
        if (availableBlocks.every(block => !block)) return;
        for (const block of availableBlocks) {
            if (block) {
                for (let r = 0; r <= ROWS - block.matrix.length; r++) {
                    for (let c = 0; c <= COLS - block.matrix[0].length; c++) {
                        if (checkPlacement(block, r, c)) return;
                    }
                }
            }
        }
        playSound('gameOver');
        finalScoreEl.innerText = score;
        gameOverModal.style.display = 'flex';
        saveData();
    }

    function getGridCoordsFromEvent(e) {
        const rect = board.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const col = Math.floor(x / (rect.width / COLS));
        const row = Math.floor(y / (rect.height / ROWS));
        return { row, col };
    }

    function clearShadow() {
        document.querySelectorAll('.cell.shadow, .cell.invalid-shadow').forEach(c => c.classList.remove('shadow', 'invalid-shadow'));
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
                        if(board.children[cellIndex]) board.children[cellIndex].classList.add(isValid ? 'shadow' : 'invalid-shadow');
                    }
                }
            });
        });
    }
    
    function handleDragStart(e) {
        const target = e.target.closest('.block-container');
        if (!target) return;
        const blockIndex = parseInt(target.dataset.blockIndex);
        if (!availableBlocks[blockIndex]) return;
        playSound('click');
        draggedBlock = { data: availableBlocks[blockIndex], element: target };
        const rect = target.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
        const clone = target.cloneNode(true);
        clone.classList.add('dragging');
        document.body.appendChild(clone);
        draggedBlock.clone = clone;
        setTimeout(() => target.style.visibility = 'hidden', 0);
        moveDraggedElement(e);
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
            const blockIndex = availableBlocks.indexOf(draggedBlock.data);
            availableBlocks[blockIndex] = null;
            clearLines();
            updateUI();
            if (availableBlocks.every(b => !b)) {
                generateNewBlocks();
                updateUI();
            }
            checkGameOver();
        } else {
            draggedBlock.element.style.visibility = 'visible';
        }
        clearShadow();
        document.body.removeChild(draggedBlock.clone);
        draggedBlock = null;
    }

    function updateUI() {
        scoreEl.textContent = score;
        coinsEl.innerHTML = `${coins} 💰`;
        drawBoard();
        drawAvailableBlocks();
        drawInventory();
    }
    function saveData() {
        localStorage.setItem('block_coins', coins);
        localStorage.setItem('block_inventory', JSON.stringify(inventory));
    }
    function loadData() {
        coins = parseInt(localStorage.getItem('block_coins')) || 200;
        inventory = JSON.parse(localStorage.getItem('block_inventory')) || {};
    }
    function openShop() {
        shopCoinsEl.innerText = coins;
        shopItemsEl.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const canAfford = coins >= item.price;
            const isOwned = item.type && inventory[item.id];
            let btnHTML = isOwned ? `<button class="buy-btn" disabled>Đã sở hữu</button>` : `<button class="buy-btn" data-item-id="${item.id}" ${!canAfford ? 'disabled' : ''}>${item.price} 💰</button>`;
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            itemEl.innerHTML = `<div class="shop-item-info"><h4>${item.icon} ${item.name}</h4><p>${item.desc}</p></div>${btnHTML}`;
            shopItemsEl.appendChild(itemEl);
        });
        shopModal.style.display = 'flex';
    }
    function buyItem(e) {
        if (!e.target.classList.contains('buy-btn')) return;
        playSound('click');
        const itemId = e.target.dataset.itemId;
        const itemData = SHOP_ITEMS.find(i => i.id === itemId);
        if (coins >= itemData.price) {
            coins -= itemData.price;
            inventory[itemId] = (inventory[itemId] || 0) + 1;
            alert(`Mua thành công "${itemData.name}"!`);
            saveData();
            updateUI();
            openShop();
        }
    }
    function drawInventory() {
        inventoryEl.innerHTML = '';
        for (const itemId in inventory) {
            if (inventory[itemId] > 0) {
                const itemData = SHOP_ITEMS.find(i => i.id === itemId);
                if (itemData && !itemData.type) {
                    const itemEl = document.createElement('button');
                    itemEl.className = 'inventory-item';
                    itemEl.innerHTML = `${itemData.icon}<span class="item-quantity">${inventory[itemId]}</span>`;
                    inventoryEl.appendChild(itemEl);
                }
            }
        }
    }

    function addAllEventListeners() {
        document.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        restartBtn.addEventListener('click', () => { playSound('click'); startGame(); });
        shopOpenBtn.addEventListener('click', () => { playSound('click'); openShop(); });
        shopCloseBtn.addEventListener('click', () => { playSound('click'); shopModal.style.display = 'none'; });
        shopItemsEl.addEventListener('click', buyItem);
    }
    
    startGame();
    addAllEventListeners();
});
