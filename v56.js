// ==========================================
// ВСЁ ДЛЯ v56 В ОДНОМ ФАЙЛЕ (v56.js)
// ==========================================
(function() {
    console.log("✅ Файл v56.js успешно загружен (финальные стили)");

    // 1. СТИЛИ ДЛЯ ВСЕХ РЕЖИМОВ
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        /* Прячем плавающую кнопку, так как + добавлен локально */
        #fabBtn { display: none !important; }
        .account-row { transition: all 0.2s ease; }

        /* --- 1. РЕЖИМ "ЦВЕТНЫЕ ПОЛОСЫ" --- */
        body.style-stripe .account-row {
            border-left: 4px solid var(--bank-color) !important;
            background: var(--card) !important;
            margin: 0 6px 0 10px !important;
            border-radius: 0 8px 8px 0 !important;
            border-bottom: 1px solid var(--border) !important;
        }
        body.style-stripe .account-row:has(.acc-debt) {
            background: rgba(255, 92, 92, 0.05) !important; 
        }
        body.style-stripe .account-row:not(:has(.acc-debt)) {
            background: rgba(46, 204, 113, 0.04) !important;
        }

        /* --- 2. РЕЖИМ "ЛЕГКИЙ ФОН" --- */
        body.style-bg .account-row {
            border-left: none !important;
            background: rgba(46, 204, 113, 0.1) !important;
            margin: 6px 10px !important;
            border-radius: 10px !important;
            border: 1px solid rgba(46, 204, 113, 0.2) !important;
        }
        body.style-bg .account-row:has(.acc-debt) {
            background: rgba(255, 92, 92, 0.1) !important; 
            border-color: rgba(255, 92, 92, 0.3) !important;
        }

        /* --- 3. РЕЖИМ "МИНИМАЛИЗМ" --- */
        body.style-minimal .account-row {
            border-left: none !important;
            background: var(--card2) !important;
            margin: 6px 10px !important;
            border-radius: 10px !important;
            border: 1px solid var(--border) !important;
        }
        
        /* Базовый стиль иконки */
        body.style-minimal .acc-icon-wrap {
            transition: all 0.2s ease;
        }
        /* Дебетовая: чуть светлее фона карточки */
        body.style-minimal .account-row:not(:has(.acc-debt)) .acc-icon-wrap {
            background: #2d3647 !important; 
            color: #9aa5b8 !important;      
        }
        /* Кредитная: чуть темнее фона карточки */
        body.style-minimal .account-row:has(.acc-debt) .acc-icon-wrap {
            background: #1f2532 !important; 
            color: #6b778c !important;      
        }
    `;
    document.head.appendChild(styleEl);

    // 2. ПРИМЕНЕНИЕ КЛАССОВ К BODY
    function applyBadgeStyle() {
        document.body.classList.remove('style-stripe', 'style-bg', 'style-minimal');
        const style = (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle) ? S.settings.badgeStyle : 'stripe';
        
        if (style === 'minimal') document.body.classList.add('style-minimal');
        else if (style === 'bg') document.body.classList.add('style-bg');
        else document.body.classList.add('style-stripe');
    }

    // 3. ПЕРЕХВАТ НАСТРОЕК
    const prevOpenSettings = window.openSettings;
    window.openSettings = function() {
        prevOpenSettings();
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect) {
            badgeSelect.innerHTML = `
                <option value="stripe" ${S.settings.badgeStyle==='stripe'?'selected':''}>Цветные полосы</option>
                <option value="bg" ${S.settings.badgeStyle==='bg'?'selected':''}>Легкий фон</option>
                <option value="minimal" ${S.settings.badgeStyle==='minimal'?'selected':''}>Минимализм</option>
            `;
        }
    };

    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() {
        prevSaveSettings();
        applyBadgeStyle();
    };
    
    setTimeout(applyBadgeStyle, 100);

    // 4. ХАК ДЛЯ МИНИМАЛИЗМА (Возвращаем цветные кружочки банков)
    const prevGetBankIndicatorHtml = window.getBankIndicatorHtml;
    window.getBankIndicatorHtml = function(bank) {
        if (typeof S !== 'undefined' && S.settings && S.settings.badgeStyle === 'minimal') {
            if (!bank) return '';
            return `<span class="bank-dot" style="background:${bank.color || '#888'}; margin-right: 6px; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>`;
        }
        return prevGetBankIndicatorHtml(bank);
    };

    // 5. ВНЕДРЕНИЕ КНОПКИ "+" НА ОПЕРАЦИИ
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

    // 6. МЕНЮ (структура)
    window.openMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Меню</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="openSettings()"><span class="menu-icon">⚙️</span>Настройки</button>
            <button class="menu-item" onclick="window.openSecuritySettings()"><span class="menu-icon">🔒</span>Безопасность</button>
            <button class="menu-item" onclick="window.openCatAndDebtsMenu()"><span class="menu-icon">📂</span>Категории и Долги</button>
            <button class="menu-item" onclick="window.openBackupMenu()"><span class="menu-icon">💾</span>Резервные копии</button>
            <button class="menu-item warn" onclick="window.clearLocalData()"><span class="menu-icon">🗑</span>Очистить данные</button>
        </div>`);
    };

    window.openCatAndDebtsMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Категории и Долги</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="openCategoryEditor()"><span class="menu-icon">📑</span>Редактор категорий</button>
            <button class="menu-item" onclick="openCounterparties()"><span class="menu-icon">👥</span>Контрагенты (Долги)</button>
        </div>`);
    };

    window.openBackupMenu = function() {
        openModal(`
        <div class="modal-header"><h2>Резервные копии</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="menu-list">
            <button class="menu-item" onclick="exportJSON()"><span class="menu-icon">📥</span>Скачать бэкап (JSON)</button>
            <button class="menu-item" onclick="importJSON()"><span class="menu-icon">📤</span>Восстановить из JSON</button>
            <button class="menu-item" onclick="openBackupHistoryModal()"><span class="menu-icon">🕒</span>История 7 дней (Облако)</button>
        </div>`);
    };

    window.openSecuritySettings = function() {
        openModal(`
        <div class="modal-header"><h2>Безопасность</h2><button class="btn-icon" onclick="openMenu()">✕</button></div>
        <div class="form-group">
            <label>PIN-код (4 цифры, пусто = отключен)</label>
            <input type="text" id="secPin" maxlength="4" value="${S.settings.pinCode || ''}" placeholder="****">
        </div>
        <button class="btn-primary btn-block" onclick="window.saveSecuritySettings()">Сохранить</button>`);
    };

    window.saveSecuritySettings = function() {
        const pin = document.getElementById('secPin').value.trim();
        if (pin && !/^\d{4}$/.test(pin)) { toast('PIN должен состоять из 4 цифр'); return; }
        S.settings.pinCode = pin;
        save();
        toast('Настройки безопасности сохранены');
        window.openMenu();
    };

    window.clearLocalData = function() {
        if (!confirm('Удалить ВСЕ локальные данные? Данные в облаке останутся.')) return;
        const token = S.settings.yandexToken;
        localStorage.removeItem('financeApp_v25');
        if (token) localStorage.setItem('financeApp_v25', JSON.stringify({ settings: { yandexToken: token } }));
        location.reload();
    };

})();
