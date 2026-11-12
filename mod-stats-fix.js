// ==========================================
// ФИКС СТАТИСТИКИ (mod-stats-fix.js) v3
// ==========================================
(function() {
    console.log("✅ Фикс Статистики (mod-stats-fix.js) v3 загружен");

    const OriginalChart = window.Chart;
    if (!OriginalChart) return;

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

                        // Включаем стандартную легенду Chart.js (она красивее)
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
                    }
                }
            }
            return new target(...args);
        }
    });

    // Функция, которая прячет старый текст и легенду из mod-chart.js, и рисует наши
    function updateCenterText() {
        const pageStats = document.getElementById('page-stats');
        if (!pageStats || !pageStats.classList.contains('active')) return;

        const canvas = pageStats.querySelector('canvas');
        if (!canvas) return;
        const container = canvas.parentNode;

        // 1. Прячем старые HTML-элементы (легенду и текст "Общий капитал")
        if (container) {
            Array.from(container.children).forEach(child => {
                if (child.tagName === 'DIV' && child !== canvas && child.id !== 'capitalCenterOverlay') {
                    // Если это старый блок с текстом или легендой — скрываем
                    if (child.textContent.includes('Общий капитал') || child.textContent.includes('Подушка')) {
                        child.style.display = 'none';
                    }
                }
            });
        }

        // 2. Добавляем наш красивый центральный текст
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
            if (container.style.position !== 'relative') {
                container.style.position = 'relative';
            }
            container.appendChild(overlay);
        }

        const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
        
        // Проверка на глобальный "Глаз"
        const mainBal = document.querySelector('.total-val');
        const isPrivacyMode = (mainBal && (mainBal.textContent.includes('❄️') || mainBal.textContent.includes('***')));
        const valStr = isPrivacyMode ? '*** ₽' : fmt(c.net);

        overlay.innerHTML = `
            <div style="font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px;">${valStr}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Капитал (без долгов)</div>
        `;
    }

    // Запускаем очистку раз в секунду (безопасно)
    setInterval(updateCenterText, 1000);

    // И при клике на глобальный "Глаз"
    document.addEventListener('click', (e) => {
        if (e.target.closest('#globalPrivacyBtn')) setTimeout(updateCenterText, 100);
    });
})();
