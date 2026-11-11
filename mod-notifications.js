// ==========================================
// МОДУЛЬ УВЕДОМЛЕНИЙ (mod-notifications.js)
// ==========================================
(function() {
    // Инициализация настроек по умолчанию
    if (typeof S !== 'undefined') {
        if (S.settings.graceYellowDays === undefined) S.settings.graceYellowDays = 7;
        if (S.settings.graceRedDays === undefined) S.settings.graceRedDays = 3;
    }

    // Добавляем стили для мягкой подсветки банков
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .bank-chip.bg-warning { background: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.5) !important; }
        .bank-chip.bg-danger { background: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.5) !important; }
        .bank-group-header.bg-warning { background: rgba(245, 158, 11, 0.1) !important; color: var(--yellow) !important; }
        .bank-group-header.bg-danger { background: rgba(239, 68, 68, 0.1) !important; color: var(--red) !important; }
        @keyframes pulse-bg { 0% { background: rgba(239, 68, 68, 0.15); } 50% { background: rgba(239, 68, 68, 0.4); } 100% { background: rgba(239, 68, 68, 0.15); } }
        .pulse-bg { animation: pulse-bg 1.5s infinite !important; }
    `;
    document.head.appendChild(styleEl);

    // 1. ПЕРЕХВАТ МЕНЮ
    const origRenderMenu = window.renderMenuContent;
    window.renderMenuContent = function(level, type = '') {
        if (level === 'main') {
            if (origRenderMenu) origRenderMenu(level, type);
            const content = document.getElementById('modalContent');
            if (content) {
                const menuSection = content.querySelector('.menu-section');
                if (menuSection && !document.getElementById('menuBtnNotifications')) {
                    const btn = document.createElement('button');
                    btn.id = 'menuBtnNotifications';
                    btn.className = 'menu-item-premium';
                    btn.innerHTML = `<div class="menu-icon-wrap">🔔</div>Уведомления<span class="chevron">›</span>`;
                    btn.onclick = () => window.openSubMenu('notifications');
                    
                    const secBtn = Array.from(menuSection.children).find(el => el.textContent.includes('Безопасность'));
                    if (secBtn) menuSection.insertBefore(btn, secBtn);
                    else menuSection.appendChild(btn);
                }
            }
            return;
        }
        if (level === 'sub' && type === 'notifications') {
            const content = document.getElementById('modalContent');
            if (content) {
                content.innerHTML = `
                    <div class="modal-header" style="align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <button class="menu-back-btn" onclick="history.back()">‹</button>
                            <h2>Уведомления</h2>
                        </div>
                        <button class="btn-icon" onclick="closeModal()">✕</button>
                    </div>
                    <div class="menu-section">
                        <button class="menu-item-premium" onclick="window.openGraceSettings()">
                            <div class="menu-icon-wrap">⏰</div>Сигнализатор льготного периода<span class="chevron">›</span>
                        </button>
                    </div>
                `;
            }
            return;
        }
        if (origRenderMenu) origRenderMenu(level, type);
    };

    // 2. ОКНО НАСТРОЕК
    window.openGraceSettings = function() {
        const y = S.settings.graceYellowDays || 7;
        const r = S.settings.graceRedDays || 3;
        openModal(`
            <div class="modal-header"><h2>Сигнализатор</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="form-group">
                <label>За сколько дней включать желтый контур?</label>
                <input type="number" id="graceYellowInp" value="${y}" min="1" max="30">
            </div>
            <div class="form-group">
                <label>За сколько дней включать красный контур?</label>
                <input type="number" id="graceRedInp" value="${r}" min="1" max="30">
            </div>
            <button class="btn-primary btn-block" onclick="window.saveGraceSettings()">Сохранить</button>
        `);
    };

    window.saveGraceSettings = function() {
        const y = parseInt(document.getElementById('graceYellowInp').value) || 7;
        const r = parseInt(document.getElementById('graceRedInp').value) || 3;
        if (y <= r) { toast('Желтый порог должен быть больше красного'); return; }
        
        S.settings.graceYellowDays = y;
        S.settings.graceRedDays = r;
        save();
        closeModal();
        
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderAccounts === 'function') renderAccounts();
        toast('Настройки сохранены');
    };

    // 3. ПЕРЕХВАТ ОТРИСОВКИ КАРТОЧЕК СЧЕТОВ
    const prevRenderAccRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccRow(a, bank);
        
        // Убираем старую жестко зашитую логику из mod-ui.js
        html = html.replace(/<span class="grace-text[^>]*>.*?<\/span>/g, '');
        html = html.replace(/class="account-row\s*(grace-warning|grace-danger|grace-overdue)"/g, 'class="account-row"');

        if (a.type === 'credit' && a.gracePeriod && !a.archived) {
            const limit = a.creditLimit || 0;
            const val = accValue(a);
            const debt = Math.max(0, limit - val);
            
            if (debt > 0) {
                const today = new Date(); today.setHours(0,0,0,0);
                const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                const diffDays = Math.ceil((gp - today) / (1000 * 60 * 60 * 24));
                
                const yDays = S.settings.graceYellowDays || 7;
                const rDays = S.settings.graceRedDays || 3;
                
                let graceClass = ''; let textHtml = '';
                if (diffDays < 0) { 
                    graceClass = 'grace-overdue'; textHtml = `<span class="grace-text overdue">⏰ Просрочка ${Math.abs(diffDays)} дн.</span>`; 
                } else if (diffDays === 0) { 
                    graceClass = 'grace-overdue'; textHtml = `<span class="grace-text danger">⏰ Сегодня!</span>`; 
                } else if (diffDays <= rDays) { 
                    graceClass = 'grace-danger'; textHtml = `<span class="grace-text danger">⏰ Осталось ${diffDays} дн.</span>`; 
                } else if (diffDays <= yDays) { 
                    graceClass = 'grace-warning'; textHtml = `<span class="grace-text warning">⏳ Осталось ${diffDays} дн.</span>`; 
                }
                
                if (graceClass) {
                    html = html.replace('class="account-row"', `class="account-row ${graceClass}"`);
                    html = html.replace('Задолженность:', `${textHtml} Задолженность:`);
                }
            }
        }
        return html;
    };

    // 4. ПЕРЕХВАТ ОТРИСОВКИ БАНКОВ (Карусель и Группы)
    const prevRenderDash = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDash) prevRenderDash();
        
        const today = new Date(); today.setHours(0,0,0,0);
        const yDays = S.settings.graceYellowDays || 7;
        const rDays = S.settings.graceRedDays || 3;
        const bankStatus = {}; 
        
        S.accounts.forEach(a => {
            if (a.type === 'credit' && a.gracePeriod && !a.archived) {
                const limit = a.creditLimit || 0; 
                const val = accValue(a); 
                const debt = Math.max(0, limit - val);
                if (debt > 0) {
                    const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                    const diffDays = Math.ceil((gp - today) / (1000 * 60 * 60 * 24));
                    
                    let status = null;
                    if (diffDays <= 0) status = 'pulse';
                    else if (diffDays <= rDays) status = 'red';
                    else if (diffDays <= yDays) status = 'yellow';
                    
                    if (status) {
                        const existing = bankStatus[a.bankId];
                        if (existing === 'pulse') { /* keep */ }
                        else if (status === 'pulse') bankStatus[a.bankId] = 'pulse';
                        else if (existing === 'red') { /* keep */ }
                        else if (status === 'red') bankStatus[a.bankId] = 'red';
                        else if (!existing) bankStatus[a.bankId] = 'yellow';
                    }
                }
            }
        });
        
        // Красим карусель банков
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bankId = chip.dataset.bankId;
            chip.classList.remove('bg-warning', 'bg-danger', 'pulse-bg');
            if (bankStatus[bankId]) {
                if (bankStatus[bankId] === 'pulse') chip.classList.add('bg-danger', 'pulse-bg');
                else if (bankStatus[bankId] === 'red') chip.classList.add('bg-danger');
                else if (bankStatus[bankId] === 'yellow') chip.classList.add('bg-warning');
            }
        });

        // Красим заголовки групп (список счетов)
        document.querySelectorAll('.bank-group').forEach(group => {
            const bankId = group.dataset.bankId;
            const header = group.querySelector('.bank-group-header');
            if (header) {
                header.classList.remove('bg-warning', 'bg-danger', 'pulse-bg');
                if (bankStatus[bankId]) {
                    if (bankStatus[bankId] === 'pulse') header.classList.add('bg-danger', 'pulse-bg');
                    else if (bankStatus[bankId] === 'red') header.classList.add('bg-danger');
                    else if (bankStatus[bankId] === 'yellow') header.classList.add('bg-warning');
                }
            }
        });
    };
})();
