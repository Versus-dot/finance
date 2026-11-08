// ==========================================
// МОДУЛЬ ДЕТАЛИЗАЦИИ БАЛАНСА И КРЕДИТОВ (mod-balance.js)
// ==========================================
(function() {
    console.log("✅ Модуль детализации баланса и кредитов загружен (v121)");

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .total-val-clickable { cursor: pointer; transition: opacity 0.2s; }
        .total-val-clickable:hover { opacity: 0.8; }
        .total-val-clickable::after { content: ' 🔍'; font-size: 14px; vertical-align: middle; opacity: 0.5; margin-left: 4px; }
    `;
    document.head.appendChild(styleEl);

    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        const totalBar = document.querySelector('.total-bar');
        if (totalBar) {
            const vals = totalBar.querySelectorAll('.total-val');
            if (vals.length >= 2) {
                vals[0].classList.add('total-val-clickable');
                vals[0].title = "Нажмите для детализации активов";
                vals[0].onclick = window.openTotalBalanceDetails;
                vals[1].classList.add('total-val-clickable');
                vals[1].title = "Нажмите для детализации долгов";
                vals[1].onclick = window.openTotalDebtDetails;
            }
        }
    };

    window.openTotalBalanceDetails = function() {
        if (typeof S === 'undefined') return;
        const totals = window.computeTotals();
        const total = totals.totalCap;
        let displayAccs = [];
        
        S.accounts.forEach(a => {
            if (a.archived) return;
            const val = window.accValue(a);
            let contribution = a.type === 'credit' ? Math.max(0, val - (a.creditLimit || 0)) : val;
            if (a.ignoreBalance || a.isTransit) contribution = 0;
            if (S.settings.hedgingEnabled && a.hedgeFor) {
                const card = S.accounts.find(c => c.id === a.hedgeFor && c.type === 'credit' && !c.archived);
                if (card) contribution -= Math.min(val, card.creditLimit || 0);
            }
            if (contribution > 0) displayAccs.push({ acc: a, val: contribution });
        });
        
        displayAccs.sort((a, b) => b.val - a.val);
        let listHtml = displayAccs.length === 0 ? '<div class="empty" style="padding: 20px 0;">Нет активов</div>' : '';
        
        displayAccs.forEach(item => {
            const acc = item.acc;
            const val = item.val;
            const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
            const bank = S.banks.find(b => b.id === acc.bankId);
            const bankName = bank ? bank.name : 'Банк';
            const icon = acc.type === 'credit' ? '💳' : acc.type === 'cash' ? '💵' : acc.type === 'brokerage' || acc.type === 'iis' ? '📈' : acc.type === 'deposit' || acc.type === 'savings' ? '🏦' : '💼';
            
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
                </div>`;
        });

        window.openModal(`
            <div class="modal-header"><h2>💰 Из чего состоит баланс</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent); margin-bottom: 16px;">${fmt(total)}</div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">Показаны только те счета, которые сейчас реально увеличивают общий баланс.</div>
            <div style="max-height: 350px; overflow-y: auto;">${listHtml}</div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };

    window.openTotalDebtDetails = function() {
        if (typeof S === 'undefined') return;
        const totals = window.computeTotals();
        const totalDebt = totals.debt;
        let debtAccs = [];
        
        S.accounts.forEach(a => {
            if (a.archived || a.type !== 'credit' || a.ignoreBalance) return;
            const limit = a.creditLimit || 0;
            const val = window.accValue(a);
            const originalDebt = Math.max(0, limit - val);
            
            let hedgeAmount = 0;
            if (S.settings.hedgingEnabled) {
                const hedges = S.accounts.filter(x => x.hedgeFor === a.id && !x.archived);
                hedgeAmount = hedges.reduce((sum, h) => sum + window.accValue(h), 0);
            }

            let realDebt = Math.max(0, originalDebt - hedgeAmount);
            let hedgePercent = 0;
            if (originalDebt > 0 && hedgeAmount > 0) {
                hedgePercent = Math.min(100, Math.round((hedgeAmount / originalDebt) * 100));
            }
            
            if (realDebt > 0) {
                debtAccs.push({ acc: a, debt: realDebt, limit: limit, hedgePercent: hedgePercent });
            }
        });
        
        debtAccs.sort((a, b) => b.debt - a.debt);
        let listHtml = debtAccs.length === 0 ? '<div class="empty" style="padding: 20px 0;">У вас нет активных кредитных задолженностей</div>' : '';
        
        debtAccs.forEach(item => {
            const acc = item.acc;
            const debt = item.debt;
            const limit = item.limit;
            const hedgePercent = item.hedgePercent;
            const pct = totalDebt > 0 ? (debt / totalDebt * 100).toFixed(1) : 0;
            const bank = S.banks.find(b => b.id === acc.bankId);
            const bankName = bank ? bank.name : 'Банк';
            
            const hedgeHtml = hedgePercent > 0 ? ` · <span>🛡️ Хеджирована на ${hedgePercent}%</span>` : '';

            listHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:20px;">💳</span>
                        <div>
                            <div style="font-weight:600; font-size:14px;">${esc(acc.name)}</div>
                            <div style="font-size:11px; color:var(--muted);">${esc(bankName)} · Лимит: ${fmt(limit)}${hedgeHtml}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700; color:var(--red);">${fmt(debt)}</div>
                        <div style="font-size:11px; color:var(--muted);">${pct}% от долга</div>
                    </div>
                </div>`;
        });

        window.openModal(`
            <div class="modal-header"><h2>💳 Из чего состоит долг</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 24px; font-weight: 800; color: var(--red); margin-bottom: 16px;">${fmt(totalDebt)}</div>
            <div style="max-height: 350px; overflow-y: auto;">${listHtml}</div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };
})();
