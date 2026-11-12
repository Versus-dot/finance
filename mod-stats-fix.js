// ==========================================
// ФИКС СТАТИСТИКИ (mod-stats-fix.js) v2
// ==========================================
(function() {
    console.log("✅ Фикс Статистики (mod-stats-fix.js) v2 загружен");

    const OriginalChart = window.Chart;
    if (!OriginalChart) return;

    // Перехватываем создание графиков
    window.Chart = new Proxy(OriginalChart, {
        construct(target, args) {
            let [ctx, config] = args;
            
            if (config.type === 'doughnut' && config.data && config.data.labels) {
                const labelsStr = config.data.labels.join(',');
                // Если это график капитала
                if (labelsStr.includes('Фондовый рынок') || labelsStr.includes('ПДС') || labelsStr.includes('Свободные средства')) {
                    const c = window.getCustomCapital ? window.getCustomCapital() : null;
                    if (c) {
                        const newLabels = [];
                        const newData = [];
                        const newColors = [];

                        // Формируем правильные данные
                        if (c.cushion > 0) { newLabels.push('Подушка'); newData.push(c.cushion); newColors.push('#10B981'); }
                        if (c.pds > 0) { newLabels.push('ПДС'); newData.push(c.pds); newColors.push('#8B5CF6'); }
                        if (c.investments > 0) { newLabels.push('Фондовый рынок'); newData.push(c.investments); newColors.push('#4d7fff'); }
                        if (c.deposits > 0) { newLabels.push('Вклады'); newData.push(c.deposits); newColors.push('#F59E0B'); }
                        if (c.cash > 0) { newLabels.push('Наличные'); newData.push(c.cash); newColors.push('#64748B'); }
                        if (c.crypto > 0) { newLabels.push('Крипта'); newData.push(c.crypto); newColors.push('#FF9F43'); }

                        config.data.labels = newLabels;
                        config.data.datasets[0].data = newData;
                        config.data.datasets[0].backgroundColor = newColors;
                        config.data.datasets[0].borderWidth = 0;

                        // Включаем стандартную легенду Chart.js (и скрываем кастомную из mod-chart.js)
                        config.options = config.options || {};
                        config.options.plugins = config.options.plugins || {};
                        config.options.plugins.legend = {
                            display: true,
                            position: 'right',
                            labels: {
                                color: getComputedStyle(document.body).getPropertyValue('--text') || '#fff',
                                usePointStyle: true,
                                boxWidth: 8,
                                padding: 15,
                                font: { family: 'inherit', size: 12 }
                            }
                        };

                        // Свой обработчик кликов (по названию сектора, а не по индексу)
                        config.options.onClick = (evt, elements, chart) => {
                            const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                            if (points.length) {
                                const idx = points[0].index;
                                const label = chart.data.labels[idx];
                                window.handleCapitalChartClick(label);
                            }
                        };
                        
                        // Скрываем старую HTML-легенду
                        setTimeout(() => {
                            const canvas = ctx.canvas || ctx;
                            if (canvas && canvas.parentNode) {
                                Array.from(canvas.parentNode.children).forEach(child => {
                                    if (child.tagName === 'DIV' && child !== canvas && (child.textContent.includes('Фондовый рынок') || child.textContent.includes('ПДС')) && !child.id.includes('Overlay')) {
                                        child.style.display = 'none';
                                    }
                                });
                            }
                        }, 100);
                    }
                }
            }
            return new target(...args);
        }
    });

    // Обработчик кликов
    window.handleCapitalChartClick = function(label) {
        if (label === 'ПДС') {
            const accs = S.accounts.filter(a => a.type === 'pds' && !a.archived);
            let html = `<div class="modal-header"><h2>ПДС</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div style="max-height: 60vh; overflow-y: auto;">`;
            if (accs.length === 0) html += `<div class="empty">Нет счетов ПДС</div>`;
            else accs.forEach(a => html += `<div class="modal-list-item"><div><div style="font-weight:600;">${esc(a.name)}</div><div style="font-size:12px; color:var(--muted);">${esc(getBank(a.bankId)?.name||'')}</div></div><div style="font-weight:700;">${fmt(accValue(a))}</div></div>`);
            html += `</div>`;
            openModal(html);
        } else if (label === 'Фондовый рынок') {
            const accs = S.accounts.filter(a => ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived);
            let html = `<div class="modal-header"><h2>Фондовый рынок</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div style="max-height: 60vh; overflow-y: auto;">`;
            if (accs.length === 0) html += `<div class="empty">Нет счетов</div>`;
            else accs.forEach(a => html += `<div class="modal-list-item"><div><div style="font-weight:600;">${esc(a.name)}</div><div style="font-size:12px; color:var(--muted);">${esc(getBank(a.bankId)?.name||'')}</div></div><div style="font-weight:700;">${fmt(accValue(a))}</div></div>`);
            html += `</div>`;
            openModal(html);
        } else if (label === 'Подушка') {
            const accs = S.accounts.filter(a => a.inCushion && !a.archived);
            let html = `<div class="modal-header"><h2>Подушка безопасности</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div style="max-height: 60vh; overflow-y: auto;">`;
            if (accs.length === 0) html += `<div class="empty">Нет счетов</div>`;
            else accs.forEach(a => html += `<div class="modal-list-item"><div><div style="font-weight:600;">${esc(a.name)}</div><div style="font-size:12px; color:var(--muted);">${esc(getBank(a.bankId)?.name||'')}</div></div><div style="font-weight:700;">${fmt(accValue(a))}</div></div>`);
            html += `</div>`;
            openModal(html);
        } else {
            toast(label + ' (детализация в разработке)');
        }
    };

    // Центральный текст (Общий капитал)
    function updateCenterText() {
        const pageStats = document.getElementById('page-stats');
        if (!pageStats || !pageStats.classList.contains('active')) return;

        const canvas = pageStats.querySelector('canvas');
        if (!canvas) return;

        let overlay = document.getElementById('capitalCenterOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'capitalCenterOverlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '50%';
            overlay.style.left = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.textAlign = 'center';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            if (canvas.parentNode.style.position !== 'relative') {
                canvas.parentNode.style.position = 'relative';
            }
            canvas.parentNode.appendChild(overlay);
        }

        const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
        
        // Проверяем, включен ли глобальный режим приватности
        const mainBal = document.querySelector('.total-val');
        const isPrivacyMode = (mainBal && (mainBal.textContent.includes('❄️') || mainBal.textContent.includes('***')));

        const valStr = isPrivacyMode ? '*** ₽' : fmt(c.net);
        const labelStr = 'Капитал (без долгов)';

        overlay.innerHTML = `
            <div style="font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px;">${valStr}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${labelStr}</div>
        `;
    }

    const observer = new MutationObserver(() => {
        updateCenterText();
    });
    
    setTimeout(() => {
        const pageStats = document.getElementById('page-stats');
        if (pageStats) {
            observer.observe(pageStats, { childList: true, subtree: true });
            updateCenterText();
        }
    }, 1000);

    // Обновляем текст при клике на "Глаз"
    document.addEventListener('click', (e) => {
        if (e.target.closest('#globalPrivacyBtn')) {
            setTimeout(updateCenterText, 100);
        }
    });
})();
