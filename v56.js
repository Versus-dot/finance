// ==========================================
// ВСЁ ДЛЯ v56 В ОДНОМ ФАЙЛЕ (v56.js)
// ==========================================
(function() {
    console.log("✅ Файл v56.js успешно загружен (исправленная версия)");

    // 1. СТИЛИ ДЛЯ ТЕМЫ "МИНИМАЛИЗМ"
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        body.theme-minimal .account-row {
            border-left: none !important; background: var(--card2) !important;
            margin: 6px 10px !important; border-radius: 10px !important;
            border-bottom: none !important; border: 1px solid var(--border) !important;
        }
        body.theme-minimal .account-row[data-acc-type="credit"] { background: rgba(255, 92, 92, 0.08) !important; }
        body.theme-minimal .account-row[data-acc-type="debit"] { background: rgba(46, 204, 113, 0.08) !important; }
        body.theme-minimal .bank-chip { background: var(--card2) !important; border: 1px solid var(--border) !important; }
        body.theme-minimal .bank-chip.active { border-color: var(--accent) !important; }
    `;
    document.head.appendChild(styleEl);

    // 2. ПОЛНОСТЬЮ СКРЫВАЕМ ПЛАВАЮЩУЮ КНОПКУ (FAB) НА ВСЕХ ВКЛАДКАХ
    const hideFab = () => {
        const fab = document.getElementById('fabBtn');
        if (fab) fab.style.display = 'none';
    };
    
    // Перехватываем переключение вкладок, чтобы FAB не появлялась
    const prevSetActiveTab = window.setActiveTab;
    window.setActiveTab = function(tab, fromPop) {
        if (prevSetActiveTab) prevSetActiveTab(tab, fromPop);
        hideFab();
    };
    document.addEventListener('DOMContentLoaded', hideFab);
    setTimeout(hideFab, 100);

    // 3. ДОБАВЛЯЕМ ЛОКАЛЬНУЮ КНОПКУ "+" НА ВКЛАДКУ ОПЕРАЦИИ
    const prevRenderTransactions = window.renderTransactions;
    window.renderTransactions = function() {
        if (prevRenderTransactions) prevRenderTransactions();
        
        const page = document.getElementById('page-transactions');
        if (page && page.classList.contains('active')) {
            const formRow = page.querySelector('.form-row');
            // Если нашли строку с датами и там еще нет нашей кнопки — добавляем
            if (formRow && !document.getElementById('inlineTxBtn')) {
                formRow.style.display = 'flex';
                formRow.style.gap = '8px';
                formRow.style.alignItems = 'center';
                
                const btn = document.createElement('button');
                btn.id = 'inlineTxBtn';
                btn.className = 'btn-primary';
                // Стиль точно как у кнопок "+" на Главной
                btn.style = 'padding: 0; width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; font-size: 24px; display: flex; align-items: center; justify-content: center;';
                btn.innerHTML = '+';
                btn.onclick = () => { if(typeof openTxModal === 'function') openTxModal(); };
                formRow.appendChild(btn);
            }
        }
    };

    // 4. ТЕМА "МИНИМАЛИЗМ" (Настройки)
    const prevOpenSettings = window.openSettings;
    window.openSettings = function() {
        prevOpenSettings();
        const badgeSelect = document.getElementById('setBadge');
        if (badgeSelect && !badgeSelect.querySelector('option[value="minimal"]')) {
            const opt = document.createElement('option');
            opt.value = 'minimal'; opt.textContent = 'Минимализм';
            if (S.settings.badgeStyle === 'minimal') opt.selected = true;
            badgeSelect.appendChild(opt);
        }
    };
    const prevSaveSettings = window.saveSettings;
    window.saveSettings = function() {
        prevSaveSettings();
        if (typeof S !== 'undefined' && S.settings.badgeStyle === 'minimal') {
            document.body.classList.add('theme-minimal');
        } else {
            document.body.classList.remove('theme-minimal');
        }
    };
    const prevRenderAccountRow = window.renderAccountRow;
    window.renderAccountRow = function(a, bank) {
        let html = prevRenderAccountRow(a, bank);
        if (html.includes('class="account-row"')) {
            html = html.replace('class="account-row"', `class="account-row" data-acc-type="${a.type}"`);
        }
        return html;
    };
    setTimeout(() => {
        if (typeof S !== 'undefined' && S.settings.badgeStyle === 'minimal') document.body.classList.add('theme-minimal');
    }, 100);

    // 5. НОВОЕ МЕНЮ
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
