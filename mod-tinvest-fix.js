// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js) v17
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста (mod-tinvest-fix.js) v16 загружен");

    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    const originalRecalculateBalances = window.recalculateBalances;
    window.recalculateBalances = function() {
        S.accounts.forEach(a => a.balance = a.initialBalance || 0);
        S.transactions.forEach(t => {
            if (t.isHistory) return; 
            
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

    window.wipeTransactionHistory = async function() {
        if (!confirm('⚠️ ВНИМАНИЕ! Это удалит ВСЕ операции (включая твои ручные) и снимки.\n\nСчета и банки останутся на месте.\n\nПродолжить?')) return;
        if (!confirm('Точно продолжить? Отменить это будет невозможно.')) return;

        toast('🧹 Очистка истории...');

        S.transactions = [];
        S.snapshots = [];
        if (S.meta) S.meta.deletedIds = [];
        
        save();

        if (S.settings.yandexToken) {
            toast('☁️ Перезапись облака...');
            const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
            const cloudS = JSON.parse(JSON.stringify(S));
            const localSettings = ['theme', 'badgeStyle', 'pinCode', 'yandexToken', 'tInvestToken', 'appTitle'];
            localSettings.forEach(k => delete cloudS.settings[k]);

            try {
                await fetch(PROXY, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ action: 'yandex_upload', token: S.settings.yandexToken, fileContent: JSON.stringify(cloudS, null, 2) }) 
                });
                localStorage.setItem('financeApp_lastSync', Date.now());
                localStorage.setItem('financeApp_localChange', Date.now());
                toast('✅ База очищена и перезаписана в облако');
            } catch (e) {
                console.error('Ошибка очистки облака', e);
                toast('⚠️ Локально очищено, но облако не перезаписалось');
            }
        }
        renderAll();
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
                
                let allOps = [];

                try {
                    if (fetchAll) {
                        const curYear = new Date().getFullYear();
                        for (let y = 2020; y <= curYear; y++) {
                            toast(`⏳ Загрузка (${apiAcc.name || 'Счет'}) за ${y} год...`);
                            let yFrom = new Date(y, 0, 1).toISOString();
                            let yTo = (y === curYear) ? new Date().toISOString() : new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
                            
                            const opRes = await fetch(PROXY, { 
                                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ action: 'tinvest_operations', token: token, accountId: apiAcc.id, from: yFrom, to: yTo }) 
                            });
                            const opData = await opRes.json();
                            
                            if (opData && opData.operations && Array.isArray(opData.operations)) {
                                allOps = allOps.concat(opData.operations);
                            }
                            // Пауза, чтобы не превысить лимиты API
                            await new Promise(r => setTimeout(r, 300));
                        }
                    } else {
                        const now = new Date();
                        let yFrom = new Date(now.getFullYear(), 0, 1).toISOString();
                        let yTo = now.toISOString();
                        
                        const opRes = await fetch(PROXY, { 
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ action: 'tinvest_operations', token: token, accountId: apiAcc.id, from: yFrom, to: yTo }) 
                        });
                        const opData = await opRes.json();
                        
                        if (opData && opData.operations && Array.isArray(opData.operations)) {
                            allOps = opData.operations;
                        }
                    }

                    // Обработка собранных операций
                    allOps.forEach(op => {
                        if (S.transactions.some(t => t.tinvestOpId === op.id)) return;

                        const opTypeRaw = op.operationType || op.type || '';
                        const opType = opTypeRaw.toLowerCase(); 
                        
                        const amount = Math.abs(qv(op.payment));
                        const d = new Date(op.date);
                        const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                        
                        let type = null, catId = null, note = '', toAccId = null, fromAccId = null;
                        
                        if (opType.includes('купон') || opType.includes('coupon')) { 
                            type = 'income'; catId = 'c_coupon'; note = 'Купон (авто)'; 
                        } else if (opType.includes('дивиденд') || opType.includes('dividend')) { 
                            type = 'income'; catId = 'c_dividend'; note = 'Дивиденды (авто)'; 
                        } else if (opType.includes('налог') || opType.includes('tax')) { 
                            type = 'expense'; catId = 'c_taxes'; note = 'Налог (авто)'; 
                        } else if (opType.includes('input') || opType.includes('пополнение') || opType.includes('ввод')) {
                            type = 'transfer'; note = 'Пополнение Т-Инвест (Авто)';
                            const linkedCardId = localAcc.linkedCardId;
                            if (linkedCardId) { fromAccId = linkedCardId; toAccId = localAcc.id; }
                        } else if (opType.includes('output') || opType.includes('вывод')) {
                            type = 'transfer'; note = 'Вывод из Т-Инвест (Авто)';
                            const linkedCardId = localAcc.linkedCardId;
                            if (linkedCardId) { fromAccId = localAcc.id; toAccId = linkedCardId; }
                        }
                        
                        if (!type) return; 
                        if (amount <= 0.01) return; 
                        if (!getCat(catId) && (type === 'income' || type === 'expense')) catId = type === 'income' ? 'c_other_inc' : 'c_other_exp';

                        if (type === 'transfer' && (!fromAccId || !toAccId)) return; 

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

                } catch (e) { console.warn('Ошибка операций', e); }

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

    // 1. Удаление всех операций Т-Инвест
    window.deleteAllTInvestOperations = function() {
        if (!confirm('⚠️ Вы уверены, что хотите удалить ВСЕ операции, полученные из Т-Инвест? Ваши ручные операции останутся.')) return;
        
        const initialCount = S.transactions.length;
        S.transactions = S.transactions.filter(t => !t.tinvestOpId);
        const deletedCount = initialCount - S.transactions.length;
        
        if (deletedCount > 0) {
            if (typeof recalculateBalances === 'function') recalculateBalances();
            save();
            renderAll();
            toast(`Удалено операций Т-Инвест: ${deletedCount}`);
        } else {
            toast('Операции Т-Инвест не найдены');
        }
    };

    // 2. Очистка дублей Т-Инвест
    window.cleanupTInvestDuplicates = function() {
        if (!confirm('Очистить дубликаты операций Т-Инвест? (Будут оставлены только первые вхождения)')) return;
        
        const seen = new Set();
        const initialCount = S.transactions.length;
        
        S.transactions = S.transactions.filter(t => {
            if (t.tinvestOpId) {
                if (seen.has(t.tinvestOpId)) {
                    return false;
                }
                seen.add(t.tinvestOpId);
            }
            return true;
        });
        
        const deletedCount = initialCount - S.transactions.length;
        
        if (deletedCount > 0) {
            if (typeof recalculateBalances === 'function') recalculateBalances();
            save();
            renderAll();
            toast(`Удалено дубликатов: ${deletedCount}`);
        } else {
            toast('Дубликаты не найдены');
        }
    };

})();
