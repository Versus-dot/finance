// ==========================================
// ФИКС СТАТИСТИКИ (mod-stats-fix.js)
// ==========================================
(function() {
    console.log("✅ Фикс Статистики (mod-stats-fix.js) загружен");

    // Перехватываем создание графиков
    const OriginalChart = window.Chart;
    if (!OriginalChart) return;

    window.Chart = new Proxy(OriginalChart, {
        construct(target, args) {
            let [ctx, config] = args;
            
            // Ищем круговую диаграмму капитала
            if (config.type === 'doughnut' && config.data && config.data.labels) {
                const labelsStr = config.data.labels.join(',');
                // Если это график капитала (в старом коде там были "Фондовый рынок" или "Свободные средства")
                if (labelsStr.includes('Фондовый рынок') || labelsStr.includes('Свободные средства')) {
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
                    }
                }
            }
            return new target(...args);
        }
    });

    // Также обновляем цифру в центре диаграммы (если она выводится текстом)
    setTimeout(() => {
        const observer = new MutationObserver(() => {
            const pageStats = document.getElementById('page-stats');
            if (pageStats && pageStats.classList.contains('active')) {
                const c = window.getCustomCapital ? window.getCustomCapital() : null;
                if (c) {
                    // Ищем элементы, где может быть выведена общая сумма
                    const centerVal = pageStats.querySelector('.chart-center-val') || pageStats.querySelector('canvas').nextElementSibling;
                    if (centerVal && centerVal.textContent.includes('₽')) {
                        centerVal.textContent = new Intl.NumberFormat('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0}).format(c.net);
                    }
                }
            }
        });
        
        const statsPage = document.getElementById('page-stats');
        if (statsPage) observer.observe(statsPage, { childList: true, subtree: true });
    }, 1000);
})();
