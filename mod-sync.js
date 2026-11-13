// ==========================================
// МОДУЛЬ СИНХРОНИЗАЦИИ (mod-sync.js) v3
// ==========================================
(function() {
    console.log("✅ Модуль синхронизации (mod-sync.js) v3 загружен");

    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('cloud-api.yandex.net')) {
            return Promise.resolve(new Response(JSON.stringify({ message: "Not Found" }), {
                status: 404, headers: { 'Content-Type': 'application/json' }
            }));
        }
        return originalFetch.apply(this, arguments);
    };

    window.checkDailyBackup = async function() {};
    window.queueSmartSync = function() {}; 
    window.performSmartSync = function() {};
    window.checkCloudSync = function() {};
    window.silentAutoSave = function() {};

    const originalBackup = window.backupToYandexDisk; 
    window.backupToYandexDisk = async function(silent = false) { 
        if (typeof S !== 'undefined') { 
            const isEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0); 
            const isReset = localStorage.getItem('financeApp_isReset') === 'true'; 
            if (isEmpty && isReset) { 
                if (!silent && typeof toast === 'function') toast('Отправка пустых данных заблокирована'); 
                return; 
            } 
        } 
        if (typeof window.syncSmart === 'function') {
            await window.syncSmart(false);
        }
    };

    setTimeout(() => { 
        if (localStorage.getItem('financeApp_isReset') === 'true') { 
            const banner = document.createElement('div'); 
            banner.id = 'restoreBanner'; 
            banner.innerHTML = `<span>Данные очищены. Восстановить из облака?</span><button onclick="window.restoreFromYandexDisk()">Восстановить</button>`; 
            const main = document.querySelector('main'); 
            if (main) main.prepend(banner); 
        } 
    }, 1000);

    if (!window._prevState && typeof S !== 'undefined') {
        window._prevState = JSON.parse(JSON.stringify(S));
    }

    const originalSave = window.save;
    window.save = function(isUserAction = true) {
        if (isUserAction && typeof S !== 'undefined' && window._prevState) {
            ['accounts', 'transactions', 'banks', 'categories', 'budgets', 'debts'].forEach(key => {
                if (!S[key] || !window._prevState[key]) return;
                S[key].forEach(newItem => {
                    const oldItem = window._prevState[key].find(x => x.id === newItem.id);
                    if (!oldItem) {
                        newItem._updatedAt = Date.now();
                    } else {
                        const cleanNew = { ...newItem }; delete cleanNew._updatedAt;
                        const cleanOld = { ...oldItem }; delete cleanOld._updatedAt;
                        if (JSON.stringify(cleanNew) !== JSON.stringify(cleanOld)) {
                            newItem._updatedAt = Date.now();
                        }
                    }
                });
            });
            window._prevState = JSON.parse(JSON.stringify(S));
            localStorage.setItem('financeApp_localChange', Date.now()); 
            scheduleSync();
        }

        if (originalSave) originalSave.call(this, isUserAction);
        if (typeof applyBadgeStyle === 'function') applyBadgeStyle();
    };

    let syncTimeout;
    function scheduleSync() { 
        clearTimeout(syncTimeout); 
        syncTimeout = setTimeout(() => { syncSmart(false); }, 2000); 
    }

    function sendBeaconUpload() {
        if (typeof S === 'undefined') return;
        const token = S.settings.yandexToken;
        if (!token) return;
        
        const isLocalEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0);
        if (isLocalEmpty) return; 

        const cloudS = JSON.parse(JSON.stringify(S));
        const localSettings = ['theme', 'badgeStyle', 'pinCode', 'yandexToken', 'tInvestToken', 'appTitle'];
        localSettings.forEach(k => delete cloudS.settings[k]);

        const payload = JSON.stringify({ action: 'yandex_upload', token: token, fileContent: JSON.stringify(cloudS) });
        const blob = new Blob([payload], { type: 'text/plain' });
        navigator.sendBeacon('https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm', blob);
    }
    
    window.addEventListener('pagehide', sendBeaconUpload);
    document.addEventListener('visibilitychange', () => { 
        if (document.visibilityState === 'hidden') sendBeaconUpload();
    });

    window.syncSmart = async function(isManual = false) {
        if (typeof S === 'undefined') return;
        const token = S.settings.yandexToken;
        if (!token) { if (isManual && typeof toast === 'function') toast('Укажите токен в Безопасности'); return; }

        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        if (isManual && typeof toast === 'function') toast('⏳ Проверка облака...');

        try {
            const metaRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'yandex_meta', token: token }) });
            
            if (metaRes.status === 404) {
                await uploadToCloud(token);
                if (isManual && typeof toast === 'function') toast('✅ Данные отправлены в облако');
                return;
            }

            const metaData = await metaRes.json();
            const cloudModified = new Date(metaData.modified).getTime();
            const lastSync = parseInt(localStorage.getItem('financeApp_lastSync') || '0');
            const localChange = parseInt(localStorage.getItem('financeApp_localChange') || '0');

            if (isManual) {
                if (typeof toast === 'function') toast('⬇️ Скачиваем и сливаем данные...');
                await downloadFromCloud(token, cloudModified, isManual);
                await uploadToCloud(token);
                if (typeof toast === 'function') toast('✅ Синхронизация завершена');
                return;
            }

            const isLocalEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0);

            if (isLocalEmpty) {
                await downloadFromCloud(token, cloudModified, isManual);
                return;
            }

            if (cloudModified > localChange) {
                await downloadFromCloud(token, cloudModified, isManual);
                return;
            }

            if (localChange > lastSync) {
                await uploadToCloud(token);
                return;
            }

        } catch (e) {
            console.error('Sync error:', e);
            if (isManual && typeof toast === 'function') toast('❌ Ошибка синхронизации: ' + e.message);
        }
    };

    async function downloadFromCloud(token, cloudModified, isManual) {
        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        const downRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'yandex_download', token: token }) });
        if (!downRes.ok) throw new Error('Ошибка скачивания');
        const cloudText = await downRes.text();
        let cloudData;
        try { cloudData = JSON.parse(cloudText); } catch(e) { throw new Error('Битый файл в облаке'); }

        mergeData(cloudData);
        
        if (typeof S !== 'undefined') {
            window._prevState = JSON.parse(JSON.stringify(S));
        }

        localStorage.setItem('financeApp_lastSync', cloudModified);
        localStorage.setItem('financeApp_localChange', cloudModified); 
        
        if (typeof save === 'function') save(false); 
        if (typeof renderAll === 'function') renderAll();
        if (isManual && typeof toast === 'function') toast('✅ Данные обновлены из облака');
    }

    async function uploadToCloud(token) {
        if (typeof S === 'undefined') return;
        const isLocalEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0);
        if (isLocalEmpty) {
            throw new Error('Попытка загрузить пустую базу заблокирована');
        }

        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        
        const cloudS = JSON.parse(JSON.stringify(S));
        const localSettings = ['theme', 'badgeStyle', 'pinCode', 'yandexToken', 'tInvestToken', 'appTitle'];
        localSettings.forEach(k => delete cloudS.settings[k]);

        const res = await fetch(PROXY, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ action: 'yandex_upload', token: token, fileContent: JSON.stringify(cloudS, null, 2) }) 
        });
        
        if (res.ok) {
            localStorage.setItem('financeApp_lastSync', Date.now());
            localStorage.setItem('financeApp_localChange', Date.now()); 
        } else {
            throw new Error('Ошибка загрузки');
        }
    }

    function mergeData(cloudData) {
        if (typeof S === 'undefined') return;

        const localVisualSettings = {
            theme: S.settings.theme,
            badgeStyle: S.settings.badgeStyle,
            pinCode: S.settings.pinCode,
            yandexToken: S.settings.yandexToken,
            tInvestToken: S.settings.tInvestToken,
            appTitle: S.settings.appTitle
        };

        if (!S.meta) S.meta = { deletedIds: [] };
        if (!cloudData.meta) cloudData.meta = { deletedIds: [] };

        const allDeleted = [...new Set([...S.meta.deletedIds, ...cloudData.meta.deletedIds])];
        
        const mergeArray = (localArr, cloudArr) => {
            if (!localArr) return cloudArr || [];
            if (!cloudArr) return localArr;
            const map = new Map();
            localArr.forEach(item => { if(!allDeleted.includes(item.id)) map.set(item.id, item); });
            
            cloudArr.forEach(cItem => {
                if(allDeleted.includes(cItem.id)) return; 
                const lItem = map.get(cItem.id);
                if (!lItem) {
                    map.set(cItem.id, cItem);
                } else {
                    const lTime = lItem._updatedAt || 0;
                    const cTime = cItem._updatedAt || 0;
                    if (cTime > lTime) map.set(cItem.id, cItem); 
                }
            });
            return Array.from(map.values());
        };

        S.accounts = mergeArray(S.accounts, cloudData.accounts);
        S.transactions = mergeArray(S.transactions, cloudData.transactions);
        S.banks = mergeArray(S.banks, cloudData.banks);
        S.categories = mergeArray(S.categories, cloudData.categories);
        S.budgets = mergeArray(S.budgets, cloudData.budgets);
        S.debts = mergeArray(S.debts, cloudData.debts);
        S.counterparties = mergeArray(S.counterparties, cloudData.counterparties);
        
        // Слияние снимков капитала (по дате)
        if (cloudData.snapshots) {
            const snapMap = new Map();
            (S.snapshots || []).forEach(s => snapMap.set(s.date, s));
            cloudData.snapshots.forEach(s => {
                const existing = snapMap.get(s.date);
                // Если снимка нет, или сумма из облака больше (актуальнее), берем облачный
                if (!existing || s.total > existing.total) {
                    snapMap.set(s.date, s);
                }
            });
            S.snapshots = Array.from(snapMap.values()).sort((a,b) => a.date.localeCompare(b.date));
        }

        S.settings = { ...cloudData.settings, ...localVisualSettings };
        S.meta = { deletedIds: allDeleted, _updatedAt: Date.now() };
    }

    setTimeout(() => { if (typeof window.syncSmart === 'function') window.syncSmart(false); }, 1500); 
    window.syncManual = function() { window.syncSmart(true); };

    setTimeout(() => {
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.onclick = function() { window.syncManual(); };
        }
    }, 500);
})();