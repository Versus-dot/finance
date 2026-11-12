// ==========================================
// МОДУЛЬ ФИКСОВ (mod-fixes.js)
// ==========================================
(function() {
    console.log("✅ Модуль фиксов (mod-fixes.js) загружен v216");

    if (typeof S !== 'undefined') {
        if (!S.meta) S.meta = { deletedIds: [] };
        if (!S.meta.deletedIds) S.meta.deletedIds = [];
    }

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .account-row.archived-acc { opacity: 0.5; filter: grayscale(100%); transition: opacity 0.2s; }
        .account-row.archived-acc:hover { opacity: 0.8; }
    `;
    document.head.appendChild(styleEl);

    // 🗑 МОГИЛЬНЫЕ ПЛИТЫ (Удаление)
    const originalDeleteAccount = window.deleteAccount;
    window.deleteAccount = function(id) {
        const acc = getAcc(id); if (!acc) return;
        if (confirm(`Вы уверены, что хотите удалить счет "${acc.name}"?\n\nЭто действие нельзя отменить.`)) {
            if (typeof S !== 'undefined' && S.meta) S.meta.deletedIds.push(id);
            if (originalDeleteAccount) originalDeleteAccount(id);
        }
    };
    const originalDeleteBank = window.deleteBank;
    window.deleteBank = function(id) {
        if (!confirm(`Удалить банк и все его счета?`)) return;
        if (typeof S !== 'undefined' && S.meta) S.meta.deletedIds.push(id);
        if (originalDeleteBank) originalDeleteBank(id);
    };
    const originalDeleteTx = window.deleteTx;
    window.deleteTx = function(id) {
        if (typeof S !== 'undefined' && S.meta) S.meta.deletedIds.push(id);
        if (originalDeleteTx) originalDeleteTx(id);
    };

    // ==========================================
    // ФИКСЫ ОКНА СЧЕТА (Игнор баланса, Срок в днях, Архив)
    // ==========================================
    const prevOpenAccountModal = window.openAccountModal;
    window.openAccountModal = function(id, bankId) {
        if (prevOpenAccountModal) prevOpenAccountModal(id, bankId);
        const modal = document.getElementById('modalContent'); if (!modal) return;
        const acc = id ? getAcc(id) : null; const form = document.getElementById('accForm'); if (!form) return;
        
        window._currentEditingAccId = id || null; 

        const cushionLabel = form.querySelector('input[id="accCushion"]').closest('.form-group');
        
        const ignoreDiv = document.createElement('div'); 
        ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label><input type="checkbox" id="accIgnoreBalance" style="width:auto;margin-right:8px" ${acc && acc.ignoreBalance ? 'checked' : ''}>👁️‍🗨️ Исключить из общего баланса</label>`;
        cushionLabel.after(ignoreDiv);

        const archiveDiv = document.createElement('div');
        archiveDiv.className = 'form-group';
        archiveDiv.innerHTML = `<label><input type="checkbox" id="accArchived" style="width:auto;margin-right:8px" ${acc && acc.archived ? 'checked' : ''}>🗄️ Отправить в архив (скрыть из списка)</label>`;
        ignoreDiv.after(archiveDiv);
        
        const termSelect = document.getElementById('accTerm');
        if (termSelect) {
            termSelect.insertAdjacentHTML('beforeend', `<option value="custom">Свой срок (в днях)</option>`);
            const customDiv = document.createElement('div'); customDiv.className = 'form-group'; customDiv.style.display = 'none';
            customDiv.innerHTML = `<label>Количество дней</label><input type="number" id="accTermDays" placeholder="Например, 181" min="1">`;
            termSelect.closest('.form-group').after(customDiv);
            if (acc && acc.term && acc.term.endsWith('d')) { termSelect.value = 'custom'; customDiv.style.display = 'block'; document.getElementById('accTermDays').value = acc.term.replace('d', ''); }
            termSelect.onchange = function() { customDiv.style.display = this.value === 'custom' ? 'block' : 'none'; };
            form.addEventListener('submit', function(e) {
                if (termSelect.value === 'custom') {
                    const days = document.getElementById('accTermDays').value;
                    if (days) { const val = days + 'd'; if (!TERMS[val]) TERMS[val] = days + ' дн.'; termSelect.innerHTML += `<option value="${val}" selected>${days} дн.</option>`; }
                }
            }, true);
        }
        
        setTimeout(() => {
            const hedgeSelect = document.getElementById('accHedgeFor');
            if (hedgeSelect) {
                Array.from(hedgeSelect.options).forEach(opt => {
                    if (!opt.value) return; const card = getAcc(opt.value);
                    if (card) { const bank = getBank(card.bankId); opt.textContent = `[${bank ? bank.name : 'Банк'}] ${card.name}`; }
                });
            }
        }, 100);
    };

    // ==========================================
    // ФИКС ОКНА ОПЕРАЦИЙ (Не учитывать в аналитике)
    // ==========================================
    const prevOpenTxModal = window.openTxModal;
    window.openTxModal = function(id) {
        if (prevOpenTxModal) prevOpenTxModal(id);
        window._currentEditingTxId = id || null;
        
        const form = document.getElementById('txForm');
        if (!form) return;
        
        const tx = id ? S.transactions.find(t => t.id === id) : null;
        const isChecked = tx && tx.ignoreInStats ? 'checked' : '';

        const ignoreDiv = document.createElement('div');
        ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label style="color:var(--muted);"><input type="checkbox" id="txIgnoreInStats" style="width:auto;margin-right:8px" ${isChecked}>🙈 Не учитывать в аналитике</label>`;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.before(ignoreDiv);
        else form.appendChild(ignoreDiv);
    };

    // ФИКС ОКНА КОРРЕКТИРОВКИ БАЛАНСА (Reconcile)
    const prevOpenReconcileModal = window.openReconcileModal;
    window.openReconcileModal = function(accId) {
        if (prevOpenReconcileModal) prevOpenReconcileModal(accId);
        
        const modal = document.getElementById('modalContent');
        if (!modal) return;
        const form = modal.querySelector('form');
        if (!form) return;
        
        const ignoreDiv = document.createElement('div');
        ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label style="color:var(--muted);"><input type="checkbox" id="recIgnoreInStats" style="width:auto;margin-right:8px">🙈 Переоценка (не в аналитику)</label>`;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.before(ignoreDiv);
        else form.appendChild(ignoreDiv);
    };

    // ФИКС СОХРАНЕНИЯ ГАЛОЧЕК
    const prevSaveWithIgnore = window.save;
    window.save = function(isUserAction = true) {
        // 1. Сохранение настроек счета
        const accForm = document.getElementById('accForm');
        const ignoreCb = document.getElementById('accIgnoreBalance');
        const archCb = document.getElementById('accArchived');
        if (accForm) {
            if (window._currentEditingAccId) {
                const acc = S.accounts.find(a => a.id === window._currentEditingAccId);
                if (acc) {
                    if (ignoreCb) acc.ignoreBalance = ignoreCb.checked;
                    if (archCb) acc.archived = archCb.checked;
                }
            } else {
                if (S.accounts.length > 0) {
                    const lastAcc = S.accounts[S.accounts.length - 1];
                    if (ignoreCb) lastAcc.ignoreBalance = ignoreCb.checked;
                    if (archCb) lastAcc.archived = archCb.checked;
                }
            }
        }

        // 2. Сохранение транзакции
        const txForm = document.getElementById('txForm');
        const txIgnoreCb = document.getElementById('txIgnoreInStats');
        if (txForm && txIgnoreCb) {
            if (window._currentEditingTxId) {
                const tx = S.transactions.find(t => t.id === window._currentEditingTxId);
                if (tx) tx.ignoreInStats = txIgnoreCb.checked;
            } else {
                const lastTx = S.transactions[S.transactions.length - 1];
                if (lastTx) lastTx.ignoreInStats = txIgnoreCb.checked;
            }
        }

        // 3. Сохранение корректировки баланса
        const recIgnoreCb = document.getElementById('recIgnoreInStats');
        if (recIgnoreCb) {
            const lastTx = S.transactions[S.transactions.length - 1];
            if (lastTx) lastTx.ignoreInStats = recIgnoreCb.checked;
        }

        if (prevSaveWithIgnore) prevSaveWithIgnore.call(this, isUserAction);
    };

    // Визуальный стиль для архивных счетов
    const prevRenderAccRowForArch = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccRowForArch(a, bank);
        if (a.archived) {
            if (html.includes('class="account-row ')) {
                html = html.replace('class="account-row ', 'class="account-row archived-acc ');
            } else {
                html = html.replace('class="account-row"', 'class="account-row archived-acc"');
            }
        }
        return html;
    };

    // ПЕРЕСЧЕТ ИТОГОВ (Игнор баланса)
    const originalComputeTotals = window.computeTotals;
    window.computeTotals = function() {
        let totals = originalComputeTotals();
        if (typeof S !== 'undefined') {
            let ignoredSum = 0, ignoredDebt = 0;
            S.accounts.filter(a => a.ignoreBalance && !a.archived).forEach(a => { 
                const v = accValue(a);
                if (a.type === 'credit') { const limit = a.creditLimit || 0; ignoredSum += Math.max(0, v - limit); ignoredDebt += Math.max(0, limit - v); } else { ignoredSum += v; }
            });
            totals.totalCap -= ignoredSum;
            totals.debt = Math.max(0, totals.debt - ignoredDebt);
        }
        return totals;
    };
    
    setTimeout(() => { if (typeof renderAll === 'function') renderAll(); }, 100);

    // ФИКС КНОПКИ "+" НА ВКЛАДКЕ ОПЕРАЦИЙ
    const prevRenderTransactions = window.renderTransactions; 
    window.renderTransactions = function() { 
        if (prevRenderTransactions) prevRenderTransactions(); 
        const page = document.getElementById('page-transactions'); 
        if (page && page.classList.contains('active')) { 
            const formRow = page.querySelector('.form-row'); 
            if (formRow && !document.getElementById('inlineTxBtn')) { 
                formRow.style.display = 'flex'; 
                formRow.style.gap = '8px'; 
                formRow.style.alignItems = 'center'; 
                const btn = document.createElement('button'); 
                btn.id = 'inlineTxBtn'; 
                btn.className = 'btn-primary'; 
                btn.style = 'padding: 0; width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; font-size: 24px; display: flex; align-items: center; justify-content: center;'; 
                btn.innerHTML = '+'; 
                btn.onclick = () => { if(typeof openTxModal === 'function') openTxModal(); }; 
                formRow.appendChild(btn); 
            } 
        } 
    };
})();
