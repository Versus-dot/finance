// ==========================================
// Модуль хеджирования (v53) - hedge.js
// ==========================================

// Инициализация настройки (по умолчанию выключено)
if (typeof S !== 'undefined' && S.settings) {
    if (S.settings.hedgingEnabled === undefined) {
        S.settings.hedgingEnabled = false;
        if (typeof save === 'function') save(false);
    }
}

// 1. Добавляем тумблер в окно Настроек
const originalOpenSettings = window.openSettings;
window.openSettings = function() {
    originalOpenSettings();
    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'form-group';
        toggleDiv.style = 'display:flex;align-items:center;justify-content:space-between;background:var(--card2);padding:10px 12px;border-radius:10px;border:1px solid var(--border);margin-top:10px;';
        toggleDiv.innerHTML = `
            <div><div style="font-size:14px;font-weight:600;">Режим хеджирования</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Привязка вкладов к кредиткам</div></div>
            <label class="toggle-switch"><input type="checkbox" id="setHedging" ${S.settings.hedgingEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
        `;
        const saveBtn = Array.from(modalContent.querySelectorAll('button')).find(b => b.textContent === 'Сохранить');
        if (saveBtn) {
            saveBtn.parentNode.insertBefore(toggleDiv, saveBtn);
        }
    }
}

// Перехватываем сохранение настроек, чтобы запомнить тумблер
const originalSaveSettings = window.saveSettings;
window.saveSettings = function() {
    const toggle = document.getElementById('setHedging');
    if (toggle && typeof S !== 'undefined') {
        S.settings.hedgingEnabled = toggle.checked;
    }
    originalSaveSettings();
}

// 2. Добавляем выбор карты в окно счёта (вклад/накопительный/финуслуги)
const originalOpenAccountModal = window.openAccountModal;
window.openAccountModal = function(id, bankId) {
    originalOpenAccountModal(id, bankId);
    if (typeof S !== 'undefined' && S.settings.hedgingEnabled) {
        const modal = document.getElementById('modalContent');
        const typeSel = document.getElementById('accType');
        if (!modal || !typeSel) return;

        const acc = id ? getAcc(id) : null;
        
        const hedgeDiv = document.createElement('div');
        hedgeDiv.className = 'form-group';
        hedgeDiv.id = 'hedgeFields';
        hedgeDiv.style.display = ['deposit', 'savings', 'finu_wallet'].includes(typeSel.value) ? 'block' : 'none';
        hedgeDiv.innerHTML = `
            <label>🛡 Хедж для кредитной карты</label>
            <select id="accHedgeFor">
                <option value="">Не является хеджем</option>
                ${S.accounts.filter(a => a.type === 'credit' && !a.archived).map(c => `<option value="${c.id}" ${acc && acc.hedgeFor === c.id ? 'selected' : ''}>${esc(c.name)} (Лимит: ${fmt(c.creditLimit || 0)})</option>`).join('')}
            </select>
        `;

        typeSel.closest('.form-group').after(hedgeDiv);

        const originalOnchange = typeSel.onchange;
        typeSel.onchange = function(e) {
            if (originalOnchange) originalOnchange.call(this, e);
            hedgeDiv.style.display = ['deposit', 'savings', 'finu_wallet'].includes(this.value) ? 'block' : 'none';
        };

        const form = document.getElementById('accForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                const hedgeSelect = document.getElementById('accHedgeFor');
                if (hedgeSelect) {
                    const cardId = hedgeSelect.value;
                    if (id) {
                        const a = getAcc(id);
                        if (a) a.hedgeFor = cardId || null;
                    } else {
                        const newest = S.accounts[S.accounts.length - 1];
                        if (newest) newest.hedgeFor = cardId || null;
                    }
                    if (typeof save === 'function') save(false);
                    if (typeof renderAll === 'function') renderAll(); // Обновляем экран
                }
            });
        }
    }
}

// 3. Пересчет общего баланса (исключаем хедж до уровня лимита)
const originalComputeTotals = window.computeTotals;
window.computeTotals = function() {
    let totals = originalComputeTotals();
    if (typeof S !== 'undefined' && S.settings.hedgingEnabled) {
        S.accounts.filter(a => a.hedgeFor && !a.archived).forEach(dep => {
            const card = S.accounts.find(c => c.id === dep.hedgeFor && c.type === 'credit' && !c.archived);
            if (card) {
                const depVal = accValue(dep);
                const limit = card.creditLimit || 0;
                const covered = Math.min(depVal, limit);
                totals.totalCap -= covered; // Вычитаем покрытую часть
            }
        });
    }
    return totals;
}

// 4. Отрисовка полоски хеджирования на кредитной карте
const originalRenderAccountRow = window.renderAccountRow;
window.renderAccountRow = function(a, bank) {
    let html = originalRenderAccountRow(a, bank);
    if (typeof S !== 'undefined' && S.settings.hedgingEnabled && a.type === 'credit') {
        const hedges = S.accounts.filter(x => x.hedgeFor === a.id && !x.archived);
        if (hedges.length > 0) {
            const totalHedge = hedges.reduce((sum, h) => sum + accValue(h), 0);
            const limit = a.creditLimit || 0;
            const pct = limit > 0 ? Math.min(100, (totalHedge / limit) * 100) : 0;
            const color = pct >= 100 ? 'var(--green)' : 'var(--yellow)';
            
            const barHtml = `
                <div style="margin-top: 6px; width: 100%; max-width: 200px; margin-left: auto; text-align: right;">
                    <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-bottom:2px;">
                        <span>🛡 ${fmt(totalHedge)} / ${fmt(limit)}</span>
                        <span>${pct.toFixed(0)}%</span>
                    </div>
                    <div style="width:100%;height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;"></div>
                    </div>
                </div>
            `;
            html = html.substring(0, html.lastIndexOf('</div>')) + barHtml + '</div>';
        }
    }
    return html;
}

console.log('✅ Модуль хеджирования (v53) загружен');
