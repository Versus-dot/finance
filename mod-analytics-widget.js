// ==========================================
// МОДУЛЬ АНАЛИТИКИ И ДОЛГОВ (mod-analytics-widget.js) v2
// ==========================================
(function() {
    console.log("✅ Модуль виджетов низа главной (mod-analytics-widget.js) загружен");

    if (typeof S !== 'undefined' && S.ui) {
        if (S.ui.collapsedAnalytics === undefined) S.ui.collapsedAnalytics = true; // По умолчанию свернут
        if (S.ui.hideAnalyticsNumbers === undefined) S.ui.hideAnalyticsNumbers = false;
        if (S.ui.collapsedDebts === undefined) S.ui.collapsedDebts = true;
        if (S.ui.hideDebtsNumbers === undefined) S.ui.hideDebtsNumbers = false;
    }

    window._analyticsMode = window._analyticsMode || 'prev';
    window._modalSort = window._modalSort || 'date';

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .bottom-widgets-grid { display: none !important; } /* Скрываем старую сетку из app.js */
        
        .fullwidth-widget {
            background: var(--card);
            border-radius: 20px;
            border: 1px solid var(--border);
            margin-bottom: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .fw-header {
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            background: var(--card2);
            font-weight: 700;
            font-size: 15px;
            transition: background 0.2s;
        }
        .fw-header:active { background: var(--card); }
        .fw-header-left { display: flex; align-items: center; gap: 8px; }
        .fw-body { padding: 16px; display: none; border-top: 1px solid var(--border); }
        .fw-body.expanded { display: block; }
        
        .analytic-item {
            background: var(--card2);
            border-radius: 12px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid var(--border);
        }
        .analytic-item:active { transform: scale(0.97); background: var(--card); }
        .analytic-item .label { font-size: 11px; color: var(--muted); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .analytic-item .val { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
        .analytic-item .trend { font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 2px; }
        
        .trend.up-good { color: var(--green); }
        .trend.down-bad { color: var(--red); }
        .trend.up-bad { color: var(--red); }
        .trend.down-good { color: var(--green); }
        .trend.neutral { color: var(--muted); }
        
        .modal-list-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .modal-list-item:last-child { border-bottom: none; }
        .group-header { font-size: 12px; font-weight: 700; color: var(--muted); margin: 16px 0 8px; text-transform: uppercase; }
    `;
    document.head.appendChild(styleEl);

    function toggleAnalyticsBody() {
        S.ui.collapsedAnalytics = !S.ui.collapsedAnalytics;
        save(false);
        if (typeof renderDashboard === 'function') renderDashboard();
    }
    function toggleAnalyticsEye(e) {
        e.stopPropagation();
        S.ui.hideAnalyticsNumbers = !S.ui.hideAnalyticsNumbers;
        save(false);
        if (typeof renderDashboard === 'function') renderDashboard();
    }
    function toggleDebtsBody() {
        S.ui.collapsedDebts = !S.ui.collapsedDebts;
        save(false);
        if (typeof renderDashboard === 'function') renderDashboard();
    }
    function toggleDebtsEye(e) {
        e.stopPropagation();
        S.ui.hideDebtsNumbers = !S.ui.hideDebtsNumbers;
        save(false);
        if (typeof renderDashboard === 'function') renderDashboard();
    }

    window.toggleAnalyticsBody = toggleAnalyticsBody;
    window.toggleAnalyticsEye = toggleAnalyticsEye;
    window.toggleDebtsBody = toggleDebtsBody;
    window.toggleDebtsEye = toggleDebtsEye;

    // Функция для расчета тренда
    function getTrendHtml(current, previous, isGoodWhenUp) {
        if (previous === 0 && current === 0) return `<div class="trend neutral">— 0%</div>`;
        if (previous === 0 && current > 0) return `<div class="trend ${isGoodWhenUp ? 'up-good' : 'up-bad'}">↑ Новое</div>`;
        
        const delta = ((current - previous) / previous) * 100;
        const isUp = delta > 0;
        const absDelta = Math.abs(delta).toFixed(0);
        
        if (Math.abs(delta) < 0.1) return `<div class="trend neutral">— 0%</div>`;

        let colorClass = '';
        if (isUp && isGoodWhenUp) colorClass = 'up-good';
        else if (!isUp && !isGoodWhenUp) colorClass = 'down-good';
        else if (isUp && !isGoodWhenUp) colorClass = 'up-bad';
        else colorClass = 'down-bad';

        return `<div class="trend ${colorClass}">${isUp ? '↑' : '↓'} ${absDelta}%</div>`;
    }

    function getPrevMonthData() {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return computeMonth(d.toISOString().slice(0, 7));
    }

    function getYearAvgData() {
        const year = new Date().toISOString().slice(0, 4);
        const months = new Set();
        S.transactions.filter(t => t.date.startsWith(year)).forEach(t => months.add(t.date.slice(0, 7)));
        if (months.size === 0) return { income: 0, expense: 0, savedTotal: 0, savingsRate: 0, passive: 0 };
        
        let totalInc = 0, totalExp = 0, totalSaved = 0, totalPassive = 0;
        months.forEach(m => {
            const mData = computeMonth(m);
            totalInc += mData.income;
            totalExp += mData.expense;
            totalSaved += mData.savedTotal;
            totalPassive += mData.passive;
        });
        
        const count = months.size;
        const avgInc = totalInc / count;
        return {
            income: avgInc,
            expense: totalExp / count,
            savedTotal: totalSaved / count,
            passive: totalPassive / count,
            savingsRate: avgInc > 0 ? (totalSaved / totalInc) * 100 : 0
        };
    }

    window.toggleAnalyticsMode = function() {
        window._analyticsMode = window._analyticsMode === 'prev' ? 'avg' : 'prev';
        if (typeof renderDashboard === 'function') renderDashboard();
    };

    window.openAnalyticsList = function(type) {
        const m = thisMonth();
        let list = [];
        if (type === 'income') list = S.transactions.filter(t => t.type === 'income' && t.date.startsWith(m));
        else if (type === 'expense') list = S.transactions.filter(t => t.type === 'expense' && t.date.startsWith(m));
        renderListModal(type, list);
    };

    window.openAnalyticsSaved = function() {
        const m = thisMonth();
        const transfers = S.transactions.filter(t => t.type === 'transfer' && t.date.startsWith(m));
        const savings = transfers.filter(t => (t.savingsKind || classifyTransfer(t.accountId, t.toAccountId)) === 'savings');
        const invest = transfers.filter(t => (t.savingsKind || classifyTransfer(t.accountId, t.toAccountId)) === 'investment');
        renderSavedModal(savings, invest);
    };

    window.openAnalyticsInfo = function() {
        const m = computeMonth();
        const html = `
            <div class="modal-header"><h2>Норма сбережений</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 14px; line-height: 1.6;">
                <p>Норма сбережений показывает, какую долю от доходов вы смогли отложить (в накопления или инвестиции).</p>
                <div style="background: var(--card2); padding: 12px; border-radius: 12px; margin: 16px 0; border: 1px solid var(--border);">
                    <div style="font-weight: 700; margin-bottom: 8px;">Расчет за этот месяц:</div>
                    <div>Доходы: <b>${fmt(m.income)}</b></div>
                    <div>Накопления + Инвестиции: <b>${fmt(m.savedTotal)}</b></div>
                    <hr style="border-color: var(--border); margin: 12px 0;">
                    <div>Формула: (${fmt(m.savedTotal)} / ${fmt(m.income)}) × 100%</div>
                    <div style="font-size: 20px; font-weight: 800; color: var(--green); margin-top: 8px;">${m.savingsRate.toFixed(0)}%</div>
                </div>
            </div>
            <button class="btn-primary btn-block" onclick="closeModal()">Понятно</button>
        `;
        openModal(html);
    };

    function renderListModal(type, list) {
        let sorted = [...list];
        if (window._modalSort === 'date') sorted.sort((a,b) => b.date.localeCompare(a.date));
        else sorted.sort((a,b) => b.amount - a.amount);

        let html = `<div class="modal-header"><h2>${type === 'income' ? 'Доходы' : 'Расходы'}</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
        html += `<div class="chips" style="margin-bottom: 12px;">
            <button class="chip ${window._modalSort === 'date' ? 'active' : ''}" onclick="window.changeModalSort('date', '${type}')">По дате</button>
            <button class="chip ${window._modalSort === 'amount' ? 'active' : ''}" onclick="window.changeModalSort('amount', '${type}')">По сумме</button>
        </div>`;
        if (sorted.length === 0) {
            html += `<div class="empty">Нет операций</div>`;
        } else {
            html += `<div style="max-height: 50vh; overflow-y: auto;">`;
            sorted.forEach(t => {
                const cat = getCat(t.categoryId);
                const catName = cat ? cat.name : 'Без категории';
                html += `<div class="modal-list-item">
                    <div><div style="font-weight:600;">${esc(catName)}</div><div style="font-size:12px; color:var(--muted);">${t.date} ${t.note ? '· '+esc(t.note) : ''}</div></div>
                    <div style="font-weight:700; color:var(--text);">${fmt(t.amount)}</div>
                </div>`;
            });
            html += `</div>`;
        }
        openModal(html);
    }

    function renderSavedModal(savings, invest) {
        let html = `<div class="modal-header"><h2>Отложено</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div style="max-height: 60vh; overflow-y: auto;">`;
        if (savings.length > 0) {
            html += `<div class="group-header" style="color: var(--green);">📈 Накопления</div>`;
            savings.sort((a,b) => b.date.localeCompare(a.date)).forEach(t => {
                const acc = getAcc(t.toAccountId);
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${acc ? esc(acc.name) : 'Счет'}</div><div style="font-size:12px; color:var(--muted);">${t.date}</div></div><div style="font-weight:700; color:var(--green);">${fmt(t.amount)}</div></div>`;
            });
        }
        if (invest.length > 0) {
            html += `<div class="group-header" style="color: var(--accent);">📈 Инвестиции</div>`;
            invest.sort((a,b) => b.date.localeCompare(a.date)).forEach(t => {
                const acc = getAcc(t.toAccountId);
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${acc ? esc(acc.name) : 'Счет'}</div><div style="font-size:12px; color:var(--muted);">${t.date}</div></div><div style="font-weight:700; color:var(--accent);">${fmt(t.amount)}</div></div>`;
            });
        }
        if (savings.length === 0 && invest.length === 0) {
            html += `<div class="empty">Нет переводов в накопления или инвестиции</div>`;
        }
        html += `</div>`;
        openModal(html);
    }

    window.changeModalSort = function(sortType, listType) {
        window._modalSort = sortType;
        if (listType === 'income') window.openAnalyticsList('income');
        else if (listType === 'expense') window.openAnalyticsList('expense');
    };

    // ГЛАВНЫЙ ПЕРЕХВАТ РЕНДЕРА
    const origRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (origRenderDashboard) origRenderDashboard();
        
        const pageHome = document.getElementById('page-home');
        if (!pageHome) return;

        // 1. Скрываем старый блок "bottom-widgets-grid" из app.js
        const oldBottomGrid = pageHome.querySelector('.bottom-widgets-grid');
        if (oldBottomGrid) oldBottomGrid.style.display = 'none';

        // 2. Считаем данные для Долгов
        let totalOwed = 0, totalOwe = 0;
        const lentSums = {}, borrowedSums = {};
        S.transactions.filter(tr => tr.type === 'debt').forEach(tr => {
            if (!tr.counterpartyId) return;
            if (tr.debtType === 'lent') lentSums[tr.counterpartyId] = (lentSums[tr.counterpartyId] || 0) + tr.amount;
            else if (tr.debtType === 'returned') lentSums[tr.counterpartyId] = (lentSums[tr.counterpartyId] || 0) - tr.amount;
            else if (tr.debtType === 'borrowed') borrowedSums[tr.counterpartyId] = (borrowedSums[tr.counterpartyId] || 0) + tr.amount;
            else if (tr.debtType === 'repaid') borrowedSums[tr.counterpartyId] = (borrowedSums[tr.counterpartyId] || 0) - tr.amount;
        });
        Object.values(lentSums).forEach(v => { if (v > 0) totalOwed += v; });
        Object.values(borrowedSums).forEach(v => { if (v > 0) totalOwe += v; });

        // 3. Считаем данные для Аналитики
        const m = computeMonth();
        const compareData = window._analyticsMode === 'prev' ? getPrevMonthData() : getYearAvgData();
        const modeText = window._analyticsMode === 'prev' ? 'К прошлому ▼' : 'К среднему ▼';

        const isAnalyticsHidden = S.ui.hideAnalyticsNumbers;
        const isDebtsHidden = S.ui.hideDebtsNumbers;
        const hideVal = (val) => isAnalyticsHidden ? '***' : fmt(val);

        // 4. Собираем HTML для Аналитики
        let analyticsHtml = `
            <div class="fullwidth-widget">
                <div class="fw-header" onclick="window.toggleAnalyticsBody()">
                    <div class="fw-header-left">
                        <span>${S.ui.collapsedAnalytics ? '▶' : '▼'} Аналитика месяца</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 8px;" onclick="event.stopPropagation(); window.toggleAnalyticsMode()">${modeText}</button>
                        <span style="cursor:pointer; padding:4px;" onclick="window.toggleAnalyticsEye(event)">${isAnalyticsHidden ? '🙈' : '👁️'}</span>
                    </div>
                </div>
                <div class="fw-body ${S.ui.collapsedAnalytics ? '' : 'expanded'}">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="analytic-item" onclick="window.openAnalyticsList('income')">
                            <div class="label">Доходы</div>
                            <div class="val pos">${hideVal(m.income)}</div>
                            ${getTrendHtml(m.income, compareData.income, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsList('expense')">
                            <div class="label">Расходы</div>
                            <div class="val neg">${hideVal(m.expense)}</div>
                            ${getTrendHtml(m.expense, compareData.expense, false)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsSaved()">
                            <div class="label">Отложено</div>
                            <div class="val pos">${hideVal(m.savedTotal)}</div>
                            ${getTrendHtml(m.savedTotal, compareData.savedTotal, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsInfo()">
                            <div class="label">Норма сбережений</div>
                            <div class="val">${isAnalyticsHidden ? '***' : m.savingsRate.toFixed(0) + '%'}</div>
                            ${getTrendHtml(m.savingsRate, compareData.savingsRate, true)}
                        </div>
                        <div class="analytic-item" style="grid-column: span 2;">
                            <div class="label">Свободный денежный поток (пассивный доход)</div>
                            <div class="val pos">${hideVal(m.passive)}</div>
                            ${getTrendHtml(m.passive, compareData.passive, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 5. Собираем HTML для Долгов
        let debtsHtml = `
            <div class="fullwidth-widget" style="margin-bottom: 0;">
                <div class="fw-header" onclick="window.toggleDebtsBody()">
                    <div class="fw-header-left">
                        <span>${S.ui.collapsedDebts ? '▶' : '▼'} Долги</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="cursor:pointer; padding:4px;" onclick="window.toggleDebtsEye(event)">${isDebtsHidden ? '🙈' : '👁️'}</span>
                    </div>
                </div>
                <div class="fw-body ${S.ui.collapsedDebts ? '' : 'expanded'}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="font-size:13px; color:var(--muted);">Мне должны</div>
                        <div class="pos" style="font-weight:700; font-size:15px;">${isDebtsHidden ? '***' : fmt(totalOwed)}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:13px; color:var(--muted);">Я должен</div>
                        <div class="neg" style="font-weight:700; font-size:15px;">${isDebtsHidden ? '***' : fmt(totalOwe)}</div>
                    </div>
                </div>
            </div>
        `;

        // 6. Вставляем новые виджеты в конец главной страницы
        const wrapper = document.createElement('div');
        wrapper.id = 'custom-bottom-widgets';
        wrapper.innerHTML = analyticsHtml + debtsHtml;
        
        const existingWrapper = document.getElementById('custom-bottom-widgets');
        if (existingWrapper) existingWrapper.remove();
        
        pageHome.appendChild(wrapper);
    };
})();
