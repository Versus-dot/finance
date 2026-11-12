// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js) v7
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста (mod-tinvest-fix.js) v7 загружен");

    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    window.syncTInvest = async function() {
        const tokenInput = document.getElementById('secTInvestToken');
        const token = tokenInput ? tokenInput.value.trim() : (S.settings.tInvestToken || '');
        
        if (!token) { toast('Сначала вставьте токен в разделе Безопасность и нажмите Сохранить!'); return; }
        
        toast('⏳ Запрашиваем счета из Т-Инвестиций...');
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

                // 1. СИНХРОНИЗАЦИЯ БАЛАНСА
                try {
                    const portRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_portfolio', token: token, accountId: apiAcc.id }) });
                    const portData = await portRes.json();
                    
                    if (portData && portData.totalAmountPortfolio) {
                        const totalRub = qv(portData.totalAmountPortfolio);
                        const currentBal = accValue(localAcc);
                        const diff = totalRub - currentBal;
                        
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

                // 2. СИНХРОНИЗАЦИЯ ИСТОРИИ ОПЕРАЦИЙ (только за последние 3 месяца, чтобы не падал прокси)
                toast(`⏳ Запрашиваем операции (${apiAcc.name || 'Брокерский'})...`);
                const now = new Date();
                const fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(); 
                const toDate = now.toISOString();

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
                            const opType = opTypeRaw.toLowerCase(); // Приводим к нижнему регистру для удобства
                            
                            const amount = Math.abs(qv(op.payment));
                            
                            let type = null, catId = null, note = '';
                            
                            // Ищем по ключевым словам! Теперь поймаем и "Выплата купонов", и "Выплата купона"
                            if (opType.includes('купон') || opType.includes('coupon')) { 
                                type = 'income'; catId = 'c_coupon'; note = 'Купон (авто)'; 
                            } else if (opType.includes('дивиденд') || opType.includes('dividend')) { 
                                type = 'income'; catId = 'c_dividend'; note = 'Дивиденды (авто)'; 
                            } else if (opType.includes('налог') || opType.includes('tax')) { 
                                type = 'expense'; catId = 'c_taxes'; note = 'Налог (авто)'; 
                            }
                            
                            if (!type) return; 
                            if (amount <= 0.01) return; 

                            if (!getCat(catId)) catId = type === 'income' ? 'c_other_inc' : 'c_other_exp';

                            S.transactions.push({
                                id: uid(),
                                type: type,
                                amount: amount,
                                date: op.date ? op.date.slice(0, 10) : today(),
                                categoryId: catId,
                                accountId: localAcc.id,
                                note: note,
                                tinvestOpId: op.id,
                                _updatedAt: Date.now()
                            });
                            txCount++;
                        });
                    }
                } catch (e) { console.warn('Ошибка операций', e); }
            }
            
            if (txCount > 0) recalculateBalances();
            save(); 
            renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            
            if (createdCount > 0 || syncedCount > 0 || txCount > 0) {
                toast(`✅ Успех! Счетов: ${createdCount}, балансов: ${syncedCount}, операций: ${txCount}`);
            } else {
                toast('Все данные актуальны (новых купонов/дивидендов нет)');
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
