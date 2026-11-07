// ==========================================
// ФИНАЛЬНЫЙ МОДУЛЬ v79 (Без синхронизации и Безопасности)
// ==========================================
(function() {
    console.log("✅ Файл v56.js загружен (v79)");

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
    // СТИЛИ (Темы, Пульсация льготного периода, Баннер)
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
        
        /* СТИЛИ ДЛЯ ЛЬГОТНОГО ПЕРИОДА */
        .account-row.grace-warning { border-color: var(--yellow) !important; box-shadow: inset 0 0 0 2px var(--yellow) !important; }
        .account-row.grace-danger { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        
        /* ЯРКАЯ ПУЛЬСАЦИЯ ДЛЯ КАРТОЧКИ */
        .account-row.grace-overdue { 
            border-color: var(--red) !important; 
            animation: pulse-red-row 1.5s infinite; 
        }
        @keyframes pulse-red-row {
            0% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0.8), inset 0 0 0 2px var(--red); }
            70% { box-shadow: 0 0 0 15px rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
            100% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
        }

        .grace-text { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }
        .grace-text.warning { background: var(--yellow); color: #000; }
        .grace-text.danger, .grace-text.overdue { background: var(--red); color: #fff; }

        /* СТИЛИ ДЛЯ ВИДЖЕТА БАНКА */
        .bank-chip.grace-bank-warning { border-color: var(--red) !important; box-shadow: inset 0 0 0 2px var(--red) !important; }
        
        /* ЯРКАЯ ПУЛЬСАЦИЯ ДЛЯ БАНКА */
        .bank-chip.grace-bank-overdue { 
            border-color: var(--red) !important; 
            animation: pulse-red-bank 1.5s infinite; 
        }
        @keyframes pulse-red-bank {
            0% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0.8), inset 0 0 0 2px var(--red); }
            70% { box-shadow: 0 0 0 10px rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
            100% { box-shadow: 0 0 0 0 rgba(255, 92, 92, 0), inset 0 0 0 2px var(--red); }
        }

        #restoreBanner { background: var(--yellow); color: #000; padding: 10px 15px; border-radius: 10px; margin: 10px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; }
        #restoreBanner button { background: #000; color: #fff; padding: 5px 10px; border-radius: 5px; }
    `;
    document.head.appendChild(styleEl);
    document.addEventListener('touchmove', function(e) { if (e.target.closest('.modal')) e.stopPropagation(); }, { capture: true, passive: true });

    // ==========================================
    // НАСТРОЙКИ И СТИЛИ (Темы)
    // ==========================================
    window.applyBadgeStyle = function() {
        document.body.classList.remove('style-stripe', 'style-bg', 'style-minimal');
        const style = (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle) ? S.settings.badgeStyle : 'stripe';
        if (style === 'minimal') document.body.classList.add('style-minimal');
        else if (style === 'bg') document.body.classList.add('style-bg');
        else document.body.classList.add('style-stripe');
    }
    setTimeout(applyBadgeStyle, 100);
    
    const prevOpenSettingsForBadge = window.openSettings;
    window.openSettings = function() {
        if (prevOpenSettingsForBadge) prevOpenSettingsForBadge();
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect) badgeSelect.innerHTML = `<option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option><option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option><option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>`;
    };
    
    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() { if (prevSaveSettings) prevSaveSettings(); applyBadgeStyle(); };

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

    // ==========================================
    // РАМКА ЛЬГОТНОГО ПЕРИОДА
    // ==========================================
    const prevRenderAccountRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccountRow(a, bank);
        
        if (html.includes('class="account-row"')) {
            html = html.replace('class="account-row"', `class="account-row" data-acc-type="${a.type}"`);
        }

        if (a.type === 'credit' && a.gracePeriod && !a.archived) {
            const limit = a.creditLimit || 0;
            const val = accValue(a);
            const debt = Math.max(0, limit - val);
            
            if (debt > 0) {
                const today = new Date(); today.setHours(0,0,0,0);
                const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                const diffTime = gp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let graceClass = '';
                let textHtml = '';
                
                if (diffDays < 0) {
                    graceClass = 'grace-overdue';
                    textHtml = `<span class="grace-text overdue">⏰ Просрочка ${Math.abs(diffDays)} дн.</span>`;
                } else if (diffDays === 0) {
                    graceClass = 'grace-overdue';
                    textHtml = `<span class="grace-text danger">⏰ Сегодня!</span>`;
                } else if (diffDays <= 3) {
                    graceClass = 'grace-danger';
                    textHtml = `<span class="grace-text danger">⏰ Осталось ${diffDays} дн.</span>`;
                } else if (diffDays <= 7) {
                    graceClass = 'grace-warning';
                    textHtml = `<span class="grace-text warning">⏳ Осталось ${diffDays} дн.</span>`;
                }
                
                if (graceClass) {
                    html = html.replace('class="account-row"', `class="account-row ${graceClass}"`);
                    html = html.replace('Задолженность:', `${textHtml} Задолженность:`);
                }
            }
        }
        return html;
    };

    // ==========================================
    // ПОДСВЕТКА ВИДЖЕТОВ БАНКОВ
    // ==========================================
    const prevRenderDashboard = window.renderDashboard;
    window.renderDashboard = function() {
        if (prevRenderDashboard) prevRenderDashboard();
        
        const today = new Date(); today.setHours(0,0,0,0);
        const problemBanks = new Set();
        const overdueBanks = new Set();
        
        S.accounts.forEach(a => {
            if (a.type === 'credit' && a.gracePeriod && !a.archived) {
                const limit = a.creditLimit || 0;
                const val = accValue(a);
                const debt = Math.max(0, limit - val);
                
                if (debt > 0) {
                    const gp = new Date(a.gracePeriod); gp.setHours(0,0,0,0);
                    const diffDays = Math.ceil((gp - today) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 3) problemBanks.add(a.bankId);
                    if (diffDays <= 0) overdueBanks.add(a.bankId);
                }
            }
        });
        
        document.querySelectorAll('.bank-chip').forEach(chip => {
            const bankId = chip.dataset.bankId;
            chip.classList.remove('grace-bank-warning', 'grace-bank-overdue');
            if (bankId) {
                if (overdueBanks.has(bankId)) chip.classList.add('grace-bank-overdue');
                else if (problemBanks.has(bankId)) chip.classList.add('grace-bank-warning');
            }
        });
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

    // ==========================================
    // МЕНЮ
    // ==========================================
    window.openMenu = function() { 
        openModal(`<div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button><button class="menu-item" onclick="window.openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button><button class="menu-item" onclick="window.openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button><button class="menu-item" onclick="window.openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button><button class="menu-item warn" onclick="window.clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button></div>`); 
    };
    
    setTimeout(() => { 
        const menuBtn = document.getElementById('menuBtn'); 
        if (menuBtn) menuBtn.onclick = window.openMenu; 
    }, 100);
    
    window.openCatAndDebtsMenu = function() { 
        openModal(`<div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button><button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button></div>`); 
    };
    
    window.openBackupMenu = function() { 
        openModal(`<div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div><div class="menu-list"><button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button><button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button><button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button></div>`); 
    };
    
    window.clearLocalData = function() { 
        if (!confirm('Вы уверены, что хотите удалить все локальные данные? Приложение вернется в исходное состояние.')) return; 
        if (confirm('ВНИМАНИЕ! Это действие необратимо. Ваши данные будут удалены с этого устройства. Восстановить их можно будет ТОЛЬКО если вы введете свой Облачный токен заново. Вы точно хотите стереть всё?')) { 
            localStorage.setItem('financeApp_isReset', 'true'); 
            localStorage.removeItem('financeApp_v25'); 
            localStorage.removeItem('financeApp_lastSync'); 
            localStorage.removeItem('financeApp_localChange'); 
            location.reload(); 
        } 
    };

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
