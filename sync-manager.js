// ==========================================
// Умная синхронизация (v45.1) - sync-manager.js
// ==========================================

let syncTimer;
let retryCount = 0;
const MAX_RETRIES = 3;

// Меняем иконку в шапке в зависимости от статуса
function updateSyncStatus(status) {
    const btn = document.getElementById('syncBtn');
    if (!btn) return;
    
    if (status === 'pending') {
        btn.textContent = '☁️';
        btn.style.opacity = '0.5';
        btn.style.color = 'inherit';
    } else if (status === 'syncing') {
        btn.textContent = '🔄';
        btn.style.opacity = '1';
        btn.style.color = 'inherit';
    } else if (status === 'synced') {
        btn.textContent = '✅';
        btn.style.opacity = '1';
        btn.style.color = 'var(--green)';
        setTimeout(() => { btn.textContent = '🔄'; btn.style.color = 'inherit'; }, 2000);
    } else if (status === 'error') {
        btn.textContent = '⚠️';
        btn.style.opacity = '1';
        btn.style.color = 'var(--red)';
    }
}

// 1. Перехватываем функцию сохранения (которая в app.js)
if (typeof window.save === 'function') {
    const originalSave = window.save;
    window.save = function(...args) {
        originalSave.apply(this, args);
        if (args[0] !== false && typeof S !== 'undefined' && S.settings && S.settings.yandexToken) {
            queueSmartSync();
        }
    }
}

// 2. Ставим в очередь (Debounce)
function queueSmartSync() {
    updateSyncStatus('pending');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        performSmartSync(false); // false = не ручная синхронизация
    }, 1500);
}

// 3. Умная отправка/загрузка
async function performSmartSync(isManual) {
    if (typeof S === 'undefined' || !S.settings.yandexToken) return;
    updateSyncStatus('syncing');
    
    try {
        const token = S.settings.yandexToken;
        const targetUrl = `https://cloud-api.yandex.net/v1/disk/resources?path=/finance-backup.json`;
        const res = await fetch(targetUrl, { headers: { 'Authorization': `OAuth ${token}` } });
        
        if (res.status === 404) {
            if(typeof backupToYandexDisk === 'function') await backupToYandexDisk(true);
            updateSyncStatus('synced');
            return;
        }
        if (!res.ok) throw new Error('Ошибка API');
        
        const data = await res.json();
        const cloudModified = new Date(data.modified).getTime();
        const localLastBackup = S.settings.lastCloudBackup || 0;
        
        // Если облако новее (с учетом погрешности 2 сек)
        if (cloudModified > localLastBackup + 2000) {
            // Если нажали вручную ИЛИ локальных изменений нет — скачиваем
            if (isManual || (typeof hasLocalUnsavedChanges === 'function' && !hasLocalUnsavedChanges())) {
                if(typeof restoreFromYandexDisk === 'function') await restoreFromYandexDisk(true);
            } else {
                // Есть локальные изменения — отправляем их
                if(typeof backupToYandexDisk === 'function') await backupToYandexDisk(true);
            }
        } else {
            // Локальные данные свежее — отправляем
            if(typeof backupToYandexDisk === 'function') await backupToYandexDisk(true);
        }
        
        updateSyncStatus('synced');
        retryCount = 0;
    } catch (e) {
        console.error('Smart Sync Error:', e);
        handleSyncError();
    }
}

// 4. Обработка ошибок (Retry)
function handleSyncError() {
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        updateSyncStatus('error');
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            performSmartSync(false);
        }, delay);
    } else {
        updateSyncStatus('error');
    }
}

// 5. Переопределяем кнопку ручной синхронизации
window.syncManual = async function() {
    if (typeof S === 'undefined' || !S.settings.yandexToken) {
        if(typeof toast === 'function') toast('❌ Укажите токен в настройках');
        return;
    }
    if(typeof toast === 'function') toast('⏳ Проверка облака...');
    retryCount = 0;
    await performSmartSync(true); // true = ручная синхронизация
}

console.log('✅ Умная синхронизация (v45.1) загружена');
