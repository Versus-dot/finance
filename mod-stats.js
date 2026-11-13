// ==========================================
// МОДУЛЬ СТАТИСТИКИ (mod-stats.js) v5
// ==========================================
(function() {
    console.log("✅ Модуль Статистики (mod-stats.js) v5 загружен");

    window._statsPeriod = window._statsPeriod || 'month';
    window._statsStart = window._statsStart || null;
    window._statsEnd = window._statsEnd || null;
    
    if (!window._statsUI) {
        window._statsUI = {
            topBlock: false,
            chartBar: false,
            chartPassive: false,
            chartRate: false,
            chartCapital: false,
            snapshots: false,
            budgets: false
        };
    }

    let chartBarInstance = null;
    let chartPassiveInstance = null;
    let chartRateInstance = null;
    let chartCapitalInstance = null;

    // Функция генерации оттенков
    function hexToHsl(H) {
        let r = 0, g = 0, b = 0;
        if (H.length == 7) { r = parseInt(H.substring(1, 3), 16); g = parseInt(H.substring(3, 5), 16); b = parseInt(H.substring(5, 7), 16); }
        else if (H.length == 4) { r = parseInt("0" + H[1] + H[1], 16); g = parseInt("0" + H[2] + H[2], 16); b = parseInt("0" + H[3] + H[3], 16); }
        r /= 255; g /= 255; b /= 255;
        let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;
        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60); if (h < 0) h += 360;
        l = (cmax + cmin) / 2; s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        return { h, s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
    }
    
    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const toHex = x => { const hex = Math.round(x * 255).toString(16); return hex.length === 1 ? "0" + hex : hex; };
        return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
    }
    
    function generateShades(baseHex, count) {
        if (count <= 1) return [baseHex];
        const hsl = hexToHsl(baseHex);
        const shades = [baseHex];
        let step = 12; 
        for (let i = 1; i < count; i++) {
            let newL = hsl.l;
            let offset = Math.ceil(i / 2) * step * (i % 2 === 1 ? 1 : -1);
            newL = Math.max(25, Math.min(80, hsl.l + offset));
            shades.push(hslToHex(hsl.h, hsl.s, newL));
        }
        return shades;
    }

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

    function getStatsDates(period) {
        let start = new Date(), end = new Date();
        end.setHours(23,59,59,999);
        start.setHours(0,0,0,0);

        if (period === 'day') {
            end = new Date(start); end.setHours(23,59,59,999);
        } else if (period === 'week') {
            const day = start.getDay() || 7; 
            if (day !== 1) start.setHours(-24 * (day - 1));
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
        } else if (period === 'month') {
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'year') {
            start.setMonth(0, 1);
            end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (period === 'ytd') {
            start.setMonth(0, 1);
            end = new Date();
        } else if (period === 'custom' && window._statsStart && window._statsEnd) {
            start = new Date(window._statsStart); start.setHours(0,0,0,0);
            end = new Date(window._statsEnd); end.setHours(23,59,59,999);
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

    function getYearlyMonthlyData(year, type) {
        const data = new Array(12).fill(0);
        S.transactions.forEach(t => {
            if (t.ignoreInStats) return;
            const [y, m] = t.date.split('-');
            if (parseInt(y) === year) {
                const monthIdx = parseInt(m) - 1;
                if (type === 'income' && t.type === 'income') data[monthIdx] += t.amount;
                if (type === 'expense' && t.type === 'expense') data[monthIdx] += t.amount;
                if (type === 'passive' && t.type === 'income') {
                    const c = getCat(t.categoryId);
                    if (c && c.passive) data[monthIdx] += t.amount;
                }
            }
        });
        
        if (type === 'rate') {
            for(let i=0; i<12; i++) {
                let inc = 0, sav = 0, inv = 0;
                const monthStr = `${year}-${String(i+1).padStart(2, '0')}`;
                S.transactions.forEach(t => {
                    if (t.ignoreInStats || !t.date.startsWith(monthStr)) return;
                    if (t.type === 'income') inc += t.amount;
                    if (t.type === 'transfer') {
                        const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                        if (k === 'savings') sav += t.amount;
                        if (k === 'investment') inv += t.amount;
                    }
                });
                data[i] = inc > 0 ? Math.min(100, Math.round((sav + inv) / inc * 100)) : 0;
            }
        }
        
        return data;
    }

    window.renderStats = function() {
        const el = document.getElementById('page-stats');
        if (!el) return;

        const dates = getStatsDates(window._statsPeriod);
        const m = calcStatsData(dates.start, dates.end);

        const periodOpts = { day:'День', week:'Неделя', month:'Месяц', year:'Год', ytd:'С начала года', custom:'Период ⚙️' };
        let selectHtml = `<select onchange="window.setStatsPeriod(this.value)" onclick="event.stopPropagation()" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card); color: var(--text); border: 1px solid var(--border); outline: none; font-weight:600; cursor:pointer;">`;
        Object.keys(periodOpts).forEach(k => {
            selectHtml += `<option value="${k}" ${window._statsPeriod === k ? 'selected' : ''}>${periodOpts[k]}</option>`;
        });
        selectHtml += `</select>`;

        let snapHTML = '';
        if (S.snapshots && S.snapshots.length) {
            snapHTML = `<table style="width:100%;font-size:13px;text-align:left;border-collapse:collapse;">
                <tr style="border-bottom:1px solid var(--border)"><th>Дата</th><th>Капитал</th></tr>
                ${S.snapshots.slice(-6).reverse().map(s=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 0">${s.date}</td><td>${fmt(s.total)}</td></tr>`).join('')}
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
                        <div class="analytic-item"><div class="label">Доходы</div><div class="val pos">${fmt(m.inc)}</div></div>
                        <div class="analytic-item"><div class="label">Расходы</div><div class="val neg">${fmt(m.exp)}</div></div>
                        <div class="analytic-item"><div class="label">В накопления</div><div class="val pos">${fmt(m.sav)}</div></div>
                        <div class="analytic-item"><div class="label">В инвестиции</div><div class="val pos">${fmt(m.inv)}</div></div>
                        <div class="analytic-item"><div class="label">Свободный поток</div><div class="val pos">${fmt(m.passive)}</div></div>
                        <div class="analytic-item"><div class="label">Норма сбережений</div><div class="val">${m.rate.toFixed(0)}%</div></div>
                    </div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('chartBar')">
                    <div class="fw-header-left">
                        <span id="stats-icon-chartBar">${window._statsUI.chartBar ? '▶' : '▼'}</span> Доходы / Расходы
                    </div>
                </div>
                <div class="fw-body" id="stats-body-chartBar" style="display: ${window._statsUI.chartBar ? 'none' : 'block'}; padding-top:8px;">
                    <div class="chart-container" style="height:260px;"><canvas id="chartBarNew"></canvas></div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('chartPassive')">
                    <div class="fw-header-left">
                        <span id="stats-icon-chartPassive">${window._statsUI.chartPassive ? '▶' : '▼'}</span> Пассивный доход
                    </div>
                </div>
                <div class="fw-body" id="stats-body-chartPassive" style="display: ${window._statsUI.chartPassive ? 'none' : 'block'}; padding-top:8px;">
                    <div class="chart-container" style="height:260px;"><canvas id="chartPassiveNew"></canvas></div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('chartRate')">
                    <div class="fw-header-left">
                        <span id="stats-icon-chartRate">${window._statsUI.chartRate ? '▶' : '▼'}</span> Норма сбережений
                    </div>
                </div>
                <div class="fw-body" id="stats-body-chartRate" style="display: ${window._statsUI.chartRate ? 'none' : 'block'}; padding-top:8px;">
                    <div class="chart-container" style="height:260px;"><canvas id="chartRateNew"></canvas></div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('chartCapital')">
                    <div class="fw-header-left">
                        <span id="stats-icon-chartCapital">${window._statsUI.chartCapital ? '▶' : '▼'}</span> Динамика капитала
                    </div>
                </div>
                <div class="fw-body" id="stats-body-chartCapital" style="display: ${window._statsUI.chartCapital ? 'none' : 'block'}; padding-top:8px;">
                    <div class="chart-container"><canvas id="chartCapitalNew"></canvas></div>
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

        // Рисуем графики
        setTimeout(() => {
            const curYear = new Date().getFullYear();
            // Меняем порядок лет с 2026-2025-2024 на 2024-2025-2026
            const years = [curYear - 2, curYear - 1, curYear]; 
            const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

            const commonOptions = { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true, // Использовать стиль точек
                            pointStyle: 'rectRounded', // Квадратики со скругленными углами
                            boxWidth: 8, // Узкие
                            boxHeight: 8, // Низкие
                            padding: 15,
                            font: { size: 11 } 
                        } 
                    } 
                }, 
                scales: { 
                    y: { beginAtZero: true, ticks: { font: { size: 10 } } }, 
                    x: { ticks: { font: { size: 9 } }, grid: { display: false } } 
                },
                barPercentage: 0.9,
                categoryPercentage: 0.8
            };

            // 1. Доходы / Расходы
            if (chartBarInstance) chartBarInstance.destroy();
            if (document.getElementById('chartBarNew')) {
                // generateShades выдаст: [светлый, средний, темный]. 
                // Так как years = [2024, 2025, 2026], то 2024 будет светлым, а 2026 темным (базовым).
                const incColors = generateShades('#10B981', 3).reverse();
                const expColors = generateShades('#EF4444', 3).reverse();
                const datasets = [];
                
                years.forEach((y, i) => {
                    datasets.push({
                        label: `Доходы ${y}`,
                        data: getYearlyMonthlyData(y, 'income'),
                        backgroundColor: incColors[i],
                        maxBarThickness: 10,
                        borderRadius: 2
                    });
                });
                years.forEach((y, i) => {
                    datasets.push({
                        label: `Расходы ${y}`,
                        data: getYearlyMonthlyData(y, 'expense'),
                        backgroundColor: expColors[i],
                        maxBarThickness: 10,
                        borderRadius: 2
                    });
                });

                chartBarInstance = new Chart(document.getElementById('chartBarNew'), {
                    type: 'bar',
                    data: { labels, datasets },
                    options: commonOptions
                });
            }

            // 2. Пассивный доход
            if (chartPassiveInstance) chartPassiveInstance.destroy();
            if (document.getElementById('chartPassiveNew')) {
                const passiveColors = generateShades('#8B5CF6', 3).reverse();
                const datasets = years.map((y, i) => ({
                    label: `${y}`,
                    data: getYearlyMonthlyData(y, 'passive'),
                    backgroundColor: passiveColors[i],
                    maxBarThickness: 14,
                    borderRadius: 2
                }));

                chartPassiveInstance = new Chart(document.getElementById('chartPassiveNew'), {
                    type: 'bar',
                    data: { labels, datasets },
                    options: commonOptions
                });
            }

            // 3. Норма сбережений
            if (chartRateInstance) chartRateInstance.destroy();
            if (document.getElementById('chartRateNew')) {
                const rateColors = generateShades('#4d7fff', 3).reverse();
                const datasets = years.map((y, i) => ({
                    label: `${y}`,
                    data: getYearlyMonthlyData(y, 'rate'),
                    backgroundColor: rateColors[i],
                    maxBarThickness: 14,
                    borderRadius: 2
                }));

                chartRateInstance = new Chart(document.getElementById('chartRateNew'), {
                    type: 'bar',
                    data: { labels, datasets },
                    options: { 
                        ...commonOptions,
                        scales: { 
                            y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 }, callback: v => v + '%' } }, 
                            x: { ticks: { font: { size: 9 } }, grid: { display: false } } 
                        } 
                    }
                });
            }

            // 4. Динамика капитала
            if (chartCapitalInstance) chartCapitalInstance.destroy();
            if (document.getElementById('chartCapitalNew')) {
                const snapLabels = S.snapshots.map(s => s.date);
                const snapData = S.snapshots.map(s => s.total);
                chartCapitalInstance = new Chart(document.getElementById('chartCapitalNew'), {
                    type: 'line',
                    data: { labels: snapLabels, datasets: [{ label: 'Капитал', data: snapData, borderColor: '#4d7fff', backgroundColor: 'rgba(77,127,255,0.15)', fill: true, tension: 0.3 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } } }
                });
            }

            // 5. Пончик
            if (typeof window.renderDonutChart === 'function') {
                window.renderDonutChart();
            }
        }, 50);
    };
})();
