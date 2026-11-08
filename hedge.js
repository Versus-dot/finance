// ==========================================
// Модуль хеджирования (v56 - Текст вместо полоски) - hedge.js
// ==========================================

if (typeof S !== 'undefined' && S.settings) {
    if (S.settings.hedgingEnabled === undefined) {
        S.settings.hedgingEnabled = false;
        if (typeof save === 'function') save(false);
    }
}

const originalOpenSettings = window.openSettings;
window.openSettings = function() {
    if (originalOpenSettings) originalOpenSettings();
    const modalContent = document.getElementById('modalContent');
    if (modalContent && !document.getElementById('setHedging')) {
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'form-group';
        toggleDiv.style = 'display:flex;align-items:center;justify-content:space-between;background:var(--card2);padding:10px 12px;border-radius:10px;border:1px solid var(--border);margin-top:10px;';
        toggleDiv.innerHTML = `
            <div><div style="font-size:14px;font-weight:600;">Режим хеджирования</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">Привязка вкладов к кредиткам</div></div>
            <label class="toggle-switch"><input type="checkbox" id="setHedging" ${S.settings.hedgingEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
        `;
        const saveBtn = Array.from(modalContent.querySelectorAll('button')).find(b => b.textContent === 'Сохранить');
        if (saveBtn) saveBtn.parentNode.insertBefore(toggleDiv, saveBtn);
    }
}

const originalSaveSettings = window.saveSettings;
window.saveSettings = function() {
    const toggle = document.getElementById('setHedging');
    if (toggle && typeof S !== 'undefined') S.settings.hedgingEnabled = toggle.checked;
    if (originalSaveSettings) originalSaveSettings();
}

const originalOpenAccountModal = window.openAccountModal;
window.openAccountModal = function(id, bankId) {
    if (originalOpenAccountModal) originalOpenAccountModal(id, bankId);
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
                ${S.accounts.filter(a => a.type === 'credit' && !a.archived).map(c => `<option value="${c.id}" ${acc && acc.hedgeFor === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
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
                    if (typeof renderAll === 'function') renderAll();
                }
            });
        }
    }
}

const originalComputeTotals = window.computeTotals;
window.computeTotals = function() {
    if (originalComputeTotals) {
        let totals = originalComputeTotals();
        if (typeof S !== 'undefined' && S.settings.hedgingEnabled) {
            let totalCoveredDebt = 0;
            S.accounts.filter(a => a.hedgeFor && !a.archived).forEach(dep => {
                const card = S.accounts.find(c => c.id === dep.hedgeFor && c.type === 'credit' && !c.archived);
                if (card) {
                    const depVal = accValue(dep);
                    const limit = card.creditLimit || 0;
                    const covered = Math.min(depVal, limit);
                    totals.totalCap -= covered;
                    totalCoveredDebt += covered;
                }
            });
            totals.debt = Math.max(0, totals.debt - totalCoveredDebt);
        }
        return totals;
    }
}

const originalRenderAccountRow = window.renderAccountRow;
window.renderAccountRow = function(a, bank) {
    if (!originalRenderAccountRow) return '';
    let html = originalRenderAccountRow(a, bank);
    
    // ИСПРАВЛЕНО: Надежный поиск строки лимита и замена
    if (typeof S !== 'undefined' && S.settings.hedgingEnabled && a.type === 'credit') {
        const hedges = S.accounts.filter(x => x.hedgeFor === a.id && !x.archived);
        if (hedges.length > 0) {
            const totalHedge = hedges.reduce((sum, h) => sum + accValue(h), 0);
            const limit = a.creditLimit || 0;
            const currentBalance = accValue(a);
            const currentDebt = Math.max(0, limit - currentBalance);
            
            let pct = 0;
            if (currentDebt > 0) {
                pct = Math.min(100, (totalHedge / currentDebt) * 100);
            }
            
            if (pct > 0) {
                // Ищем просто "Лимит: 50 000 ₽" без учета тегов вокруг
                const targetStr = `Лимит: ${fmt(limit)}`;
                const replacementStr = `Лимит: ${fmt(limit)} · <span style="color:var(--muted);">🛡️ Хеджирована на ${pct.toFixed(0)}%</span>`;
                html = html.replace(targetStr, replacementStr);
            }
        }
    }
    return html;
}

console.log('✅ Модуль хеджирования (v56) обновлен');
