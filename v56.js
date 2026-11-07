// ==========================================
// ФИНАЛЬНЫЙ МОДУЛЬ v80 (Интеграции и Фиксы)
// ==========================================
(function() {
    console.log("✅ Файл v56.js загружен (v80)");

    if (typeof S !== 'undefined') {
        if (!S.meta) S.meta = { deletedIds: [] };
        if (!S.meta.deletedIds) S.meta.deletedIds = [];
    }

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
    // ИНТЕГРАЦИЯ С Т-ИНВЕСТ
    // ==========================================
    window.syncTInvest = async function() {
        const token = document.getElementById('secTInvestToken').value.trim();
        if (!token) { toast('Сначала вставьте токен и нажмите Сохранить!'); return; }
        
        toast('⏳ Запрашиваем счета из Т-Инвестиций...');
        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        
        try {
            const accRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_accounts', token: token }) });
            const accData = await accRes.json();
            
            if (!accData.accounts) { toast('❌ Ошибка Т-Инвеста: ' + (accData.message || 'Нет доступа')); return; }

            let syncedCount = 0;
            let createdCount = 0;
            
            let tBank = S.banks.find(b => b.name.toLowerCase().includes('т-банк') || b.name.toLowerCase().includes('тинькофф'));
            if (!tBank) { tBank = { id: uid(), name: 'Т-Банк', color: '#f5b945', parentId: null, order: S.banks.length, _updatedAt: Date.now() }; S.banks.push(tBank); }

            for (const apiAcc of accData.accounts) {
                if (apiAcc.status !== 'ACCOUNT_STATUS_OPEN') continue;

                toast(`⏳ Запрашиваем портфель (${apiAcc.name || 'Брокерский'})...`);
                const portRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_portfolio', token: token, accountId: apiAcc.id }) });
                const portData = await portRes.json();
                
                if (portData.totalAmountPortfolio) {
                    const rub = parseFloat(portData.totalAmountPortfolio.units || 0) + (parseFloat(portData.totalAmountPortfolio.nano || 0) / 1000000000);
                    let localAcc = S.accounts.find(a => a.tinvestId === apiAcc.id);
                    
                    if (!localAcc) {
                        const isIIS = apiAcc.type === 'ACCOUNT_TYPE_TINKOFF_IIS';
                        localAcc = { id: uid(), bankId: tBank.id, name: apiAcc.name || (isIIS ? 'ИИС (Т-Инвест)' : 'Брокерский (Т-Инвест)'), type: isIIS ? 'iis' : 'brokerage', initialBalance: 0, currency: 'RUB', inCushion: false, isTransit: false, archived: false, tinvestId: apiAcc.id, order: S.accounts.length, _updatedAt: Date.now() };
                        S.accounts.push(localAcc);
                        createdCount++;
                    }

                    const currentBal = accValue(localAcc);
                    const diff = rub - currentBal;
                    
                    if (Math.abs(diff) > 1) {
                        S.transactions.push({ id: uid(), type: diff > 0 ? 'income' : 'expense', amount: Math.abs(diff), date: today(), categoryId: diff > 0 ? 'c_other_inc' : 'c_other_exp', accountId: localAcc.id, note: `Синхронизация с Т-Инвест`, _updatedAt: Date.now() });
                        localAcc._updatedAt = Date.now(); 
                        syncedCount++;
                    }
                }
            }
            recalculateBalances(); save(); renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            if (createdCount > 0 || syncedCount > 0) toast(`✅ Успех! Создано: ${createdCount}, обновлено: ${syncedCount}`);
            else toast('Баланс уже актуален (разницы нет)');
        } catch (e) { console.error(e); toast('❌ Ошибка синхронизации. Проверьте токен.'); }
    };

    // ==========================================
    // ФИКСЫ ОКНА СЧЕТА (Игнор баланса, Срок в днях, Хедж)
    // ==========================================
    const prevOpenAccountModal = window.openAccountModal;
    window.openAccountModal = function(id, bankId) {
        if (prevOpenAccountModal) prevOpenAccountModal(id, bankId);
        const modal = document.getElementById('modalContent'); if (!modal) return;
        const acc = id ? getAcc(id) : null; const form = document.getElementById('accForm'); if (!form) return;
        
        window._currentEditingAccId = id || null; 

        const cushionLabel = form.querySelector('input[id="accCushion"]').closest('.form-group');
        const ignoreDiv = document.createElement('div'); ignoreDiv.className = 'form-group';
        ignoreDiv.innerHTML = `<label><input type="checkbox" id="accIgnoreBalance" style="width:auto;margin-right:8px" ${acc && acc.ignoreBalance ? 'checked' : ''}>👁️‍🗨️ Исключить из общего баланса</label>`;
        cushionLabel.after(ignoreDiv);
        
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

    // ФИКС СОХРАНЕНИЯ ГАЛОЧКИ ИГНОРИРОВАНИЯ
    const prevSaveWithIgnore = window.save;
    window.save = function(isUserAction = true) {
        const accForm = document.getElementById('accForm');
        const ignoreCb = document.getElementById('accIgnoreBalance');
        
        if (accForm && ignoreCb) {
            const isIgnore = ignoreCb.checked;
            if (window._currentEditingAccId) {
                const acc = S.accounts.find(a => a.id === window._currentEditingAccId);
                if (acc) acc.ignoreBalance = isIgnore;
            } else {
                if (S.accounts.length > 0) {
                    S.accounts[S.accounts.length - 1].ignoreBalance = isIgnore;
                }
            }
        }
        if (prevSaveWithIgnore) prevSaveWithIgnore.call(this, isUserAction);
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
