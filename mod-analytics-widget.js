// ==========================================
// МОДУЛЬ АНАЛИТИКИ И ДОЛГОВ (mod-analytics-widget.js) v10
// ==========================================
(function() {
    console.log("✅ Модуль виджетов низа главной (mod-analytics-widget.js) v10 загружен");

    if (typeof S !== 'undefined' && S.ui) {
        if (S.ui.collapsedAnalytics === undefined) S.ui.collapsedAnalytics = true;
        if (S.ui.hideAnalyticsNumbers === undefined) S.ui.hideAnalyticsNumbers = false;
        if (S.ui.collapsedDebts === undefined) S.ui.collapsedDebts = true;
        if (S.ui.hideDebtsNumbers === undefined) S.ui.hideDebtsNumbers = false;
    }

    window._analyticsPeriod = window._analyticsPeriod || 'month';
    window._modalSort = window._modalSort || 'date';
    window._customStart = window._customStart || null;
    window._customEnd = window._customEnd || null;

    const eyeOpenSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosedSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .bottom-widgets-grid { display: none !important; }
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
        
        .eye-btn {
            background: transparent;
            border: none;
            color: var(--muted);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .eye-btn:hover { background: rgba(255,255,255,0.1); }
    `;
    document.head.appendChild(styleEl);

    window.getCustomCapital = function() {
        let assets = 0, debt = 0, coveredDebt = 0;
        let cushion = 0, pds = 0, investments = 0, savings = 0, crypto = 0, other = 0;

        const hedgesByCard = {};
        if (S.settings.hedgingEnabled) {
            S.accounts.filter(a => a.hedgeFor && !a.archived && !a.inCushion).forEach(h => {
                if (!hedgesByCard[h.hedgeFor]) hedgesByCard[h.hedgeFor] = 0;
                hedgesByCard[h.hedgeFor] += accValue(h);
            });
        }

        S.accounts.filter(a => !a.archived).forEach(a => {
            const v = accValue(a);
            if (a.type === 'credit') {
                const limit = a.creditLimit || 0;
                let cardDebt = Math.max(0, limit - v);
                let overpay = Math.max(0, v - limit);
                
                if (overpay > 0) {
                    savings += overpay;
                    assets += overpay;
                }
                
                let hedgeTotal = 0;
                if (S.settings.hedgingEnabled && hedgesByCard[a.id]) {
                    hedgeTotal = hedgesByCard[a.id];
                }

                const covered = Math.min(cardDebt, hedgeTotal);
                const surplus = Math.max(0, hedgeTotal - cardDebt);

                if (surplus > 0) {
                    savings += surplus;
                    assets += surplus;
                }

                debt += Math.max(0, cardDebt - covered);
                coveredDebt += covered;
            } else {
                if (a.inCushion) {
                    cushion += v;
                    assets += v;
                } else if (S.settings.hedgingEnabled && a.hedgeFor) {
                    // Хедж уже учтен в излишке/покрытии кредитки
                } else {
                    if (a.type === 'pds') pds += v;
                    else if (['brokerage', 'iis', 'invest_kopilka'].includes(a.type)) investments += v;
                    else if (['deposit', 'savings', 'finu_wallet', 'debit', 'cash'].includes(a.type)) savings += v;
                    else if (['crypto_wallet', 'crypto_exchange'].includes(a.type)) crypto += v;
                    else other += v;
                    
                    assets += v;
                }
            }
        });

        return { net: assets - debt, assets, debt, coveredDebt, cushion, pds, investments, savings, crypto, other };
    };

    function getPeriodDates(period, isPrev = false) {
        let start = new Date(), end = new Date();
        end.setHours(23,59,59,999);
        start.setHours(0,0,0,0);

        if (period === 'day') {
            if (isPrev) start.setDate(start.getDate() - 1);
            end = new Date(start); end.setHours(23,59,59,999);
        } else if (period === 'week') {
            const day = start.getDay() || 7; 
            if (day !== 1) start.setHours(-24 * (day - 1));
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
            if (isPrev) { start.setDate(start.getDate() - 7); end.setDate(end.getDate() - 7); }
        } else if (period === 'month') {
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            if (isPrev) { start.setMonth(start.getMonth() - 1); end.setMonth(end.getMonth() - 1); }
        } else if (period === 'year') {
            start.setMonth(0, 1);
            end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
            if (isPrev) { start.setFullYear(start.getFullYear() - 1); end.setFullYear(end.getFullYear() - 1); }
        } else if (period === 'ytd') {
            start.setMonth(0, 1);
            if (isPrev) start.setFullYear(start.getFullYear() - 1);
            end = new Date(start); end.setFullYear(end.getFullYear() + (isPrev?1:0));
            const today = new Date();
            if (!isPrev) end = today;
            else end.setDate(today.getDate());
        } else if (period === 'custom' && window._customStart && window._customEnd) {
            start = new Date(window._customStart); start.setHours(0,0,0,0);
            end = new Date(window._customEnd); end.setHours(23,59,59,999);
            if (isPrev) {
                const diff = end - start;
                end = new Date(start.getTime() - 1);
                start = new Date(end.getTime() - diff);
            }
        }
        return { start, end };
    }

    function calcDataForRange(start, end) {
        let inc = 0, exp = 0, saved = 0, passive = 0;
        S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= start.getTime() && d <= end.getTime() && !t.ignoreInStats;
        }).forEach(t => {
            if (t.type === 'income') { 
                inc += t.amount; 
                const c = getCat(t.categoryId);
                if (c && c.passive) passive += t.amount; 
            }
            if (t.type === 'expense') exp += t.amount;
            if (t.type === 'transfer') {
                const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                if (k === 'savings' || k === 'investment') saved += t.amount;
            }
        });
        return { inc, exp, saved, passive, rate: inc > 0 ? (saved/inc*100) : 0 };
    }

    function getTrendHtml(current, previous, isGoodWhenUp) {
        if (previous === 0 && current === 0) return `<div class="trend neutral">— 0%</div>`;
        if (previous === 0 && current > 0) return `<div class="trend ${isGoodWhenUp ? 'up-good' : 'up-bad'}">↑ Новое</div>`;
        const delta = ((current - previous) / previous) * 100;
        const isUp = delta > 0;
        const absDelta = Math.abs(delta).toFixed(0);
        if (Math.abs(delta) < 0.1) return `<div class="trend neutral">— 0%</div>`;
        let colorClass = (isUp && isGoodWhenUp) ? 'up-good' : (!isUp && !isGoodWhenUp) ? 'down-good' : (isUp && !isGoodWhenUp) ? 'up-bad' : 'down-bad';
        return `<div class="trend ${colorClass}">${isUp ? '↑' : '↓'} ${absDelta}%</div>`;
    }

    window.setAnalyticsPeriod = function(val) {
        window._analyticsPeriod = val;
        if (val === 'custom') window.openCustomPeriodModal();
        else renderDashboard();
    };

    window.openCustomPeriodModal = function() {
        const s = window._customStart || today();
        const e = window._customEnd || today();
        openModal(`
            <div class="modal-header"><h2>Свой период</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="form-row">
                <div class="form-group"><label>С даты</label><input type="date" id="cpStart" value="${s}"></div>
                <div class="form-group"><label>По дату</label><input type="date" id="cpEnd" value="${e}"></div>
            </div>
            <button class="btn-primary btn-block" onclick="window.applyCustomPeriod()">Применить</button>
        `);
    };

    window.applyCustomPeriod = function() {
        window._customStart = document.getElementById('cpStart').value;
        window._customEnd = document.getElementById('cpEnd').value;
        closeModal();
        renderDashboard();
    };

    window.toggleAnalyticsBody = function() { S.ui.collapsedAnalytics = !S.ui.collapsedAnalytics; save(false); renderDashboard(); };
    window.toggleAnalyticsEye = function(e) { e.stopPropagation(); S.ui.hideAnalyticsNumbers = !S.ui.hideAnalyticsNumbers; save(false); renderDashboard(); };
    window.toggleDebtsBody = function() { S.ui.collapsedDebts = !S.ui.collapsedDebts; save(false); renderDashboard(); };
    window.toggleDebtsEye = function(e) { e.stopPropagation(); S.ui.hideDebtsNumbers = !S.ui.hideDebtsNumbers; save(false); renderDashboard(); };

    window.openAnalyticsList = function(type) {
        const dates = getPeriodDates(window._analyticsPeriod);
        let list = S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= dates.start.getTime() && d <= dates.end.getTime() && !t.ignoreInStats;
        });

        if (type === 'income') list = list.filter(t => t.type === 'income');
        else if (type === 'expense') list = list.filter(t => t.type === 'expense');
        else if (type === 'passive') list = list.filter(t => t.type === 'income' && getCat(t.categoryId)?.passive);

        renderListModal(type, list);
    };

    window.openAnalyticsSaved = function() {
        const dates = getPeriodDates(window._analyticsPeriod);
        const transfers = S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= dates.start.getTime() && d <= dates.end.getTime() && t.type === 'transfer' && !t.ignoreInStats;
        });
        const savings = transfers.filter(t => (t.savingsKind || classifyTransfer(t.accountId, t.toAccountId)) === 'savings');
        const invest = transfers.filter(t => (t.savingsKind || classifyTransfer(t.accountId, t.toAccountId)) === 'investment');
        renderSavedModal(savings, invest);
    };
    window.openAnalyticsInfo = function() {
        const dates = getPeriodDates(window._analyticsPeriod);
        const m = calcDataForRange(dates.start, dates.end);
        openModal(`
            <div class="modal-header"><h2>Норма сбережений</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 14px; line-height: 1.6;">
                <p>Норма сбережений показывает, какую долю от доходов вы смогли отложить.</p>
                <div style="background: var(--card2); padding: 12px; border-radius: 12px; margin: 16px 0; border: 1px solid var(--border);">
                    <div>Доходы: <b>${fmt(m.inc)}</b></div>
                    <div>Отложено: <b>${fmt(m.saved)}</b></div>
                    <hr style="border-color: var(--border); margin: 12px 0;">
                    <div>Формула: (${fmt(m.saved)} / ${fmt(m.inc)}) × 100%</div>
                    <div style="font-size: 20px; font-weight: 800; color: var(--green); margin-top: 8px;">${m.rate.toFixed(0)}%</div>
                </div>
            </div>
            <button class="btn-primary btn-block" onclick="closeModal()">Понятно</button>
        `);
    };

    window.openCapitalDetails = function() {
        const c = getCustomCapital();
        const dates = getPeriodDates(window._analyticsPeriod);
        
        let prevCap = c.net;
        if (S.snapshots && S.snapshots.length > 0) {
            const pastSnapshots = S.snapshots.filter(s => new Date(s.date).getTime() <= dates.start.getTime());
            if (pastSnapshots.length > 0) {
                pastSnapshots.sort((a,b) => new Date(b.date) - new Date(a.date));
                prevCap = pastSnapshots[0].total;
            }
        }

        const delta = prevCap > 0 ? ((c.net - prevCap) / prevCap * 100) : 0;
        const deltaHtml = prevCap > 0 ? `<span style="color:${delta>=0?'var(--green)':'var(--red)'}">${delta>=0?'↑':'↓'} ${Math.abs(delta).toFixed(1)}%</span>` : '—';

        openModal(`
            <div class="modal-header"><h2>Структура чистого капитала</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 14px; line-height: 1.8;">
                ${c.cushion > 0 ? `<div style="display:flex; justify-content:space-between;"><span>🛡 Подушка безопасности</span> <b>${fmt(c.cushion)}</b></div>` : ''}
                ${c.pds > 0 ? `<div style="display:flex; justify-content:space-between;"><span>📈 ПДС</span> <b>${fmt(c.pds)}</b></div>` : ''}
                ${c.investments > 0 ? `<div style="display:flex; justify-content:space-between;"><span>📊 Фондовый рынок</span> <b>${fmt(c.investments)}</b></div>` : ''}
                ${c.savings > 0 ? `<div style="display:flex; justify-content:space-between;"><span>💰 Накопления</span> <b>${fmt(c.savings)}</b></div>` : ''}
                ${c.crypto > 0 ? `<div style="display:flex; justify-content:space-between;"><span>🪙 Крипта</span> <b>${fmt(c.crypto)}</b></div>` : ''}
                ${c.other > 0 ? `<div style="display:flex; justify-content:space-between;"><span>🗂 Прочее</span> <b>${fmt(c.other)}</b></div>` : ''}
                <div style="display:flex; justify-content:space-between; margin-top:8px;"><span>🔴 Долги по кредитам</span> <b style="color:var(--red)">-${fmt(c.debt)}</b></div>
                ${c.coveredDebt > 0 ? `<div style="font-size:12px; color:var(--muted); text-align:right;">(в т.ч. покрыто хеджем: ${fmt(c.coveredDebt)})</div>` : ''}
                <hr style="border-color: var(--border); margin: 12px 0;">
                <div style="display:flex; justify-content:space-between; font-size: 18px; font-weight: 800;">
                    <span>Итого</span> <span>${fmt(c.net)}</span>
                </div>
                <div style="text-align:center; margin-top: 8px; font-size: 13px;">Изменение: ${deltaHtml}</div>
            </div>
        `);
    };

    window.openDebtorHistory = function(cpId, type) {
        const cp = S.counterparties.find(c => c.id === cpId);
        if (!cp) return;
        
        let txs = S.transactions.filter(t => t.type === 'debt' && t.counterpartyId === cpId && !t.ignoreInStats);
        if (type === 'lent') txs = txs.filter(t => t.debtType === 'lent' || t.debtType === 'returned');
        else txs = txs.filter(t => t.debtType === 'borrowed' || t.debtType === 'repaid');
        
        txs.sort((a,b) => b.date.localeCompare(a.date));

        let html = `<div class="modal-header"><h2>${esc(cp.name)}</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
        if (txs.length === 0) html += `<div class="empty">Нет операций</div>`;
        else {
            html += `<div style="max-height: 60vh; overflow-y: auto;">`;
            txs.forEach(t => {
                const isPositive = (t.debtType === 'returned' || t.debtType === 'borrowed');
                const sign = isPositive ? '+' : '-';
                const color = isPositive ? 'var(--green)' : 'var(--red)';
                const label = {lent:'Дал в долг', returned:'Вернули', borrowed:'Взял в долг', repaid:'Отдал'}[t.debtType];
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${label}</div><div style="font-size:12px; color:var(--muted);">${t.date}</div></div><div style="font-weight:700; color:${color};">${sign}${fmt(t.amount)}</div></div>`;
            });
            html += `</div>`;
        }
        openModal(html);
    };

    function renderListModal(type, list) {
        let sorted = [...list];
        if (window._modalSort === 'date') sorted.sort((a,b) => b.date.localeCompare(a.date));
        else sorted.sort((a,b) => b.amount - a.amount);
        const titles = {income:'Доходы', expense:'Расходы', passive:'Свободный поток'};
        
        let html = `<div class="modal-header"><h2>${titles[type]}</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
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
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${cat ? esc(cat.name) : 'Без категории'}</div><div style="font-size:12px; color:var(--muted);">${t.date} ${t.note ? '· '+esc(t.note) : ''}</div></div><div style="font-weight:700;">${fmt(t.amount)}</div></div>`;
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
        if (savings.length === 0 && invest.length === 0) html += `<div class="empty">Нет данных</div>`;
        html += `</div>`;
        openModal(html);
    }

    window.changeModalSort = function(sortType, listType) {
        window._modalSort = sortType;
        window.openAnalyticsList(listType);
    };

    const origRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (origRenderDashboard) origRenderDashboard();
        const pageHome = document.getElementById('page-home');
        if (!pageHome) return;

        const oldBottomGrid = pageHome.querySelector('.bottom-widgets-grid');
        if (oldBottomGrid) oldBottomGrid.style.display = 'none';

        let totalOwed = 0, totalOwe = 0;
        const lentSums = {}, borrowedSums = {};
        S.transactions.filter(tr => tr.type === 'debt' && !tr.ignoreInStats).forEach(tr => {
            if (!tr.counterpartyId) return;
            if (tr.debtType === 'lent') lentSums[tr.counterpartyId] = (lentSums[tr.counterpartyId] || 0) + tr.amount;
            else if (tr.debtType === 'returned') lentSums[tr.counterpartyId] = (lentSums[tr.counterpartyId] || 0) - tr.amount;
            else if (tr.debtType === 'borrowed') borrowedSums[tr.counterpartyId] = (borrowedSums[tr.counterpartyId] || 0) + tr.amount;
            else if (tr.debtType === 'repaid') borrowedSums[tr.counterpartyId] = (borrowedSums[tr.counterpartyId] || 0) - tr.amount;
        });
        
        let owedListHtml = '';
        Object.keys(lentSums).forEach(cpId => {
            if (lentSums[cpId] > 0) {
                const cp = S.counterparties.find(c => c.id === cpId);
                totalOwed += lentSums[cpId];
                owedListHtml += `<div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border); cursor:pointer;" onclick="window.openDebtorHistory('${cpId}', 'lent')"><span>${cp?esc(cp.name):'Неизвестный'}</span><span class="pos">${fmt(lentSums[cpId])}</span></div>`;
            }
        });

        let oweListHtml = '';
        Object.keys(borrowedSums).forEach(cpId => {
            if (borrowedSums[cpId] > 0) {
                const cp = S.counterparties.find(c => c.id === cpId);
                totalOwe += borrowedSums[cpId];
                oweListHtml += `<div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid var(--border); cursor:pointer;" onclick="window.openDebtorHistory('${cpId}', 'borrowed')"><span>${cp?esc(cp.name):'Неизвестный'}</span><span class="neg">${fmt(borrowedSums[cpId])}</span></div>`;
            }
        });

        const dCurrent = getPeriodDates(window._analyticsPeriod, false);
        const dPrev = getPeriodDates(window._analyticsPeriod, true);
        const m = calcDataForRange(dCurrent.start, dCurrent.end);
        const p = calcDataForRange(dPrev.start, dPrev.end);
        const c = getCustomCapital();

        let prevCap = c.net;
        if (S.snapshots && S.snapshots.length > 0) {
            const pastSnapshots = S.snapshots.filter(s => new Date(s.date).getTime() <= dCurrent.start.getTime());
            if (pastSnapshots.length > 0) {
                pastSnapshots.sort((a,b) => new Date(b.date) - new Date(a.date));
                prevCap = pastSnapshots[0].total;
            }
        }

        const isHideAn = S.ui.hideAnalyticsNumbers;
        const isHideDebt = S.ui.hideDebtsNumbers;
        const hideV = (v) => isHideAn ? '***' : fmt(v);

        const periodOpts = { day:'День', week:'Неделя', month:'Месяц', year:'Год', ytd:'С начала года', custom:'Период ⚙️' };
        let selectHtml = `<select onchange="window.setAnalyticsPeriod(this.value)" style="padding: 4px 8px; border-radius: 8px; font-size: 12px; background: var(--card); color: var(--text); border: 1px solid var(--border); outline: none;">`;
        Object.keys(periodOpts).forEach(k => {
            selectHtml += `<option value="${k}" ${window._analyticsPeriod === k ? 'selected' : ''}>${periodOpts[k]}</option>`;
        });
        selectHtml += `</select>`;

        let analyticsHtml = `
            <div class="fullwidth-widget">
                <div class="fw-header" onclick="window.toggleAnalyticsBody()">
                    <div class="fw-header-left">
                        <span>${S.ui.collapsedAnalytics ? '▶' : '▼'} Аналитика</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                        ${selectHtml}
                        <button class="eye-btn" onclick="window.toggleAnalyticsEye(event)">${isHideAn ? eyeClosedSvg : eyeOpenSvg}</button>
                    </div>
                </div>
                <div class="fw-body ${S.ui.collapsedAnalytics ? '' : 'expanded'}">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="analytic-item" onclick="window.openAnalyticsList('income')">
                            <div class="label">Доходы</div><div class="val pos">${hideV(m.inc)}</div>${getTrendHtml(m.inc, p.inc, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsList('expense')">
                            <div class="label">Расходы</div><div class="val neg">${hideV(m.exp)}</div>${getTrendHtml(m.exp, p.exp, false)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsSaved()">
                            <div class="label">Отложено</div><div class="val pos">${hideV(m.saved)}</div>${getTrendHtml(m.saved, p.saved, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsInfo()">
                            <div class="label">Норма сбережений</div><div class="val">${isHideAn ? '***' : m.rate.toFixed(0) + '%'}</div>${getTrendHtml(m.rate, p.rate, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsList('passive')">
                            <div class="label">Свободный поток</div><div class="val pos">${hideV(m.passive)}</div>${getTrendHtml(m.passive, p.passive, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openCapitalDetails()">
                            <div class="label">Чистый капитал</div><div class="val">${hideV(c.net)}</div>${getTrendHtml(c.net, prevCap, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        let debtsHtml = `
            <div class="fullwidth-widget" style="margin-bottom: 0;">
                <div class="fw-header" onclick="window.toggleDebtsBody()">
                    <div class="fw-header-left">
                        <span>${S.ui.collapsedDebts ? '▶' : '▼'} Долги</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="eye-btn" onclick="window.toggleDebtsEye(event)">${isHideDebt ? eyeClosedSvg : eyeOpenSvg}</button>
                    </div>
                </div>
                <div class="fw-body ${S.ui.collapsedDebts ? '' : 'expanded'}">
                    <div style="margin-bottom: 12px;">
                        <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:4px;">🟢 Мне должны (${isHideDebt?'***':fmt(totalOwed)})</div>
                        ${owedListHtml || '<div style="font-size:12px; color:var(--muted);">Нет</div>'}
                    </div>
                    <div>
                        <div style="font-size:13px; font-weight:700; color:var(--red); margin-bottom:4px;">🔴 Я должен (${isHideDebt?'***':fmt(totalOwe)})</div>
                        ${oweListHtml || '<div style="font-size:12px; color:var(--muted);">Нет</div>'}
                    </div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.id = 'custom-bottom-widgets';
        wrapper.innerHTML = analyticsHtml + debtsHtml;
        const existingWrapper = document.getElementById('custom-bottom-widgets');
        if (existingWrapper) existingWrapper.remove();
        pageHome.appendChild(wrapper);
    };
})();