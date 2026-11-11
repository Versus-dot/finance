// ==========================================
// МОДУЛЬ ТОЧЕК ВОССТАНОВЛЕНИЯ (mod-backups.js) v3
// ==========================================
(function() {
    if (typeof S !== 'undefined') {
        if (!S.settings.backupPoints) S.settings.backupPoints = [];
    }

    const PROXY = 'https://functions.yandexcloud.net/d4ef6t7rvpthq7cihjtm';

    // 1. Функция создания точки
    async function createBackupPoint(isManual) {
        const token = S.settings.yandexToken;
        if (!token) { if (isManual) toast('❌ Укажите токен в настройках'); return; }

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Формируем уникальное имя файла с точностью до минуты
        const timeForFile = now.toTimeString().slice(0, 5).replace(':', '-');
        const fileName = `backup-${todayStr}_${timeForFile}.json`;

        // Защита от пустой базы
        const isEmpty = (!S.accounts || S.accounts.length === 0) && (!S.transactions || S.transactions.length === 0);
        if (isEmpty) { if (isManual) toast('Отправка пустых данных заблокирована'); return; }

        try {
            if (isManual) toast('⏳ Создание точки...');
            
            const cloudS = JSON.parse(JSON.stringify(S));
            const localSettings = ['theme', 'badgeStyle', 'pinCode', 'yandexToken', 'tInvestToken', 'appTitle'];
            localSettings.forEach(k => delete cloudS.settings[k]);

            const res = await fetch(PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'yandex_upload',
                    token: token,
                    fileContent: JSON.stringify(cloudS, null, 2),
                    fileName: fileName
                })
            });

            if (!res.ok) throw new Error('Ошибка облака');

            const totals = computeTotals();
            const newPoint = { 
                date: todayStr, 
                time: timeStr,
                timestamp: now.getTime(), // Для точной сортировки
                fileName: fileName, 
                balance: totals.totalCap,
                debt: totals.debt 
            };
            
            // Убираем дубликат, если он случайно был создан в ту же минуту
            S.settings.backupPoints = S.settings.backupPoints.filter(p => p.fileName !== fileName);
            S.settings.backupPoints.push(newPoint);

            // Сортируем по времени (новые сверху) и оставляем только 7
            S.settings.backupPoints.sort((a, b) => b.timestamp - a.timestamp);
            if (S.settings.backupPoints.length > 7) {
                S.settings.backupPoints = S.settings.backupPoints.slice(0, 7);
            }
            
            save(false);
            if (isManual) {
                toast('✅ Точка создана');
                window.openRestorePointsModal();
            }
        } catch (e) {
            console.error(e);
            if (isManual) toast('❌ Ошибка создания точки');
        }
    }

    // 2. Автоматическая проверка (после 6:00 утра)
    setTimeout(() => {
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toISOString().slice(0, 10);
        
        if (hour >= 6) {
            // Проверяем, есть ли уже точка за сегодня
            const hasToday = S.settings.backupPoints.some(p => p.date === todayStr);
            if (!hasToday) {
                createBackupPoint(false);
            }
        }
    }, 5000);

    // 3. Перехват меню синхронизации
    const origRenderMenu = window.renderMenuContent;
    window.renderMenuContent = function(level, type = '') {
        if (origRenderMenu) origRenderMenu(level, type);
        
        if (level === 'sub' && type === 'sync') {
            const content = document.getElementById('modalContent');
            if (content) {
                const menuSection = content.querySelector('.menu-section');
                if (menuSection && !document.getElementById('menuBtnRestore')) {
                    const btnRestore = document.createElement('button');
                    btnRestore.id = 'menuBtnRestore';
                    btnRestore.className = 'menu-item-premium';
                    btnRestore.innerHTML = `<div class="menu-icon-wrap">⏪</div>Точки восстановления<span class="chevron">›</span>`;
                    btnRestore.onclick = () => window.openRestorePointsModal();
                    
                    const btnManual = document.createElement('button');
                    btnManual.className = 'menu-item-premium';
                    btnManual.innerHTML = `<div class="menu-icon-wrap">📸</div>Создать точку сейчас<span class="chevron">›</span>`;
                    btnManual.onclick = () => { closeModal(); createBackupPoint(true); };

                    const importBtn = Array.from(menuSection.children).find(el => el.textContent.includes('Восстановить из JSON'));
                    if (importBtn) {
                        menuSection.insertBefore(btnRestore, importBtn);
                        menuSection.insertBefore(btnManual, importBtn);
                    } else {
                        menuSection.appendChild(btnRestore);
                        menuSection.appendChild(btnManual);
                    }
                }
            }
        }
    };

    // 4. Окно со списком точек
    window.openRestorePointsModal = function() {
        const points = S.settings.backupPoints || [];
        let html = `<div class="modal-header"><h2>Точки восстановления</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
        
        if (points.length === 0) {
            html += `<div class="empty">У вас пока нет сохраненных точек.</div>`;
        } else {
            html += `<div style="font-size:12px; color:var(--muted); margin-bottom:16px;">Выберите дату и время для отката. Текущие данные будут заменены.</div>`;
            points.forEach(p => {
                const d = new Date(p.date);
                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeHtml = p.time ? `, <span style="color:var(--accent); font-weight:700;">${p.time}</span>` : '';
                
                const debtHtml = (p.debt !== undefined) ? ` | Кредиты: <span style="color:var(--red); font-weight:700;">${fmt(p.debt)}</span>` : '';

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--card2); border-radius:12px; margin-bottom:8px; border:1px solid var(--border);">
                        <div>
                            <div style="font-weight:600; font-size:14px;">${dateStr}${timeHtml}</div>
                            <div style="font-size:12px; color:var(--muted); margin-top:4px;">Баланс: ${fmt(p.balance)}${debtHtml}</div>
                        </div>
                        <button class="btn-secondary btn-small" onclick="window.restoreFromPoint('${p.fileName}')">Восстановить</button>
                    </div>
                `;
            });
        }
        openModal(html);
    };

    // 5. Логика восстановления
    window.restoreFromPoint = async function(fileName) {
        if (!confirm('Вы уверены? Текущие данные будут заменены версией из этой точки.')) return;
        
        const token = S.settings.yandexToken;
        if (!token) { toast('❌ Укажите токен'); return; }

        try {
            toast('⏳ Скачивание...');
            const res = await fetch(PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'yandex_download', token: token, fileName: fileName })
            });
            
            if (!res.ok) throw new Error('Ошибка скачивания');
            const text = await res.text();
            const data = JSON.parse(text);

            const localVisual = {
                theme: S.settings.theme,
                badgeStyle: S.settings.badgeStyle,
                pinCode: S.settings.pinCode,
                yandexToken: token,
                tInvestToken: S.settings.tInvestToken,
                appTitle: S.settings.appTitle,
                graceYellowDays: S.settings.graceYellowDays,
                graceRedDays: S.settings.graceRedDays,
                graceGlowIntensity: S.settings.graceGlowIntensity,
                backupPoints: S.settings.backupPoints
            };

            S = Object.assign(defaultState(), data);
            S.settings = { ...S.settings, ...localVisual };

            save(false);
            location.reload();
        } catch(e) {
            console.error(e);
            toast('❌ Ошибка восстановления');
        }
    };
})();
