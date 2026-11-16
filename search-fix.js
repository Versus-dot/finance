// ==========================================
// Умный поиск и фикс курсора (v58) - search-fix.js
// ==========================================

window.renderTransactions = function() {
    const el = document.getElementById('page-transactions');
    let listWrapper = document.getElementById('txListWrapper');

    // 1. Если это первый рендер — создаем статичную часть (поиск, фильтры)
    if (!listWrapper) {
        // Генерируем список счетов для фильтра
        let accOpts = `<option value="all" ${window.txAccFilter === 'all' || !window.txAccFilter ? 'selected' : ''}>🏦 Все счета</option>`;
        if (typeof S !== 'undefined' && S.accounts) {
            S.accounts.filter(a => !a.archived).forEach(a => {
                accOpts += `<option value="${a.id}" ${window.txAccFilter === a.id ? 'selected' : ''}>${esc(a.name)}</option>`;
            });
        }

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
        <div class="form-group" style="margin-bottom:12px;">
            <select id="txAccSelect" onchange="window.txAccFilter=this.value;renderTransactions()" style="padding: 10px 14px; border-radius: 12px; font-size: 14px; background: var(--card2); color: var(--text); border: 1px solid var(--border); width: 100%; outline:none;">
                ${accOpts}
            </select>
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
        // Синхронизируем селект, если он слетел
        const accSel = document.getElementById('txAccSelect');
        if (accSel && window.txAccFilter) accSel.value = window.txAccFilter;
    }

    // 2. Фильтруем данные
    let list = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (txFilter !== 'all') list = list.filter(t => t.type === txFilter);

    if (window.txAccFilter && window.txAccFilter !== 'all') {
        list = list.filter(t => t.accountId === window.txAccFilter || t.toAccountId === window.txAccFilter);
    }

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
                // Убрали weekday, добавили year
                const d = new Date(t.date);
                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
                listHtml += `<div style="font-size:11px;color:var(--muted);font-weight:700;padding:8px 4px 4px;text-transform:uppercase">${dateStr}</div>`;
                last = t.date;
            }
            listHtml += renderTxItem(t);
        });
    }
    listWrapper.innerHTML = listHtml;
};

function renderTxItem(t){
    let icon,title,meta,amount,sign,cls;
    if(t.type==='income'){
        const c=getCat(t.categoryId);icon='↓';title=c?c.name:'Доход';cls='income';
        const a=getAcc(t.accountId);meta=a?a.name:'';sign='+';amount=t.amount;
    }else if(t.type==='expense'){
        const c=getCat(t.categoryId);icon='↑';title=c?c.name:'Расход';cls='expense';
        const a=getAcc(t.accountId);meta=a?a.name:'';sign='−';amount=t.amount;
    }else if(t.type==='transfer'){
        const f=getAcc(t.accountId),to=getAcc(t.toAccountId);icon='⇄';title=(f?f.name:'?')+' → '+(to?to.name:'?');cls='transfer';
        const k=t.savingsKind||classifyTransfer(t.accountId,t.toAccountId);meta={savings:'в накопления',investment:'в инвестиции',withdraw:'снятие',ignore:'между'}[k]||'';sign='';amount=t.amount;
    }else{
        const cp=S.counterparties.find(c=>c.id===t.counterpartyId);icon='🤝';cls='debt';
        if(t.debtType==='lent'){title='Дал в долг: '+(cp?cp.name:'');sign='−';}
        else if(t.debtType==='returned'){title='Вернули: '+(cp?cp.name:'');sign='+';}
        else if(t.debtType==='borrowed'){title='Взял в долг: '+(cp?cp.name:'');sign='+';}
        else if(t.debtType==='repaid'){title='Отдал долг: '+(cp?cp.name:'');sign='−';}
        meta=getAcc(t.accountId)?.name||'';amount=t.amount;
    }

    // ФИКС: Добавляем стили для игнорируемых операций
    const ignoreStyle = t.ignoreInStats ? 'opacity: 0.4; filter: grayscale(100%);' : '';

    return `<div class="tx-item" style="${ignoreStyle}" onclick="openTxModal('${t.id}')"><div class="icon ${cls}">${icon}</div><div class="body"><div class="title">${esc(title)}</div><div class="meta">${esc(meta)}${t.note?' · '+esc(t.note):''}</div></div><div class="amount ${cls}">${sign}${fmt(amount)}</div></div>`;
}
console.log('✅ Умный поиск (v58) загружен');
