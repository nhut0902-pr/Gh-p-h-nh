// Đợi cho toàn bộ nội dung trang được tải xong mới chạy script
document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const board = document.getElementById('puzzle-board');
    const movesEl = document.getElementById('moves');
    const coinsEl = document.getElementById('coins');
    const resetBtn = document.getElementById('reset-btn');
    const gameContainer = document.getElementById('game-container');

    // Shop Elements
    const shopBtn = document.getElementById('shop-btn');
    const shopModal = document.getElementById('shop-modal');
    const closeShopBtn = document.getElementById('close-shop-btn');
    const shopCoinsEl = document.getElementById('shop-coins');
    const shopItemsContainer = document.querySelector('.shop-items-container');

    // Game State
    const SIZE = 4;
    let tiles = [];
    let moves = 0;
    let coins = 0;
    let isGameWon = false;
    
    // Shop State
    let purchasedThemes = ['default'];
    let activeTheme = 'default';

    const themes = [
        { id: 'default', name: 'Mặc định', desc: 'Chủ đề màu tím và xanh cổ điển.', price: 0, icon: '🎨' },
        { id: 'forest', name: 'Rừng Xanh', desc: 'Tông màu xanh lá cây mát mẻ.', price: 100, icon: '🌲' },
        { id: 'ocean', name: 'Đại Dương', desc: 'Chủ đề xanh dương sâu thẳm.', price: 100, icon: '🌊' },
        { id: 'sunset', name: 'Hoàng Hôn', desc: 'Tông màu cam và đỏ ấm áp.', price: 150, icon: '🌇' },
        { id: 'mono', name: 'Đơn Sắc', desc: 'Giao diện đen trắng tối giản.', price: 200, icon: '🔳' }
    ];

    // --- LOCAL STORAGE FUNCTIONS ---
    function saveState() {
        localStorage.setItem('puzzle_coins', coins);
        localStorage.setItem('puzzle_purchasedThemes', JSON.stringify(purchasedThemes));
        localStorage.setItem('puzzle_activeTheme', activeTheme);
    }

    function loadState() {
        coins = parseInt(localStorage.getItem('puzzle_coins')) || 50; // Bắt đầu với 50 tiền
        const savedThemes = JSON.parse(localStorage.getItem('puzzle_purchasedThemes'));
        if (savedThemes) {
            purchasedThemes = savedThemes;
        } else {
            purchasedThemes = ['default']; // Đảm bảo theme mặc định luôn có
        }
        activeTheme = localStorage.getItem('puzzle_activeTheme') || 'default';
    }

    // --- THEME FUNCTIONS ---
    function applyTheme(themeId) {
        document.body.className = ''; // Reset class của body
        if (themeId !== 'default') {
            document.body.classList.add(`theme-${themeId}`);
        }
        activeTheme = themeId;
        saveState();
    }

    // --- SHOP FUNCTIONS ---
    function openShop() {
        updateShopUI();
        shopModal.style.display = 'flex';
    }

    function closeShop() {
        shopModal.style.display = 'none';
    }

    function updateShopUI() {
        shopCoinsEl.innerText = coins;
        shopItemsContainer.innerHTML = ''; // Xóa các item cũ

        themes.forEach(theme => {
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            
            const isPurchased = purchasedThemes.includes(theme.id);
            const isActive = activeTheme === theme.id;

            let buttonHTML;
            if (isActive) {
                buttonHTML = `<button class="btn shop-btn" disabled>Đang dùng</button>`;
            } else if (isPurchased) {
                buttonHTML = `<button class="btn shop-btn" data-theme-id="${theme.id}">Chọn</button>`;
            } else {
                const canAfford = coins >= theme.price;
                buttonHTML = `<button class="btn shop-btn" data-theme-id="${theme.id}" data-price="${theme.price}" ${canAfford ? '' : 'disabled'}>${theme.price} 💰</button>`;
            }

            itemEl.innerHTML = `
                <div class="shop-item-info">
                    <h3>${theme.icon} ${theme.name}</h3>
                    <p>${theme.desc}</p>
                </div>
                ${buttonHTML}
            `;
            shopItemsContainer.appendChild(itemEl);
        });
    }
    
    function handleShopClick(e) {
        const button = e.target.closest('.shop-btn');
        if (!button || button.disabled) return;

        const themeId = button.dataset.themeId;
        const price = parseInt(button.dataset.price);
        const isPurchased = purchasedThemes.includes(themeId);

        if (isPurchased) {
            applyTheme(themeId);
        } else {
            if (coins >= price) {
                coins -= price;
                purchasedThemes.push(themeId);
                applyTheme(themeId);
                alert(`Chúc mừng! Bạn đã mua thành công chủ đề "${themes.find(t=>t.id === themeId).name}".`);
            }
        }
        updateUI();
        updateShopUI();
    }

    // --- GAME LOGIC ---
    function init() {
        loadState();
        applyTheme(activeTheme);
        startGame();
        addEventListeners();
    }

    function startGame() {
        isGameWon = false;
        moves = 0;
        createBoard();
        shuffleBoard();
        renderBoard();
        updateUI();
    }
    
    function createBoard() {
        tiles = [];
        for (let i = 1; i < SIZE * SIZE; i++) {
            tiles.push(i);
        }
        tiles.push(null); // Ô trống
    }

    function shuffleBoard() {
        // Thuật toán xáo trộn Fisher-Yates
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        // Đảm bảo game có thể giải được (tạm thời đơn giản hoá)
        // Một thuật toán đầy đủ cần kiểm tra số cặp nghịch thế.
    }

    function renderBoard() {
        board.innerHTML = '';
        tiles.forEach((tileValue, index) => {
            const tileEl = document.createElement('div');
            tileEl.classList.add('tile');
            if (tileValue === null) {
                tileEl.classList.add('empty');
            } else {
                tileEl.textContent = tileValue;
                tileEl.dataset.value = tileValue;
                tileEl.addEventListener('click', () => handleTileClick(index));
            }
            board.appendChild(tileEl);
        });
    }
    
    function handleTileClick(clickedIndex) {
        if (isGameWon) return;

        const emptyIndex = tiles.indexOf(null);
        const { row: clickedRow, col: clickedCol } = getRowCol(clickedIndex);
        const { row: emptyRow, col: emptyCol } = getRowCol(emptyIndex);

        const isAdjacent = (Math.abs(clickedRow - emptyRow) + Math.abs(clickedCol - emptyCol)) === 1;

        if (isAdjacent) {
            [tiles[clickedIndex], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[clickedIndex]];
            moves++;
            renderBoard();
            updateUI();
            checkWin();
        }
    }
    
    function checkWin() {
        for (let i = 0; i < tiles.length - 1; i++) {
            if (tiles[i] !== i + 1) {
                return false; // Chưa thắng
            }
        }
        // Nếu vòng lặp hoàn thành, nghĩa là đã thắng
        isGameWon = true;
        const reward = 50 + Math.max(0, 100 - moves); // Thưởng dựa trên số bước
        coins += reward;
        updateUI();
        saveState();
        setTimeout(() => {
            alert(`🎉 Chúc mừng, bạn đã thắng! 🎉\nSố bước: ${moves}\nBạn nhận được ${reward} 💰!`);
        }, 300); // Đợi 1 chút để người dùng thấy ô cuối cùng di chuyển
        return true;
    }
    
    function getRowCol(index) {
        return {
            row: Math.floor(index / SIZE),
            col: index % SIZE
        };
    }

    function updateUI() {
        movesEl.textContent = moves;
        coinsEl.textContent = coins;
    }
    
    function addEventListeners() {
        resetBtn.addEventListener('click', startGame);
        shopBtn.addEventListener('click', openShop);
        closeShopBtn.addEventListener('click', closeShop);
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) closeShop(); // Đóng modal khi click ra ngoài
        });
        shopItemsContainer.addEventListener('click', handleShopClick);
    }
    
    // Khởi chạy game
    init();

});
