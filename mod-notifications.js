// ==========================================
// МОДУЛЬ УВЕДОМЛЕНИЙ (mod-notifications.js) v7
// ==========================================
(function() {
    console.log("✅ Модуль уведомлений (mod-notifications.js) v7 загружен");

    if (typeof S !== 'undefined') {
        if (S.settings.graceYellowDays === undefined) S.settings.graceYellowDays = 7;
        if (S.settings.graceRedDays === undefined) S.settings.graceRedDays = 3;
        if (S.settings.graceGlowIntensity === undefined) S.settings.graceGlowIntensity = 60;
    }

    function applyGlowIntensity() {
        const intensity = (S.settings.graceGlowIntensity || 60) / 100;
        document.documentElement.style.setProperty('--glow-alpha', (intensity * 0.8).toFixed(2));
        document.documentElement.style.setProperty('--glow-alpha-inner', (intensity * 0.4).toFixed(2));
    }
    setTimeout(applyGlowIntensity, 100);

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .bank-chip.bg-warning { 
            background: var(--card) !important;
            border-color: var(--yellow) !important; 
            box-shadow: 0 0 15px rgba(245, 158, 11, var(--glow-alpha, 0.5)), inset 0 0 0 1px rgba(245, 158, 11, var(--glow-alpha-inner, 0.25)) !important; 
        }
        .bank-chip.bg-danger { 
            background: var(--card) !important;
            border-color: var(--red) !important; 
            box-shadow: 0 0 15px rgba(239, 68, 68, var(--glow-alpha, 0.5)), inset 0 0 0 1px rgba(239, 68, 68, var(--glow-alpha-inner, 0.25)) !important; 
        }
        .bank-group.bg-warning { 
            border-color: var(--yellow) !important; 
            box-shadow: 0 0 15px rgba(245, 158, 11, var(--glow-alpha, 0.5)) !important;
        }
        .bank-group.bg-danger { 
            border-color: var(--red) !important; 
            box-shadow: 0 0 15px rgba(239, 68, 68, var(--glow-alpha, 0.5)) !important;
        }

        @keyframes pulse-glow {
            0% { box-shadow: 0 0 10px rgba(239, 68, 68, var(--glow-alpha-inner, 0.3)), inset 0 0 0 1px rgba(239, 68, 68, 0.2); }
            50% { box-shadow: 0 0 25px rgba(239, 68, 68, var(--glow-alpha, 0.7)), inset 0 0 0 2px rgba(239, 68, 68, var(--glow-alpha-inner, 0.4)); }
            100% { box-shadow: 0 0 10px rgba(239, 68, 68, var(--glow-alpha-inner, 0.3)), inset 0 0 0 1px rgba(239, 68, 68, 0.2); }
        }
        @keyframes pulse-glow-group {
            0% { box-shadow: 0 0 10px rgba(239, 68, 68, var(--glow-alpha-inner, 0.2)); border-color: rgba(239, 68, 68, 0.5); }
            50% { box-shadow: 0 0 25px rgba(239, 68, 68, var(--glow-alpha, 0.6)); border-color: var(--red); }
            100% { box-shadow: 0 0 10px rgba(239, 68, 68, var(--glow-alpha-inner, 0.2)); border-color: rgba(239, 68, 68, 0.5); }
        }

        .bank-chip.bg-danger.pulse-bg { animation: pulse-glow 1.5s infinite !important; }
        .bank-group.bg-danger.pulse-bg { animation: pulse-glow-group 1.5s infinite !important; }

        .global-grace-icon { display: inline-flex; align-items: center; margin-left: 8px; cursor: pointer; vertical-align: middle; }
        .global-grace-icon svg { width: 20px; height: 20px; }
        .global-grace-icon.warn { color: var(--yellow); }
        .global-grace-icon.danger { color: var(--red); }
        .global-grace-icon.pulse { color: var(--red); animation: pulse-danger 1.5s infinite; }
        
        @keyframes pulse-danger { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
    `;
    document.head.appendChild(styleEl);

    window.showGraceListModal = function() {
        const cards = S.accounts.filter(a => a.type === 'credit' && a.gracePeriod && !a.archived && Math.max(0, (a.creditLimit || 0) - accValue(a)) > 0);
        cards.sort((a,b) => new Date(a.gracePeriod) - new Date(b.gracePeriod));
        
        let html = `<div class="modal-header"><h2>Льготные периоды</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div style="max-height:60vh; overflow-y:auto;">`;
        const today = new Date(); today.setHours(0,0,0,0);
        
        cards.forEach(a => {
            const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
            const diffDays = Math.ceil((gp - today) / (1000 * 60 * 60 * 24));
            
            let statusColor = 'var(--muted)';
            let statusText = `Осталось ${diffDays} дн.`;
            if (diffDays < 0) { statusColor = 'var(--red)'; statusText = `Просрочка ${Math.abs(diffDays)} дн.`; }
            else if (diffDays === 0) { statusColor = 'var(--red)'; statusText = 'Сегодня!'; }
            else if (diffDays <= S.settings.graceRedDays) { statusColor = 'var(--red)'; }
            else if (diffDays <= S.settings.graceYellowDays) { statusColor = 'var(--yellow)'; }
            else { return; }

            const bank = S.banks.find(b => b.id === a.bankId);
            html += `<div class="modal-list-item">
                <div><div style="font-weight:600;">${esc(a.name)}</div><div style="font-size:11px; color:var(--muted);">${esc(bank ? bank.name : 'Банк')}</div></div>
                <div style="font-weight:700; color:${statusColor};">${statusText}</div>
            </div>`;
        });
        html += `</div>`;
        openModal(html);
    };

    window.renderMenuContent = function(level, type = '') {
        if (level === 'main') {
            const content = document.getElementById('modalContent');
            if (content) {
                const menuSection = content.querySelector('.menu-section');
                if (menuSection && !document.getElementById('menuBtnNotifications')) {
                    const btn = document.createElement('button');
                    btn.id = 'menuBtnNotifications';
                    btn.className = 'menu-item-premium';
                    btn.innerHTML = `<div class="menu-icon-wrap">🔔</div>Уведомления<span class="chevron">›</span>`;
                    btn.onclick = () => window.openSubMenu('notifications', 'sub');
                    
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
    };

    window.openGraceSettings = function() {
        const y = S.settings.graceYellowDays || 7;
        const r = S.settings.graceRedDays || 3;
        const b = S.settings.graceGlowIntensity || 60;
        
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
            <div class="form-group">
                <label>Яркость свечения (1-100%)</label>
                <input type="number" id="graceGlowInp" value="${b}" min="1" max="100">
            </div>
            <button class="btn-primary btn-block" onclick="window.saveGraceSettings()">Сохранить</button>
        `);
    };

    window.saveGraceSettings = function() {
        const y = parseInt(document.getElementById('graceYellowInp').value) || 7;
        const r = parseInt(document.getElementById('graceRedInp').value) || 3;
        const b = parseInt(document.getElementById('graceGlowInp').value) || 60;
        
        if (y <= r) { toast('Желтый порог должен быть больше красного'); return; }
        if (b < 1 || b > 100) { toast('Яркость должна быть от 1 до 100'); return; }
        
        S.settings.graceYellowDays = y;
        S.settings.graceRedDays = r;
        S.settings.graceGlowIntensity = b;
        save();
        closeModal();
        
        applyGlowIntensity(); 
        
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderAccounts === 'function') renderAccounts();
        toast('Настройки сохранены');
    };

    const prevRenderAccRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccRow(a, bank);
        
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

    const prevRenderDash = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDash) prevRenderDash();
        
        const today = new Date(); today.setHours(0,0,0,0);
        const yDays = S.settings.graceYellowDays || 7;
        const rDays = S.settings.graceRedDays || 3;
        const bankStatus = {}; 
        
        let worstGlobalStatus = null; 
        let worstGlobalDiff = Infinity;

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

                        if (diffDays < worstGlobalDiff) {
                            worstGlobalDiff = diffDays;
                            worstGlobalStatus = status;
                        }
                    }
                }
            }
        });
        
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bankId = chip.dataset.bankId;
            chip.classList.remove('bg-warning', 'bg-danger', 'pulse-bg');
            if (bankStatus[bankId]) {
                if (bankStatus[bankId] === 'pulse') chip.classList.add('bg-danger', 'pulse-bg');
                else if (bankStatus[bankId] === 'red') chip.classList.add('bg-danger');
                else if (bankStatus[bankId] === 'yellow') chip.classList.add('bg-warning');
            }
        });

        document.querySelectorAll('.bank-group').forEach(group => {
            const bankId = group.dataset.bankId;
            group.classList.remove('bg-warning', 'bg-danger', 'pulse-bg');
            if (bankStatus[bankId]) {
                if (bankStatus[bankId] === 'pulse') group.classList.add('bg-danger', 'pulse-bg');
                else if (bankStatus[bankId] === 'red') group.classList.add('bg-danger');
                else if (bankStatus[bankId] === 'yellow') group.classList.add('bg-warning');
            }
        });

        // Global indicator
        const banksTitle = document.querySelector('.banks-header .banks-title');
        if (banksTitle) {
            const oldIcon = document.getElementById('globalGraceIcon');
            if (oldIcon) oldIcon.remove();

            if (worstGlobalStatus) {
                const icon = document.createElement('span');
                icon.id = 'globalGraceIcon';
                let className = 'global-grace-icon ';
                if (worstGlobalStatus === 'pulse') className += 'pulse';
                else if (worstGlobalStatus === 'red') className += 'danger';
                else if (worstGlobalStatus === 'yellow') className += 'warn';
                icon.className = className;
                icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="vertical-align: text-bottom;"><path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
                icon.title = 'Есть карты с подходящим льготным периодом';
                icon.onclick = window.showGraceListModal;
                banksTitle.appendChild(icon);
            }
        }
    };
})();
