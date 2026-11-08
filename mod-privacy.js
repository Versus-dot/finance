// ==========================================
// МОДУЛЬ ПРИВАТНОСТИ (Скрытие балансов) - mod-privacy.js
// ==========================================
(function() {
    console.log("✅ Модуль приватности (mod-privacy.js) загружен (v144)");

    // Инициализация настроек
    if (typeof S !== 'undefined' && S.ui) {
        if (S.ui.globalHideBalances === undefined) S.ui.globalHideBalances = false;
        if (!S.ui.hiddenBanks) S.ui.hiddenBanks = [];
        if (!S.ui.hiddenAccounts) S.ui.hiddenAccounts = [];
    }

    // Стилизованные снежинки для скрытых сумм
    const HIDDEN_BALANCE = '<span style="filter: grayscale(1) opacity(0.4); font-size: 0.9em; margin-right: 2px;">❄️❄️❄️</span> ₽';
    const HIDDEN_PERCENT = '<span style="filter: grayscale(1) opacity(0.4); font-size: 0.9em;">❄❄❄</span> %';

    // SVG Иконки
    const eyeOpenSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosedSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
    
    // Глобальная иконка для шапки (чуть больше)
    const eyeOpenGlobal = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosedGlobal = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

    // Функции переключения
    window.toggleGlobalPrivacy = function() {
        S.ui.globalHideBalances = !S.ui.globalHideBalances;
        save();
        renderAll();
    };

    window.toggleBankPrivacy = function(bankId) {
        if (S.ui.globalHideBalances) return;
        const idx = S.ui.hiddenBanks.indexOf(bankId);
        if (idx > -1) S.ui.hiddenBanks.splice(idx, 1);
        else S.ui.hiddenBanks.push(bankId);
        save();
        renderAll();
    };

    // Функция для виджета "Все банки"
    window.toggleAllBanksPrivacy = function() {
        if (S.ui.globalHideBalances) return;
        
        const allBankIds = S.banks.map(b => b.id);
        const areAllHidden = allBankIds.length > 0 && allBankIds.every(id => S.ui.hiddenBanks.includes(id));
        
        if (areAllHidden) {
            S.ui.hiddenBanks = S.ui.hiddenBanks.filter(id => !allBankIds.includes(id));
        } else {
            S.ui.hiddenBanks = [...new Set([...S.ui.hiddenBanks, ...allBankIds])];
        }
        save();
        renderAll();
    };

    window.toggleAccountPrivacy = function(accId) {
        if (S.ui.globalHideBalances) return;
        const idx = S.ui.hiddenAccounts.indexOf(accId);
        if (idx > -1) S.ui.hiddenAccounts.splice(idx, 1);
        else S.ui.hiddenAccounts.push(accId);
        save();
        renderAll();
    };

    // 1. Перехват отрисовки строки счета
    const prevRenderAccountRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccountRow(a, bank);
        
        const isHidden = S.ui.globalHideBalances || S.ui.hiddenBanks.includes(a.bankId) || S.ui.hiddenAccounts.includes(a.id);
        
        if (isHidden) {
            html = html.replace(/<div class="acc-balance">([\s\S]*?)<\/div>/, `<div class="acc-balance">${HIDDEN_BALANCE}</div>`);
            html = html.replace(/Задолженность:\s*([^<]*)<\/div>/, `Задолженность: ${HIDDEN_BALANCE}</div>`);
            html = html.replace(/Ваши деньги:\s*\+?([^<]*)<\/div>/, `Ваши деньги: +${HIDDEN_BALANCE}</div>`);
        }

        const eyeIcon = isHidden ? eyeOpenSvg : eyeClosedSvg;
        const eyeBtn = `<span class="privacy-eye-btn" style="cursor:pointer;margin-left:6px;display:inline-flex;align-items:center;color:var(--muted);transition:color 0.2s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted)'" onclick="event.stopPropagation(); window.toggleAccountPrivacy('${a.id}')" title="${isHidden ? 'Показать' : 'Скрыть'}">${eyeIcon}</span>`;
        
        if (!S.ui.globalHideBalances) {
            if (html.includes('class="acc-balance"')) {
                html = html.replace(/(<div class="acc-balance">[\s\S]*?)<\/div>/, `$1 ${eyeBtn}</div>`);
            } else if (html.includes('class="acc-debt"')) {
                html = html.replace(/(<div class="acc-debt"[^>]*>[\s\S]*?)<\/div>/, `$1 ${eyeBtn}</div>`);
            }
        }

        return html;
    };

    // 2. Перехват отрисовки главной страницы
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();

        // --- Глобальный глаз в шапке ---
        const globalBtn = document.getElementById('globalPrivacyBtn');
        if (globalBtn) {
            const isHidden = S.ui.globalHideBalances;
            globalBtn.innerHTML = isHidden ? eyeOpenGlobal : eyeClosedGlobal;
            globalBtn.title = isHidden ? "Показать все балансы" : "Скрыть все балансы";
            globalBtn.onclick = window.toggleGlobalPrivacy;
        }

        if (S.ui.globalHideBalances) {
            document.querySelectorAll('.total-val').forEach(el => el.innerHTML = HIDDEN_BALANCE);
            document.querySelectorAll('.group-total-val').forEach(el => el.innerHTML = HIDDEN_BALANCE);
            document.querySelectorAll('.bottom-widgets-grid .pos, .bottom-widgets-grid .neg').forEach(el => el.innerHTML = HIDDEN_BALANCE);
            document.querySelectorAll('.bottom-widgets-grid div').forEach(el => {
                if (el.children.length === 0 && el.textContent.trim().endsWith('%')) el.innerHTML = HIDDEN_PERCENT;
            });
            const cushionAmt = document.querySelector('.cushion-amount');
            if (cushionAmt) cushionAmt.innerHTML = HIDDEN_BALANCE;
            const goalText = document.querySelector('.cushion-goal-text');
            if (goalText) {
                const spans = goalText.querySelectorAll('span');
                spans.forEach(span => {
                    if (span.textContent.includes('Цель')) span.innerHTML = 'Цель: ' + HIDDEN_BALANCE;
                    else if (span.textContent.includes('%')) span.innerHTML = HIDDEN_PERCENT;
                });
            }
        }

        // --- Обработка карточек банков ---
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bId = chip.dataset.bankId;

            // Логика для чипа "Все банки" (у него нет data-bank-id)
            if (!bId && chip.textContent.includes('Все банки')) {
                const isAllHidden = S.ui.globalHideBalances || (S.banks.length > 0 && S.banks.every(b => S.ui.hiddenBanks.includes(b.id)));
                
                if (isAllHidden && !S.ui.globalHideBalances) {
                    const bal = chip.querySelector('.bc-bal');
                    if (bal) bal.innerHTML = HIDDEN_BALANCE;
                }
                
                if (!S.ui.globalHideBalances && !chip.querySelector('.bank-eye-btn')) {
                    const eyeBtn = document.createElement('span');
                    eyeBtn.className = 'bank-eye-btn';
                    eyeBtn.style = 'position:absolute; top:8px; right:8px; cursor:pointer; color:var(--muted); display:flex;';
                    eyeBtn.innerHTML = isAllHidden ? eyeOpenSvg : eyeClosedSvg;
                    eyeBtn.onclick = (e) => { e.stopPropagation(); window.toggleAllBanksPrivacy(); };
                    chip.style.position = 'relative';
                    chip.appendChild(eyeBtn);
                }
                return; 
            }

            if (!bId) return;

            // Логика для конкретных банков
            const isHidden = S.ui.globalHideBalances || S.ui.hiddenBanks.includes(bId);
            
            if (isHidden) {
                const bal = chip.querySelector('.bc-bal');
                if (bal) bal.innerHTML = HIDDEN_BALANCE;
                const debt = chip.querySelector('.bc-debt');
                if (debt) debt.innerHTML = HIDDEN_BALANCE;
            }

            if (!S.ui.globalHideBalances && !chip.querySelector('.bank-eye-btn')) {
                const eyeBtn = document.createElement('span');
                eyeBtn.className = 'bank-eye-btn';
                eyeBtn.style = 'position:absolute; top:8px; right:8px; cursor:pointer; color:var(--muted); display:flex;';
                eyeBtn.innerHTML = isHidden ? eyeOpenSvg : eyeClosedSvg;
                eyeBtn.onclick = (e) => { e.stopPropagation(); window.toggleBankPrivacy(bId); };
                chip.style.position = 'relative';
                chip.appendChild(eyeBtn);
            }
        });

        // --- Обработка заголовков групп (если банк скрыт локально) ---
        document.querySelectorAll('.bank-group').forEach(group => {
            const bankId = group.dataset.bankId;
            const isHidden = S.ui.globalHideBalances || S.ui.hiddenBanks.includes(bankId);
            if (isHidden) {
                const totalEl = group.querySelector('.group-total-val');
                if (totalEl) totalEl.innerHTML = HIDDEN_BALANCE;
            }
        });
    };

})();
