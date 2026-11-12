// ==========================================
// МОДУЛЬ КРУГОВОЙ ДИАГРАММЫ КАПИТАЛА (mod-chart.js) v123
// ==========================================
(function() {
    console.log("✅ Модуль круговой диаграммы (mod-chart.js) загружен (v123)");

    let myChart = null;

    const centerTextPlugin = {
        id: 'centerText',
        afterDatasetsDraw: (chart) => {
            const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
            ctx.save();
            const centerX = left + width / 2;
            const centerY = top + height / 2;

            // Берем данные из нашей новой функции
            const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
            const isPrivacyMode = (typeof S !== 'undefined' && S.ui && S.ui.globalHideBalances);
            
            const valStr = isPrivacyMode ? '*** ₽' : fmt(c.net);

            ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(valStr, centerX, centerY - 8);

            ctx.font = '11px -apple-system, system-ui, sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';
            ctx.fillText('Капитал (без долгов)', centerX, centerY + 14);
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

    function injectDonutChart() {
        const statsPage = document.getElementById('page-stats');
        if (!statsPage) return;
        const oldContainer = document.getElementById('donutChartContainer');
        if (oldContainer) oldContainer.remove();

        const chartData = getChartData();
        const totalSum = chartData.reduce((sum, item) => sum + item.value, 0);
        if (totalSum <= 0) return;

        const container = document.createElement('div');
        container.id = 'donutChartContainer';
        container.className = 'card';
        container.style.marginBottom = '16px';
        container.innerHTML = `
            <div style="font-weight:700; margin-bottom:12px; font-size:16px;">Структура капитала</div>
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
                                return ` ${fmt(val)} (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const category = chartData[index];
                        openCategoryDetails(category);
                    }
                }
            },
            plugins: [centerTextPlugin, sectorLabelPlugin] 
        });
    }

    function getChartData() {
        const sectors = {
            cushion: { label: '🛡️ Подушка', value: 0, color: '#10B981', accounts: [] },
            pds: { label: '🏦 ПДС', value: 0, color: '#8B5CF6', accounts: [] },
            stocks: { label: '📈 Фондовый рынок', value: 0, color: '#4d7fff', accounts: [] },
            savings: { label: '🏦 Вклады', value: 0, color: '#F59E0B', accounts: [] },
            crypto: { label: '🪙 Крипта', value: 0, color: '#FF9F43', accounts: [] },
            cash: { label: '💵 Наличные', value: 0, color: '#64748B', accounts: [] }
        };

        S.accounts.forEach(a => {
            if (a.archived || a.hedgeFor) return;
            const val = accValue(a);
            let contribution = val;
            if (a.type === 'credit') {
                const limit = a.creditLimit || 0;
                contribution = Math.max(0, val - limit);
            }
            if (contribution > 0) {
                let target = null;
                if (a.inCushion) target = sectors.cushion;
                else if (a.type === 'pds') target = sectors.pds;
                else if (['brokerage', 'iis', 'invest_kopilka'].includes(a.type)) target = sectors.stocks;
                else if (['crypto_wallet', 'crypto_exchange'].includes(a.type)) target = sectors.crypto;
                else if (['deposit', 'savings', 'finu_wallet'].includes(a.type)) target = sectors.savings;
                else if (['debit', 'cash', 'credit'].includes(a.type)) target = sectors.cash;
                if (target) {
                    target.value += contribution;
                    target.accounts.push({ ...a, _chartContribution: contribution });
                }
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
                    <div style="font-weight:700;">${fmt(val)}</div>
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
