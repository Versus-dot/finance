// ==========================================
// МОДУЛЬ КАТЕГОРИЙ (mod-categories.js) v1
// ==========================================
(function() {
    console.log("✅ Модуль Категорий (mod-categories.js) v1 загружен");

    window._catEditorType = 'expense';

    window.openCategoryEditor = function() {
        window._catEditorType = 'expense';
        openModal(`
            <div class="modal-header"><h2>Категории</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="chips" style="margin-bottom:16px">
                <button class="chip" id="tabInc" onclick="window.changeCatTab('income')">Доходы</button>
                <button class="chip active" id="tabExp" onclick="window.changeCatTab('expense')">Расходы</button>
            </div>
            <div style="display:flex; gap:8px; margin-bottom:16px; align-items:flex-start;">
                <div style="flex:1;">
                    <input id="newCatNameInput" type="text" placeholder="Название новой категории">
                    <div id="newCatPassiveWrapper" style="display:none; margin-top:8px;">
                        <label style="font-size:13px; display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" id="newCatPassive" style="width:auto; margin:0;"> Пассивный доход
                        </label>
                    </div>
                </div>
                <button class="btn-primary" style="height:48px; padding:0 20px;" onclick="window.addCategoryInlineNew()">+</button>
            </div>
            <div id="catList" style="max-height:50vh; overflow-y:auto;"></div>
        `);
        window.renderCatListNew('expense');
    };

    window.changeCatTab = function(type) {
        window._catEditorType = type;
        document.getElementById('tabInc').classList.toggle('active', type === 'income');
        document.getElementById('tabExp').classList.toggle('active', type === 'expense');
        document.getElementById('newCatPassiveWrapper').style.display = (type === 'income') ? 'block' : 'none';
        window.renderCatListNew(type);
    };

    window.renderCatListNew = function(type) {
        const cats = S.categories.filter(c => c.type === type);
        let html = '';
        cats.forEach(c => {
            const passiveHtml = (type === 'income') ? `<label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted); cursor:pointer; margin-left:10px;"><input type="checkbox" style="width:auto;margin:0;" ${c.passive ? 'checked' : ''} onchange="window.toggleCatPassive('${c.id}', this.checked)"> Пассивный</label>` : '';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex; align-items:center; flex:1;">
                    <input type="text" value="${esc(c.name)}" style="width:60%;padding:6px;background:transparent;border:1px solid transparent;border-radius:4px;color:inherit;font-size:15px;" onfocus="this.style.border='1px solid var(--border)'" onblur="this.style.border='1px solid transparent';if(this.value.trim()&&this.value!=='${esc(c.name)}'){window.updateCatNameNew('${c.id}',this.value.trim())}">
                    ${passiveHtml}
                </div>
                <button class="btn-icon" onclick="window.deleteCategoryNew('${c.id}')">🗑</button>
            </div>`;
        });
        document.getElementById('catList').innerHTML = html || '<div class="empty">Нет категорий</div>';
    };

    window.addCategoryInlineNew = function() {
        const name = document.getElementById('newCatNameInput').value.trim();
        if (!name) return;
        const isPassive = (window._catEditorType === 'income') && document.getElementById('newCatPassive').checked;
        S.categories.push({id: uid(), type: window._catEditorType, name: name, passive: isPassive});
        save();
        document.getElementById('newCatNameInput').value = '';
        document.getElementById('newCatPassive').checked = false;
        window.renderCatListNew(window._catEditorType);
    };

    window.toggleCatPassive = function(id, isPassive) {
        const c = getCat(id);
        if (c) { c.passive = isPassive; save(); }
    };

    window.updateCatNameNew = function(id, name) {
        const c = getCat(id);
        if (c) { c.name = name; save(); }
    };

    window.deleteCategoryNew = function(id) {
        const c = getCat(id);
        if (S.transactions.some(t => t.categoryId === id)) { alert('Нельзя удалить: к категории привязаны операции.'); return; }
        S.categories = S.categories.filter(x => x.id !== id);
        save();
        window.renderCatListNew(c.type);
    };
})();
