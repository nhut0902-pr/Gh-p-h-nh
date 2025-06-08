document.addEventListener('DOMContentLoaded', () => {
    // ---- CÁC BIẾN VÀ HẰNG SỐ ---- //
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30; // Kích thước mỗi ô (sẽ được tính tự động)

    const board = document.getElementById('game-board');
    const scoreEl = document.getElementById('score');
    const coinsEl = document.getElementById('coins');
    const nextBlocksEl = document.getElementById('next-blocks');
    const inventoryEl = document.getElementById('inventory');
    
    // Shop
    const shopOpenBtn = document.getElementById('shop-open-btn');
    const shopModal = document.getElementById('shop-modal');
    const shopCloseBtn = document.getElementById('shop-close-btn');
    const shopCoinsEl = document.getElementById('shop-coins');
    const shopItemsEl = document.getElementById('shop-items');

    let grid = createEmptyGrid();
    let score = 0;
    let coins = 0;
    let inventory = {}; // { itemId: quantity }
    let activeItem = null; // Vật phẩm đang được kích hoạt

    // Hình dạng các khối (Tetrominos)
    const SHAPES = {
        'T': [[1, 1, 1], [0, 1, 0]],
        'O': [[1, 1], [1, 1]],
        'L': [[1, 0], [1, 0], [1, 1]],
        'J': [[0, 1], [0, 1], [1, 1]],
        'I': [[1], [1], [1], [1]],
        'S': [[0, 1, 1], [1, 1, 0]],
        'Z': [[1, 1, 0], [0, 1, 1]]
    };
    const SHAPE_KEYS = Object.keys(SHAPES);

    // Cửa hàng vật phẩm
    const SHOP_ITEMS = [
        { id: 'hammer', name: 'Búa Phá Khối', desc: 'Phá hủy 1 khối bất kỳ.', price: 50, icon: '🔨' },
        { id: 'row_rocket', name: 'Tên Lửa Hàng', desc: 'Xóa 1 hàng ngang.', price: 75, icon: '🚀' },
        { id: 'bomb', name: 'Bom Nhỏ', desc: 'Phá hủy khu vực 3x3.', price: 100, icon: '💣' },
        { id: 'swap', name: 'Đổi Khối', desc: 'Hoán đổi khối hiện tại.', price: 40, icon: '🔄' }
    ];

    // ---- HÀM KHỞI TẠO VÀ VẼ ---- //

    function createEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    // Hàm vẽ toàn bộ bảng game
    function draw() {
        board.innerHTML = '';
        grid.forEach(row => {
            row.forEach(cellValue => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (cellValue) {
                    cell.classList.add(cellValue); // Thêm class màu
                }
                board.appendChild(cell);
            });
        });
        updateUI();
    }

    // Cập nhật điểm số, tiền và kho đồ
    function updateUI() {
        scoreEl.textContent = score;
        coinsEl.innerHTML = `${coins} 💰`;
        drawInventory();
    }

    // ---- LOGIC KHO ĐỒ VÀ CỬA HÀNG ---- //
    
    function loadData() {
        coins = parseInt(localStorage.getItem('block_coins')) || 100; // Bắt đầu với 100 tiền
        inventory = JSON.parse(localStorage.getItem('block_inventory')) || {};
    }

    function saveData() {
        localStorage.setItem('block_coins', coins);
        localStorage.setItem('block_inventory', JSON.stringify(inventory));
    }

    function drawInventory() {
        inventoryEl.innerHTML = '';
        for (const itemId in inventory) {
            if (inventory[itemId] > 0) {
                const itemData = SHOP_ITEMS.find(i => i.id === itemId);
                const itemEl = document.createElement('button');
                itemEl.className = 'inventory-item';
                if (activeItem === itemId) {
                    itemEl.classList.add('active');
                }
                itemEl.innerHTML = `
                    ${itemData.icon}
                    <span class="item-quantity">${inventory[itemId]}</span>
                `;
                itemEl.addEventListener('click', () => toggleActiveItem(itemId));
                inventoryEl.appendChild(itemEl);
            }
        }
    }

    function toggleActiveItem(itemId) {
        if (activeItem === itemId) {
            activeItem = null; // Hủy kích hoạt
            board.style.cursor = 'default';
        } else {
            activeItem = itemId; // Kích hoạt
            board.style.cursor = 'crosshair'; // Đổi con trỏ chuột để báo hiệu
        }
        drawInventory();
    }
    
    function useItem(row, col) {
        if (!activeItem) return;

        const itemInInventory = inventory[activeItem];
        if (!itemInInventory || itemInInventory <= 0) return;
        
        let itemUsed = false;
        switch(activeItem) {
            case 'hammer':
                if (grid[row][col]) {
                    grid[row][col] = null;
                    itemUsed = true;
                }
                break;
            case 'row_rocket':
                for(let c = 0; c < COLS; c++) {
                    grid[row][c] = null;
                }
                itemUsed = true;
                break;
            // Thêm các case khác cho vật phẩm khác ở đây
        }

        if (itemUsed) {
            inventory[activeItem]--;
            if (inventory[activeItem] === 0) {
                delete inventory[activeItem];
            }
            activeItem = null; // Tự động hủy kích hoạt sau khi dùng
            board.style.cursor = 'default';
            saveData();
            draw();
        }
    }


    function openShop() {
        shopCoinsEl.innerText = coins;
        shopItemsEl.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const canAfford = coins >= item.price;
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            itemEl.innerHTML = `
                <div class="shop-item-info">
                    <h4>${item.icon} ${item.name}</h4>
                    <p>${item.desc}</p>
                </div>
                <button class="buy-btn" data-item-id="${item.id}" data-price="${item.price}" ${!canAfford ? 'disabled' : ''}>
                    ${item.price} 💰
                </button>
            `;
            shopItemsEl.appendChild(itemEl);
        });
        shopModal.style.display = 'flex';
    }

    function buyItem(e) {
        if (!e.target.classList.contains('buy-btn')) return;

        const button = e.target;
        const itemId = button.dataset.itemId;
        const price = parseInt(button.dataset.price);

        if (coins >= price) {
            coins -= price;
            inventory[itemId] = (inventory[itemId] || 0) + 1;
            
            const itemData = SHOP_ITEMS.find(i => i.id === itemId);
            alert(`Mua thành công "${itemData.name}"!`);
            
            saveData();
            updateUI();
            openShop(); // Cập nhật lại shop
        }
    }

    // ---- LOGIC GAME (Tạm thời đơn giản) ---- //
    // Đây là phần khó nhất, mình sẽ làm một phiên bản cơ bản.
    // Bạn sẽ cần phát triển thêm phần di chuyển, xoay và rơi của khối.
    function clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(cell => cell !== null)) {
                linesCleared++;
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(null));
                r++; // Kiểm tra lại hàng vừa dịch chuyển xuống
            }
        }
        if (linesCleared > 0) {
            score += linesCleared * 10;
            coins += linesCleared * 5; // Thưởng tiền khi xóa hàng
            saveData();
        }
    }

    function simulateGame() {
        // Mô phỏng việc chơi game để bạn test
        // Đặt ngẫu nhiên một vài khối vào bảng
        for(let i=0; i<50; i++) {
            const row = Math.floor(Math.random() * ROWS);
            const col = Math.floor(Math.random() * COLS);
            const shapeKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
            if (grid[row][col] === null) {
                grid[row][col] = shapeKey;
            }
        }
        setInterval(clearLines, 2000); // Cứ 2s kiểm tra xóa hàng 1 lần
        draw();
    }


    // ---- GẮN CÁC SỰ KIỆN ---- //
    shopOpenBtn.addEventListener('click', openShop);
    shopCloseBtn.addEventListener('click', () => shopModal.style.display = 'none');
    shopItemsEl.addEventListener('click', buyItem);
    
    // Sự kiện click trên bảng để dùng vật phẩm
    board.addEventListener('click', (e) => {
        if (!activeItem) return;
        
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / (rect.width / COLS));
        const row = Math.floor(y / (rect.height / ROWS));

        useItem(row, col);
    });

    // ---- KHỞI CHẠY GAME ---- //
    function init() {
        loadData();
        // Bạn sẽ thay thế hàm simulateGame bằng logic game thực của bạn
        simulateGame(); 
    }

    init();
});
