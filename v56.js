// ==========================================
// ФИНАЛЬНЫЙ МОДУЛЬ v71 (Всё в одном)
// ==========================================
(function() {
    console.log("✅ Файл v56.js загружен (v71)");

    // 🚫 ГЛУШИЛКА СТАРОГО КОДА (запрещает app.js делать прямые запросы к Yandex API)
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('cloud-api.yandex.net')) {
            return Promise.reject(new Error("Blocked by v56.js"));
        }
        return originalFetch.apply(this, arguments);
    };

    window.queueSmartSync = function() {}; 
    window.performSmartSync = function() {};
    window.checkCloudSync = function() {};
    window.silentAutoSave = function() {};

    // ==========================================
    // СТИЛИ
    // ==========================================
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .modal, #modalBackdrop2 { overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch; }
        #fabBtn { display: none !important; }
        .account-row { transition: all 0.2s ease; }
        body.style-stripe .account-row { border-left: 4px solid var(--bank-color) !important; background: var(--card) !important; margin: 0 6px 0 10px !important; border-radius: 0 8px 8px 0 !important; border-bottom: 1px solid var(--border) !important; }
        body.style-stripe .account-row:has(.acc-debt) { background: rgba(255, 92, 92, 0.05) !important; }
        body.style-stripe .account-row:not(:has(.acc-debt)) { background: rgba(46, 204, 113, 0.04) !important; }
        body.style-bg .account-row { border-left: none !important; background: rgba(46, 204, 113, 0.1) !important; margin: 6px 10px !important; border-radius: 10px !important; border: 1px solid rgba(46, 204, 113, 0.2) !important; }
        body.style-bg .account-row:has(.acc-debt) { background: rgba(255, 92, 92, 0.1) !important; border-color: rgba(255, 92, 92, 0.3) !important; }
        body.style-minimal .account-row { border-left: none !important; background: var(--card2) !important; margin: 6px 10px !important; border-radius: 10px !important; border: 1px solid var(--border) !important; }
        body.style-minimal .acc-icon-wrap { transition: all 0.2s ease; }
        body.style-minimal .account-row:not(:has(.acc-debt)) .acc-icon-wrap { background: #2d3647 !important; color: #9aa5b8 !important; }
        body.style-minimal .account-row:has(.acc-debt) .acc-icon-wrap { background: #1f2532 !important; color: #6b778c !important; }
        .account-row.ignore-balance { opacity: 0.5; filter: grayscale(1); }
        .account-row.ignore-balance .acc-balance::after { content: ' 👁️‍🗨️'; font-size: 12px; }
        
        #lockScreen { position: fixed; inset: 0; background: var(--bg); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #lockScreen .dots { display: flex; gap: 15px; margin: 30px 0; }
        #lockScreen .dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--muted); transition: all 0.2s; }
        #lockScreen .dot.filled { background: var(--accent); border-color: var(--accent); }
        #lockScreen .numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        #lockScreen .num-btn { width: 70px; height: 70px; border-radius: 50%; background: var(--card2); color: var(--text); font-size: 24px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #lockScreen .num-btn:active { background: var(--accent); color: #fff; }
        #lockScreen .forgot-btn { margin-top: 20px; color: var(--muted); background: none; border: none; text-decoration: underline; }
        #lockScreen .error-msg { color: var(--red); font-size: 14px; margin-top: 10px; height: 20px; }
        .shake { animation: shake 0.4s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        #restoreBanner { background: var(--yellow); color: #000; padding: 10px 15px; border-radius: 10px; margin: 10px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; }
        #restoreBanner button { background: #000; color: #fff; padding: 5px 10px; border-radius: 5px; }
    `;
    document.head.appendChild(styleEl);
    document.addEventListener('touchmove', function(e) { if (e.target.closest('.modal')) e.stopPropagation(); }, { capture: true, passive: true });

    // ИНИЦИАЛИЗАЦИЯ СПИСКА УДАЛЕННЫХ (Tombstones)
    if (typeof S !== 'undefined') {
        if (!S.meta) S.meta = { deletedIds: [] };
        if (!S.meta.deletedIds) S.meta.deletedIds = [];
    }

    // ==========================================
    // ПЕРЕХВАТ УДАЛЕНИЙ
    // ==========================================
    const originalDeleteAccount = window.deleteAccount;
    window.deleteAccount = function(id) {
        const acc = getAcc(id); if (!acc) return;
        if (confirm(`Вы уверены, что хотите удалить счет "${acc.name}"?\n\nЭто действие нельзя отменить.`)) {
            S.meta.deletedIds.push(id);
            originalDeleteAccount(id);
        }
    };
    const originalDeleteBank = window.deleteBank;
    window.deleteBank = function(id) {
        if (!confirm(`Удалить банк и все его счета?`)) return;
        S.meta.deletedIds.push(id);
        originalDeleteBank(id);
    };
    const originalDeleteTx = window.deleteTx;
    window.deleteTx = function(id) {
        S.meta.deletedIds.push(id);
        originalDeleteTx(id);
    };

    // ==========================================
    // ЭКРАН БЛОКИРОВКИ
    // ==========================================
    let pinBuffer = '';
    let lastActiveTime = Date.now();
    function showLockScreen() {
        if (document.getElementById('lockScreen')) return;
        const ls = document.createElement('div'); ls.id = 'lockScreen';
        ls.innerHTML = `<div style="font-size: 40px; margin-bottom: 20px;">🔒</div><div style="font-size: 18px; font-weight: 600;">Введите PIN-код</div><div class="dots" id="pinDots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="error-msg" id="pinError"></div><div class="numpad" id="pinNumpad">${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" data-val="${n}">${n}</button>`).join('')}<div></div><button class="num-btn" data-val="0">0</button><button class="num-btn" data-val="back">⌫</button></div><button class="forgot-btn" id="forgotPinBtn">Забыли PIN-код?</button>`;
        document.body.appendChild(ls);
        const dots = document.querySelectorAll('#pinDots .dot');
        const errorEl = document.getElementById('pinError');
        function updateDots() { dots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length)); }
        document.getElementById('pinNumpad').onclick = (e) => {
            const btn = e.target.closest('.num-btn'); if (!btn) return; const val = btn.dataset.val;
            if (val === 'back') { pinBuffer = pinBuffer.slice(0, -1); updateDots(); } 
            else {
                if (pinBuffer.length < 4) { pinBuffer += val; updateDots(); }
                if (pinBuffer.length === 4) {
                    setTimeout(() => {
                        if (pinBuffer === S.settings.pinCode) { ls.remove(); lastActiveTime = Date.now(); } 
                        else { errorEl.textContent = 'Неверный PIN'; ls.classList.add('shake'); setTimeout(() => ls.classList.remove('shake'), 400); pinBuffer = ''; updateDots(); }
                    }, 100);
                }
            }
        };
        document.getElementById('forgotPinBtn').onclick = () => {
            if (confirm("Сбросить PIN? Данные будут удалены. Восстановить можно только из облака.")) {
                if (confirm("ВНИМАНИЕ! Восстановление потребует ввода Облачного токена заново. Вы точно хотите стереть данные?")) {
                    localStorage.setItem('financeApp_isReset', 'true'); localStorage.removeItem('financeApp_v25'); location.reload();
                }
            }
        };
    }
    function checkLock() {
        if (typeof S !== 'undefined' && S.settings && S.settings.pinCode) {
            const timePassed = Date.now() - lastActiveTime;
            if (timePassed > 5 * 60 * 1000 || !sessionStorage.getItem('app_unlocked')) { showLockScreen(); sessionStorage.setItem('app_unlocked', 'true'); }
        }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { lastActiveTime = Date.now(); } else if (document.visibilityState === 'visible') { checkLock(); }
    });
    setTimeout(checkLock, 500);

    // ==========================================
    // НАСТРОЙКИ И БЕЗОПАСНОСТЬ
    // ==========================================
    function applyBadgeStyle() {
        document.body.classList.remove('style-stripe', 'style-bg', 'style-minimal');
        const style = (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle) ? S.settings.badgeStyle : 'stripe';
        if (style === 'minimal') document.body.classList.add('style-minimal');
        else if (style === 'bg') document.body.classList.add('style-bg');
        else document.body.classList.add('style-stripe');
    }
    setTimeout(applyBadgeStyle, 100);
    
    const prevOpenSettings = window.openSettings;
    window.openSettings = function() {
        prevOpenSettings();
        const oldPin = document.getElementById('setPin'); if (oldPin) oldPin.closest('.form-group').style.display = 'none';
        const oldToken = document.getElementById('setYandexToken'); if (oldToken) oldToken.closest('.form-group').style.display = 'none';
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect) badgeSelect.innerHTML = `<option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option><option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option><option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>`;
    };
    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() { prevSaveSettings(); applyBadgeStyle(); };

    window.openSecuritySettings = function() {
        openModal(`
        <div class="modal-header"><h2>Безопасность</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="form-group"><label>PIN-код (4 цифры, пусто = отключен)</label><input type="text" id="secPin" maxlength="4" value="${S.settings.pinCode || ''}" placeholder="****"></div>
        <hr style="border-color:var(--border); margin: 16px 0;">
        <div style="font-weight:700; margin-bottom:10px;">💾 Токен облачного бэкапа</div>
        <div class="form-group"><label>Токен доступа</label><input type="password" id="secYandexToken" value="${S.settings.yandexToken || ''}" placeholder="Вставьте токен"></div>
        <hr style="border-color:var(--border); margin: 16px 0;">
        <div style="font-weight:700; margin-bottom:10px;">📈 Синхронизация с Т-Инвестиции</div>
        <div class="form-group"><label>Токен доступа (Read-only)</label><input type="password" id="secTInvestToken" value="${S.settings.tInvestToken || ''}" placeholder="Вставьте токен"></div>
        <button class="btn-secondary btn-block" style="margin-bottom:8px" onclick="syncTInvest()">🔄 Запросить баланс из Т-Инвестиций</button>
        <button class="btn-primary btn-block" onclick="window.saveSecuritySettings()">Сохранить всё</button>`);
    };

    window.saveSecuritySettings = function() {
        const pin = document.getElementById('secPin').value.trim();
        if (pin && !/^\d{4}$/.test(pin)) { toast('PIN должен состоять из 4 цифр'); return; }
        S.settings.pinCode = pin;
        S.settings.yandexToken = document.getElementById('secYandexToken').value.trim();
        S.settings.tInvestToken = document.getElementById('secTInvestToken').value.trim();
        save(); toast('Настройки безопасности сохранены'); window.openMenu();
        syncSmart(true); 
    };

    // ==========================================
    // Т-ИНВЕСТИЦИИ
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
            recalculateBalances(); save(); renderAll(); syncSmart(true); 
            if (createdCount > 0 || syncedCount > 0) toast(`✅ Успех! Создано: ${createdCount}, обновлено: ${syncedCount}`);
            else toast('Баланс уже актуален (разницы нет)');
        } catch (e) { console.error(e); toast('❌ Ошибка синхронизации. Проверьте токен.'); }
    };

    // ==========================================
    // ОКНО СЧЕТА (Срок, Исключить, Хедж)
    // ==========================================
    const prevOpenAccountModal = window.openAccountModal;
    window.openAccountModal = function(id, bankId) {
        prevOpenAccountModal(id, bankId);
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

    // ==========================================
    // УМНЫЙ СКАНЕР ИЗМЕНЕНИЙ И СОХРАНЕНИЕ
    // ==========================================
    if (!window._prevState) window._prevState = JSON.parse(JSON.stringify(S));

    const originalSave = window.save;
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

        originalSave.call(this, isUserAction);
        applyBadgeStyle();
        localStorage.setItem('financeApp_localChange', Date.now()); 
        
        if (isUserAction) scheduleSync();
    };

    // ==========================================
    // СИНХРОНИЗАЦИЯ
    // ==========================================
    let syncTimeout;
    function scheduleSync() { clearTimeout(syncTimeout); syncTimeout = setTimeout(() => { syncSmart(false); }, 2000); }

    function sendBeaconUpload() {
        const token = S.settings.yandexToken;
        if (!token) return;
        
        const cloudS = JSON.parse(JSON.stringify(S));
        const localSettings = ['theme', 'badgeStyle', 'pinCode', 'yandexToken', 'tInvestToken', 'appTitle'];
        localSettings.forEach(k => delete cloudS.settings[k]);

        const payload = JSON.stringify({ action: 'yandex_upload', token: token, fileContent: JSON.stringify(cloudS) });
        const blob = new Blob([payload], { type: 'text/plain' });
        navigator.sendBeacon('https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm', blob);
        console.log("📤 Данные отправлены через sendBeacon");
    }
    window.addEventListener('pagehide', sendBeaconUpload);
    document.addEventListener('visibilitychange', () => { 
        if (document.visibilityState === 'hidden') sendBeaconUpload();
    });

    window.syncSmart = async function(isManual = false) {
        const token = S.settings.yandexToken;
        if (!token) { if (isManual) toast('Укажите токен в Безопасности'); return; }

        const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
        if (isManual) toast('⏳ Проверка облака...');

        try {
            const metaRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'yandex_meta', token: token }) });
            
            if (metaRes.status === 404) {
                await uploadToCloud(token);
                return;
            }

            const metaData = await metaRes.json();
            const cloudModified = new Date(metaData.modified).getTime();
            const lastSync = parseInt(localStorage.getItem('financeApp_lastSync') || '0');
            const localChange = parseInt(localStorage.getItem('financeApp_localChange') || '0');

            if (cloudModified > localChange) {
                if (isManual) toast('⬇️ Скачиваем новые данные...');
                const downRes = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'yandex_download', token: token }) });
                const cloudText = await downRes.text();
                let cloudData;
                try { cloudData = JSON.parse(cloudText); } catch(e) { throw new Error('Битый файл в облаке'); }

                mergeData(cloudData);
                
                localStorage.setItem('financeApp_lastSync', cloudModified);
                localStorage.setItem('financeApp_localChange', cloudModified); 
                save(false); renderAll();
                if (isManual) toast('✅ Данные обновлены из облака');
                return;
            }

            if (localChange > lastSync) {
                await uploadToCloud(token);
                if (isManual) toast('✅ Данные сохранены в облако');
                return;
            }

            if (isManual) toast('✨ Всё актуально');

        } catch (e) {
            console.error('Sync error:', e);
            if (isManual) toast('❌ Ошибка синхронизации');
        }
    };

    async function uploadToCloud(token) {
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
        const localSettings = { ...S.settings };
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
        S.meta = { deletedIds: allDeleted, _updatedAt: Date.now() };
        S.settings = { ...S.settings, ...localSettings };
    }

    // ==========================================
    // ФИКС КУРСА USDT
    // ==========================================
    window.fetchUSDT = async function() {
        try {
            const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';
            const r = await fetch(PROXY, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ action: 'usdt_rate' }) 
            });
            if (!r.ok) throw new Error('Ошибка сети');
            const d = await r.json();
            if (d.tether && d.tether.rub) {
                S.settings.usdtRate.lastFetched = d.tether.rub;
                S.settings.usdtRate.updatedAt = new Date().toISOString();
                save(false);
                toast('Курс USDT: ' + fmtNum(d.tether.rub) + '₽');
                renderAll();
            }
        } catch(e) {
            console.log('Курс USDT временно недоступен. Используется сохраненный.');
        }
    };

    setTimeout(syncSmart, 1500); 
    window.syncManual = function() { syncSmart(true); };

    // ==========================================
    // ПЕРЕРАСЧЕТ БАЛАНСА И UI
    // ==========================================
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

    const originalBackup = window.backupToYandexDisk; 
    window.backupToYandexDisk = async function(silent = false) { 
        if (typeof S !== 'undefined') { 
            const isEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0); 
            const isReset = localStorage.getItem('financeApp_isReset') === 'true'; 
            if (isEmpty && isReset) { if (!silent) toast('Отправка пустых данных заблокирована'); return; } 
        } 
        return originalBackup(silent); 
    };
    setTimeout(() => { if (localStorage.getItem('financeApp_isReset') === 'true') { const banner = document.createElement('div'); banner.id = 'restoreBanner'; banner.innerHTML = `<span>Данные очищены. Восстановить из облака?</span><button onclick="window.restoreFromYandexDisk()">Восстановить</button>`; const main = document.querySelector('main'); if (main) main.prepend(banner); } }, 1000);
    const prevRenderTransactions = window.renderTransactions; window.renderTransactions = function() { if (prevRenderTransactions) prevRenderTransactions(); const page = document.getElementById('page-transactions'); if (page && page.classList.contains('active')) { const formRow = page.querySelector('.form-row'); if (formRow && !document.getElementById('inlineTxBtn')) { formRow.style.display = 'flex'; formRow.style.gap = '8px'; formRow.style.alignItems = 'center'; const btn = document.createElement('button'); btn.id = 'inlineTxBtn'; btn.className = 'btn-primary'; btn.style = 'padding: 0; width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; font-size: 24px; display: flex; align-items: center; justify-content: center;'; btn.innerHTML = '+'; btn.onclick = () => { if(typeof openTxModal === 'function') openTxModal(); }; formRow.appendChild(btn); } } };
    window.openMenu = function() { openModal(`<div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button><button class="menu-item" onclick="window.openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button><button class="menu-item" onclick="window.openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button><button class="menu-item" onclick="window.openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button><button class="menu-item warn" onclick="window.clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button></div>`); };
    setTimeout(() => { const menuBtn = document.getElementById('menuBtn'); if (menuBtn) menuBtn.onclick = window.openMenu; }, 100);
    window.openCatAndDebtsMenu = function() { openModal(`<div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button><button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button></div>`); };
    window.openBackupMenu = function() { openModal(`<div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button><button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button><button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button></div>`); };
    window.clearLocalData = function() { if (!confirm('Вы уверены, что хотите удалить все локальные данные? Приложение вернется в исходное состояние.')) return; if (confirm('ВНИМАНИЕ! Это действие необратимо. Ваши данные будут удалены с этого устройства. Восстановить их можно будет ТОЛЬКО если вы введете свой Облачный токен заново. Вы точно хотите стереть всё?')) { localStorage.setItem('financeApp_isReset', 'true'); localStorage.removeItem('financeApp_v25'); localStorage.removeItem('financeApp_lastSync'); localStorage.removeItem('financeApp_localChange'); location.reload(); } };
})();
