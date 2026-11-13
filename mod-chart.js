// ==========================================
// МОДУЛЬ КРУГОВОЙ ДИАГРАММЫ КАПИТАЛА (mod-chart.js) v128
// ==========================================
(function() {
    console.log("✅ Модуль круговой диаграммы (mod-chart.js) загружен (v128)");

    let myChart = null;
    window._chartDrillDown = null; // Состояние для двухуровневой диаграммы

    // --- ФУНКЦИИ ГЕНЕРАЦИИ ОТТЕНКОВ ЦВЕТА ---
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
        const shades = [baseHex]; // Первый цвет (самый большой сектор) - точный цвет категории
        let step = 12; 
        for (let i = 1; i < count; i++) {
            let newL = hsl.l;
            let offset = Math.ceil(i / 2) * step * (i % 2 === 1 ? 1 : -1);
            newL = Math.max(25, Math.min(80, hsl.l + offset)); // Ограничиваем яркость
            shades.push(hslToHex(hsl.h, hsl.s, newL));
        }
        return shades;
    }

    // --- ПЛАГИНЫ ДИАГРАММЫ ---
    const centerTextPlugin = {
        id: 'centerText',
        afterDatasetsDraw: (chart) => {
            const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
            ctx.save();
            const centerX = left + width / 2;
            const centerY = top + height / 2;

            const isPrivacyMode = (typeof S !== 'undefined' && S.ui && S.ui.globalHideBalances);
            const customData = chart.config._centerText || { val: 0, label: 'Чистый капитал' };
            
            const valStr = isPrivacyMode ? '*** ₽' : fmt(customData.val);

            ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(valStr, centerX, centerY - 8);

            ctx.font = '11px -apple-system, system-ui, sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';
            ctx.fillText(customData.label, centerX, centerY + 14);
            ctx.restore();
        }
    };

    const sectorLabelPlugin = {
        id: 'sectorLabels',
        afterDatasetsDraw: (chart) => {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);
            const data = chart.data.datasets[0].data;
            const total = data.reduce((a, b) => a + b, 0);
            if (total === 0) return;
            ctx.save();
            meta.data.forEach((arc, index) => {
                const value = data[index];
                const pct = (value / total) * 100;
                if (pct > 5) {
                    const midAngle = (arc.startAngle + arc.endAngle) / 2;
                    const midRadius = (arc.innerRadius + arc.outerRadius) / 2;
                    const centerX = arc.x + Math.cos(midAngle) * midRadius;
                    const centerY = arc.y + Math.sin(midAngle) * midRadius;
                    ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
                    ctx.fillStyle = '#ffffff'; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(Math.round(pct) + '%', centerX, centerY);
                }
            });
            ctx.restore();
        }
    };

    const prevRenderStats = window.renderStats;
    window.renderStats = function() {
        if (prevRenderStats) prevRenderStats();
        setTimeout(injectDonutChart, 100);
    };

    window.resetChartDrillDown = function() {
        window._chartDrillDown = null;
        injectDonutChart();
    };

    function injectDonutChart() {
        const statsPage = document.getElementById('page-stats');
        if (!statsPage) return;
        const oldContainer = document.getElementById('donutChartContainer');
        if (oldContainer) oldContainer.remove();

        const isDrillDown = window._chartDrillDown !== null;
        let chartData = [];
        let totalSum = 0;
        let centerVal = 0;
        let centerLabel = 'Чистый капитал';
        let headerTitle = 'Структура чистого капитала';

        if (isDrillDown) {
            const cat = window._chartDrillDown;
            headerTitle = `Структура: ${cat.label}`;
            centerVal = cat.value;
            centerLabel = cat.label;
            
            // Сортируем счета внутри категории по убыванию
            const sortedAccs = [...cat.accounts].sort((a, b) => b._chartContribution - a._chartContribution);
            const shades = generateShades(cat.color, sortedAccs.length); // Генерируем оттенки
            
            sortedAccs.forEach((acc, idx) => {
                chartData.push({
                    label: acc.name,
                    value: acc._chartContribution,
                    color: shades[idx],
                    bankName: (S.banks.find(b => b.id === acc.bankId) || {}).name || 'Банк'
                });
            });
            totalSum = chartData.reduce((sum, item) => sum + item.value, 0);
        } else {
            chartData = getChartData();
            totalSum = chartData.reduce((sum, item) => sum + item.value, 0);
            const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
            centerVal = c.net;
        }

        if (totalSum <= 0) return;

        const container = document.createElement('div');
        container.id = 'donutChartContainer';
        container.className = 'card';
        container.style.marginBottom = '16px';
        
        const backBtn = isDrillDown 
            ? `<button class="btn-secondary btn-small" style="margin-right:8px; padding:4px 8px; font-size:12px;" onclick="window.resetChartDrillDown()">⬅️ Назад</button>` 
            : '';

        container.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:12px;">
                ${backBtn}
                <div style="font-weight:700; font-size:16px;">${headerTitle}</div>
            </div>
            <div style="position:relative; height:220px; width:100%;">
                <canvas id="capitalDonutChart"></canvas>
            </div>
        `;
        statsPage.prepend(container);

        const ctx = document.getElementById('capitalDonutChart').getContext('2d');
        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(d => d.label),
                datasets: [{ data: chartData.map(d => d.value), backgroundColor: chartData.map(d => d.color), borderWidth: 0, hoverOffset: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%', 
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11 }, color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 37, 50, 1)', titleColor: '#ffffff', bodyColor: '#ffffff',
                        borderColor: '#4d7fff', borderWidth: 2, padding: 12, cornerRadius: 8, displayColors: true,
                        callbacks: {
                            label: function(context) {
                                if (typeof S !== 'undefined' && S.ui && S.ui.globalHideBalances) return ' *** ₽';
                                const val = context.raw;
                                const pct = ((val / totalSum) * 100).toFixed(1);
                                const prefix = context.label.includes('Долги') ? ' -' : ' ';
                                return `${prefix}${fmt(val)} (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        if (!isDrillDown) {
                            const category = chartData[index];
                            if (category.accounts && category.accounts.length > 0) {
                                window._chartDrillDown = category;
                                injectDonutChart();
                            } else {
                                openCategoryDetails(category);
                            }
                        } else {
                            openCategoryDetails(window._chartDrillDown);
                        }
                    }
                }
            },
            plugins: [centerTextPlugin, sectorLabelPlugin] 
        });
        
        myChart.config._centerText = { val: centerVal, label: centerLabel };
    }
    
    // ==========================================
    // КОНЕЦ ЧАСТИ 1. СДЕЛАЙ ENTER И ВСТАВЬ ЧАСТЬ 2.
    // ==========================================
    function getChartData() {
        const sectors = {
            cushion: { label: '🛡️ Подушка', value: 0, color: '#10B981', accounts: [] },
            pds: { label: '🏦 ПДС', value: 0, color: '#8B5CF6', accounts: [] },
            stocks: { label: '📈 Фондовый рынок', value: 0, color: '#4d7fff', accounts: [] },
            savings: { label: '💰 Накопления', value: 0, color: '#F59E0B', accounts: [] },
            crypto: { label: '🪙 Крипта', value: 0, color: '#FF9F43', accounts: [] },
            debts: { label: '🔴 Долги', value: 0, color: '#EF4444', accounts: [] }
        };

        const hedgesByCard = {};
        if (S.settings.hedgingEnabled) {
            S.accounts.filter(a => a.hedgeFor && !a.archived && !a.inCushion).forEach(h => {
                if (!hedgesByCard[h.hedgeFor]) hedgesByCard[h.hedgeFor] = 0;
                hedgesByCard[h.hedgeFor] += accValue(h);
            });
        }

        S.accounts.filter(a => a.type === 'credit' && !a.archived).forEach(a => {
            const limit = a.creditLimit || 0;
            const val = accValue(a);
            let debt = Math.max(0, limit - val);
            let overpay = Math.max(0, val - limit);
            
            if (overpay > 0) {
                sectors.savings.value += overpay;
                sectors.savings.accounts.push({ id: a.id + '_overpay', name: 'Переплата по карте ' + a.name, bankId: a.bankId, _chartContribution: overpay });
            }
            
            let hedgeTotal = 0;
            if (S.settings.hedgingEnabled && hedgesByCard[a.id]) {
                hedgeTotal = hedgesByCard[a.id];
            }
            
            const covered = Math.min(debt, hedgeTotal);
            const surplus = Math.max(0, hedgeTotal - debt);

            if (surplus > 0) {
                sectors.savings.value += surplus;
                sectors.savings.accounts.push({ id: a.id + '_surplus', name: 'Свободный остаток хеджа', bankId: a.bankId, _chartContribution: surplus });
            }
            
            const unhedgedDebt = Math.max(0, debt - covered);
            if (unhedgedDebt > 0) {
                sectors.debts.value += unhedgedDebt;
                sectors.debts.accounts.push({ ...a, _chartContribution: unhedgedDebt });
            }
        });

        S.accounts.filter(a => a.type !== 'credit' && !a.archived).forEach(a => {
            if (S.settings.hedgingEnabled && a.hedgeFor && !a.inCushion) return;
            
            const val = accValue(a);
            if (val <= 0) return;

            let target = null;
            if (a.inCushion) target = sectors.cushion;
            else if (a.type === 'pds') target = sectors.pds;
            else if (['brokerage', 'iis', 'invest_kopilka'].includes(a.type)) target = sectors.stocks;
            else if (['crypto_wallet', 'crypto_exchange'].includes(a.type)) target = sectors.crypto;
            else if (['deposit', 'savings', 'finu_wallet', 'debit', 'cash'].includes(a.type)) target = sectors.savings;
            
            if (target) {
                target.value += val;
                target.accounts.push({ ...a, _chartContribution: val });
            }
        });
        
        return Object.values(sectors).filter(s => s.value > 0);
    }

    function openCategoryDetails(category) {
        let listHtml = '';
        category.accounts.sort((a, b) => b._chartContribution - a._chartContribution).forEach(acc => {
            const val = acc._chartContribution;
            const bank = S.banks.find(b => b.id === acc.bankId);
            const bankName = bank ? bank.name : 'Банк';
            
            listHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                    <div>
                        <div style="font-weight:600; font-size:14px;">${esc(acc.name)}</div>
                        <div style="font-size:11px; color:var(--muted);">${esc(bankName)}</div>
                    </div>
                    <div style="font-weight:700; color:${category.label.includes('Долги') ? 'var(--red)' : 'inherit'};">${fmt(val)}</div>
                </div>
            `;
        });

        let extraBtnHtml = '';
        if (category.label.includes('Фондовый рынок')) {
            extraBtnHtml = `<button class="btn-secondary btn-block" style="margin-top: 12px;" onclick="window.openPortfolioBreakdown()">📊 Показать состав портфеля</button>`;
        }

        window.openModal(`
            <div class="modal-header">
                <h2>${category.label}</h2>
                <button class="btn-icon" onclick="closeModal()">✕</button>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: ${category.color}; margin-bottom: 16px;">
                ${fmt(category.value)}
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${listHtml}
            </div>
            ${extraBtnHtml}
            <button class="btn-secondary btn-block" style="margin-top: 12px;" onclick="closeModal()">Закрыть</button>
        `);
    }

    window.openPortfolioBreakdown = function() {
        let stocksSum = 0, bondsSum = 0, etfSum = 0, cashSum = 0;
        let hasBreakdown = false;

        S.accounts.filter(a => (a.type === 'brokerage' || a.type === 'iis') && !a.inCushion && !a.archived).forEach(a => {
            if (a.portfolioBreakdown) {
                hasBreakdown = true;
                stocksSum += a.portfolioBreakdown.stocks || 0;
                bondsSum += a.portfolioBreakdown.bonds || 0;
                etfSum += a.portfolioBreakdown.etf || 0;
                cashSum += a.portfolioBreakdown.cash || 0;
            }
        });

        if (!hasBreakdown) {
            window.openModal(`
                <div class="modal-header"><h2>Состав портфеля</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
                <div class="empty">Нет данных о составе портфеля. Синхронизируйте с Т-Инвестом.</div>
                <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
            `);
            return;
        }

        const total = stocksSum + bondsSum + etfSum + cashSum;

        function getRow(label, value, color) {
            if (value <= 0) return '';
            const pct = total > 0 ? (value / total * 100).toFixed(1) : 0;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:12px; height:12px; border-radius:50%; background:${color};"></div>
                        <span>${label}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:600;">${fmt(value)}</div>
                        <div style="font-size:11px; color:var(--muted);">${pct}%</div>
                    </div>
                </div>
            `;
        }

        let html = getRow('Акции', stocksSum, '#2ecc71') + 
                   getRow('Облигации', bondsSum, '#4d7fff') + 
                   getRow('Фонды (ETF)', etfSum, '#f5b945') + 
                   getRow('Денежные средства', cashSum, '#8a94a6');

        window.openModal(`
            <div class="modal-header"><h2>Состав портфеля</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div style="font-size: 20px; font-weight: 800; color: var(--accent); margin-bottom: 16px;">${fmt(total)}</div>
            <div style="max-height: 300px; overflow-y: auto;">${html}</div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal()">Понятно</button>
        `);
    };

    document.addEventListener('click', (e) => {
        if (e.target.closest('#globalPrivacyBtn')) {
            setTimeout(() => { if (myChart) myChart.update(); }, 100);
        }
    });

})();