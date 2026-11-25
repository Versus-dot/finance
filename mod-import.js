(function() {
    console.log("✅ Модуль импорта Excel (mod-import.js) v3 загружен");

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
                
                if (!json || json.length < 5) {
                    toast('❌ Файл пустой или некорректный');
                    closeModal();
                    return;
                }

                // Карта месяцев
                const MONTH_MAP = {
                    'янв': 1, 'январь': 1, 'фев': 2, 'февраль': 2, 'мар': 3, 'март': 3, 'мар.': 3,
                    'апр': 4, 'апрель': 4, 'апр.': 4, 'май': 5, 'июн': 6, 'июнь': 6,
                    'июл': 7, 'июль': 7, 'авг': 8, 'август': 8, 'сен': 9, 'сентябрь': 9,
                    'окт': 10, 'октябрь': 10, 'ноя': 11, 'ноябрь': 11, 'дек': 12, 'декабрь': 12
                };

                // Парсим "май 24" → {month, year}
                function parseMonthCell(cell) {
                    if (!cell) return null;
                    const s = String(cell).trim().toLowerCase().replace('.', '');
                    // Ищем месяц
                    for (const [name, num] of Object.entries(MONTH_MAP)) {
                        if (s.startsWith(name)) {
                            // Ищем год после месяца
                            const rest = s.slice(name.length).trim();
                            let year = new Date().getFullYear();
                            const yearMatch4 = rest.match(/(\d{4})/);
                            const yearMatch2 = rest.match(/(\d{2})/);
                            if (yearMatch4) {
                                year = parseInt(yearMatch4[1]);
                            } else if (yearMatch2) {
                                year = 2000 + parseInt(yearMatch2[1]);
                            }
                            return { month: num, year: year };
                        }
                    }
                    return null;
                }

                // Находим строку с датами (ищем строку, где есть ячейки с названиями месяцев)
                let dateRowIdx = -1;
                let dateCells = [];
                for (let i = 0; i < json.length; i++) {
                    const row = json[i];
                    if (!row || row.length < 2) continue;
                    // Проверяем, есть ли в строке ячейки с названиями месяцев
                    const monthCells = row.filter(c => parseMonthCell(c)).map(c => parseMonthCell(c));
                    if (monthCells.length >= 2) {
                        dateRowIdx = i;
                        dateCells = row;
                        break;
                    }
                }

                if (dateRowIdx === -1) {
                    toast('❌ Не найдена строка с датами');
                    closeModal();
                    return;
                }

                // Находим строку "Стоимость портфеля"
                let portfolioRowIdx = -1;
                for (let i = dateRowIdx + 1; i < json.length; i++) {
                    const row = json[i];
                    if (!row || !row[0]) continue;
                    const label = String(row[0]).toLowerCase().replace('.', '').replace(/\s+/g, '');
                    if (label.includes('стоимостьпортфеля') || label.includes('totalportfolio') || label.includes('портфеля')) {
                        portfolioRowIdx = i;
                        break;
                    }
                }

                if (portfolioRowIdx === -1) {
                    toast('❌ Не найдена строка "Стоимость портфеля"');
                    closeModal();
                    return;
                }

                // Парсим пары дата → стоимость
                const portfolioHistory = {};
                for (let ci = 1; ci < dateCells.length; ci++) {
                    const dateCell = dateCells[ci];
                    const monthData = parseMonthCell(dateCell);
                    if (!monthData) continue;

                    const valCell = json[portfolioRowIdx][ci];
                    if (valCell === undefined || valCell === null) continue;

                    const val = parseFloat(String(valCell).replace(/\s/g, '').replace(',', '.'));
                    if (isNaN(val)) continue;

                    // Формируем ключ YYYY-MM-31
                    const monthStr = String(monthData.month).padStart(2, '0');
                    const key = `${monthData.year}-${monthStr}-31`;
                    portfolioHistory[key] = Math.round(val * 100) / 100;
                }

                // Сохраняем в объект счета
                const acc = getAcc(accId);
                if (!acc) {
                    toast('❌ Счёт не найден');
                    closeModal();
                    return;
                }

                if (!acc.portfolioHistory) acc.portfolioHistory = {};
                const count = Object.keys(portfolioHistory).length;
                Object.assign(acc.portfolioHistory, portfolioHistory);

                // Удаляем нулевые значения
                Object.keys(acc.portfolioHistory).forEach(k => {
                    if (acc.portfolioHistory[k] === 0) delete acc.portfolioHistory[k];
                });

                if (count === 0) {
                    toast('⚠️ Не найдено значений стоимости');
                    closeModal();
                    return;
                }

                save();
                closeModal();
                toast(`✅ Загружено: ${count} снимков портфеля`);
                if (typeof renderAll === 'function') renderAll();

            } catch (err) {
                console.error(err);
                toast('❌ Ошибка чтения файла: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

})();
