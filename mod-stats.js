// ==========================================
// МОДУЛЬ СТАТИСТИКИ (mod-stats.js) v11
// ==========================================
(function() {
    console.log("✅ Модуль Статистики (mod-stats.js) v11 загружен");

    window._statsPeriod = window._statsPeriod || 'month';
    window._statsStart = window._statsStart || null;
    window._statsEnd = window._statsEnd || null;
    window._statsTableGroup = window._statsTableGroup || 'month';
    window._statsTablePeriod = window._statsTablePeriod || '1y';
    window._statsSelectedRows = window._statsSelectedRows || [];
    
    if (!window._statsUI) {
        window._statsUI = {
            topBlock: false,
            reportWidget: false,
            snapshots: false,
            budgets: false
        };
    }

    let reportChartInstance = null;

    const COLORS = {
        income: '#10B981',
        active: '#34D399',
        passive: '#8B5CF6',
        expense: '#EF4444',
        saved: '#F59E0B',
        invest: '#4d7fff',
        fcf: '#00d2d3',
        rate: '#FBBF24',
        capital: '#6366F1',
        cushion: '#059669',
        pds: '#7C3AED',
        stocks: '#2563EB',
        savings: '#D97706',
        debt: '#DC2626'
    };

    const formatPercent = (val) => {
        let absVal = Math.abs(val);
        let str = absVal.toFixed(2);
        str = parseFloat(str).toString();
        return str + '%';
    };

    window.deleteSnapshot = function(date) {
        if (!confirm(`Удалить снимок за ${date}?\nОн будет пересчитан автоматически.`)) return;
        S.snapshots = S.snapshots.filter(s => s.date !== date);
        if (typeof save === 'function') save();
        
        if (date === today()) {
            setTimeout(() => {
                const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
                S.snapshots.push({ 
                    date: today(), 
                    total: c.net,
                    breakdown: {
                        cushion: c.cushion,
                        pds: c.pds,
                        stocks: c.investments,
                        savings: c.savings,
                        crypto: c.crypto,
                        debt: c.debt
                    }
                });
                if (typeof save === 'function') save();
                if (typeof window.renderStats === 'function') window.renderStats();
                toast('Снимок пересчитан');
            }, 100);
        } else {
            window.renderStats();
            toast('Снимок удален');
        }
    };

    window.toggleStatsBlock = function(blockId) {
        window._statsUI[blockId] = !window._statsUI[blockId];
        const body = document.getElementById(`stats-body-${blockId}`);
        const icon = document.getElementById(`stats-icon-${blockId}`);
        if (body) body.style.display = window._statsUI[blockId] ? 'none' : 'block';
        if (icon) icon.textContent = window._statsUI[blockId] ? '▶' : '▼';
    };

    window.setStatsPeriod = function(val) {
        window._statsPeriod = val;
        if (val === 'custom') window.openStatsCustomPeriod();
        else window.renderStats();
    };

    window.openStatsCustomPeriod = function() {
        const s = window._statsStart || today();
        const e = window._statsEnd || today();
        openModal(`
            <div class="modal-header"><h2>Свой период</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="form-row">
                <div class="form-group"><label>С даты</label><input type="date" id="stStart" value="${s}"></div>
                <div class="form-group"><label>По дату</label><input type="date" id="stEnd" value="${e}"></div>
            </div>
            <button class="btn-primary btn-block" onclick="window.applyStatsCustomPeriod()">Применить</button>
        `);
    };

    window.applyStatsCustomPeriod = function() {
        window._statsStart = document.getElementById('stStart').value;
        window._statsEnd = document.getElementById('stEnd').value;
        closeModal();
        window.renderStats();
    };

    window.changeTableFilter = function(key, val) {
        if (key === 'group') window._statsTableGroup = val;
        if (key === 'period') window._statsTablePeriod = val;
        window.renderStats();
    };

    window.toggleTableRow = function(key) {
        const idx = window._statsSelectedRows.indexOf(key);
        if (idx > -1) window._statsSelectedRows.splice(idx, 1);
        else window._statsSelectedRows.push(key);
        window.renderStats();
    };

    window.resetReportChart = function() {
        window._statsSelectedRows = [];
        window.renderStats();
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
        } else if (period === 'custom' && window._statsStart && window._statsEnd) {
            start = new Date(window._statsStart); start.setHours(0,0,0,0);
            end = new Date(window._statsEnd); end.setHours(23,59,59,999);
            if (isPrev) {
                const diff = end - start;
                end = new Date(start.getTime() - 1);
                start = new Date(end.getTime() - diff);
            }
        }
        return { start, end };
    }

    function calcStatsData(start, end) {
        let inc = 0, exp = 0, sav = 0, inv = 0, passive = 0;
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
                if (k === 'savings') sav += t.amount;
                if (k === 'investment') inv += t.amount;
            }
        });
        return { inc, exp, sav, inv, passive, rate: inc > 0 ? ((sav + inv) / inc * 100) : 0 };
    }

    function getTrendHtml(current, previous, isGoodWhenUp) {
        if (previous === 0 && current === 0) return `<div class="trend neutral">— 0%</div>`;
        if (previous === 0 && current > 0) return `<div class="trend ${isGoodWhenUp ? 'up-good' : 'up-bad'}">↑ Новое</div>`;
        const delta = ((current - previous) / previous) * 100;
        const isUp = delta > 0;
        
        if (Math.abs(delta) < 0.01) return `<div class="trend neutral">— 0%</div>`;
        let colorClass = (isUp && isGoodWhenUp) ? 'up-good' : (!isUp && !isGoodWhenUp) ? 'down-good' : (isUp && !isGoodWhenUp) ? 'up-bad' : 'down-bad';
        return `<div class="trend ${colorClass}">${isUp ? '↑' : '↓'} ${formatPercent(delta)}</div>`;
    }

    function generateTablePeriods() {
        const periods = [];
        const now = new Date();
        
        if (window._statsTablePeriod === '1y') {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                periods.push({ y: d.getFullYear(), m: d.getMonth(), dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
            }
        } else if (window._statsTablePeriod === '5y') {
            for (let i = 59; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                periods.push({ y: d.getFullYear(), m: d.getMonth(), dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
            }
        } else if (window._statsTablePeriod === 'ytd') {
            const start = new Date(now.getFullYear(), 0, 1);
            let cur = new Date(start);
            while (cur <= now) {
                periods.push({ y: cur.getFullYear(), m: cur.getMonth(), dateStr: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}` });
                cur.setMonth(cur.getMonth() + 1);
            }
        } else { // 'all'
            const txs = [...S.transactions].sort((a,b) => a.date.localeCompare(b.date));
            if (txs.length > 0) {
                const firstDate = new Date(txs[0].date);
                let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
                while (cur <= now) {
                    periods.push({ y: cur.getFullYear(), m: cur.getMonth(), dateStr: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}` });
                    cur.setMonth(cur.getMonth() + 1);
                }
            } else {
                periods.push({ y: now.getFullYear(), m: now.getMonth(), dateStr: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` });
            }
        }

        if (window._statsTableGroup === 'month') {
            return periods.map(p => ({
                ...p, 
                label: new Date(p.y, p.m).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }).replace('.', '')
            }));
        } else if (window._statsTableGroup === 'quarter') {
            const qMap = {};
            periods.forEach(p => {
                const q = Math.floor(p.m / 3) + 1;
                const key = `${p.y}-Q${q}`;
                if (!qMap[key]) qMap[key] = { y: p.y, q: q, label: `${p.y} Q${q}`, months: [] };
                qMap[key].months.push(p.dateStr);
            });
            return Object.values(qMap);
        } else { // year
            const yMap = {};
            periods.forEach(p => {
                const key = `${p.y}`;
                if (!yMap[key]) yMap[key] = { y: p.y, label: `${p.y}`, months: [] };
                yMap[key].months.push(p.dateStr);
            });
            return Object.values(yMap);
        }
    }

    function calcTableRow(row, monthsArray) {
        let total = 0;
        const isDateMatch = (d) => monthsArray.some(m => d.startsWith(m));

        if (['income', 'active', 'passive', 'expense', 'saved', 'invest'].includes(row)) {
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (row === 'income' && t.type === 'income') total += t.amount;
                if (row === 'expense' && t.type === 'expense') total += t.amount;
                if (row === 'active' && t.type === 'income') { const c = getCat(t.categoryId); if (!c || !c.passive) total += t.amount; }
                if (row === 'passive' && t.type === 'income') { const c = getCat(t.categoryId); if (c && c.passive) total += t.amount; }
                if (row === 'saved' && t.type === 'transfer') { const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId); if (k === 'savings') total += t.amount; }
                if (row === 'invest' && t.type === 'transfer') { const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId); if (k === 'investment') total += t.amount; }
            });
        } else if (row === 'fcf') {
            let inc = 0, exp = 0;
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income') inc += t.amount;
                if (t.type === 'expense') exp += t.amount;
            });
            total = inc - exp;
        } else if (row === 'rate') {
            let inc = 0, sav = 0, inv = 0;
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income') inc += t.amount;
                if (t.type === 'transfer') {
                    const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                    if (k === 'savings') sav += t.amount;
                    if (k === 'investment') inv += t.amount;
                }
            });
            total = inc > 0 ? ((sav + inv) / inc * 100) : 0;
        } else if (['capital', 'cushion', 'pds', 'stocks', 'savings', 'debt'].includes(row)) {
            const currentMonthStr = today().slice(0, 7);
            
            if (monthsArray.includes(currentMonthStr)) {
                const c = window.getCustomCapital ? window.getCustomCapital() : null;
                if (c) {
                    if (row === 'capital') total = c.net;
                    if (row === 'cushion') total = c.cushion;
                    if (row === 'pds') total = c.pds;
                    if (row === 'stocks') total = c.investments;
                    if (row === 'savings') total = c.savings;
                    if (row === 'debt') total = c.debt;
                }
            } else {
                const snaps = S.snapshots.filter(s => isDateMatch(s.date));
                if (snaps.length > 0) {
                    const latest = snaps[snaps.length - 1];
                    if (row === 'capital') total = latest.total;
                    else if (latest.breakdown) {
                        if (row === 'cushion') total = latest.breakdown.cushion || 0;
                        if (row === 'pds') total = latest.breakdown.pds || 0;
                        if (row === 'stocks') total = latest.breakdown.stocks || 0;
                        if (row === 'savings') total = latest.breakdown.savings || 0;
                        if (row === 'debt') total = latest.breakdown.debt || 0;
                    }
                }
            }
        }
        return total;
    }

    window.renderStats = function() {
        const el = document.getElementById('page-stats');
        if (!el) return;

        const dates = getPeriodDates(window._statsPeriod, false);
        const datesPrev = getPeriodDates(window._statsPeriod, true);
        const m = calcStatsData(dates.start, dates.end);
        const p = calcStatsData(datesPrev.start, datesPrev.end);

        const periodOpts = { day:'День', week:'Неделя', month:'Месяц', year:'Год', ytd:'С начала года', custom:'Период ⚙️' };
        let selectHtml = `<select onchange="window.setStatsPeriod(this.value)" onclick="event.stopPropagation()" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card); color: var(--text); border: 1px solid var(--border); outline: none; font-weight:600; cursor:pointer;">`;
        Object.keys(periodOpts).forEach(k => {
            selectHtml += `<option value="${k}" ${window._statsPeriod === k ? 'selected' : ''}>${periodOpts[k]}</option>`;
        });
        selectHtml += `</select>`;

        let snapHTML = '';
        if (S.snapshots && S.snapshots.length) {
            const currentMonthStr = today().slice(0, 7);
            snapHTML = `<table style="width:100%;font-size:13px;text-align:left;border-collapse:collapse;">
                <tr style="border-bottom:1px solid var(--border)"><th>Дата</th><th>Капитал</th><th style="width:40px; text-align:center;">Действие</th></tr>
                ${S.snapshots.slice(-6).reverse().map(s=>{
                    const isCurrentMonth = s.date.startsWith(currentMonthStr);
                    const actionHtml = isCurrentMonth 
                        ? `<button class="btn-icon" style="color:var(--red); padding:2px;" onclick="window.deleteSnapshot('${s.date}')" title="Удалить снимок">🗑</button>`
                        : `<span style="color:var(--muted); padding:2px; cursor:not-allowed;" title="Архивный снимок защищен">🔒</span>`;
                    return `<tr style="border-bottom:1px solid var(--border)">
                        <td style="padding:6px 0">${s.date}</td>
                        <td>${fmt(s.total)}</td>
                        <td style="text-align:center;">${actionHtml}</td>
                    </tr>`;
                }).join('')}
            </table>`;
        } else {
            snapHTML = '<div class="empty">Нет снимков</div>';
        }

        let budgetHTML = '';
        if (!S.budgets.length) {
            budgetHTML = '<div class="empty" style="padding:14px">Нет бюджетов</div>';
        } else {
            S.budgets.forEach(b => {
                const cat = getCat(b.categoryId);
                if (!cat) return;
                const spent = S.transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(thisMonth())).reduce((s,t) => s + t.amount, 0);
                const pct = b.limit > 0 ? Math.min(100, spent / b.limit * 100) : 0;
                const cls = pct > 100 ? 'red' : pct > 80 ? 'yellow' : 'green';
                budgetHTML += `<div style="padding:10px 0; border-bottom:1px solid var(--border)">
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                        <strong>${esc(cat.name)}</strong>
                        <div><span>${fmt(spent)} / ${fmt(b.limit)}</span> <button class="btn-icon" onclick="openBudgetModal('${b.categoryId}')">✏️</button></div>
                    </div>
                    <div class="progress"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div>
                </div>`;
            });
        }

        const periods = generateTablePeriods();
        
        let tableHtml = `<div style="overflow-x:auto; white-space:nowrap; border-radius:12px; border:1px solid var(--border); max-width: 100%;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:right;">
                <thead>
                    <tr style="background:var(--card2); border-bottom:1px solid var(--border);">
                        <th style="position:sticky; left:0; background:var(--card2); z-index:2; padding:10px; text-align:left; font-weight:700; min-width:140px;">Параметр</th>`;
        periods.forEach(p => {
            tableHtml += `<th style="padding:10px; font-weight:600;">${p.label}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;

        const rows = [
            { key: 'income', label: 'Доходы', indent: 0, color: COLORS.income, bold: true },
            { key: 'active', label: 'Активный', indent: 1, color: COLORS.active },
            { key: 'passive', label: 'Пассивный', indent: 1, color: COLORS.passive },
            { key: 'expense', label: 'Расходы', indent: 0, color: COLORS.expense, bold: true },
            { key: 'saved', label: 'Отложено', indent: 0, color: COLORS.saved },
            { key: 'invest', label: 'Инвестиции', indent: 0, color: COLORS.invest },
            { key: 'fcf', label: 'Свободный поток', indent: 0, color: COLORS.fcf, bold: true },
            { key: 'rate', label: 'Норма сбережений', indent: 0, color: COLORS.rate, suffix: '%' },
            { key: 'capital', label: 'Капитал', indent: 0, color: COLORS.capital, bold: true, isHeader: true },
            { key: 'cushion', label: 'Подушка', indent: 1, color: COLORS.cushion },
            { key: 'pds', label: 'ПДС', indent: 1, color: COLORS.pds },
            { key: 'stocks', label: 'Фондовый рынок', indent: 1, color: COLORS.stocks },
            { key: 'savings', label: 'Накопления', indent: 1, color: COLORS.savings },
            { key: 'debt', label: 'Долги', indent: 1, color: COLORS.debt }
        ];

        rows.forEach((row, i) => {
            const isSelected = window._statsSelectedRows.includes(row.key);
            const bg = isSelected ? 'rgba(255,255,255,0.05)' : (i % 2 === 0 ? 'var(--card)' : 'var(--card2)');
            const activeBar = isSelected ? `<div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:${row.color};"></div>` : '';
            
            tableHtml += `<tr style="background:${bg}; border-bottom:1px solid var(--border); transition: background 0.2s; position:relative;">
                <td onclick="window.toggleTableRow('${row.key}')" 
                    style="position:sticky; left:0; background:${bg}; z-index:1; padding:10px 10px 10px ${10 + row.indent * 15}px; text-align:left; font-weight:${row.bold ? '700' : '400'}; color:${row.color || 'inherit'}; cursor:pointer; user-select:none; border-right:1px solid var(--border); ${isSelected ? 'box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);' : ''}">
                    ${activeBar}
                    ${row.label}
                </td>`;
            
            periods.forEach(p => {
                const monthsArr = p.months ? p.months : [p.dateStr];
                let val = calcTableRow(row.key, monthsArr);
                let display = val === 0 ? '-' : (row.suffix ? formatPercent(val) : fmt(val));
                if (row.key === 'capital' && val === 0) display = '-';
                tableHtml += `<td style="padding:10px;">${display}</td>`;
            });
            tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;

        el.innerHTML = `
            <div id="donutChartContainer" class="card" style="margin-bottom:16px;"></div>
            
            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('topBlock')">
                    <div class="fw-header-left">
                        <span id="stats-icon-topBlock">${window._statsUI.topBlock ? '▶' : '▼'}</span> Итог за период
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                        ${selectHtml}
                    </div>
                </div>
                <div class="fw-body" id="stats-body-topBlock" style="display: ${window._statsUI.topBlock ? 'none' : 'block'};">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="analytic-item">
                            <div class="label">Доходы</div><div class="val pos">${fmt(m.inc)}</div>${getTrendHtml(m.inc, p.inc, true)}
                        </div>
                        <div class="analytic-item">
                            <div class="label">Расходы</div><div class="val neg">${fmt(m.exp)}</div>${getTrendHtml(m.exp, p.exp, false)}
                        </div>
                        <div class="analytic-item">
                            <div class="label">В накопления</div><div class="val pos">${fmt(m.sav)}</div>${getTrendHtml(m.sav, p.sav, true)}
                        </div>
                        <div class="analytic-item">
                            <div class="label">В инвестиции</div><div class="val pos">${fmt(m.inv)}</div>${getTrendHtml(m.inv, p.inv, true)}
                        </div>
                        <div class="analytic-item">
                            <div class="label">Свободный поток</div><div class="val pos">${fmt(m.passive)}</div>${getTrendHtml(m.passive, p.passive, true)}
                        </div>
                        <div class="analytic-item">
                            <div class="label">Норма сбережений</div><div class="val">${formatPercent(m.rate)}</div>${getTrendHtml(m.rate, p.rate, true)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('reportWidget')">
                    <div class="fw-header-left">
                        <span id="stats-icon-reportWidget">${window._statsUI.reportWidget ? '▶' : '▼'}</span> Конструктор отчётов
                    </div>
                    <button class="btn-small btn-secondary" onclick="event.stopPropagation(); window.resetReportChart()">Сбросить всё</button>
                </div>
                <div class="fw-body" id="stats-body-reportWidget" style="display: ${window._statsUI.reportWidget ? 'none' : 'block'}; padding-top:0;">
                    <div style="padding: 12px 0;">
                        <div style="position:relative; height:300px; width:100%;">
                            <canvas id="reportDynamicChart"></canvas>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom:12px; overflow-x:auto; padding-bottom:4px;">
                        <select onchange="window.changeTableFilter('group', this.value)" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card2); color: var(--text); border: 1px solid var(--border); outline:none; font-weight:600;">
                            <option value="month" ${window._statsTableGroup==='month'?'selected':''}>По месяцам</option>
                            <option value="quarter" ${window._statsTableGroup==='quarter'?'selected':''}>По кварталам</option>
                            <option value="year" ${window._statsTableGroup==='year'?'selected':''}>По годам</option>
                        </select>
                        <select onchange="window.changeTableFilter('period', this.value)" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card2); color: var(--text); border: 1px solid var(--border); outline:none; font-weight:600;">
                            <option value="all" ${window._statsTablePeriod==='all'?'selected':''}>Весь период</option>
                            <option value="1y" ${window._statsTablePeriod==='1y'?'selected':''}>За 1 год</option>
                            <option value="5y" ${window._statsTablePeriod==='5y'?'selected':''}>За 5 лет</option>
                            <option value="ytd" ${window._statsTablePeriod==='ytd'?'selected':''}>С начала года</option>
                        </select>
                    </div>
                    <div style="font-size: 11px; color: var(--muted); margin-bottom: 8px;">💡 Нажмите на параметр в таблице, чтобы отобразить его на графике.</div>
                    ${tableHtml}
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('snapshots')">
                    <div class="fw-header-left">
                        <span id="stats-icon-snapshots">${window._statsUI.snapshots ? '▶' : '▼'}</span> Отчёт (снимки)
                    </div>
                </div>
                <div class="fw-body" id="stats-body-snapshots" style="display: ${window._statsUI.snapshots ? 'none' : 'block'};">
                    ${snapHTML}
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('budgets')">
                    <div class="fw-header-left">
                        <span id="stats-icon-budgets">${window._statsUI.budgets ? '▶' : '▼'}</span> Бюджеты
                    </div>
                    <button class="btn-small btn-secondary" onclick="event.stopPropagation(); openBudgetModal()">+</button>
                </div>
                <div class="fw-body" id="stats-body-budgets" style="display: ${window._statsUI.budgets ? 'none' : 'block'};">
                    ${budgetHTML}
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof window.renderDonutChart === 'function') {
                window.renderDonutChart();
            }
            renderReportChart();
        }, 50);
    };

    function renderReportChart() {
        const canvas = document.getElementById('reportDynamicChart');
        if (!canvas) return;
        
        if (reportChartInstance) reportChartInstance.destroy();

        if (window._statsSelectedRows.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const periods = generateTablePeriods();
        const labels = periods.map(p => p.label);
        
        const datasets = [];
        let hasRub = false;
        let hasPct = false;

        window._statsSelectedRows.forEach((key, idx) => {
            const rowDef = [
                { key: 'income', label: 'Доходы', type: 'bar' },
                { key: 'active', label: 'Активный', type: 'bar' },
                { key: 'passive', label: 'Пассивный', type: 'bar' },
                { key: 'expense', label: 'Расходы', type: 'bar' },
                { key: 'saved', label: 'Отложено', type: 'bar' },
                { key: 'invest', label: 'Инвестиции', type: 'bar' },
                { key: 'fcf', label: 'Свободный поток', type: 'bar' },
                { key: 'rate', label: 'Норма сбережений', type: 'line', isPct: true },
                { key: 'capital', label: 'Капитал', type: 'line' },
                { key: 'cushion', label: 'Подушка', type: 'bar' },
                { key: 'pds', label: 'ПДС', type: 'bar' },
                { key: 'stocks', label: 'Фондовый рынок', type: 'bar' },
                { key: 'savings', label: 'Накопления', type: 'bar' },
                { key: 'debt', label: 'Долги', type: 'bar' }
            ].find(r => r.key === key);

            if (!rowDef) return;
            if (rowDef.isPct) hasPct = true; else hasRub = true;

            const data = periods.map(p => {
                const monthsArr = p.months ? p.months : [p.dateStr];
                return calcTableRow(key, monthsArr);
            });

            const color = COLORS[key];
            datasets.push({
                type: rowDef.type,
                label: rowDef.label,
                data: data,
                backgroundColor: rowDef.type === 'bar' ? color : color + '33',
                borderColor: color,
                borderWidth: rowDef.type === 'line' ? 2 : 0,
                fill: rowDef.type === 'line',
                tension: 0.3,
                yAxisID: rowDef.isPct ? 'y1' : 'y',
                maxBarThickness: 30
            });
        });

        reportChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: {size: 11} } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const val = ctx.parsed.y;
                                if (ctx.dataset.yAxisID === 'y1') return ctx.dataset.label + ': ' + formatPercent(val);
                                return ctx.dataset.label + ': ' + fmt(val);
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: {size: 10} } },
                    y: { 
                        type: 'linear', display: hasRub, position: 'left',
                        beginAtZero: true, ticks: { font: {size: 10} }
                    },
                    y1: { 
                        type: 'linear', display: hasPct, position: 'right',
                        beginAtZero: true, max: 100, grid: { drawOnChartArea: false },
                        ticks: { font: {size: 10}, callback: function(v) { return v + '%'; } }
                    }
                }
            }
        });
    }
})();
