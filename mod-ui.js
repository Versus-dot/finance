// ==========================================
// МОДУЛЬ UI (Темы, Анимации, Меню) - mod-ui.js
// ==========================================
(function() {
    console.log("✅ Модуль UI (mod-ui.js) загружен (v182)");

    let lastBackPress = 0;
    let isMenuOpen = false;
    let isHandlingPopState = false;
    window._currentBankFilter = 'all';

    const origOpenModal = window.openModal;
    const origSetActiveTab = window.setActiveTab;
    const origSetDashFilter = window.setDashFilter;

    window.setDashFilter = function(bankId) {
        const wasAll = window._currentBankFilter === 'all';
        window._currentBankFilter = bankId;
        
        if (typeof S !== 'undefined' && S.ui) {
            if (bankId === 'all') { S.ui.collapsedBanks = S.banks.map(b => b.id); } 
            else {
                const idx = S.ui.collapsedBanks.indexOf(bankId);
                if (idx > -1) S.ui.collapsedBanks.splice(idx, 1);
            }
            if (typeof save === 'function') save(false);
        }
        if (origSetDashFilter) origSetDashFilter(bankId);

        if (!isHandlingPopState) {
            if (bankId !== 'all') {
                if (wasAll) {
                    history.pushState({ bankFilter: bankId }, '', location.pathname + '#bank');
                } else {
                    history.replaceState({ bankFilter: bankId }, '', location.pathname + '#bank');
                }
            } else {
                if (history.state && history.state.bankFilter) {
                    history.replaceState({ tab: 'home', buffer: true }, '', location.pathname + '#home');
                }
            }
        }

        setTimeout(() => {
            requestAnimationFrame(() => {
                const carousel = document.querySelector('.banks-carousel');
                if (!carousel) return;
                if (bankId === 'all') {
                    carousel.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    const targetChip = carousel.querySelector(`.bank-chip[data-bank-id="${bankId}"]`);
                    if (targetChip) {
                        const carouselRect = carousel.getBoundingClientRect();
                        const targetRect = targetChip.getBoundingClientRect();
                        const offset = targetRect.left - carouselRect.left;
                        const scrollTarget = carousel.scrollLeft + offset - (carouselRect.width / 2) + (targetRect.width / 2);
                        carousel.scrollTo({ left: scrollTarget, behavior: 'smooth' });
                    }
                }
            });
        }, 100);
    };

    window.openModal = function(html) {
        const content = document.getElementById('modalContent');
        if (content) content.innerHTML = html;
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('active'); 
            backdrop.classList.add('visible');   
        }
        
        let prevMenu = null;
        if (isMenuOpen && history.state) {
            if (history.state.menu === 'sub') prevMenu = { menu: 'sub', type: history.state.type };
            else if (history.state.menu === 'main') prevMenu = { menu: 'main' };
        }
        
        history.pushState({ modal: true, prevMenu: prevMenu }, '', location.pathname + '#modal');
        
        setTimeout(() => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.ontouchmove = null;
                modal.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });
            });
        }, 50);
    };

    window.closeModal = function() {
        history.back();
    };

    window.setActiveTab = function(tab, fromPop) {
        const backdrop = document.getElementById('modalBackdrop');
        if (fromPop && (isMenuOpen || backdrop.classList.contains('visible'))) {
            return; 
        }
        if (origSetActiveTab) origSetActiveTab(tab, fromPop);
        const fab = document.getElementById('fabBtn');
        if (fab) fab.style.display = (tab === 'home') ? 'none' : 'flex';
    };

    function handleExit() {
        if (Date.now() - lastBackPress < 2000) {
            // Разрешаем браузеру закрыть приложение
        } else {
            history.pushState({ tab: 'home', buffer: true }, '', location.pathname + '#home');
            if (typeof toast === 'function') toast('Свайпните назад ещё раз для выхода');
            lastBackPress = Date.now();
        }
    }

    window.addEventListener('popstate', function(e) {
        e.stopImmediatePropagation();
        isHandlingPopState = true;
        
        try {
            const state = e.state || {};
            const backdrop = document.getElementById('modalBackdrop');
            const isModalActive = backdrop.classList.contains('visible');

            if (isModalActive) {
                backdrop.classList.remove('visible');
                const content = document.getElementById('modalContent');
                if (content) content.innerHTML = ''; 
                
                if (state.menu === 'sub') {
                    isMenuOpen = true;
                    backdrop.classList.add('visible');
                    window.renderMenuContent('sub', state.type);
                } else if (state.menu === 'main') {
                    isMenuOpen = true;
                    backdrop.classList.add('visible');
                    window.renderMenuContent('main');
                } else {
                    isMenuOpen = false;
                }
                return;
            }

            if (isMenuOpen) {
                if (state.menu === 'sub') {
                    window.renderMenuContent('sub', state.type);
                } else if (state.menu === 'main') {
                    window.renderMenuContent('main');
                } else {
                    isMenuOpen = false;
                    backdrop.classList.remove('visible');
                }
                return;
            }

            if (activeTab !== 'home') {
                if (origSetActiveTab) origSetActiveTab('home', true);
                return;
            }

            if (window._currentBankFilter !== 'all' || (typeof dashFilterBank !== 'undefined' && dashFilterBank !== 'all')) {
                window.setDashFilter('all');
                return;
            }

            handleExit();
        } finally {
            isHandlingPopState = false;
        }
    }, true);

    setTimeout(() => {
        if (typeof dashFilterBank !== 'undefined') dashFilterBank = 'all';
        window._currentBankFilter = 'all';
        document.querySelectorAll('.modal-backdrop').forEach(b => b.classList.remove('visible', 'active'));
        isMenuOpen = false;
        if (typeof renderDashboard === 'function') renderDashboard();

        if (!history.state || !history.state.buffer) {
            history.replaceState({ tab: 'home', root: true }, '', location.pathname + '#home');
            history.pushState({ tab: 'home', buffer: true }, '', location.pathname + '#home');
        }
    }, 100);

    window.addEventListener('pageshow', function(e) {
        if (e.persisted) {
            document.querySelectorAll('.modal-backdrop').forEach(b => {
                b.classList.remove('visible');
                b.classList.remove('active');
            });
            isMenuOpen = false;
            
            history.replaceState({ tab: 'home', root: true }, '', location.pathname + '#home');
            history.pushState({ tab: 'home', buffer: true }, '', location.pathname + '#home');

            if (typeof dashFilterBank !== 'undefined') dashFilterBank = 'all';
            window._currentBankFilter = 'all';
            if (typeof renderDashboard === 'function') renderDashboard();
        }
    });

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            document.querySelectorAll('.modal-backdrop').forEach(b => {
                b.classList.remove('visible');
                b.classList.remove('active');
            });
            isMenuOpen = false;
            
            if (typeof dashFilterBank !== 'undefined') dashFilterBank = 'all';
            window._currentBankFilter = 'all';
            if (typeof renderDashboard === 'function') renderDashboard();
        }
    });

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .modal-backdrop { display: none; }
        .modal-backdrop.visible { display: flex; }
        .modal, #modalBackdrop2 { overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch; touch-action: pan-y !important; }
        .account-row { transition: all 0.2s ease; }
        body.style-stripe .account-row { border-left: 4px solid var(--bank-color) !important; background: var(--card) !important; margin: 0 6px 0 10px !important; border-radius: 0 8px 8px 0 !important; border-bottom: 1px solid var(--border) !important; }
        body.style-stripe .account-row:has(.acc-debt) { background: rgba(239, 68, 68, 0.05) !important; }
        body.style-stripe .account-row:not(:has(.acc-debt)) { background: rgba(16, 185, 129, 0.04) !important; }
        body.style-bg .account-row { border-left: none !important; background: rgba(16, 185, 129, 0.1) !important; margin: 6px 10px !important; border-radius: 10px !important; border: 1px solid rgba(16, 185, 129, 0.2) !important; }
        body.style-bg .account-row:has(.acc-debt) { background: rgba(239, 68, 68, 0.1) !important; border-color: rgba(239, 68, 68, 0.3) !important; }
        body.style-minimal .account-row { border-left: none !important; background: var(--card2) !important; margin: 6px 10px !important; border-radius: 14px !important; border: 1px solid var(--border) !important; }
        body.style-minimal .acc-icon-wrap { transition: all 0.2s ease; }
        body.style-minimal .account-row:not(:has(.acc-debt)) .acc-icon-wrap { background: #2d3647 !important; color: #9aa5b8 !important; }
        body.style-minimal .account-row:has(.acc-debt) .acc-icon-wrap { background: #1f2532 !important; color: #6b778c !important; }
        
        .account-row.grace-warning { border-color: var(--yellow) !important; box-shadow: inset 0 0 0 2px var(--yellow) !important; }
        .account-row.grace-danger { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        .account-row.grace-overdue { border-color: var(--red) !important; animation: pulse-red-row 1.5s infinite; }
        @keyframes pulse-red-row { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8), inset 0 0 0 2px var(--red); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0), inset 0 0 0 2px var(--red); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), inset 0 0 0 2px var(--red); } }
        .grace-text { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
        .grace-text.warning { background: var(--yellow); color: #000; }
        .grace-text.danger, .grace-text.overdue { background: var(--red); color: #fff; }
        .bank-chip.grace-bank-warning { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        .bank-chip.grace-bank-overdue { border-color: var(--red) !important; animation: pulse-red-bank 1.5s infinite; }
        @keyframes pulse-red-bank { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8), inset 0 0 0 2px var(--red); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0), inset 0 0 0 2px var(--red); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), inset 0 0 0 2px var(--red); } }

        .menu-section { margin-bottom: 20px; }
        .menu-section-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 12px; }
        .menu-item-premium { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--card2); border-radius: 16px; color: var(--text); font-weight: 500; cursor: pointer; border: 1px solid transparent; text-align: left; width: 100%; font-family: inherit; font-size: 15px; transition: all 0.2s ease; margin-bottom: 8px; }
        .menu-item-premium:hover { border-color: var(--border); background: var(--card); }
        .menu-item-premium:active { transform: scale(0.98); }
        .menu-icon-wrap { width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--card); color: var(--accent); flex-shrink: 0; font-size: 18px; border: 1px solid var(--border); }
        .menu-item-premium .chevron { margin-left: auto; color: var(--muted); font-size: 16px; }
        .menu-item-premium.warn { color: var(--red); }
        .menu-item-premium.warn .menu-icon-wrap { color: var(--red); background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); }
        
        .menu-back-btn { background: var(--card2); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 20px; padding-bottom: 4px; color: var(--text); cursor: pointer; border: none; }
    `;
    document.head.appendChild(styleEl);

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
        setTimeout(() => {
            const modalContent = document.getElementById('modalContent');
            if (!modalContent) return;

            const badgeSelect = document.getElementById('setBadge');
            if (badgeSelect) badgeSelect.innerHTML = `
                <option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option>
                <option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option>
                <option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>
            `;
            
            const setSnap = document.getElementById('setSnap');
            if (setSnap) setSnap.closest('.form-group').style.display = 'none';
            
            const yandexBtns = Array.from(modalContent.querySelectorAll('button')).filter(b => b.textContent.includes('Яндекс'));
            yandexBtns.forEach(b => b.style.display = 'none');

            const yandexTitle = Array.from(modalContent.querySelectorAll('div')).find(el => el.textContent.includes('Облачный бэкап (Яндекс.Диск)') && el.children.length === 0);
            if (yandexTitle) {
                yandexTitle.style.display = 'none';
                let prev = yandexTitle.previousElementSibling;
                if (prev && prev.tagName === 'HR') prev.style.display = 'none';

                let next = yandexTitle.nextElementSibling;
                while (next && next.tagName !== 'HR') {
                    next.style.display = 'none';
                    next = next.nextElementSibling;
                }
                if (next && next.tagName === 'HR') next.style.display = 'none';
            }

            const usdtBtn = Array.from(modalContent.querySelectorAll('button')).find(b => b.textContent.includes('USDT'));
            if (usdtBtn) usdtBtn.style.display = 'none';

            modalContent.querySelectorAll('hr').forEach(hr => {
                 if (!hr.nextElementSibling || hr.nextElementSibling.style.display === 'none') hr.style.display = 'none';
            });

        }, 100);
    };
    
    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() { if (prevSaveSettings) prevSaveSettings(); applyBadgeStyle(); };

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
                let graceClass = ''; let textHtml = '';
                if (diffDays < 0) { graceClass = 'grace-overdue'; textHtml = `<span class="grace-text overdue">⏰ Просрочка ${Math.abs(diffDays)} дн.</span>`; } 
                else if (diffDays === 0) { graceClass = 'grace-overdue'; textHtml = `<span class="grace-text danger">⏰ Сегодня!</span>`; } 
                else if (diffDays <= 3) { graceClass = 'grace-danger'; textHtml = `<span class="grace-text danger">⏰ Осталось ${diffDays} дн.</span>`; } 
                else if (diffDays <= 7) { graceClass = 'grace-warning'; textHtml = `<span class="grace-text warning">⏳ Осталось ${diffDays} дн.</span>`; }
                if (graceClass) {
                    html = html.replace('class="account-row"', `class="account-row ${graceClass}"`);
                    html = html.replace('Задолженность:', `${textHtml} Задолженность:`);
                }
            }
        }
        return html;
    };

    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        const today = new Date(); today.setHours(0,0,0,0);
        const problemBanks = new Set(); const overdueBanks = new Set();
        S.accounts.forEach(a => {
            if (a.type === 'credit' && a.gracePeriod && !a.archived) {
                const limit = a.creditLimit || 0; const val = accValue(a); const debt = Math.max(0, limit - val);
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

    document.addEventListener('DOMContentLoaded', () => {
        const fab = document.getElementById('fabBtn');
        if (fab && typeof activeTab !== 'undefined' && activeTab === 'home') fab.style.display = 'none';
    });

    let isDown = false, startX, scrollLeft, moved = false;
    document.addEventListener('mousedown', (e) => {
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel || (S.ui && S.ui.bankEditMode)) return;
        isDown = true; moved = false; startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft;
    });
    document.addEventListener('mouseleave', () => { isDown = false; });
    document.addEventListener('mouseup', () => { isDown = false; });
    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel || (S.ui && S.ui.bankEditMode)) return;
        const x = e.pageX - carousel.offsetLeft; const walk = (x - startX) * 1.5;
        if (Math.abs(walk) > 5) moved = true;
        if (moved) e.preventDefault();
        carousel.scrollLeft = scrollLeft - walk;
    });
    document.addEventListener('wheel', (e) => {
        const carousel = e.target.closest('.banks-carousel');
        if (!carousel) return;
        if (e.deltaY !== 0) { e.preventDefault(); carousel.scrollLeft += e.deltaY; }
    }, { passive: false });

    // === ДВУХЭТАЖНОЕ МЕНЮ ===
    window.renderMenuContent = function(level, type = '') {
        const content = document.getElementById('modalContent');
        if (!content) return;

        if (level === 'main') {
            content.innerHTML = `
                <div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
                <div class="menu-section">
                    <button class="menu-item-premium" onclick="window.openSubMenu('sync')"><div class="menu-icon-wrap">☁️</div>Данные и Синхронизация<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.openSubMenu('appearance')"><div class="menu-icon-wrap">🎨</div>Оформление<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.openSubMenu('invest')"><div class="menu-icon-wrap">📈</div>Инвестиции<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.openSubMenu('directories')"><div class="menu-icon-wrap">📑</div>Справочники<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.openSubMenu('security')"><div class="menu-icon-wrap">🔒</div>Безопасность и Опасная зона<span class="chevron">›</span></button>
                </div>
            `;
        } else if (level === 'sub') {
            let title = '';
            let items = '';

            if (type === 'sync') {
                title = 'Данные и Синхронизация';
                items = `
                    <button class="menu-item-premium" onclick="window.syncSmart(true)"><div class="menu-icon-wrap">☁️</div>Сохранить в облако<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.syncSmart(true)"><div class="menu-icon-wrap">⬇️</div>Восстановить из облака<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="exportJSON()"><div class="menu-icon-wrap">📥</div>Скачать бэкап (JSON)<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="importJSON()"><div class="menu-icon-wrap">📤</div>Восстановить из JSON<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="window.openSnapshotFreqModal()"><div class="menu-icon-wrap">📸</div>Частота снимков<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="fetchUSDT()"><div class="menu-icon-wrap">💱</div>Обновить курс USDT<span class="chevron">›</span></button>
                `;
            } else if (type === 'appearance') {
                title = 'Оформление';
                items = `
                    <button class="menu-item-premium" onclick="window.openSettings()"><div class="menu-icon-wrap">🎨</div>Настройки приложения<span class="chevron">›</span></button>
                `;
            } else if (type === 'invest') {
                title = 'Инвестиции';
                items = `
                    <button class="menu-item-premium" onclick="window.syncTInvest()"><div class="menu-icon-wrap">📈</div>Обновить балансы (Т-Инвест)<span class="chevron">›</span></button>
                `;
            } else if (type === 'directories') {
                title = 'Справочники';
                items = `
                    <button class="menu-item-premium" onclick="openCategoryEditor()"><div class="menu-icon-wrap">📑</div>Категории<span class="chevron">›</span></button>
                    <button class="menu-item-premium" onclick="openCounterparties()"><div class="menu-icon-wrap">👥</div>Контрагенты (Долги)<span class="chevron">›</span></button>
                `;
            } else if (type === 'security') {
                title = 'Безопасность';
                items = `
                    <button class="menu-item-premium" onclick="window.openSecuritySettings()"><div class="menu-icon-wrap">🔒</div>Пароли и Опасная зона<span class="chevron">›</span></button>
                `;
            }

            content.innerHTML = `
                <div class="modal-header" style="align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button class="menu-back-btn" onclick="history.back()">‹</button>
                        <h2>${title}</h2>
                    </div>
                    <button class="btn-icon" onclick="closeModal()">✕</button>
                </div>
                <div class="menu-section">${items}</div>
            `;
        }

        setTimeout(() => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.ontouchmove = null;
                modal.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });
            });
        }, 50);
    };

    window.openSubMenu = function(type) {
        window.renderMenuContent('sub', type);
        history.pushState({ menu: 'sub', type: type }, '', location.pathname + '#menu-sub');
    };

    window.openMenu = function() {
        isMenuOpen = true;
        const backdrop = document.getElementById('modalBackdrop');
        backdrop.classList.remove('active');
        backdrop.classList.add('visible');
        window.renderMenuContent('main');
        history.pushState({ menu: 'main' }, '', location.pathname + '#menu');
    };

    window.openSnapshotFreqModal = function() {
        const currentFreq = S.settings.snapshotFreq || 'monthly';
        openModal(`
            <div class="modal-header"><h2>Частота снимков</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="form-group">
                <label>Как часто сохранять историю капитала</label>
                <select id="newSnapFreq">
                    <option value="monthly" ${currentFreq==='monthly'?'selected':''}>Раз в месяц</option>
                    <option value="weekly" ${currentFreq==='weekly'?'selected':''}>Раз в неделю</option>
                    <option value="daily" ${currentFreq==='daily'?'selected':''}>Раз в день</option>
                </select>
            </div>
            <button class="btn-primary btn-block" onclick="window.saveSnapshotFreq()">Сохранить</button>
        `);
    };

    window.saveSnapshotFreq = function() {
        const freq = document.getElementById('newSnapFreq').value;
        S.settings.snapshotFreq = freq;
        save();
        closeModal();
        toast('Частота снимков обновлена');
    };
    
    setTimeout(() => { const menuBtn = document.getElementById('menuBtn'); if (menuBtn) menuBtn.onclick = window.openMenu; }, 100);
    
    window.openCatAndDebtsMenu = function() { window.openMenu(); };
    
    setTimeout(() => {
        const navTabs = {
            home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
            accounts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
            transactions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
            stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>'
        };
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const tabName = tab.dataset.tab;
            if (navTabs[tabName]) {
                const iconSpan = tab.querySelector('.nav-icon');
                if (iconSpan) { iconSpan.innerHTML = navTabs[tabName]; iconSpan.style.display = 'flex'; }
            }
        });
    }, 500);

    window.toggleArchiveView = function() {
        if (!S.ui.showArchived) {
            prevCollapsedState = [...S.ui.collapsedBanks];
            const archBanks = new Set();
            S.accounts.filter(a => a.archived).forEach(a => {
                archBanks.add(a.bankId);
                const bank = S.banks.find(b => b.id === a.bankId);
                if (bank && bank.parentId) archBanks.add(bank.parentId);
            });
            S.ui.collapsedBanks = S.ui.collapsedBanks.filter(id => !archBanks.has(id));
        } else {
            if (prevCollapsedState) {
                S.ui.collapsedBanks = [...prevCollapsedState];
            }
        }
        S.ui.showArchived = !S.ui.showArchived;
        save();
        renderAccounts();
    };

    window.renderAccounts = function() {
        const el = document.getElementById('page-accounts'); if (!el) return;
        const showArch = S.ui.showArchived;
        let html = `<button class="btn-primary btn-block" style="margin-bottom:12px" onclick="openBankModal()">+ Добавить банк</button>`;
        if (showArch) html += `<div style="font-size:12px; color:var(--muted); text-align:center; margin-bottom:12px;">Показаны архивные счета (они выделены серым)</div>`;
        const topBanks = filterBanksForDisplay(S.banks.filter(b => !b.parentId)).sort((a,b) => (a.order||0) - (b.order||0));
        html += `<div id="banksSortable">`;
        topBanks.forEach(b => {
            const accs = filterAccountsForDisplay(S.accounts.filter(a => a.bankId === b.id && (showArch || !a.archived))).sort((a,b) => (a.order||0) - (b.order||0));
            const subBanks = filterBanksForDisplay(S.banks.filter(sb => sb.parentId === b.id)).sort((a,b) => (a.order||0) - (b.order||0));
            let total = 0;
            accs.forEach(a => { const v = accValue(a); if (a.type === 'credit') { const limit = a.creditLimit || 0; total += Math.max(0, v - limit); } else { total += v; } });
            subBanks.forEach(sb => { filterAccountsForDisplay(S.accounts.filter(a => a.bankId === sb.id && (showArch || !a.archived))).forEach(a => { const v = accValue(a); if (a.type === 'credit') { const limit = a.creditLimit || 0; total += Math.max(0, v - limit); } else { total += v; } }); });
            const collapsed = S.ui.collapsedBanks.includes(b.id);
            html += `<div class="bank-section" data-bank-id="${b.id}">
                <div class="bank-header" onclick="toggleBankAccs('${b.id}')" style="cursor:pointer">
                    <span style="display:flex;align-items:center;">
                        <span class="drag-handle" style="cursor:grab;margin-right:8px;" onclick="event.stopPropagation()">⋮⋮</span>
                        <span style="width:12px;height:12px;border-radius:50%;background:${b.color||'#888'};margin-right:8px;"></span>
                        ${collapsed?'▶':'▼'} ${esc(b.name)}
                    </span>
                    <span class="bank-total">${fmt(total)}</span>
                </div>
                <div class="bank-accounts-list" data-bank-id="${b.id}" style="${collapsed?'display:none':''}">`;
            subBanks.forEach(sb => {
                const sbAccs = filterAccountsForDisplay(S.accounts.filter(a => a.bankId === sb.id && (showArch || !a.archived))).sort((a,b) => (a.order||0) - (b.order||0));
                const sbCollapsed = S.ui.collapsedBanks.includes(sb.id);
                html += `<div class="sub-bank-section" data-bank-id="${sb.id}" style="padding-left:14px;border-left:2px solid ${sb.color};margin-left:14px;margin-top:8px;">
                    <div style="font-weight:600;font-size:13px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleBankAccs('${sb.id}')">
                        <span><span class="drag-handle" style="cursor:grab;margin-right:4px;" onclick="event.stopPropagation()">⋮⋮</span>${sbCollapsed?'▶':'▼'} ${esc(sb.name)}</span>
                        <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
                            <button class="btn-icon" onclick="openBankModal('${sb.id}')" title="Редактировать банк">✏️</button>
                            <button class="btn-icon" onclick="deleteBank('${sb.id}')" title="Удалить банк">🗑</button>
                            <button class="btn-icon" onclick="openAccountModal(null,'${sb.id}')" title="Добавить счёт">+ Счёт</button>
                        </div>
                    </div>
                    <div class="bank-accounts-list" data-bank-id="${sb.id}" style="${sbCollapsed?'display:none':''}">
                        ${sbAccs.map(a => `<div data-acc-id="${a.id}">${renderAccountRow(a, sb)}</div>`).join('')}
                    </div>
                </div>`;
            });
            accs.forEach(a => { html += `<div data-acc-id="${a.id}">${renderAccountRow(a, b)}</div>`; });
            html += `</div><div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;"><div style="display:flex;gap:8px;"><button class="btn-secondary btn-small" onclick="openAccountModal(null,'${b.id}')">+ Счёт</button>${b.isPlatform?`<button class="btn-secondary btn-small" onclick="openSubBankModal('${b.id}')">+ Банк платформы</button>`:''}</div><div style="display:flex;gap:4px;"><button class="btn-icon" onclick="openBankModal('${b.id}')" title="Редактировать банк">✏️</button>${!b.isPlatform?`<button class="btn-icon" onclick="deleteBank('${b.id}')" title="Удалить банк">🗑</button>`:''}</div></div></div>`;
        });
        html += `</div>`;
        html += `<button class="btn-secondary btn-block" style="margin-top:12px" onclick="window.toggleArchiveView()">${showArch?'Скрыть архив':'Показать архив'}</button>`;
        el.innerHTML = html;
        if (typeof Sortable !== 'undefined') {
            const banksContainer = document.getElementById('banksSortable');
            if (banksContainer) { new Sortable(banksContainer, { animation: 150, handle: '.drag-handle', filter: 'button, input, select, .sub-bank-section', onEnd: function() { const items = banksContainer.querySelectorAll(':scope > .bank-section'); items.forEach((item, index) => { const id = item.dataset.bankId; const b = getBank(id); if (b) b.order = index; }); save(); renderAll(); } }); }
            document.querySelectorAll('.bank-accounts-list').forEach(container => { new Sortable(container, { animation: 150, group: { name: 'accounts', pull: false, put: false }, handle: '.drag-handle', filter: 'button, input, select, .sub-bank-section', onEnd: function() { const items = container.querySelectorAll(':scope > [data-acc-id]'); items.forEach((item, index) => { const id = item.dataset.accId; const a = getAcc(id); if (a) a.order = index; }); save(); renderAll(); } }); });
        }
    };
})();
