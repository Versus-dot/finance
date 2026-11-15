// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js) v10
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста (mod-tinvest-fix.js) v10 загружен");

    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    // Перехват пересчета балансов, чтобы игнорировать исторические операции (только для старых доходов/расходов)
    const originalRecalculateBalances = window.recalculateBalances;
    window.recalculateBalances = function() {
        S.accounts.forEach(a => a.balance = a.initialBalance || 0);
        S.transactions.forEach(t => {
            if (t.isHistory && t.type !== 'transfer') return; // Пропускаем исторические операции, КРОМЕ переводов
            if (t.type === 'income') { const a = getAcc(t.accountId); if(a) a.balance += t.amount; }
            else if (t.type === 'expense') { const a = getAcc(t.accountId); if(a) a.balance -= t.amount; }
            else if (t.type === 'transfer') {
                const f = getAcc(t.accountId); const to = getAcc(t.toAccountId);
                if(f) f.balance -= t.amount; if(to) to.balance += t.amount;
            } else if (t.type === 'debt') {
                const a = getAcc(t.accountId);
                if (a) {
                    if(t.debtType === 'lent' || t.debtType === 'repaid') a.balance -= t.amount;
                    else if(t.debtType === 'borrowed' || t.debtType === 'returned') a.balance += t.amount;
                }
            }
        });
    };

    window.syncTInvest = async function(fetchAll = false) {
        const tokenInput = document.getElementById('secTInvestToken');
        const token = tokenInput ? tokenInput.value.trim() : (S.settings.tInvestToken || '');
        
        if (!token) { toast('Сначала вставьте токен в разделе Безопасность и нажмите Сохранить!'); return; }
        
        toast(`⏳ Запрашиваем счета (${fetchAll ? 'вся история' : 'за год'})...`);
        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        
        try {
            const accRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_accounts', token: token }) });
            const accData = await accRes.json();
            
            if (!accData.accounts) { toast('❌ Ошибка Т-Инвеста: ' + (accData.message || 'Нет доступа')); return; }

            let syncedCount = 0;
            let createdCount = 0;
            let txCount = 0;
            
            let tBank = S.banks.find(b => b.name.toLowerCase().includes('т-банк') || b.name.toLowerCase().includes('тинькофф'));
            if (!tBank) { 
                tBank = { id: uid(), name: 'Т-Банк', color: '#f5b945', parentId: null, order: S.banks.length, _updatedAt: Date.now() }; 
                S.banks.push(tBank); 
            }

            // Находим дефолтную карту для переводов (первая дебетовая)
            let defaultCard = S.accounts.find(a => (a.type === 'debit' || a.type === 'cash') && !a.archived);

            for (const apiAcc of accData.accounts) {
                if (apiAcc.status !== 'ACCOUNT_STATUS_OPEN') continue;

                let localAcc = S.accounts.find(a => a.tinvestId === apiAcc.id);
                if (!localAcc) {
                    const isIIS = apiAcc.type === 'ACCOUNT_TYPE_TINKOFF_IIS';
                    localAcc = { 
                        id: uid(), bankId: tBank.id, name: apiAcc.name || (isIIS ? 'ИИС (Т-Инвест)' : 'Брокерский (Т-Инвест)'), 
                        type: isIIS ? 'iis' : 'brokerage', initialBalance: 0, currency: 'RUB', inCushion: false, isTransit: false, archived: false, 
                        tinvestId: apiAcc.id, order: S.accounts.length, _updatedAt: Date.now() 
                    };
                    S.accounts.push(localAcc);
                    createdCount++;
                }

                toast(`⏳ Запрашиваем операции (${apiAcc.name || 'Брокерский'})...`);
                
                let fromDate;
                if (fetchAll) {
                    fromDate = new Date(2020, 0, 1).toISOString();
                } else {
                    const now = new Date();
                    fromDate = new Date(now.getFullYear(), 0, 1).toISOString(); // С начала текущего года
                }
                
                const toDate = new Date().toISOString();
                let txSumForAcc = 0;

                try {
                    const opRes = await fetch(PROXY, { 
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ action: 'tinvest_operations', token: token, accountId: apiAcc.id, from: fromDate, to: toDate }) 
                    });
                    const opData = await opRes.json();
                    
                    if (opData && opData.operations && Array.isArray(opData.operations)) {
                        opData.operations.forEach(op => {
                            if (S.transactions.some(t => t.tinvestOpId === op.id)) return;

                            const opTypeRaw = op.operationType || op.type || '';
                            const opType = opTypeRaw.toLowerCase(); 
                            
                            const amount = Math.abs(qv(op.payment));
                            const dateStr = op.date ? op.date.slice(0, 10) : today();
                            
                            let type = null, catId = null, note = '', toAccId = null, fromAccId = null;
                            
                            if (opType.includes('купон') || opType.includes('coupon')) { 
                                type = 'income'; catId = 'c_coupon'; note = 'Купон (авто)'; 
                            } else if (opType.includes('дивиденд') || opType.includes('dividend')) { 
                                type = 'income'; catId = 'c_dividend'; note = 'Дивиденды (авто)'; 
                            } else if (opType.includes('налог') || opType.includes('tax')) { 
                                type = 'expense'; catId = 'c_taxes'; note = 'Налог (авто)'; 
                            } else if (opType.includes('input') || opType.includes('пополнение') || opType.includes('ввод')) {
                                type = 'transfer'; note = 'Пополнение Т-Инвест (Авто)';
                                const linkedCardId = localAcc.linkedCardId || (defaultCard ? defaultCard.id : null);
                                if (linkedCardId) { fromAccId = linkedCardId; toAccId = localAcc.id; }
                            } else if (opType.includes('output') || opType.includes('вывод')) {
                                type = 'transfer'; note = 'Вывод из Т-Инвест (Авто)';
                                const linkedCardId = localAcc.linkedCardId || (defaultCard ? defaultCard.id : null);
                                if (linkedCardId) { fromAccId = localAcc.id; toAccId = linkedCardId; }
                            }
                            
                            if (!type) return; 
                            if (amount <= 0.01) return; 
                            if (!getCat(catId) && (type === 'income' || type === 'expense')) catId = type === 'income' ? 'c_other_inc' : 'c_other_exp';

                            // Умная защита от дублей для переводов
                            if (type === 'transfer') {
                                if (!fromAccId || !toAccId) return; 
                                const isDup = S.transactions.some(t => 
                                    t.type === 'transfer' && t.date === dateStr && Math.abs(t.amount - amount) < 0.01 && 
                                    t.accountId === fromAccId && t.toAccountId === toAccId
                                );
                                if (isDup) return;
                            }

                            S.transactions.push({
                                id: uid(),
                                type: type,
                                amount: amount,
                                date: dateStr,
                                categoryId: catId,
                                accountId: type === 'transfer' ? fromAccId : localAcc.id,
                                toAccountId: type === 'transfer' ? toAccId : null,
                                note: note,
                                tinvestOpId: op.id,
                                isHistory: (fetchAll && new Date(dateStr) < new Date(new Date().getFullYear(), 0, 1)) ? true : false,
                                _updatedAt: Date.now()
                            });
                            txCount++;
                        });
                    }
                } catch (e) { console.warn('Ошибка операций', e); }

                // Синхронизация баланса
                try {
                    const portRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_portfolio', token: token, accountId: apiAcc.id }) });
                    const portData = await portRes.json();
                    
                    if (portData && portData.totalAmountPortfolio) {
                        const totalRub = qv(portData.totalAmountPortfolio);
                        
                        recalculateBalances(); 
                        const balanceWithNewTxs = accValue(localAcc);
                        const diff = totalRub - balanceWithNewTxs;
                        
                        if (Math.abs(diff) > 1) {
                            localAcc.initialBalance = (localAcc.initialBalance || 0) + diff;
                            localAcc._updatedAt = Date.now(); 
                            syncedCount++;
                        }

                        localAcc.portfolioBreakdown = {
                            stocks: qv(portData.totalAmountShares),
                            bonds: qv(portData.totalAmountBonds),
                            etf: qv(portData.totalAmountEtf),
                            cash: qv(portData.totalAmountCurrencies),
                            futures: qv(portData.totalAmountFutures)
                        };
                    }
                } catch (e) { console.warn('Ошибка портфеля', e); }
            }
            
            recalculateBalances();
            save(); 
            renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            
            if (createdCount > 0 || syncedCount > 0 || txCount > 0) {
                toast(`✅ Успех! Счетов: ${createdCount}, балансов: ${syncedCount}, операций: ${txCount}`);
            } else {
                toast('Все данные актуальны');
            }
            
        } catch (e) { 
            console.error(e); 
            toast('❌ Ошибка синхронизации. Проверьте токен.'); 
        }
    };

    window.cleanupFakeTInvestTransactions = function() {
        if (!confirm('Удалить все старые операции "Синхронизация с Т-Инвест"?\n\nЭто очистит статистику, но не затронет реальные доходы/расходы.')) return;
        const fakeTxs = S.transactions.filter(t => t.note === 'Синхронизация с Т-Инвест');
        if (fakeTxs.length > 0) {
            if (!S.meta) S.meta = { deletedIds: [] };
            if (!S.meta.deletedIds) S.meta.deletedIds = [];
            fakeTxs.forEach(t => S.meta.deletedIds.push(t.id));
            S.transactions = S.transactions.filter(t => t.note !== 'Синхронизация с Т-Инвест');
            save(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            renderAll();
            toast(`✅ Удалено ${fakeTxs.length} фейковых операций`);
        } else {
            toast('Мусорных операций не найдено');
        }
    };

    const prevRenderStats = window.renderStats;
    window.renderStats = function() {
        if (prevRenderStats) prevRenderStats();
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 150);
    };
})();
