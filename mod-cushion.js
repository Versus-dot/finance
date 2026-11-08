// ==========================================
// МОДУЛЬ ПОДУШКИ БЕЗОПАСНОСТИ (mod-cushion.js)
// ==========================================
(function() {
    console.log("✅ Модуль Подушки безопасности (mod-cushion.js) загружен");

    // 1. Добавляем стили для виджета
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .cushion-widget {
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(30, 37, 50, 0.5));
            border: 1px solid rgba(46, 204, 113, 0.3);
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 16px;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.2s;
            position: relative;
            overflow: hidden;
        }
        .cushion-widget:active { transform: scale(0.99); }
        .cushion-widget:hover { box-shadow: 0 4px 12px rgba(46, 204, 113, 0.1); }
        
        .cushion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .cushion-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--green);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .cushion-eye-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text);
            transition: background 0.2s;
        }
        .cushion-eye-btn:hover { background: rgba(255,255,255,0.2); }
        
        .cushion-amount {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 12px;
        }
        .cushion-goal-text {
            font-size: 12px;
            color: var(--muted);
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        .cushion-progress-bg {
            height: 8px;
            background: var(--border);
            border-radius: 4px;
            overflow: hidden;
        }
        .cushion-progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease-out, background-color 0.3s;
        }
        /* Мини-виджет, когда подушка скрыта */
        .cushion-mini {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 600;
            color: var(--muted);
            cursor: pointer;
        }
    `;
    document.head.appendChild(styleEl);

    // 2. Функция отрисовки виджета
    function injectCushionWidget() {
        const homePage = document.getElementById('page-home');
        if (!homePage) return;

        const oldWidget = document.getElementById('cushionWidgetContainer');
        if (oldWidget) oldWidget.remove();

        const totals = window.computeTotals ? window.computeTotals() : { cushion: 0 };
        const cushionSum = totals.cushion || 0;
        const target = S.settings.cushionTarget || 0;
        
        const isVisible = S.settings.showCushionWidget !== false;

        if (cushionSum === 0 && target === 0) return;

        const container = document.createElement('div');
        container.id = 'cushionWidgetContainer';

        if (!isVisible) {
            container.innerHTML = `
                <div class="cushion-mini" onclick="window.toggleCushionVisibility()">
                    <span>🛡️ Подушка безопасности (скрыта)</span>
                    <span>👁️ Показать</span>
                </div>
            `;
        } else {
            let percent = 0;
            if (target > 0) {
                percent = Math.min(100, (cushionSum / target) * 100);
            }
            
            let barColor = 'var(--green)';
            if (target > 0) {
                if (percent < 30) barColor = 'var(--red)';
                else if (percent < 80) barColor = 'var(--yellow)';
            }

            const goalHtml = target > 0 ? `
                <div class="cushion-goal-text">
                    <span>Цель: ${fmt(target)}</span>
                    <span>${percent.toFixed(0)}%</span>
                </div>
                <div class="cushion-progress-bg">
                    <div class="cushion-progress-fill" style="width: ${percent}%; background-color: ${barColor};"></div>
                </div>
            ` : `
                <div class="cushion-goal-text" style="justify-content: flex-start; color: var(--muted);">
                    <span>Цель не задана (нажмите, чтобы настроить)</span>
                </div>
            `;

            container.innerHTML = `
                <div class="cushion-widget" onclick="window.openCushionDetails()">
                    <div class="cushion-header">
                        <div class="cushion-title">🛡️ Подушка безопасности</div>
                        <button class="cushion-eye-btn" onclick="event.stopPropagation(); window.toggleCushionVisibility()" title="Скрыть">👁️</button>
                    </div>
                    <div class="cushion-amount">${fmt(cushionSum)}</div>
                    ${goalHtml}
                </div>
            `;
        }

        const totalBar = homePage.querySelector('.total-bar');
        if (totalBar) {
            totalBar.after(container);
        } else {
            homePage.prepend(container);
        }
    }

    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        setTimeout(injectCushionWidget, 50);
    };

    window.toggleCushionVisibility = function() {
        S.settings.showCushionWidget = (S.settings.showCushionWidget === false);
        if (typeof save === 'function') save();
        if (typeof renderDashboard === 'function') renderDashboard();
    };

    window.openCushionDetails = function() {
        const cushionAccounts = S.accounts.filter(a => a.inCushion && !a.archived);
        
        if (!cushionAccounts.length) {
            if (confirm('У вас пока нет счетов в подушке безопасности.\n\nХотите перейти в настройки, чтобы указать цель и добавить счета?')) {
                if (typeof openSettings === 'function') openSettings();
            }
            return;
        }

        const total = cushionAccounts.reduce((sum, a) => sum + window.accValue(a), 0);
        
        let listHtml = '';
        cushionAccounts.sort((a, b) => window.accValue(b) - window.accValue(a)).forEach(acc => {
            const val = window.accValue(acc);
            const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
            const bank = S.banks.find(b => b.id === acc.bankId);
            const bankName = bank ? bank.name : 'Банк';
            
            listHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                    <div>
                        <div style="font-weight:600; font-size:14px;">${esc(acc.name)}</div>
                        <div style="font-size:11px; color:var(--muted);">${esc(bankName)} · ${pct}%</div>
                    </div>
                    <div style="font-weight:700;">${fmt(val)}</div>
                </div>
            `;
        });

        window.openModal(`
            <div class="modal-header">
                <h2>🛡️ Подушка безопасности</h2>
                <button class="btn-icon" onclick="closeModal()">✕</button>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--green); margin-bottom: 16px;">
                ${fmt(total)}
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${listHtml}
            </div>
            <button class="btn-secondary btn-block" style="margin-top: 16px;" onclick="closeModal(); openSettings();">Настроить цель</button>
        `);
    };

})();
