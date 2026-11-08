// ==========================================
// ФИКС Т-ИНВЕСТА И СТАТИСТИКИ (mod-tinvest-fix.js)
// ==========================================
(function() {
    console.log("✅ Модуль фиксов Т-Инвеста и Статистики загружен");

    const qv = (val) => {
        if (!val) return 0;
        return parseFloat(val.units || 0) + (parseFloat(val.nano || 0) / 1000000000);
    };

    // ==========================================
    // 1. ПРАВИЛЬНАЯ СИНХРОНИЗАЦИЯ С Т-ИНВЕСТ
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
                    
                    // ТИХАЯ КОРРЕКТИРОВКА БАЛАНСА (без создания транзакций)
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
            }
            
            recalculateBalances(); save(); renderAll(); 
            if (typeof syncSmart === 'function') syncSmart(true); 
            
            if (createdCount > 0 || syncedCount > 0) toast(`✅ Успех! Создано: ${createdCount}, обновлено: ${syncedCount}`);
            else toast('Баланс уже актуален (разницы нет)');
            
        } catch (e) { console.error(e); toast('❌ Ошибка синхронизации. Проверьте токен.'); }
    };

    // ==========================================
    // 2. ОЧИСТКА СТАРЫХ ФЕЙКОВЫХ ОПЕРАЦИЙ
    // ==========================================
    window.cleanupFakeTInvestTransactions = function() {
        if (!confirm('Удалить все старые операции "Синхронизация с Т-Инвест", которые были созданы до обновления?\n\nЭто очистит статистику, но не затронет реальные доходы/расходы.')) return;
        
        const beforeCount = S.transactions.length;
        S.transactions = S.transactions.filter(t => t.note !== 'Синхронизация с Т-Инвест');
        const deletedCount = beforeCount - S.transactions.length;
        
        if (deletedCount > 0) {
            save();
            renderAll();
            if (typeof syncSmart === 'function') syncSmart(true);
            toast(`✅ Удалено ${deletedCount} фейковых операций`);
        } else {
            toast('Мусорных операций не найдено');
        }
    };

    // Добавляем кнопку очистки в окно Безопасности (рядом с Т-Инвестом)
    const prevOpenSecurity = window.openSecuritySettings;
    window.openSecuritySettings = function() {
        if (prevOpenSecurity) prevOpenSecurity();
        
        setTimeout(() => {
            const tInvestBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Запросить баланс'));
            if (tInvestBtn) {
                const cleanBtn = document.createElement('button');
                cleanBtn.className = 'btn-secondary btn-block';
                cleanBtn.style.marginBottom = '8px';
                cleanBtn.style.color = 'var(--red)';
                cleanBtn.innerHTML = '🧹 Очистить старые операции Т-Инвеста';
                cleanBtn.onclick = window.cleanupFakeTInvestTransactions;
                tInvestBtn.after(cleanBtn);
            }
        }, 100);
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
