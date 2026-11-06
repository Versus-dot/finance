// ==========================================
// Менеджер 7-дневного бэкапа (v52)
// ==========================================

// 1. Добавляем кнопку в Настройки (перехватываем функцию)
if (typeof window.openSettings === 'function') {
    const originalOpenSettings = window.openSettings;
    window.openSettings = function() {
        originalOpenSettings();
        const modalContent = document.getElementById('modalContent');
        if (modalContent) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary btn-block';
            btn.style.marginTop = '8px';
            btn.innerHTML = '🕒 История резервных копий';
            btn.onclick = openBackupHistoryModal;
            
            // Вставляем кнопку перед кнопкой "Сохранить"
            const saveBtn = Array.from(modalContent.querySelectorAll('button')).find(b => b.textContent === 'Сохранить');
            if (saveBtn) {
                saveBtn.parentNode.insertBefore(btn, saveBtn);
            } else {
                modalContent.appendChild(btn);
            }
        }
    };
}

// 2. Функция ежедневного бэкапа
async function checkDailyBackup() {
    const token = (typeof S !== 'undefined' && S.settings) ? S.settings.yandexToken : null;
    if (!token) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (S.settings.lastDailyBackup === todayStr) return; // Уже делали сегодня

    console.log('Запуск ежедневного бэкапа...');
    try {
        // Получаем список файлов в корне Диска
        const res = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=/&limit=100', {
            headers: { 'Authorization': `OAuth ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = data._embedded ? data._embedded.items : [];
        
        // Ищем наши файлы бэкапа
        const backupFiles = items.filter(item => item.name.match(/^finance-backup-[1-7]\.json$/));
        
        let targetSlot = null;
        let oldestTime = Infinity;

        if (backupFiles.length < 7) {
            // Если файлов меньше 7, ищем свободный слот
            for (let i = 1; i <= 7; i++) {
                if (!backupFiles.find(f => f.name === `finance-backup-${i}.json`)) {
                    targetSlot = i;
                    break;
                }
            }
        } else {
            // Если все 7 заняты, ищем самый старый
            backupFiles.forEach(f => {
                const modTime = new Date(f.modified).getTime();
                if (modTime < oldestTime) {
                    oldestTime = modTime;
                    targetSlot = f.name.match(/[1-7]/)[0]; // Извлекаем номер
                }
            });
        }

        if (targetSlot) {
            const fileName = `finance-backup-${targetSlot}.json`;
            const filePath = encodeURIComponent(`/${fileName}`);
            
            // Запрашиваем ссылку для загрузки
            const uploadRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${filePath}&overwrite=true`, {
                headers: { 'Authorization': `OAuth ${token}` }
            });
            if (!uploadRes.ok) return;
            const uploadData = await uploadRes.json();
            
            // Загружаем данные
            await fetch(uploadData.href, { method: 'PUT', body: JSON.stringify(S, null, 2) });
            
            S.settings.lastDailyBackup = todayStr;
            localStorage.setItem('financeApp_v25', JSON.stringify(S));
            console.log(`✅ Ежедневный бэкап сохранен в ${fileName}`);
        }
    } catch (e) {
        console.error('Ошибка ежедневного бэкапа:', e);
    }
}

// Запускаем проверку через 5 секунд после загрузки приложения
setTimeout(checkDailyBackup, 5000);

// 3. Модальное окно с историей
async function openBackupHistoryModal() {
    const token = S.settings.yandexToken;
    if (!token) { toast('❌ Укажите токен'); return; }
    
    openModal(`<div class="modal-header"><h2>История копий</h2><button class="btn-icon" onclick="closeModal()">✕</button></div><div id="backupList"><div class="empty">Загрузка...</div></div>`);

    try {
        const res = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=/&limit=100', {
            headers: { 'Authorization': `OAuth ${token}` }
        });
        const data = await res.json();
        const items = data._embedded ? data._embedded.items : [];
        
        let html = '';
        let count = 0;
        
        for (let i = 1; i <= 7; i++) {
            const fileName = `finance-backup-${i}.json`;
            const file = items.find(f => f.name === fileName);
            
            if (file) {
                count++;
                const dateStr = formatBackupDate(file.modified);
                html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                    <div style="font-weight:600; font-size:13px;">${dateStr}</div>
                    <button class="btn-secondary btn-small" onclick="restoreFromBackup('${fileName}')">Восстановить</button>
                </div>`;
            }
        }
        
        if (count === 0) html = '<div class="empty">Пока нет резервных копий</div>';
        document.getElementById('backupList').innerHTML = html;
        
    } catch (e) {
        document.getElementById('backupList').innerHTML = '<div class="empty" style="color:var(--red)">Ошибка загрузки</div>';
    }
}

// Вспомогательная функция для красивых дат
function formatBackupDate(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const timeStr = d.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
    if (d.toDateString() === today.toDateString()) return `Сегодня, ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Вчера, ${timeStr}`;
    return d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'}) + `, ${timeStr}`;
}

// 4. Восстановление из бэкапа
window.restoreFromBackup = async function(fileName) {
    if (!confirm(`Восстановить данные из копии "${fileName}"? Текущие данные будут сохранены в основной файл.`)) return;
    
    toast('⏳ Восстановление...');
    const token = S.settings.yandexToken;
    
    try {
        // Сначала сохраняем текущие данные
        if (typeof backupToYandexDisk === 'function') await backupToYandexDisk(true);
        
        // Скачиваем выбранный бэкап
        const filePath = encodeURIComponent(`/${fileName}`);
        const res = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${filePath}`, {
            headers: { 'Authorization': `OAuth ${token}` }
        });
        if (!res.ok) throw new Error('Ошибка API');
        
        const data = await res.json();
        const fileRes = await fetch(data.href);
        const text = await fileRes.text();
        const parsed = JSON.parse(text);
        
        // Заменяем данные, сохраняя токен
        const currentToken = S.settings.yandexToken;
        S = Object.assign(defaultState(), parsed);
        S.settings.yandexToken = currentToken;
        S.settings.lastCloudBackup = Date.now(); // Обновляем метку, чтобы не затереть облако
        
        save(false);
        applySettings();
        renderAll();
        closeModal();
        toast('✅ Данные успешно восстановлены');
        
    } catch (e) {
        console.error(e);
        toast('❌ Ошибка восстановления');
    }
};

console.log('✅ Менеджер бэкапов (v52) загружен');
