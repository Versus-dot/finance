// ==========================================
// МОДУЛЬ ФИКСОВ (mod-fixes.js) v220
// ==========================================
(function() {
    console.log("✅ Модуль фиксов (mod-fixes.js) v220 загружен");

    if (typeof S !== 'undefined') {
        if (!S.meta) S.meta = { deletedIds: [] };
        if (!S.meta.deletedIds) S.meta.deletedIds = [];
    }

    // ФИКС: Убираем -0 и микроскопические погрешности
    const prevAccValue = window.accValue;
    window.accValue = function(a) {
        let val = prevAccValue(a);
        if (Math.abs(val) < 0.01) return 0;
        return val;
    };

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .account-row.archived-acc { opacity: 0.5; filter: grayscale(100%); transition: opacity 0.2s; }
        .account-row.archived-acc:hover { opacity: 0.8; }
    `;
    document.head.appendChild(styleEl);

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

    const prevOpenAccountModal = window.openAccountModal;
    window.openAccountModal = function(id, bankId) {
        if (prevOpenAccountModal) prevOpenAccountModal(id, bankId);
        const modal = document.getElementById('modalContent'); if (!modal) return;
        const acc = id ? getAcc(id) : null; const form = document.getElementById('accForm'); if (!form) return;
        
        window._currentEditingAccId = id || null; 

        // СКРЫВАЕМ "Начальный баланс", чтобы не было путаницы
        const accBalanceGroup = form.querySelector('input[id="accBalance"]').closest('.form-group');
        if (accBalanceGroup) accBalanceGroup.style.display = 'none';

        const cushionLabel = form.querySelector('input[id="accCushion"]').closest('.form-group');
        
        const ignoreDiv = document.createElement('div'); 
        ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label><input type="checkbox" id="accIgnoreBalance" style="width:auto;margin-right:8px" ${acc && acc.ignoreBalance ? 'checked' : ''}>👁️‍🗨️ Исключить из общего баланса</label>`;
        cushionLabel.after(ignoreDiv);

        const archiveDiv = document.createElement('div');
        archiveDiv.className = 'form-group';
        archiveDiv.innerHTML = `<label><input type="checkbox" id="accArchived" style="width:auto;margin-right:8px" ${acc && acc.archived ? 'checked' : ''}>🗄️ Отправить в архив (скрыть из списка)</label>`;
        ignoreDiv.after(archiveDiv);
        
        const typeSel = document.getElementById('accType');
        const creditFields = document.getElementById('creditFields');
        
        if (typeSel) {
            const linkedCardDiv = document.createElement('div');
            linkedCardDiv.className = 'form-group';
            linkedCardDiv.id = 'linkedCardGroup';
            linkedCardDiv.style.display = ['brokerage', 'iis'].includes(typeSel.value) ? 'block' : 'none';
            
            const debitCards = S.accounts.filter(a => (a.type === 'debit' || a.type === 'cash') && !a.archived);
            linkedCardDiv.innerHTML = `
                <label>Связанная карта (для переводов Т-Инвест)</label>
                <select id="accLinkedCard">
                    <option value="">Не привязана</option>
                    ${debitCards.map(c => `<option value="${c.id}" ${acc && acc.linkedCardId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                </select>
            `;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.before(linkedCardDiv);
            else form.appendChild(linkedCardDiv);

            const originalOnchange = typeSel.onchange;
            typeSel.onchange = function(e) {
                if (originalOnchange) originalOnchange.call(this, e);
                linkedCardDiv.style.display = ['brokerage', 'iis'].includes(this.value) ? 'block' : 'none';
            };
        }

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

    // ПОЛНОСТЬЮ ПЕРЕПИСАНА КОРРЕКТИРОВКА (без выбора "Просто исправить")
    window.openReconcileModal = function(accId) {
        const acc = getAcc(accId);
        if (!acc) return;
        const currentBal = window.accValue(acc);

        openModal(`
            <div class="modal-header"><h2>Корректировка баланса</h2><button class="btn-icon" onclick="openAccountModal('${accId}')">✕</button></div>
            <form id="reconcileFormNew">
                <div class="form-group">
                    <label>Фактический баланс на сегодня</label>
                    <input id="recNewBal" type="number" step="0.01" value="${currentBal}" required>
                </div>
                <div style="font-size: 12px; color: var(--muted); margin-bottom: 16px;">
                    Разница будет учтена как техническая корректировка и не повлияет на доходы/расходы в аналитике.
                </div>
                <button type="submit" class="btn-primary btn-block">Применить</button>
            </form>
        `);

        document.getElementById('reconcileFormNew').onsubmit = (e) => {
            e.preventDefault();
            const newBal = parseFloat(document.getElementById('recNewBal').value) || 0;
            const diff = newBal - currentBal;

            if (Math.abs(diff) < 0.01) { toast('Баланс не изменился'); closeModal(); return; }

            let txType = diff > 0 ? 'income' : 'expense';
            if (acc.type === 'credit') txType = diff > 0 ? 'expense' : 'income';

            const txAmount = Math.abs(diff);
            const catId = txType === 'income' ? 'c_other_inc' : 'c_other_exp';
            
            S.transactions.push({
                id: uid(),
                type: txType,
                amount: txAmount,
                date: today(),
                categoryId: catId,
                accountId: accId,
                note: `Корректировка баланса (${diff > 0 ? '+' : ''}${diff})`,
                ignoreInStats: true,
                _updatedAt: Date.now()
            });

            save();
            renderAll();
            closeModal();
            toast('Баланс обновлен');
        };
    };

    const prevOpenTxModal = window.openTxModal;
    window.openTxModal = function(id) {
        if (prevOpenTxModal) prevOpenTxModal(id);
        window._currentEditingTxId = id || null;
        
        if (id) {
            const oldTx = S.transactions.find(t => t.id === id);
            if (oldTx) {
                window._editingTxIsHistory = oldTx.isHistory;
                window._editingTxTInvestId = oldTx.tinvestOpId;
            }
        } else {
            window._editingTxIsHistory = false;
            window._editingTxTInvestId = null;
        }
        
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

    const prevSaveWithIgnore = window.save;
    window.save = function(isUserAction = true) {
        const accForm = document.getElementById('accForm');
        const ignoreCb = document.getElementById('accIgnoreBalance');
        const archCb = document.getElementById('accArchived');
        const linkedCardCb = document.getElementById('accLinkedCard');
        if (accForm) {
            if (window._currentEditingAccId) {
                const acc = S.accounts.find(a => a.id === window._currentEditingAccId);
                if (acc) {
                    if (ignoreCb) acc.ignoreBalance = ignoreCb.checked;
                    if (archCb) acc.archived = archCb.checked;
                    if (linkedCardCb) acc.linkedCardId = linkedCardCb.value || null;
                }
            } else {
                if (S.accounts.length > 0) {
                    const lastAcc = S.accounts[S.accounts.length - 1];
                    if (ignoreCb) lastAcc.ignoreBalance = ignoreCb.checked;
                    if (archCb) lastAcc.archived = archCb.checked;
                    if (linkedCardCb) lastAcc.linkedCardId = linkedCardCb.value || null;
                }
            }
        }

        const txForm = document.getElementById('txForm');
        const txIgnoreCb = document.getElementById('txIgnoreInStats');
        if (txForm && txIgnoreCb) {
            if (window._currentEditingTxId) {
                const tx = S.transactions.find(t => t.id === window._currentEditingTxId);
                if (tx) {
                    tx.ignoreInStats = txIgnoreCb.checked;
                    if (window._editingTxIsHistory) tx.isHistory = true;
                    if (window._editingTxTInvestId) tx.tinvestOpId = window._editingTxTInvestId;
                }
            } else {
                const lastTx = S.transactions[S.transactions.length - 1];
                if (lastTx) lastTx.ignoreInStats = txIgnoreCb.checked;
            }
        }

        if (prevSaveWithIgnore) prevSaveWithIgnore.call(this, isUserAction);
    };

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
