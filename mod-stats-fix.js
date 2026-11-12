// ==========================================
// ФИКС СТАТИСТИКИ (mod-stats-fix.js) v5
// ==========================================
(function() {
    console.log("✅ Фикс Статистики (mod-stats-fix.js) v5 загружен");

    // 1. Добавляем CSS-маску, которая скроет старый текст, если он нарисуется на холсте
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .chart-container > div:not(#capitalCenterOverlay),
        .chart-container > span:not(#capitalCenterOverlay) {
            display: none !important;
        }
        #capitalCenterOverlay {
            background: var(--card);
            padding: 15px;
            border-radius: 50%;
            box-shadow: 0 0 15px 15px var(--card);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }
    `;
    document.head.appendChild(styleEl);

    const OriginalChart = window.Chart;
    if (!OriginalChart) return;

    // 2. Блокируем отрисовку старого текста на холсте (Canvas)
    if (!window._fillTextPatched) {
        const origFillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
            if (this.canvas && this.canvas.closest('#page-stats')) {
                if (typeof text === 'string' && (text.includes('Общий капитал') || text.includes('₽'))) {
                    return; // Блокируем старый текст
                }
            }
            return origFillText.apply(this, arguments);
        };
        window._fillTextPatched = true;
    }

    window.Chart = new Proxy(OriginalChart, {
        construct(target, args) {
            let [ctx, config] = args;
            
            if (config.type === 'doughnut' && config.data && config.data.labels) {
                const labelsStr = config.data.labels.join(',');
                if (labelsStr.includes('Фондовый рынок') || labelsStr.includes('Свободные средства') || labelsStr.includes('ПДС')) {
                    const c = window.getCustomCapital ? window.getCustomCapital() : null;
                    if (c) {
                        const newLabels = [];
                        const newData = [];
                        const newColors = [];

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

                        config.options = config.options || {};
                        config.options.plugins = config.options.plugins || {};
                        
                        // УДАЛЯЕМ ВСЕ КАСТОМНЫЕ ПЛАГИНЫ (типа centerText)
                        Object.keys(config.options.plugins).forEach(k => {
                            if (k !== 'legend' && k !== 'tooltip') delete config.options.plugins[k];
                        });
                        delete config.options.plugins.centerText;

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
                    }
                }
            }
            return new target(...args);
        }
    });

    function updateCenterText() {
        const pageStats = document.getElementById('page-stats');
        if (!pageStats || !pageStats.classList.contains('active')) return;

        const canvas = pageStats.querySelector('canvas');
        if (!canvas) return;
        const container = canvas.parentNode;

        let overlay = document.getElementById('capitalCenterOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'capitalCenterOverlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '50%';
            overlay.style.left = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.zIndex = '10';
            if (container.style.position !== 'relative') {
                container.style.position = 'relative';
            }
            container.appendChild(overlay);
        }

        const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
        const mainBal = document.querySelector('.total-val');
        const isPrivacyMode = (mainBal && (mainBal.textContent.includes('❄️') || mainBal.textContent.includes('***')));
        const valStr = isPrivacyMode ? '*** ₽' : fmt(c.net);

        overlay.innerHTML = `
            <div style="font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px;">${valStr}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Капитал (без долгов)</div>
        `;
    }

    // Безопасный обсервер: если контейнер очистился при перерисовке, возвращаем наш текст
    const obs = new MutationObserver(() => {
        const pageStats = document.getElementById('page-stats');
        if (pageStats && pageStats.classList.contains('active')) {
            if (!document.getElementById('capitalCenterOverlay')) {
                updateCenterText();
            }
        }
    });
    
    setTimeout(() => {
        const pageStats = document.getElementById('page-stats');
        if (pageStats) obs.observe(pageStats, { childList: true, subtree: true });
    }, 1000);

    setInterval(updateCenterText, 1000);
    document.addEventListener('click', (e) => {
        if (e.target.closest('#globalPrivacyBtn')) setTimeout(updateCenterText, 100);
    });
})();
