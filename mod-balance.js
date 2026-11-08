// ==========================================
// МОДУЛЬ ДЕТАЛИЗАЦИИ БАЛАНСА (mod-balance.js)
// ==========================================
(function() {
    console.log("✅ Модуль детализации баланса (mod-balance.js) загружен");

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

    // 2. Перехватываем рендер главной страницы, чтобы добавить клик
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        
        // Ищем блок с общим балансом (самый первый .total-val)
        const totalBar = document.querySelector('.total-bar');
        if (totalBar) {
            const balanceDiv = totalBar.querySelector('div:first-child');
            const balanceVal = balanceDiv ? balanceDiv.querySelector('.total-val') : null;
            
            if (balanceVal) {
                balanceVal.classList.add('total-val-clickable');
                balanceVal.title = "Нажмите для детализации";
                balanceVal.onclick = window.openTotalBalanceDetails;
            }
        }
    };

    // 3. Функция открытия модального окна с детализацией
    window.openTotalBalanceDetails = function() {
        if (typeof S === 'undefined') return;
        
        const totals = window.computeTotals();
        const total = totals.totalCap;
        
        // Собираем все счета, которые ДАЮТ вклад в общий баланс
        let displayAccs = [];
        
        S.accounts.filter(a => !a.archived && !a.ignoreBalance).forEach(a => {
            const val = window.accValue(a);
            if (a.type === 'credit') {
                // Для кредиток в общий баланс идет только переплата (если баланс больше лимита)
                const limit = a.creditLimit || 0;
                const overpay = Math.max(0, val - limit);
                if (overpay > 0) displayAccs.push({ acc: a, val: overpay });
            } else {
                // Для остальных счетов — полная сумма
                if (val !== 0) displayAccs.push({ acc: a, val: val });
            }
        });
        
        // Сортируем по убыванию суммы
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
                
                // Иконка типа счета
                const icon = acc.type === 'credit' ? '💳' : 
                             acc.type === 'cash' ? '💵' : 
                             acc.type === 'brokerage' || acc.type === 'iis' ? '📈' : 
                             acc.type === 'deposit' || acc.type === 'savings' ? '🏦' : '💼';
                
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:20px;">${icon}</span>
                            <div>
                                <div style="font-weight:600; font-size:14px;">${window.esc(acc.name)}</div>
                                <div style="font-size:11px; color:var(--muted);">${window.esc(bankName)} · ${pct}%</div>
                            </div>
                        </div>
                        <div style="font-weight:700;">${window.fmt(val)}</div>
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
                ${window.fmt(total)}
            </div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">
                Показаны активы, за вычетом исключенных из баланса и кредитных лимитов. Счета в минусе не отображаются.
            </div>
            <div style="max-height: 350px; overflow-y: auto;">
                ${listHtml}
            </div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };

})();
