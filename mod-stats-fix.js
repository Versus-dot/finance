// ==========================================
// ФИКС СТАТИСТИКИ (mod-stats-fix.js) v1 (Stable)
// ==========================================
(function() {
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
                    }
                }
            }
            return new target(...args);
        }
    });

    // Обновление центрального текста (без MutationObserver, чтобы не вешать браузер)
    setInterval(() => {
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
            if (canvas.parentNode.style.position !== 'relative') canvas.parentNode.style.position = 'relative';
            canvas.parentNode.appendChild(overlay);
        }

        const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
        const mainBal = document.querySelector('.total-val');
        const isPrivacyMode = (mainBal && (mainBal.textContent.includes('❄️') || mainBal.textContent.includes('***')));
        const valStr = isPrivacyMode ? '*** ₽' : fmt(c.net);

        overlay.innerHTML = `
            <div style="font-size: 20px; font-weight: 800; color: var(--text);">${valStr}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Капитал</div>
        `;
    }, 1000);
})();
