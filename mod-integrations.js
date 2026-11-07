// ==========================================
// МОДУЛЬ ИНТЕГРАЦИЙ (Т-Инвест) - mod-integrations.js
// ==========================================
(function() {
    console.log("✅ Модуль интеграций (mod-integrations.js) загружен");

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
})();
