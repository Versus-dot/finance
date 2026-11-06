// ==========================================
// Умная синхронизация (v45) - sync-manager.js
// ==========================================

let syncTimer;
let retryCount = 0;
const MAX_RETRIES = 3;

// Меняем иконку в шапке в зависимости от статуса
function updateSyncStatus(status) {
    const btn = document.getElementById('syncBtn');
    if (!btn) return;
    
    if (status === 'pending') {
        btn.textContent = '☁️'; // Ждем паузу (1.5 сек)
        btn.style.opacity = '0.5';
        btn.style.color = 'inherit';
    } else if (status === 'syncing') {
        btn.textContent = '🔄'; // Идет отправка
        btn.style.opacity = '1';
        btn.style.color = 'inherit';
    } else if (status === 'synced') {
        btn.textContent = '✅'; // Успешно!
        btn.style.opacity = '1';
        btn.style.color = 'var(--green)';
        setTimeout(() => { btn.textContent = '🔄'; btn.style.color = 'inherit'; }, 2000);
    } else if (status === 'error') {
        btn.textContent = '⚠️'; // Ошибка сети
        btn.style.opacity = '1';
        btn.style.color = 'var(--red)';
    }
}

// 1. Перехватываем функцию сохранения (которая в app.js)
if (typeof window.save === 'function') {
    const originalSave = window.save;
    window.save = function(...args) {
        originalSave.apply(this, args);
        // Если это не системное сохранение (например, при загрузке), а твое действие:
        if (args[0] !== false && typeof S !== 'undefined' && S.settings && S.settings.yandexToken) {
            queueSmartSync();
        }
    }
}

// 2. Ставим в очередь (Debounce)
function queueSmartSync() {
    updateSyncStatus('pending');
    clearTimeout(syncTimer);
    // Ждем 1.5 секунды тишины, прежде чем отправлять
    syncTimer = setTimeout(() => {
        performSmartSync();
    }, 1500);
}

// 3. Отправляем на сервер
async function performSmartSync() {
    if (typeof S === 'undefined' || !S.settings.yandexToken) return;
    
    updateSyncStatus('syncing');
    const token = S.settings.yandexToken;
    const filePath = encodeURIComponent('/finance-backup.json');
    
    try {
        const res = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${filePath}&overwrite=true`, {
            headers: { 'Authorization': `OAuth ${token}` }
        });
        
        if (!res.ok) throw new Error('Ошибка API');
        const data = await res.json();
        
        const uploadRes = await fetch(data.href, { 
            method: 'PUT', 
            body: JSON.stringify(S, null, 2) 
        });
        
        if (!uploadRes.ok) throw new Error('Ошибка загрузки');
        
        S.settings.lastCloudBackup = Date.now();
        localStorage.setItem('financeApp_v25', JSON.stringify(S));
        
        updateSyncStatus('synced');
        retryCount = 0; // Сбрасываем счетчик ошибок
        
    } catch (e) {
        console.error('Smart Sync Error:', e);
        handleSyncError();
    }
}

// 4. Если ошибка — пробуем еще раз (2с, 4с, 8с)
function handleSyncError() {
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        updateSyncStatus('error');
        console.log(`⚠️ Ошибка синхронизации. Повтор через ${delay/1000} сек...`);
        
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            performSmartSync();
        }, delay);
    } else {
        updateSyncStatus('error');
        console.log('❌ Не удалось синхронизировать после 3 попыток.');
    }
}

// 5. Переопределяем кнопку ручной синхронизации (чтобы она тоже работала умно)
if (typeof window.syncManual === 'function') {
    window.syncManual = async function() {
        if (typeof S === 'undefined' || !S.settings.yandexToken) {
            if(typeof toast === 'function') toast('❌ Укажите токен в настройках');
            return;
        }
        if(typeof toast === 'function') toast('⏳ Синхронизация...');
        retryCount = 0;
        await performSmartSync();
    }
}

console.log('✅ Умная синхронизация (v45) загружена');
