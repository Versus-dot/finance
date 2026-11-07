// ==========================================
// МОДУЛЬ UI (Темы, Анимации, Меню) - mod-ui.js
// ==========================================
(function() {
    console.log("✅ Модуль UI (mod-ui.js) загружен");

    // ==========================================
    // СТИЛИ (Темы, Пульсация льготного периода)
    // ==========================================
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .modal, #modalBackdrop2 { overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch; }
        #fabBtn { display: none !important; }
        .account-row { transition: all 0.2s ease; }
        body.style-stripe .account-row { border-left: 4px solid var(--bank-color) !important; background: var(--card) !important; margin: 0 6px 0 10px !important; border-radius: 0 8px 8px 0 !important; border-bottom: 1px solid var(--border) !important; }
        body.style-stripe .account-row:has(.acc-debt) { background: rgba(255, 92, 92, 0.05) !important; }
        body.style-stripe .account-row:not(:has(.acc-debt)) { background: rgba(46, 204, 113, 0.04) !important; }
        body.style-bg .account-row { border-left: none !important; background: rgba(46, 204, 113, 0.1) !important; margin: 6px 10px !important; border-radius: 10px !important; border: 1px solid rgba(46, 204, 113, 0.2) !important; }
        body.style-bg .account-row:has(.acc-debt) { background: rgba(255, 92, 92, 0.1) !important; border-color: rgba(255, 92, 92, 0.3) !important; }
        body.style-minimal .account-row { border-left: none !important; background: var(--card2) !important; margin: 6px 10px !important; border-radius: 10px !important; border: 1px solid var(--border) !important; }
        body.style-minimal .acc-icon-wrap { transition: all 0.2s ease; }
        body.style-minimal .account-row:not(:has(.acc-debt)) .acc-icon-wrap { background: #2d3647 !important; color: #9aa5b8 !important; }
        body.style-minimal .account-row:has(.acc-debt) .acc-icon-wrap { background: #1f2532 !important; color: #6b778c !important; }
        
        /* СТИЛИ ДЛЯ ЛЬГОТНОГО ПЕРИОДА */
        .account-row.grace-warning { border-color: var(--yellow) !important; box-shadow: inset 0 0 0 2px var(--yellow) !important; }
        .account-row.grace-danger { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        
        /* ЯРКАЯ ПУЛЬСАЦИЯ ДЛЯ КАРТОЧКИ */
        .account-row.grace-overdue { border-color: var(--red) !important; animation: pulse-red-row 1.5s infinite; }
        @keyframes pulse-red-row {
            0% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0.8), inset 0 0 0 2px var(--red); }
            70% { box-shadow: 0 0 0 15px rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
            100% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
        }

        .grace-text { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
        .grace-text.warning { background: var(--yellow); color: #000; }
        .grace-text.danger, .grace-text.overdue { background: var(--red); color: #fff; }

        /* СТИЛИ ДЛЯ ВИДЖЕТА БАНКА */
        .bank-chip.grace-bank-warning { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        .bank-chip.grace-bank-overdue { border-color: var(--red) !important; animation: pulse-red-bank 1.5s infinite; }
        @keyframes pulse-red-bank {
            0% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0.8), inset 0 0 0 2px var(--red); }
            70% { box-shadow: 0 0 0 10px rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
            100% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
        }
    `;
    document.head.appendChild(styleEl);

    // ==========================================
    // ТЕМЫ ОФОРМЛЕНИЯ (Полоски, Фон, Минимализм)
    // ==========================================
    window.applyBadgeStyle = function() {
        document.body.classList.remove('style-stripe', 'style-bg', 'style-minimal');
        const style = (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle) ? S.settings.badgeStyle : 'stripe';
        if (style === 'minimal') document.body.classList.add('style-minimal');
        else if (style === 'bg') document.body.classList.add('style-bg');
        else document.body.classList.add('style-stripe');
    }
    setTimeout(applyBadgeStyle, 100);
    
    const prevOpenSettingsForBadge = window.openSettings;
    window.openSettings = function() {
        if (prevOpenSettingsForBadge) prevOpenSettingsForBadge();
        const badgeSelect = document.getElementById('setBadge');
        // ВОТ ТУТ ДОЛЖНЫ БЫТЬ ВСЕ ТРИ ТЕМЫ
        if (badgeSelect) badgeSelect.innerHTML = `
            <option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option>
            <option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option>
            <option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>
        `;
    };
    
    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() { if (prevSaveSettings) prevSaveSettings(); applyBadgeStyle(); };

    // ==========================================
    // РАМКА ЛЬГОТНОГО ПЕРИОДА
    // ==========================================
    const prevRenderAccountRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccountRow(a, bank);
        
        if (html.includes('class="account-row"')) {
            html = html.replace('class="account-row"', `class="account-row" data-acc-type="${a.type}"`);
        }

        if (a.type === 'credit' && a.gracePeriod && !a.archived) {
            const limit = a.creditLimit || 0;
            const val = accValue(a);
            const debt = Math.max(0, limit - val);
            
            if (debt > 0) {
                const today = new Date(); today.setHours(0,0,0,0);
                const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                const diffTime = gp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let graceClass = '';
                let textHtml = '';
                
                if (diffDays < 0) {
                    graceClass = 'grace-overdue';
                    textHtml = `<span class="grace-text overdue">⏰ Просрочка ${Math.abs(diffDays)} дн.</span>`;
                } else if (diffDays === 0) {
                    graceClass = 'grace-overdue';
                    textHtml = `<span class="grace-text danger">⏰ Сегодня!</span>`;
                } else if (diffDays <= 3) {
                    graceClass = 'grace-danger';
                    textHtml = `<span class="grace-text danger">⏰ Осталось ${diffDays} дн.</span>`;
                } else if (diffDays <= 7) {
                    graceClass = 'grace-warning';
                    textHtml = `<span class="grace-text warning">⏳ Осталось ${diffDays} дн.</span>`;
                }
                
                if (graceClass) {
                    html = html.replace('class="account-row"', `class="account-row ${graceClass}"`);
                    html = html.replace('Задолженность:', `${textHtml} Задолженность:`);
                }
            }
        }
        return html;
    };

    // ==========================================
    // ПОДСВЕТКА ВИДЖЕТОВ БАНКОВ
    // ==========================================
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        
        const today = new Date(); today.setHours(0,0,0,0);
        const problemBanks = new Set();
        const overdueBanks = new Set();
        
        S.accounts.forEach(a => {
            if (a.type === 'credit' && a.gracePeriod && !a.archived) {
                const limit = a.creditLimit || 0;
                const val = accValue(a);
                const debt = Math.max(0, limit - val);
                
                if (debt > 0) {
                    const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                    const diffDays = Math.ceil((gp - today) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 3) problemBanks.add(a.bankId);
                    if (diffDays <= 0) overdueBanks.add(a.bankId);
                }
            }
        });
        
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bankId = chip.dataset.bankId;
            chip.classList.remove('grace-bank-warning', 'grace-bank-overdue');
            if (bankId) {
                if (overdueBanks.has(bankId)) chip.classList.add('grace-bank-overdue');
                else if (problemBanks.has(bankId)) chip.classList.add('grace-bank-warning');
            }
        });
    };

    // ==========================================
    // СКРОЛЛ МЫШКОЙ И ФИКС КНОПОК
    // ==========================================
    const originalSetDashFilter = window.setDashFilter;
    window.setDashFilter = function(bankId) {
        if (typeof S !== 'undefined' && S.ui) {
            if (bankId === 'all') { S.ui.collapsedBanks = S.banks.map(b => b.id); } 
            else {
                const idx = S.ui.collapsedBanks.indexOf(bankId);
                if (idx > -1) S.ui.collapsedBanks.splice(idx, 1);
            }
            if (typeof save === 'function') save(false);
        }
        if (originalSetDashFilter) originalSetDashFilter(bankId);
    };

    const originalSetActiveTab = window.setActiveTab;
    window.setActiveTab = function(tab, fromPop) {
        if (originalSetActiveTab) originalSetActiveTab(tab, fromPop);
        const fab = document.getElementById('fabBtn');
        if (fab) fab.style.display = (tab === 'home') ? 'none' : 'flex';
    };

    document.addEventListener('DOMContentLoaded', () => {
        const fab = document.getElementById('fabBtn');
        if (fab && typeof activeTab !== 'undefined' && activeTab === 'home') fab.style.display = 'none';
    });

    let isDown = false, startX, scrollLeft, moved = false;
    document.addEventListener('mousedown', (e) => {
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel || (S.ui && S.ui.bankEditMode)) return;
        isDown = true; moved = false;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });
    document.addEventListener('mouseleave', () => { isDown = false; });
    document.addEventListener('mouseup', () => { isDown = false; });
    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel || (S.ui && S.ui.bankEditMode)) return;
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 5) moved = true;
        if (moved) e.preventDefault();
        carousel.scrollLeft = scrollLeft - walk;
    });
    document.addEventListener('wheel', (e) => {
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel) return;
        if (e.deltaY !== 0) { e.preventDefault(); carousel.scrollLeft += e.deltaY; }
    }, { passive: false });

    // ==========================================
    // МЕНЮ
    // ==========================================
    window.openMenu = function() { 
        openModal(`<div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button><button class="menu-item" onclick="window.openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button><button class="menu-item" onclick="window.openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button><button class="menu-item" onclick="window.openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button><button class="menu-item warn" onclick="window.clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button></div>`); 
    };
    
    setTimeout(() => { 
        const menuBtn = document.getElementById('menuBtn'); 
        if (menuBtn) menuBtn.onclick = window.openMenu; 
    }, 100);
    
    window.openCatAndDebtsMenu = function() { 
        openModal(`<div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button><button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button></div>`); 
    };
    
    window.openBackupMenu = function() { 
        openModal(`<div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button><button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button><button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button></div>`); 
    };
    
    window.clearLocalData = function() { 
        if (!confirm('Вы уверены, что хотите удалить все локальные данные? Приложение вернется в исходное состояние.')) return; 
        if (confirm('ВНИМАНИЕ! Это действие необратимо. Ваши данные будут удалены с этого устройства. Восстановить их можно будет ТОЛЬКО если вы введете свой Облачный токен заново. Вы точно хотите стереть всё?')) { 
            localStorage.setItem('financeApp_isReset', 'true'); 
            localStorage.removeItem('financeApp_v25'); 
            localStorage.removeItem('financeApp_lastSync'); 
            localStorage.removeItem('financeApp_localChange'); 
            location.reload(); 
        } 
    };
})();
