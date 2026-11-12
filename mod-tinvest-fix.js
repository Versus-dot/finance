// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js) v2
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста (mod-tinvest-fix.js) v2 загружен");

    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    // ==========================================
    // 1. ПРАВИЛЬНАЯ СИНХРОНИЗАЦИЯ С Т-ИНВЕСТ
    // ==========================================
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

                // 1. СИНХРОНИЗАЦИЯ БАЛАНСА
                toast(`⏳ Запрашиваем портфель (${apiAcc.name || 'Брокерский'})...`);
                const portRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_portfolio', token: token, accountId: apiAcc.id }) });
                const portData = await portRes.json();
                
                if (portData.totalAmountPortfolio) {
                    const totalRub = qv(portData.totalAmountPortfolio);
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

                    // 2. СИНХРОНИЗАЦИЯ ИСТОРИИ ОПЕРАЦИЙ (Купоны, Дивиденды, Налоги)
                    toast(`⏳ Запрашиваем операции (${apiAcc.name || 'Брокерский'})...`);
                    const now = new Date();
                    const fromDate = new Date(now.getFullYear(), 0, 1).toISOString(); // С начала года
                    const toDate = now.toISOString();

                    const opRes = await fetch(PROXY, { 
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ action: 'tinvest_operations', token: token, accountId: apiAcc.id, from: fromDate, to: toDate }) 
                    });
                    const opData = await opRes.json();

                    if (opData.operations && Array.isArray(opData.operations)) {
                        opData.operations.forEach(op => {
                            // Проверка на дубликаты по ID операции из Т-Инвеста
                            if (S.transactions.some(t => t.tinvestOpId === op.id)) return;

                            let type = null, catId = null, note = '';
                            
                            if (op.type === 'OPERATION_TYPE_COUPON') { type = 'income'; catId = 'c_coupon'; note = 'Купон (авто)'; }
                            else if (op.type === 'OPERATION_TYPE_DIVIDEND') { type = 'income'; catId = 'c_dividend'; note = 'Дивиденды (авто)'; }
                            else if (op.type === 'OPERATION_TYPE_TAX') { type = 'expense'; catId = 'c_taxes'; note = 'Налог (авто)'; }
                            else return; // Игнорируем другие типы (пополнения, покупки и т.д.)

                            const amount = Math.abs(qv(op.payment));
                            if (amount <= 0.01) return; // Пропускаем нулевые

                            if (!getCat(catId)) catId = type === 'income' ? 'c_other_inc' : 'c_other_exp';

                            S.transactions.push({
                                id: uid(),
                                type: type,
                                amount: amount,
                                date: op.date.slice(0, 10),
                                categoryId: catId,
                                accountId: localAcc.id,
                                note: note,
                                tinvestOpId: op.id, // Сохраняем ID для защиты от дублей
                                _updatedAt: Date.now()
                            });
                            txCount++;
                        });
                    }
                }
            }
            
            if (txCount > 0) {
                recalculateBalances();
            }
            save(); 
            renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            
            if (createdCount > 0 || syncedCount > 0 || txCount > 0) {
                toast(`✅ Успех! Счетов: ${createdCount}, балансов: ${syncedCount}, операций: ${txCount}`);
            } else {
                toast('Все данные уже актуальны');
            }
            
        } catch (e) { console.error(e); toast('❌ Ошибка синхронизации. Проверьте токен.'); }
    };

    // ==========================================
    // 2. ОЧИСТКА СТАРЫХ ФЕЙКОВЫХ ОПЕРАЦИЙ
    // ==========================================
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

    // ==========================================
    // 3. ФИКС ГРАФИКОВ СТАТИСТИКИ НА ТЕЛЕФОНЕ
    // ==========================================
    const prevRenderStats = window.renderStats;
    window.renderStats = function() {
        if (prevRenderStats) prevRenderStats();
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 150);
    };
})();
