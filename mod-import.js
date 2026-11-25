(function() {
    console.log("✅ Модуль импорта Excel (mod-import.js) v1 загружен");

    const origOpenAccountModal = window.openAccountModal;
    
    window.openAccountModal = function(id, bankId) {
        if (origOpenAccountModal) origOpenAccountModal(id, bankId);
        
        const acc = getAcc(id);
        if (!acc) return; 
        
        const form = document.getElementById('accForm');
        if (!form) return;

        let btnsHtml = `<div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; background:var(--card); padding:10px; border-radius:12px; border:1px solid var(--border);">`;
        
        if (acc.tinvestId) {
            btnsHtml += `<button type="button" class="btn-secondary" style="flex:1; padding:10px; font-size:13px;" onclick="closeModal(); if(typeof window.syncTInvest === 'function') window.syncTInvest(false);">🔄 API Синхр.</button>`;
        }
        
        btnsHtml += `<button type="button" class="btn-primary" style="flex:1; padding:10px; font-size:13px;" onclick="window.openImportExcelModal('${acc.id}')">📥 Импорт Excel</button>`;
        btnsHtml += `</div>`;

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.insertAdjacentHTML('beforebegin', btnsHtml);
        }
    };

    window.openImportExcelModal = function(accId) {
        const acc = getAcc(accId);
        if (!acc) return;
        
        openModal(`
            <div class="modal-header"><h2>Импорт из Snowball</h2><button class="btn-icon" onclick="openAccountModal('${acc.id}')">✕</button></div>
            <div style="font-size:13px; margin-bottom:16px; line-height:1.5;">
                Счёт: <b>${esc(acc.name)}</b><br>
                Выберите Excel-файл (.xlsx), выгруженный из Snowball. Система найдет строку «Стоимость портфеля» и сохранит историю.
            </div>
            <input type="file" id="excelFileInput" accept=".xlsx, .xls" style="display:none;" onchange="window.processExcelFile(event, '${acc.id}')">
            <button type="button" class="btn-primary btn-block" style="padding:14px;" onclick="document.getElementById('excelFileInput').click()">Выбрать файл</button>
        `);
    };

    window.processExcelFile = function(event, accId) {
        const file = event.target.files[0];
        if (!file) return;
        
        toast('⏳ Чтение файла...');
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                // Заглушка: просто показываем, что файл прочитан
                console.log("Прочитан Excel:", json);
                toast('✅ Файл прочитан! (Следующий шаг - парсинг)');
                closeModal(); 
            } catch (err) {
                console.error(err);
                toast('❌ Ошибка чтения файла');
            }
        };
        reader.readAsArrayBuffer(file);
    };

})();
