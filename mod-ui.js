// ==========================================
// МОДУЛЬ UI (Темы, Анимации, Меню) - mod-ui.js
// ==========================================
(function() {
    console.log("✅ Модуль UI (mod-ui.js) загружен");

    let prevCollapsedState = null;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .modal, #modalBackdrop2 { overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch; }
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
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect) badgeSelect.innerHTML = `
            <option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option>
            <option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option>
            <option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>
        `;
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

    // === НОВОЕ ПРЕМИАЛЬНОЕ МЕНЮ ===
    window.openMenu = function() { 
        openModal(`
            <div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            
            <div class="menu-section">
                <div class="menu-section-title">Управление</div>
                <button class="menu-item-premium" onclick="openSettings()">
                    <div class="menu-icon-wrap">⚙️</div>Настройки<span class="chevron">›</span>
                </button>
                <button class="menu-item-premium" onclick="window.openSecuritySettings()">
                    <div class="menu-icon-wrap">🔒</div>Безопасность и Токены<span class="chevron">›</span>
                </button>
            </div>

            <div class="menu-section">
                <div class="menu-section-title">Справочники</div>
                <button class="menu-item-premium" onclick="openCategoryEditor()">
                    <div class="menu-icon-wrap">📑</div>Категории<span class="chevron">›</span>
                </button>
                <button class="menu-item-premium" onclick="openCounterparties()">
                    <div class="menu-icon-wrap">👥</div>Контрагенты (Долги)<span class="chevron">›</span>
                </button>
            </div>

            <div class="menu-section">
                <div class="menu-section-title">Синхронизация данных</div>
                <button class="menu-item-premium" onclick="window.backupToYandexDisk()">
                    <div class="menu-icon-wrap">☁️</div>Сохранить в облако<span class="chevron">›</span>
                </button>
                <button class="menu-item-premium" onclick="window.syncTInvest()">
                    <div class="menu-icon-wrap">🔄</div>Обновить балансы (Т-Инвест)<span class="chevron">›</span>
                </button>
            </div>

            <div class="menu-section">
                <div class="menu-section-title">Данные</div>
                <button class="menu-item-premium" onclick="exportJSON()">
                    <div class="menu-icon-wrap">📥</div>Скачать бэкап (JSON)<span class="chevron">›</span>
                </button>
                <button class="menu-item-premium" onclick="importJSON()">
                    <div class="menu-icon-wrap">📤</div>Восстановить из JSON<span class="chevron">›</span>
                </button>
            </div>

            <div class="menu-section" style="margin-top:24px;">
                <button class="menu-item-premium warn" onclick="window.clearLocalData()">
                    <div class="menu-icon-wrap">🗑</div>Очистить данные<span class="chevron">›</span>
                </button>
            </div>
        `); 
    };
    
    setTimeout(() => { const menuBtn = document.getElementById('menuBtn'); if (menuBtn) menuBtn.onclick = window.openMenu; }, 100);
    
    window.openCatAndDebtsMenu = function() { openModal(`<div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button><button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button></div>`); };
    window.openBackupMenu = function() { openModal(`<div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button><button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button><button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button></div>`); };
    window.clearLocalData = function() { if (!confirm('Вы уверены, что хотите удалить все локальные данные? Приложение вернется в исходное состояние.')) return; if (confirm('ВНИМАНИЕ! Это действие необратимо. Ваши данные будут удалены с этого устройства. Восстановить их можно будет ТОЛЬКО если вы введете свой Облачный токен заново. Вы точно хотите стереть всё?')) { localStorage.setItem('financeApp_isReset', 'true'); localStorage.removeItem('financeApp_v25'); localStorage.removeItem('financeApp_lastSync'); localStorage.removeItem('financeApp_localChange'); location.reload(); } };

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
