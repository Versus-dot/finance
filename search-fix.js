// ==========================================
// Умный поиск и фикс курсора (v55) - search-fix.js
// ==========================================

window.renderTransactions = function() {
    const el = document.getElementById('page-transactions');
    let listWrapper = document.getElementById('txListWrapper');

    // 1. Если это первый рендер — создаем статичную часть (поиск, фильтры)
    if (!listWrapper) {
        let html = `
        <div class="search-input"><input id="txSearchInp" type="text" placeholder="Поиск по всему..." value="${typeof esc === 'function' ? esc(txSearch) : txSearch}"></div>
        <div class="chips">
            <button class="chip ${txFilter==='all'?'active':''}" data-f="all">Все</button>
            <button class="chip ${txFilter==='income'?'active':''}" data-f="income">Доходы</button>
            <button class="chip ${txFilter==='expense'?'active':''}" data-f="expense">Расходы</button>
            <button class="chip ${txFilter==='transfer'?'active':''}" data-f="transfer">Переводы</button>
            <button class="chip ${txFilter==='debt'?'active':''}" data-f="debt">Долги</button>
        </div>
        <div class="form-row" style="margin-bottom:12px">
            <input type="date" id="txDateStart" value="${txDateStart}" onchange="txDateStart=this.value;renderTransactions()" title="С даты">
            <input type="date" id="txDateEnd" value="${txDateEnd}" onchange="txDateEnd=this.value;renderTransactions()" title="По дату">
        </div>
        <div id="txListWrapper"></div>`;
        
        el.innerHTML = html;
        listWrapper = document.getElementById('txListWrapper');

        // Привязываем события (они больше не слетают!)
        const si = document.getElementById('txSearchInp');
        if (si) {
            si.oninput = (e) => {
                txSearch = e.target.value;
                renderTransactions();
            };
        }
        el.querySelectorAll('.chip').forEach(c => c.onclick = () => {
            txFilter = c.dataset.f;
            renderTransactions();
        });
    } else {
        // Если поиск уже на экране, просто обновляем активный чип
        el.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', c.dataset.f === txFilter);
        });
    }

    // 2. Фильтруем данные
    let list = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (txFilter !== 'all') list = list.filter(t => t.type === txFilter);

    // Умный поиск (ищет по всему)
    if (txSearch.trim()) {
        const q = txSearch.trim().toLowerCase();
        list = list.filter(t => {
            const cat = typeof getCat === 'function' ? getCat(t.categoryId) : null;
            const acc = typeof getAcc === 'function' ? getAcc(t.accountId) : null;
            const toAcc = typeof getAcc === 'function' ? getAcc(t.toAccountId) : null;
            const cp = S.counterparties ? S.counterparties.find(c => c.id === t.counterpartyId) : null;
            const bank = acc && S.banks ? S.banks.find(b => b.id === acc.bankId) : null;
            const accType = acc && typeof ACC_TYPES !== 'undefined' ? ACC_TYPES[acc.type] : '';
            
            const searchString = [
                t.note || '',
                cat ? cat.name : '',
                acc ? acc.name : '',
                toAcc ? toAcc.name : '',
                bank ? bank.name : '',
                cp ? cp.name : '',
                accType,
                String(t.amount),
                t.date,
                t.type === 'income' ? 'доход' : t.type === 'expense' ? 'расход' : t.type === 'transfer' ? 'перевод' : 'долг'
            ].join(' ').toLowerCase();

            return searchString.includes(q);
        });
    }

    if (txDateStart) list = list.filter(t => t.date >= txDateStart);
    if (txDateEnd) list = list.filter(t => t.date <= txDateEnd);

    // 3. Отрисовываем список
    let listHtml = '';
    if (!list.length) {
        listHtml = '<div class="empty">Нет операций</div>';
    } else {
        let last = '';
        list.forEach(t => {
            if (t.date !== last) {
                listHtml += `<div style="font-size:11px;color:var(--muted);font-weight:700;padding:8px 4px 4px;text-transform:uppercase">${new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</div>`;
                last = t.date;
            }
            listHtml += renderTxItem(t);
        });
    }
    listWrapper.innerHTML = listHtml;
};
console.log('✅ Умный поиск (v55) загружен');
