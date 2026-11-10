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
    document.addEventListener('mouseup', () => { 