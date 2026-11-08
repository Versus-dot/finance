// ==========================================
// МОДУЛЬ ПРИВАТНОСТИ (Скрытие балансов) - mod-privacy.js
// ==========================================
(function() {
    console.log("✅ Модуль приватности (mod-privacy.js) загружен (v134)");

    // Инициализация настроек
    if (typeof S !== 'undefined' && S.ui) {
        if (S.ui.globalHideBalances === undefined) S.ui.globalHideBalances = false;
        if (!S.ui.hiddenBanks) S.ui.hiddenBanks = [];
        if (!S.ui.hiddenAccounts) S.ui.hiddenAccounts = [];
    }

    // SVG Иконки
    const eyeOpenSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosedSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

    // Функции переключения
    window.toggleGlobalPrivacy = function() {
        S.ui.globalHideBalances = !S.ui.globalHideBalances;
        save();
        renderAll();
    };

    window.toggleBankPrivacy = function(bankId) {
        if (S.ui.globalHideBalances) return; // Глобальный режим перекрывает всё
        const idx = S.ui.hiddenBanks.indexOf(bankId);
        if (idx > -1) S.ui.hiddenBanks.splice(idx, 1);
        else S.ui.hiddenBanks.push(bankId);
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
            // Заменяем цифры на точки
            html = html.replace(/<div class="acc-balance">([\s\S]*?)<\/div>/, `<div class="acc-balance">•••• ₽</div>`);
            html = html.replace(/Задолженность:\s*([^<]*)<\/div>/, `Задолженность: •••• ₽</div>`);
            html = html.replace(/Ваши деньги:\s*\+?([^<]*)<\/div>/, `Ваши деньги: +•••• ₽</div>`);
        }

        // Вставляем глазик
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

        // Глобальный глаз в топ-баре
        const totalBar = document.querySelector('.total-bar');
        if (totalBar && !document.getElementById('globalPrivacyBtn')) {
            const isHidden = S.ui.globalHideBalances;
            const btn = document.createElement('button');
            btn.id = 'globalPrivacyBtn';
            btn.className = 'btn-icon';
            btn.style = 'position:absolute; right:14px; top:14px; color:var(--muted); padding:8px; border-radius:50%; background:var(--card2);';
            btn.innerHTML = isHidden ? eyeOpenSvg.replace('14px', '20px') : eyeClosedSvg.replace('14px', '20px');
            btn.title = isHidden ? "Показать все балансы" : "Скрыть все балансы";
            btn.onclick = window.toggleGlobalPrivacy;
            totalBar.style.position = 'relative';
            totalBar.appendChild(btn);
        }

        if (S.ui.globalHideBalances) {
            // 1. Тотал-бар
            document.querySelectorAll('.total-val').forEach(el => el.textContent = '•••• ₽');
            
            // 2. Заголовки групп счетов
            document.querySelectorAll('.group-total-val').forEach(el => el.textContent = '•••• ₽');

            // 3. Нижние виджеты
            document.querySelectorAll('.bottom-widgets-grid .pos, .bottom-widgets-grid .neg').forEach(el => el.textContent = '•••• ₽');
            document.querySelectorAll('.bottom-widgets-grid div').forEach(el => {
                if (el.children.length === 0 && el.textContent.trim().endsWith('%')) {
                    el.textContent = '•••• %';
                }
            });

            // 4. Подушка безопасности
            const cushionAmt = document.querySelector('.cushion-amount');
            if (cushionAmt) cushionAmt.textContent = '•••• ₽';
            const goalText = document.querySelector('.cushion-goal-text');
            if (goalText) {
                const spans = goalText.querySelectorAll('span');
                spans.forEach(span => {
                    if (span.textContent.includes('Цель')) span.textContent = 'Цель: •••• ₽';
                    else if (span.textContent.includes('%')) span.textContent = '•••• %';
                });
            }
        }

        // Обработка карточек банков (карусель)
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bId = chip.dataset.bankId;
            if (!bId || bId === 'all') return;

            const isHidden = S.ui.globalHideBalances || S.ui.hiddenBanks.includes(bId);
            
            if (isHidden) {
                const bal = chip.querySelector('.bc-bal');
                if (bal) bal.textContent = '•••• ₽';
                const debt = chip.querySelector('.bc-debt');
                if (debt) debt.textContent = '•••• ₽';
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

        // Обработка заголовков групп (если банк скрыт локально)
        document.querySelectorAll('.bank-group').forEach(group => {
            const bankId = group.dataset.bankId;
            const isHidden = S.ui.globalHideBalances || S.ui.hiddenBanks.includes(bankId);
            if (isHidden) {
                const totalEl = group.querySelector('.group-total-val');
                if (totalEl) totalEl.textContent = '•••• ₽';
            }
        });
    };

})();
