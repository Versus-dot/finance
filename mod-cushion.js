// ==========================================
// МОДУЛЬ ПОДУШКИ БЕЗОПАСНОСТИ (mod-cushion.js) v4
// ==========================================
(function() {
    console.log("✅ Модуль Подушки безопасности (mod-cushion.js) v4 загружен");

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .cushion-widget {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(26, 32, 44, 0.5));
            border: 1px solid rgba(16, 185, 129, 0.15);
            border-radius: 20px;
            padding: 16px;
            margin-bottom: 16px;
            cursor: pointer;
            transition: transform 0.1s;
            position: relative;
            overflow: hidden;
        }
        .cushion-widget:active { transform: scale(0.99); }
        
        .cushion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .cushion-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.9;
        }
        .cushion-eye-btn {
            background: transparent;
            border: none;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--muted);
            transition: background 0.2s, color 0.2s;
            padding: 0;
        }
        .cushion-eye-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
        .cushion-eye-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        
        .cushion-amount {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }
        .cushion-goal-text {
            font-size: 11px;
            color: var(--muted);
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-weight: 600;
        }
        .cushion-progress-bg {
            height: 6px;
            background: var(--border);
            border-radius: 3px;
            overflow: hidden;
        }
        .cushion-progress-fill {
            height: 100%;
            border-radius: 3px;
            background: var(--muted);
            transition: width 0.3s ease-out;
        }
        .cushion-mini {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 600;
            color: var(--muted);
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .cushion-mini span:last-child {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--accent);
        }
        .cushion-mini svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    `;
    document.head.appendChild(styleEl);

    const eyeOpen = `<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeClosed = `<svg viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

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
                    <span>${eyeOpen} Показать</span>
                </div>
            `;
        } else {
            let percent = 0;
            if (target > 0) {
                percent = Math.min(100, (cushionSum / target) * 100);
            }

            const goalHtml = target > 0 ? `
                <div class="cushion-goal-text">
                    <span>Цель: ${fmt(target)}</span>
                    <span>${percent.toFixed(0)}%</span>
                </div>
                <div class="cushion-progress-bg">
                    <div class="cushion-progress-fill" style="width: ${percent}%;"></div>
                </div>
            ` : `
                <div class="cushion-goal-text" style="justify-content: flex-start;">
                    <span>Цель не задана (нажмите, чтобы настроить)</span>
                </div>
            `;

            container.innerHTML = `
                <div class="cushion-widget" onclick="window.openCushionDetails()">
                    <div class="cushion-header">
                        <div class="cushion-title">🛡️ Подушка безопасности</div>
                        <button class="cushion-eye-btn" onclick="event.stopPropagation(); window.toggleCushionVisibility()" title="Скрыть">${eyeClosed}</button>
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
        injectCushionWidget();
    };

    window.toggleCushionVisibility = function() {
        S.settings.showCushionWidget = (S.settings.showCushionWidget === false);
        if (typeof save === 'function') save();
        if (typeof renderDashboard === 'function') renderDashboard();
    };

    window.saveCushionTarget = function() {
        const input = document.getElementById('cushionTargetInput');
        if (input) {
            S.settings.cushionTarget = parseFloat(input.value) || 0;
            if (typeof save === 'function') save();
        }
        closeModal();
        if (typeof renderDashboard === 'function') renderDashboard();
        toast('Цель обновлена');
    };

    window.openCushionGoalEdit = function() {
        window.openModal(`
            <div class="modal-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn-icon" onclick="window.openCushionDetails()" title="Назад">⬅️</button>
                    <h2>Изменить цель</h2>
                </div>
                <button class="btn-icon" onclick="closeModal()">✕</button>
            </div>
            <div class="form-group">
                <label>Цель подушки безопасности (₽)</label>
                <input id="cushionTargetInput" type="number" value="${S.settings.cushionTarget || ''}" placeholder="Например, 500000">
            </div>
            <button class="btn-primary btn-block" onclick="window.saveCushionTarget()">Сохранить</button>
        `);
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
                <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--border);">
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
            <div style="max-height: 250px; overflow-y: auto;">
                ${listHtml}
            </div>
            
            <div style="margin-top: 20px; display:flex; flex-direction:column; gap:8px;">
                <button class="btn-secondary btn-block" onclick="window.openCushionGoalEdit()">Изменить цель</button>
            </div>
        `);
    };
})();
