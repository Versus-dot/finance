// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js)
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста и Статистики загружен");

    // Вспомогательная функция для перевода формата {units, nano} в число
    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    // ==========================================
    // 1. ПЕРЕПИСАННАЯ СИНХРОНИЗАЦИЯ С Т-ИНВЕСТ
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
            if (!tBank) { 
                tBank = { id: uid(), name: 'Т-Банк', color: '#f5b945', parentId: null, order: S.banks.length, _updatedAt: Date.now() }; 
                S.banks.push(tBank); 
            }

            for (const apiAcc of accData.accounts) {
                if (apiAcc.status !== 'ACCOUNT_STATUS_OPEN') continue;

                toast(`⏳ Запрашиваем портфель (${apiAcc.name || 'Брокерский'})...`);
                const portRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'tinvest_portfolio', token: token, accountId: apiAcc.id }) });
                const portData = await portRes.json();
                
                if (portData.totalAmountPortfolio) {
                    const totalRub = qv(portData.totalAmountPortfolio);
                    
                    // Ищем счет в приложении
                    let localAcc = S.accounts.find(a => a.tinvestId === apiAcc.id);
                    
                    // Если счета нет — создаем
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

                    // Считаем текущий баланс в приложении (до синхронизации)
                    const currentBal = accValue(localAcc);
                    const diff = totalRub - currentBal;
                    
                    // ФИКС: Вместо создания транзакции, просто корректируем начальный баланс.
                    // Это тихо обновит сумму на счете, но не испортит статистику доходов/расходов.
                    if (Math.abs(diff) > 1) {
                        localAcc.initialBalance = (localAcc.initialBalance || 0) + diff;
                        localAcc._updatedAt = Date.now(); 
                        syncedCount++;
                    }

                    // ФИКС: Сохраняем разбивку портфеля (Акции, Облигации, ETF, Деньги)
                    localAcc.portfolioBreakdown = {
                        stocks: qv(portData.totalAmountShares),
                        bonds: qv(portData.totalAmountBonds),
                        etf: qv(portData.totalAmountEtf),
                        cash: qv(portData.totalAmountCurrencies),
                        futures: qv(portData.totalAmountFutures)
                    };
                }
            }
            
            recalculateBalances(); save(); renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            
            if (createdCount > 0 || syncedCount > 0) toast(`✅ Успех! Создано: ${createdCount}, обновлено: ${syncedCount}`);
            else toast('Баланс уже актуален (разницы нет)');
            
        } catch (e) { console.error(e); toast('❌ Ошибка синхронизации. Проверьте токен.'); }
    };

    // ==========================================
    // 2. ФИКС ГРАФИКОВ СТАТИСТИКИ НА ТЕЛЕФОНЕ
    // ==========================================
    // Перехватываем рендер статистики, чтобы принудительно обновить размеры графиков
    const prevRenderStats = window.renderStats;
    window.renderStats = function() {
        if (prevRenderStats) prevRenderStats();
        
        // Небольшая задержка, чтобы DOM успел отрисоваться, а затем пинок для Chart.js
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 150);
    };
})();
