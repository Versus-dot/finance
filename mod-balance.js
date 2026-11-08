// ==========================================
// МОДУЛЬ ДЕТАЛИЗАЦИИ БАЛАНСА И КРЕДИТОВ (mod-balance.js)
// ==========================================
(function() {
    console.log("✅ Модуль детализации баланса и кредитов загружен");

    // 1. Добавляем стили для курсора и подсказки
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .total-val-clickable {
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .total-val-clickable:hover {
            opacity: 0.8;
        }
        .total-val-clickable::after {
            content: ' 🔍';
            font-size: 14px;
            vertical-align: middle;
            opacity: 0.5;
            margin-left: 4px;
        }
    `;
    document.head.appendChild(styleEl);

    // 2. Перехватываем рендер главной страницы, чтобы добавить клики
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        
        const totalBar = document.querySelector('.total-bar');
        if (totalBar) {
            // Левая часть - Баланс
            const balanceDiv = totalBar.querySelector('div:first-child');
            const balanceVal = balanceDiv ? balanceDiv.querySelector('.total-val') : null;
            if (balanceVal) {
                balanceVal.classList.add('total-val-clickable');
                balanceVal.title = "Нажмите для детализации активов";
                balanceVal.onclick = window.openTotalBalanceDetails;
            }

            // Правая часть - Кредиты
            const creditDiv = totalBar.querySelector('div:last-child');
            const creditVal = creditDiv ? creditDiv.querySelector('.total-val') : null;
            if (creditVal) {
                creditVal.classList.add('total-val-clickable');
                creditVal.title = "Нажмите для детализации долгов";
                creditVal.onclick = window.openTotalDebtDetails;
            }
        }
    };

    // 3. Функция открытия детализации БАЛАНСА (Активы)
    window.openTotalBalanceDetails = function() {
        if (typeof S === 'undefined') return;
        
        const totals = window.computeTotals();
        const total = totals.totalCap;
        
        let displayAccs = [];
        
        S.accounts.filter(a => !a.archived && !a.ignoreBalance).forEach(a => {
            const val = window.accValue(a);
            if (a.type === 'credit') {
                const limit = a.creditLimit || 0;
                const overpay = Math.max(0, val - limit);
                if (overpay > 0) displayAccs.push({ acc: a, val: overpay });
            } else {
                if (val !== 0) displayAccs.push({ acc: a, val: val });
            }
        });
        
        displayAccs.sort((a, b) => b.val - a.val);
        
        let listHtml = '';
        if (displayAccs.length === 0) {
            listHtml = '<div class="empty" style="padding: 20px 0;">Нет активов, формирующих баланс</div>';
        } else {
            displayAccs.forEach(item => {
                const acc = item.acc;
                const val = item.val;
                const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                const bank = S.banks.find(b => b.id === acc.bankId);
                const bankName = bank ? bank.name : 'Банк';
                
                const icon = acc.type === 'credit' ? '💳' : 
                             acc.type === 'cash' ? '💵' : 
                             acc.type === 'brokerage' || acc.type === 'iis' ? '📈' : 
                             acc.type === 'deposit' || acc.type === 'savings' ? '🏦' : '💼';
                
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:20px;">${icon}</span>
                            <div>
                                <div style="font-weight:600; font-size:14px;">${esc(acc.name)}</div>
                                <div style="font-size:11px; color:var(--muted);">${esc(bankName)} · ${pct}%</div>
                            </div>
                        </div>
                        <div style="font-weight:700;">${fmt(val)}</div>
                    </div>
                `;
            });
        }

        window.openModal(`
            <div class="modal-header">
                <h2>💰 Из чего состоит баланс</h2>
                <button class="btn-icon" onclick="closeModal()">✕</button>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent); margin-bottom: 16px;">
                ${fmt(total)}
            </div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">
                Показаны активы, за вычетом исключенных из баланса и кредитных лимитов.
            </div>
            <div style="max-height: 350px; overflow-y: auto;">
                ${listHtml}
            </div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };

    // 4. Функция открытия детализации КРЕДИТОВ (Долги)
    window.openTotalDebtDetails = function() {
        if (typeof S === 'undefined') return;
        
        const totals = window.computeTotals();
        const totalDebt = totals.debt;
        
        let debtAccs = [];
        
        S.accounts.filter(a => !a.archived && a.type === 'credit' && !a.ignoreBalance).forEach(a => {
            const limit = a.creditLimit || 0;
            const val = window.accValue(a);
            const debt = Math.max(0, limit - val);
            if (debt > 0) {
                debtAccs.push({ acc: a, debt: debt, limit: limit, balance: val });
            }
        });
        
        debtAccs.sort((a, b) => b.debt - a.debt);
        
        let listHtml = '';
        if (debtAccs.length === 0) {
            listHtml = '<div class="empty" style="padding: 20px 0;">У вас нет активных кредитных задолженностей</div>';
        } else {
            debtAccs.forEach(item => {
                const acc = item.acc;
                const debt = item.debt;
                const limit = item.limit;
                const pct = totalDebt > 0 ? (debt / totalDebt * 100).toFixed(1) : 0;
                const bank = S.banks.find(b => b.id === acc.bankId);
                const bankName = bank ? bank.name : 'Банк';
                
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:20px;">💳</span>
                            <div>
                                <div style="font-weight:600; font-size:14px;">${esc(acc.name)}</div>
                                <div style="font-size:11px; color:var(--muted);">${esc(bankName)} · Лимит: ${fmt(limit)}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:var(--red);">${fmt(debt)}</div>
                            <div style="font-size:11px; color:var(--muted);">${pct}% от общего долга</div>
                        </div>
                    </div>
                `;
            });
        }

        window.openModal(`
            <div class="modal-header">
                <h2>💳 Из чего состоит долг</h2>
                <button class="btn-icon" onclick="closeModal()">✕</button>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--red); margin-bottom: 16px;">
                ${fmt(totalDebt)}
            </div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">
                Суммы рассчитаны как (Кредитный лимит - Остаток на карте).
            </div>
            <div style="max-height: 350px; overflow-y: auto;">
                ${listHtml}
            </div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };

})();
