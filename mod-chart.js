// ==========================================
// МОДУЛЬ КРУГОВОЙ ДИАГРАММЫ КАПИТАЛА (mod-chart.js) v127
// ==========================================
(function() {
    console.log("✅ Модуль круговой диаграммы (mod-chart.js) загружен (v127)");

    let myChart = null;
    window._chartDrillDown = null; // Состояние для двухуровневой диаграммы

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
            sortedAccs.forEach((acc, idx) => {
                chartData.push({
                    label: acc.name,
                    value: acc._chartContribution,
                    color: cat.color, // Используем цвет родительской категории или генерируем оттенки
                    bankName: (S.banks.find(b => b.id === acc.bankId) || {}).name || 'Банк'
                });
            });
            // Разные оттенки для наглядности
            const colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#B45309', '#D97706', '#92400E'];
            chartData.forEach((d, i) => { d.color = colors[i % colors.length]; });
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
                            // Проваливаемся внутрь сектора
                            const category = chartData[index];
                            if (category.accounts && category.accounts.length > 0) {
                                window._chartDrillDown = category;
                                injectDonutChart();
                            } else {
                                // Если счетов нет (например, искусственный излишек), просто показываем модалку
                                openCategoryDetails(category);
                            }
                        } else {
                            // Если мы уже внутри, можно показать модалку детализации конкретного счета
                            openCategoryDetails(window._chartDrillDown);
                        }
                    }
                }
            },
            plugins: [centerTextPlugin, sectorLabelPlugin] 
        });
        
        // Передаем данные для плагина центрального текста
        myChart.config._centerText = { val: centerVal, label: centerLabel };
    }

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

        // Сначала обрабатываем кредитки (считаем переплаты и хеджи)
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

        // Теперь все остальные счета
        S.accounts.filter(a => a.type !== 'credit' && !a.archived).forEach(a => {
            if (S.settings.hedgingEnabled && a.hedgeFor && !a.inCushion) return; // Исключаем сами хеджи, мы уже учли их в излишках
            
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
