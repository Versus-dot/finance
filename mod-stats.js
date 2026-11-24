// ==========================================
// МОДУЛЬ СТАТИСТИКИ (mod-stats.js) v23
// ==========================================
(function() {
    console.log("✅ Модуль Статистики (mod-stats.js) v18 загружен");

    window._statsPeriod = window._statsPeriod || 'month';
    window._statsStart = window._statsStart || null;
    window._statsEnd = window._statsEnd || null;
    window._statsTableGroup = window._statsTableGroup || 'month';
    window._statsTablePeriod = window._statsTablePeriod || '1y';
    window._statsSelectedRows = window._statsSelectedRows || [];
    
    if (!window._statsUI) {
        window._statsUI = {
            topBlock: false,
            reportWidget: false,
            snapshots: false,
            investSpoiler: true,
            spoilers: { cushion: true }
        };
    }

    let reportChartInstance = null;

    const COLORS = {
        income: '#10B981',
        active: '#34D399',
        passive: '#8B5CF6',
        expense: '#EF4444',
        taxes: '#F87171',
        saved: '#F59E0B',
        invest: '#4d7fff',
        fcf: '#00d2d3',
        rate: '#FBBF24',
        capital: '#6366F1',
        cushion: '#059669',
        pds: '#7C3AED',
        stocks: '#2563EB',
        savings: '#D97706',
        debt: '#DC2626'
    };

    const formatPercent = (val) => {
        let absVal = Math.abs(val);
        let str = absVal.toFixed(2);
        str = parseFloat(str).toString();
        return str + '%';
    };

    window.deleteSnapshot = function(date) {
        if (!confirm(`Удалить снимок за ${date}?\nОн будет пересчитан автоматически.`)) return;
        S.snapshots = S.snapshots.filter(s => s.date !== date);
        if (typeof save === 'function') save();
        
        if (date === today()) {
            setTimeout(() => {
                const c = window.getCustomCapital ? window.getCustomCapital() : { net: 0 };
                S.snapshots.push({ 
                    date: today(), 
                    total: c.net,
                    breakdown: {
                        cushion: c.cushion,
                        pds: c.pds,
                        stocks: c.investments,
                        savings: c.savings,
                        crypto: c.crypto,
                        debt: c.debt
                    }
                });
                if (typeof save === 'function') save();
                if (typeof window.renderStats === 'function') window.renderStats();
                toast('Снимок пересчитан');
            }, 100);
        } else {
            window.renderStats();
            toast('Снимок удален');
        }
    };

    window.toggleStatsBlock = function(blockId) {
        window._statsUI[blockId] = !window._statsUI[blockId];
        const body = document.getElementById(`stats-body-${blockId}`);
        const icon = document.getElementById(`stats-icon-${blockId}`);
        if (body) body.style.display = window._statsUI[blockId] ? 'none' : 'block';
        if (icon) icon.textContent = window._statsUI[blockId] ? '▶' : '▼';
    };

    window.setStatsPeriod = function(val) {
        window._statsPeriod = val;
        if (val === 'custom') window.openStatsCustomPeriod();
        else window.renderStats();
    };

    window.openStatsCustomPeriod = function() {
        const s = window._statsStart || today();
        const e = window._statsEnd || today();
        openModal(`
            <div class="modal-header"><h2>Свой период</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>
            <div class="form-row">
                <div class="form-group"><label>С даты</label><input type="date" id="stStart" value="${s}"></div>
                <div class="form-group"><label>По дату</label><input type="date" id="stEnd" value="${e}"></div>
            </div>
            <button class="btn-primary btn-block" onclick="window.applyStatsCustomPeriod()">Применить</button>
        `);
    };

    window.applyStatsCustomPeriod = function() {
        window._statsStart = document.getElementById('stStart').value;
        window._statsEnd = document.getElementById('stEnd').value;
        closeModal();
        window.renderStats();
    };

    window.changeTableFilter = function(key, val) {
        if (key === 'group') window._statsTableGroup = val;
        if (key === 'period') window._statsTablePeriod = val;
        window.renderStats();
    };

    window.toggleTableRow = function(key) {
        const idx = window._statsSelectedRows.indexOf(key);
        if (idx > -1) window._statsSelectedRows.splice(idx, 1);
        else window._statsSelectedRows.push(key);
        window.renderStats();
    };

    window.resetReportChart = function() {
        window._statsSelectedRows = [];
        window.renderStats();
    };

    window.toggleStatsSpoiler = function(key) {
        window._statsUI.spoilers[key] = !window._statsUI.spoilers[key];
        window.renderStats();
    };

    window.toggleInvestSpoiler = function() {
        window._statsUI.investSpoiler = !window._statsUI.investSpoiler;
        window.renderStats();
    };

    function getPeriodDates(period, isPrev = false) {
        let start = new Date(), end = new Date();
        end.setHours(23,59,59,999);
        start.setHours(0,0,0,0);

        if (period === 'day') {
            if (isPrev) start.setDate(start.getDate() - 1);
            end = new Date(start); end.setHours(23,59,59,999);
        } else if (period === 'week') {
            const day = start.getDay() || 7; 
            if (day !== 1) start.setHours(-24 * (day - 1));
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
            if (isPrev) { start.setDate(start.getDate() - 7); end.setDate(end.getDate() - 7); }
        } else if (period === 'month') {
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            if (isPrev) { start.setMonth(start.getMonth() - 1); end.setMonth(end.getMonth() - 1); }
        } else if (period === 'year') {
            start.setMonth(0, 1);
            end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
            if (isPrev) { start.setFullYear(start.getFullYear() - 1); end.setFullYear(end.getFullYear() - 1); }
        } else if (period === 'ytd') {
            start.setMonth(0, 1);
            if (isPrev) start.setFullYear(start.getFullYear() - 1);
            end = new Date(start); end.setFullYear(end.getFullYear() + (isPrev?1:0));
            const today = new Date();
            if (!isPrev) end = today;
            else end.setDate(today.getDate());
        } else if (period === 'custom' && window._statsStart && window._statsEnd) {
            start = new Date(window._statsStart); start.setHours(0,0,0,0);
            end = new Date(window._statsEnd); end.setHours(23,59,59,999);
            if (isPrev) {
                const diff = end - start;
                end = new Date(start.getTime() - 1);
                start = new Date(end.getTime() - diff);
            }
        }
        return { start, end };
    }

    function calcStatsData(start, end) {
        let inc = 0, exp = 0, tax = 0, sav = 0, inv = 0, passive = 0, activeInc = 0;
        S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= start.getTime() && d <= end.getTime() && !t.ignoreInStats;
        }).forEach(t => {
            if (t.type === 'income') { 
                inc += t.amount; 
                const c = getCat(t.categoryId);
                if (c && c.passive) passive += t.amount;
                else activeInc += t.amount;
            }
            if (t.type === 'expense') {
                exp += t.amount;
                const c = getCat(t.categoryId);
                if (c && (c.id === 'c_taxes' || c.name.toLowerCase().includes('налог'))) tax += t.amount;
            }
            if (t.type === 'transfer') {
                const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                if (k === 'savings') sav += t.amount;
                if (k === 'investment') inv += t.amount;
            }
        });
        const totalSaved = sav + inv;
        return { inc, exp, tax, sav, inv, passive, activeInc, totalSaved, rate: activeInc > 0 ? Math.min(100, ((sav + inv) / activeInc * 100)) : 0 };
    }

    function getTrendHtml(current, previous, isGoodWhenUp) {
        if (previous === 0 && current === 0) return `<div class="trend neutral">— 0%</div>`;
        if (previous === 0 && current > 0) return `<div class="trend ${isGoodWhenUp ? 'up-good' : 'up-bad'}">↑ Новое</div>`;
        const delta = ((current - previous) / previous) * 100;
        const isUp = delta > 0;
        
        if (Math.abs(delta) < 0.01) return `<div class="trend neutral">— 0%</div>`;
        let colorClass = (isUp && isGoodWhenUp) ? 'up-good' : (!isUp && !isGoodWhenUp) ? 'down-good' : (isUp && !isGoodWhenUp) ? 'up-bad' : 'down-bad';
        return `<div class="trend ${colorClass}">${isUp ? '↑' : '↓'} ${formatPercent(delta)}</div>`;
    }

    function generateTablePeriods() {
        const periods = [];
        const now = new Date();
        
        if (window._statsTablePeriod === '1y') {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                periods.push({ y: d.getFullYear(), m: d.getMonth(), dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
            }
        } else if (window._statsTablePeriod === '5y') {
            for (let i = 59; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                periods.push({ y: d.getFullYear(), m: d.getMonth(), dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
            }
        } else if (window._statsTablePeriod === 'ytd') {
            const start = new Date(now.getFullYear(), 0, 1);
            let cur = new Date(start);
            while (cur <= now) {
                periods.push({ y: cur.getFullYear(), m: cur.getMonth(), dateStr: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}` });
                cur.setMonth(cur.getMonth() + 1);
            }
        } else { // 'all'
            const txs = [...S.transactions].sort((a,b) => a.date.localeCompare(b.date));
            if (txs.length > 0) {
                const firstDate = new Date(txs[0].date);
                let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
                while (cur <= now) {
                    periods.push({ y: cur.getFullYear(), m: cur.getMonth(), dateStr: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}` });
                    cur.setMonth(cur.getMonth() + 1);
                }
            } else {
                periods.push({ y: now.getFullYear(), m: now.getMonth(), dateStr: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` });
            }
        }

        if (window._statsTableGroup === 'month') {
            return periods.map(p => ({
                ...p, 
                label: new Date(p.y, p.m).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }).replace('.', '')
            }));
        } else if (window._statsTableGroup === 'quarter') {
            const qMap = {};
            periods.forEach(p => {
                const q = Math.floor(p.m / 3) + 1;
                const key = `${p.y}-Q${q}`;
                if (!qMap[key]) qMap[key] = { y: p.y, q: q, label: `${p.y} Q${q}`, months: [] };
                qMap[key].months.push(p.dateStr);
            });
            return Object.values(qMap);
        } else { // year
            const yMap = {};
            periods.forEach(p => {
                const key = `${p.y}`;
                if (!yMap[key]) yMap[key] = { y: p.y, label: `${p.y}`, months: [] };
                yMap[key].months.push(p.dateStr);
            });
            return Object.values(yMap);
        }
    }

    function getHistoricalValue(row, targetMonthStr) {
        // Обработка конкретных счетов подушки
        if (row.startsWith('cushion_acc_')) {
            const accId = row.replace('cushion_acc_', '');
            const acc = getAcc(accId);
            if (!acc || acc.archived) return null;

            // Определяем дату появления счета
            let startDate = acc.openedAt;
            if (!startDate) {
                const txs = S.transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
                if (txs.length > 0) {
                    startDate = txs.map(t => t.date).sort()[0];
                } else {
                    startDate = today();
                }
            }

            const targetEnd = targetMonthStr + '-31';

            // Если целевой месяц раньше даты создания счета — возвращаем null
            if (targetEnd < startDate) return null;

            if (targetMonthStr === today().slice(0, 7)) return accValue(acc);

            let bal = acc.initialBalance || 0;
            S.transactions.filter(t => t.date <= targetEnd && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income' && t.accountId === acc.id) bal += t.amount;
                if (t.type === 'expense' && t.accountId === acc.id) bal -= t.amount;
                if (t.type === 'transfer') {
                    if (t.accountId === acc.id) bal -= t.amount;
                    if (t.toAccountId === acc.id) bal += t.amount;
                }
            });
            return bal;
        }

        const currentMonthStr = today().slice(0, 7);
        const c = window.getCustomCapital ? window.getCustomCapital() : null;
        if (!c) return 0;

        if (targetMonthStr === currentMonthStr) {
            if (row === 'capital') return c.net;
            if (row === 'cushion') return c.cushion;
            if (row === 'pds') return c.pds;
            if (row === 'stocks') return c.investments;
            if (row === 'savings') return c.savings;
            if (row === 'debt') return c.debt;
            return 0;
        }

        const targetEnd = targetMonthStr + '-31';

        // Долги считаем прямым пересчетом от кредитных лимитов
        if (row === 'debt') {
            let histDebt = 0;
            S.accounts.filter(a => a.type === 'credit' && !a.archived).forEach(a => {
                let bal = a.initialBalance || 0;
                S.transactions.filter(t => t.date <= targetEnd && !t.ignoreInStats).forEach(t => {
                    if (t.type === 'income' && t.accountId === a.id) bal += t.amount;
                    if (t.type === 'expense' && t.accountId === a.id) bal -= t.amount;
                    if (t.type === 'transfer') {
                        if (t.accountId === a.id) bal -= t.amount;
                        if (t.toAccountId === a.id) bal += t.amount;
                    }
                });
                histDebt += Math.max(0, (a.creditLimit || 0) - bal);
            });
            return histDebt;
        }

        // ПРЯМОЙ ПЕРЕСЧЕТ: сумма всех транзакций до конца целевого месяца
        if (row === 'capital') {
            let total = 0;
            S.accounts.filter(a => !a.archived).forEach(a => {
                let bal = a.initialBalance || 0;
                S.transactions.filter(t => t.date <= targetEnd && !t.ignoreInStats).forEach(t => {
                    if (t.type === 'income' && t.accountId === a.id) bal += t.amount;
                    if (t.type === 'expense' && t.accountId === a.id) bal -= t.amount;
                    if (t.type === 'transfer') {
                        if (t.accountId === a.id) bal -= t.amount;
                        if (t.toAccountId === a.id) bal += t.amount;
                    }
                    if (t.type === 'debt') {
                        if (t.accountId === a.id) {
                            if (t.debtType === 'lent' || t.debtType === 'repaid') bal -= t.amount;
                            if (t.debtType === 'borrowed' || t.debtType === 'returned') bal += t.amount;
                        }
                    }
                });
                total += bal;
            });
            return total;
        }

        // Для групп (pds, stocks, savings, cushion) — прямой пересчет по каждому счету
        const rowAccounts = [];
        if (row === 'pds') {
            S.accounts.filter(a => !a.archived && a.type === 'pds').forEach(a => rowAccounts.push(a));
        } else if (row === 'stocks') {
            S.accounts.filter(a => !a.archived && ['brokerage','iis','invest_kopilka'].includes(a.type)).forEach(a => rowAccounts.push(a));
        } else if (row === 'savings') {
            S.accounts.filter(a => !a.archived && ['deposit','savings','finu_wallet','debit','cash'].includes(a.type)).forEach(a => rowAccounts.push(a));
        } else if (row === 'cushion') {
            S.accounts.filter(a => !a.archived && a.inCushion).forEach(a => rowAccounts.push(a));
        }

        if (rowAccounts.length === 0) return 0;

        let total = 0;
        rowAccounts.forEach(acc => {
            let bal = acc.initialBalance || 0;
            S.transactions.filter(t => t.date <= targetEnd && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income' && t.accountId === acc.id) bal += t.amount;
                if (t.type === 'expense' && t.accountId === acc.id) bal -= t.amount;
                if (t.type === 'transfer') {
                    if (t.accountId === acc.id) bal -= t.amount;
                    if (t.toAccountId === acc.id) bal += t.amount;
                }
            });
            if (row === 'cushion') {
                total += bal;
            } else {
                total += bal;
            }
        });
        return total;
    }

    function calcTableRow(row, monthsArray) {
        let total = 0;
        const isDateMatch = (d) => monthsArray.some(m => d.startsWith(m));

        if (['income', 'active', 'passive', 'expense', 'taxes', 'saved'].includes(row)) {
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (row === 'income' && t.type === 'income') total += t.amount;
                if (row === 'expense' && t.type === 'expense') total += t.amount;
                if (row === 'taxes' && t.type === 'expense') {
                    const c = getCat(t.categoryId);
                    if (c && (c.id === 'c_taxes' || c.name.toLowerCase().includes('налог'))) total += t.amount;
                }
                if (row === 'active' && t.type === 'income') { const c = getCat(t.categoryId); if (!c || !c.passive) total += t.amount; }
                if (row === 'passive' && t.type === 'income') { const c = getCat(t.categoryId); if (c && c.passive) total += t.amount; }
                if (row === 'saved' && t.type === 'transfer') { const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId); if (k === 'savings') total += t.amount; }
            });
        } else if (row === 'invest_total' || row.startsWith('inv_bank_') || row.startsWith('inv_acc_')) {
            let targetAccIds = [];
            if (row === 'invest_total') {
                targetAccIds = S.accounts.filter(a => ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived).map(a => a.id);
            } else if (row.startsWith('inv_bank_')) {
                const bankId = row.replace('inv_bank_', '');
                targetAccIds = S.accounts.filter(a => a.bankId === bankId && ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived).map(a => a.id);
            } else if (row.startsWith('inv_acc_')) {
                targetAccIds = [row.replace('inv_acc_', '')];
            }

            let inSum = 0, outSum = 0;
            // ФИКС: Убрана проверка !t.ignoreInStats для инвестиций
            S.transactions.filter(t => isDateMatch(t.date)).forEach(t => {
                if (t.type === 'transfer' && targetAccIds.includes(t.toAccountId)) inSum += t.amount;
                if (t.type === 'transfer' && targetAccIds.includes(t.accountId)) outSum += t.amount;
            });
            total = inSum - outSum;
        } else if (row === 'fcf') {
            let inc = 0, exp = 0;
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income') inc += t.amount;
                if (t.type === 'expense') exp += t.amount;
            });
            total = inc - exp;
        } else if (row === 'rate') {
            let inc = 0, sav = 0, inv = 0, passive = 0;
            S.transactions.filter(t => isDateMatch(t.date) && !t.ignoreInStats).forEach(t => {
                if (t.type === 'income') {
                    inc += t.amount;
                    const c = getCat(t.categoryId);
                    if (c && c.passive) passive += t.amount;
                }
                if (t.type === 'transfer') {
                    const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                    if (k === 'savings') sav += t.amount;
                    if (k === 'investment') inv += t.amount;
                }
            });
            const activeInc = inc - passive;
            total = activeInc > 0 ? Math.min(100, ((sav + inv) / activeInc * 100)) : 0;
        } else if (row === 'total_saved') {
            total = calcTableRow('saved', monthsArray) + calcTableRow('invest_total', monthsArray);
        } else if (row.startsWith('cushion_acc_')) {
            const targetMonth = monthsArray[monthsArray.length - 1];
            total = getHistoricalValue(row, targetMonth);
        } else if (['capital', 'cushion', 'pds', 'stocks', 'savings', 'debt'].includes(row)) {
            const targetMonth = monthsArray[monthsArray.length - 1];
            total = getHistoricalValue(row, targetMonth);
        }
        return total;
    }

    window.openStatsList = function(type) {
        const dates = getPeriodDates(window._statsPeriod);
        let list = S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= dates.start.getTime() && d <= dates.end.getTime() && !t.ignoreInStats;
        });

        if (type === 'income') list = list.filter(t => t.type === 'income');
        else if (type === 'expense') list = list.filter(t => t.type === 'expense');
        else if (type === 'taxes') list = list.filter(t => {
            if (t.type !== 'expense') return false;
            const c = getCat(t.categoryId);
            return c && (c.id === 'c_taxes' || c.name.toLowerCase().includes('налог'));
        });
        else if (type === 'saved') list = list.filter(t => t.type === 'transfer' && (t.savingsKind || classifyTransfer(t.accountId, t.toAccountId)) === 'savings');
        else if (type === 'invest') {
            const targetAccIds = S.accounts.filter(a => ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived).map(a => a.id);
            list = list.filter(t => t.type === 'transfer' && (targetAccIds.includes(t.toAccountId) || targetAccIds.includes(t.accountId)));
        }

        list.sort((a,b) => b.amount - a.amount);
        const limit = 100;
        const displayList = list.slice(0, limit);

        let html = `<div class="modal-header"><h2>${type === 'income' ? 'Доходы' : type === 'expense' ? 'Расходы' : type === 'taxes' ? 'Налоги' : type === 'saved' ? 'В накопления' : type === 'invest' ? 'Инвестиции' : 'Операции'}</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
        if (list.length > limit) {
            html += `<div style="font-size:12px; color:var(--muted); margin-bottom:12px;">Показаны топ-${limit} операций по сумме. Всего: ${list.length}.</div>`;
        }
        if (displayList.length === 0) {
            html += `<div class="empty">Нет операций</div>`;
        } else {
            html += `<div style="max-height:60vh; overflow-y:auto;">`;
            displayList.forEach(t => {
                const cat = getCat(t.categoryId);
                const acc = getAcc(t.accountId);
                const toAcc = getAcc(t.toAccountId);
                
                let title = cat ? cat.name : (t.type === 'transfer' ? 'Перевод' : 'Операция');
                let meta = t.date + (acc ? ' · ' + acc.name : '') + (toAcc ? ' → ' + toAcc.name : '');
                let amountStr = fmt(t.amount);
                let color = 'inherit';
                
                if (t.type === 'income') {
                    amountStr = '+' + amountStr;
                    color = 'var(--green)';
                } else if (t.type === 'expense') {
                    amountStr = '-' + amountStr;
                    color = 'var(--red)';
                } else if (t.type === 'transfer') {
                    if (type === 'invest') {
                        const targetAccIds = S.accounts.filter(a => ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived).map(a => a.id);
                        if (targetAccIds.includes(t.toAccountId)) {
                            title = 'Пополнение инвестиций';
                            amountStr = '+' + amountStr;
                            color = 'var(--green)';
                        } else {
                            title = 'Вывод из инвестиций';
                            amountStr = '-' + amountStr;
                            color = 'var(--red)';
                        }
                    } else if (type === 'saved') {
                        const isToSaved = classifyTransfer(t.accountId, t.toAccountId) === 'savings';
                        if (isToSaved) {
                            title = 'Пополнение накоплений';
                            amountStr = '+' + amountStr;
                            color = 'var(--green)';
                        } else {
                            title = 'Снятие накоплений';
                            amountStr = '-' + amountStr;
                            color = 'var(--red)';
                        }
                    } else {
                        color = 'var(--muted)';
                    }
                }
                
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${esc(title)}</div><div style="font-size:12px; color:var(--muted);">${meta}</div></div><div style="font-weight:700; color:${color};">${amountStr}</div></div>`;
            });
            html += `</div>`;
        }
        openModal(html);
    };

    window.openStatsFCF = function() {
        const dates = getPeriodDates(window._statsPeriod);
        let incList = [], expList = [];
        let incTotal = 0, expTotal = 0;

        S.transactions.filter(t => {
            const d = new Date(t.date).getTime();
            return d >= dates.start.getTime() && d <= dates.end.getTime() && !t.ignoreInStats;
        }).forEach(t => {
            if (t.type === 'income') { incList.push(t); incTotal += t.amount; }
            if (t.type === 'expense') { expList.push(t); expTotal += t.amount; }
        });

        incList.sort((a,b) => b.amount - a.amount);
        expList.sort((a,b) => b.amount - a.amount);
        
        const limit = 50;
        const dispInc = incList.slice(0, limit);
        const dispExp = expList.slice(0, limit);

        const fcf = incTotal - expTotal;

        let html = `<div class="modal-header"><h2>Свободный поток</h2><button class="btn-icon" onclick="closeModal()">✕</button></div>`;
        html += `<div style="font-size: 24px; font-weight: 800; color: ${fcf>=0?'var(--green)':'var(--red)'}; margin-bottom: 16px;">${fmt(fcf)}</div>`;

        html += `<div style="max-height:60vh; overflow-y:auto;">`;
        
        html += `<div style="font-weight:700; color:var(--green); margin-bottom:8px;">Доходы (${fmt(incTotal)})</div>`;
        if (dispInc.length === 0) html += `<div class="empty" style="padding:8px;">Нет доходов</div>`;
        else {
            dispInc.forEach(t => {
                const cat = getCat(t.categoryId);
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${cat?esc(cat.name):'Доход'}</div><div style="font-size:12px; color:var(--muted);">${t.date}</div></div><div style="font-weight:700; color:var(--green);">+${fmt(t.amount)}</div></div>`;
            });
            if (incList.length > limit) html += `<div style="font-size:11px; color:var(--muted); text-align:right;">...и еще ${incList.length - limit}</div>`;
        }

        html += `<div style="font-weight:700; color:var(--red); margin:16px 0 8px;">Расходы (${fmt(expTotal)})</div>`;
        if (dispExp.length === 0) html += `<div class="empty" style="padding:8px;">Нет расходов</div>`;
        else {
            dispExp.forEach(t => {
                const cat = getCat(t.categoryId);
                html += `<div class="modal-list-item"><div><div style="font-weight:600;">${cat?esc(cat.name):'Расход'}</div><div style="font-size:12px; color:var(--muted);">${t.date}</div></div><div style="font-weight:700; color:var(--red);">-${fmt(t.amount)}</div></div>`;
            });
            if (expList.length > limit) html += `<div style="font-size:11px; color:var(--muted); text-align:right;">...и еще ${expList.length - limit}</div>`;
        }

        html += `</div>`;
        html += `<div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; font-weight:800;">
            <span>Итого:</span><span>${fmt(fcf)}</span>
        </div>`;
        openModal(html);
    };

    window.renderStats = function() {
        const el = document.getElementById('page-stats');
        if (!el) return;

        const dates = getPeriodDates(window._statsPeriod, false);
        const datesPrev = getPeriodDates(window._statsPeriod, true);
        const m = calcStatsData(dates.start, dates.end);
        const p = calcStatsData(datesPrev.start, datesPrev.end);

        const periodOpts = { day:'День', week:'Неделя', month:'Месяц', year:'Год', ytd:'С начала года', custom:'Период ⚙️' };
        let selectHtml = `<select onchange="window.setStatsPeriod(this.value)" onclick="event.stopPropagation()" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card); color: var(--text); border: 1px solid var(--border); outline: none; font-weight:600; cursor:pointer;">`;
        Object.keys(periodOpts).forEach(k => {
            selectHtml += `<option value="${k}" ${window._statsPeriod === k ? 'selected' : ''}>${periodOpts[k]}</option>`;
        });
        selectHtml += `</select>`;

        let snapHTML = '';
        if (S.snapshots && S.snapshots.length) {
            const currentMonthStr = today().slice(0, 7);
            snapHTML = `<table style="width:100%;font-size:13px;text-align:left;border-collapse:collapse;">
                <tr style="border-bottom:1px solid var(--border)"><th>Дата</th><th>Капитал</th><th style="width:40px; text-align:center;">Действие</th></tr>
                ${S.snapshots.slice(-6).reverse().map(s=>{
                    const isCurrentMonth = s.date.startsWith(currentMonthStr);
                    const actionHtml = isCurrentMonth 
                        ? `<button class="btn-icon" style="color:var(--red); padding:2px;" onclick="window.deleteSnapshot('${s.date}')" title="Удалить снимок">🗑</button>`
                        : `<span style="color:var(--muted); padding:2px; cursor:not-allowed;" title="Архивный снимок защищен">🔒</span>`;
                    return `<tr style="border-bottom:1px solid var(--border)">
                        <td style="padding:6px 0">${s.date}</td>
                        <td>${fmt(s.total)}</td>
                        <td style="text-align:center;">${actionHtml}</td>
                    </tr>`;
                }).join('')}
            </table>`;
        } else {
            snapHTML = '<div class="empty">Нет снимков</div>';
        }

        const periods = generateTablePeriods();
        
        // ДИНАМИЧЕСКИЕ СТРОКИ ДЛЯ ПОДУШКИ
        const dynamicCushionRows = [];
        S.accounts.filter(a => a.inCushion && !a.archived).forEach(a => {
            const bank = getBank(a.bankId);
            dynamicCushionRows.push({
                key: 'cushion_acc_' + a.id,
                label: '↳ ' + (bank ? bank.name + ' - ' : '') + a.name,
                indent: 1,
                color: COLORS.cushion
            });
        });
        dynamicCushionRows.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

        // ДИНАМИЧЕСКИЕ СТРОКИ ДЛЯ ИНВЕСТИЦИЙ
        const dynamicInvestmentRows = [];
        
        const investAccounts = S.accounts.filter(a => ['brokerage', 'iis', 'invest_kopilka'].includes(a.type) && !a.archived);
        const bankGroups = {};
        investAccounts.forEach(a => {
            if (!bankGroups[a.bankId]) bankGroups[a.bankId] = [];
            bankGroups[a.bankId].push(a);
        });

        Object.keys(bankGroups).forEach(bankId => {
            const bank = getBank(bankId);
            if (!bank) return;
            const accs = bankGroups[bankId];
            
            if (accs.length > 1) {
                dynamicInvestmentRows.push({ key: 'inv_bank_' + bankId, label: '↳ ' + esc(bank.name), indent: 1, color: COLORS.invest });
                accs.forEach(acc => {
                    dynamicInvestmentRows.push({ key: 'inv_acc_' + acc.id, label: '↳↳ ' + esc(acc.name), indent: 2, color: COLORS.invest });
                });
            } else if (accs.length === 1) {
                dynamicInvestmentRows.push({ key: 'inv_acc_' + accs[0].id, label: '↳ ' + esc(bank.name), indent: 1, color: COLORS.invest });
            }
        });

        // Собираем финальный массив строк
        const rows = [
            { type: 'header', label: 'ПОТОК ЗА ПЕРИОД' },
            { key: 'income', label: 'Доходы', indent: 0, color: COLORS.income, bold: true },
            { key: 'active', label: 'Активный', indent: 1, color: COLORS.active },
            { key: 'passive', label: 'Пассивный', indent: 1, color: COLORS.passive },
            { key: 'expense', label: 'Расходы', indent: 0, color: COLORS.expense, bold: true },
            { key: 'taxes', label: 'Налоги', indent: 1, color: COLORS.taxes },
            { key: 'saved', label: 'Отложено в накопления', indent: 0, color: COLORS.saved },
            { key: 'total_saved', label: 'Общее отложенное', indent: 0, color: COLORS.saved, bold: true },
            { key: 'invest_total', label: 'Инвестировано (Всего)', indent: 0, color: COLORS.invest, bold: true },
            ...(window._statsUI.investSpoiler ? [] : dynamicInvestmentRows),
            { key: 'fcf', label: 'Свободный поток', indent: 0, color: COLORS.fcf, bold: true },
            { key: 'rate', label: 'Норма сбережений', indent: 0, color: COLORS.rate, suffix: '%' },
            { type: 'header', label: 'БАЛАНСЫ НА КОНЕЦ ПЕРИОДА' },
            { key: 'capital', label: 'Капитал', indent: 0, color: COLORS.capital, bold: true, isHeader: true },
            { key: 'cushion', label: 'Подушка', indent: 1, color: COLORS.cushion },
            ...(window._statsUI.spoilers.cushion ? [] : dynamicCushionRows),
            { key: 'pds', label: 'ПДС', indent: 1, color: COLORS.pds },
            { key: 'stocks', label: 'Фондовый рынок', indent: 1, color: COLORS.stocks },
            { key: 'savings', label: 'Накопления', indent: 1, color: COLORS.savings },
            { key: 'debt', label: 'Долги', indent: 1, color: COLORS.debt }
        ];

        // ФИКС: Убран table-layout: fixed, добавлены min-width для колонок
        let topScrollbarHtml = `<div id="stats-top-scroll" style="overflow-x:auto; overflow-y:hidden; border-radius:12px; margin-bottom: 4px; display:none;"><div id="stats-top-scroll-inner" style="height:1px;"></div></div>`;
        let tableHtml = `<div id="stats-table-container" style="overflow-x:auto; white-space:nowrap; border-radius:12px; border:1px solid var(--border); max-width: 100%; position:relative;">
            <table style="width: max-content; min-width: 100%; border-collapse:collapse; font-size:13px; text-align:right;">
                <thead>
                    <tr style="background:var(--card2); border-bottom:1px solid var(--border);">
                        <th style="position:sticky; left:0; background:var(--card2); z-index:3; padding:10px; text-align:left; font-weight:700; width: 110px; min-width: 110px; max-width: 110px; border-right:1px solid var(--border);">Параметр</th>`;
        periods.forEach(p => {
            tableHtml += `<th style="padding:10px; font-weight:600; min-width: 90px; text-align:right;">${p.label}</th>`;
        });
        tableHtml += `<th style="position:sticky; right:0; background:var(--card2); z-index:3; padding:10px; font-weight:700; min-width: 110px; border-left:1px solid var(--border); text-align:right;">Итого</th>`;
        tableHtml += `</tr></thead><tbody>`;

        rows.forEach((row, i) => {
            // === СТРОКА-ЗАГОЛОВОК ===
            if (row.type === 'header') {
                tableHtml += `<tr style="background:var(--bg2);"><td colspan="${periods.length + 2}" style="padding: 8px 10px; font-size: 11px; font-weight: 800; color: var(--muted); text-align: left; letter-spacing: 1px; border-bottom: 1px solid var(--border); position: sticky; left: 0; z-index: 4;">${row.label}</td></tr>`;
                return;
            }

            const isSelected = window._statsSelectedRows.includes(row.key);
            const bg = isSelected ? 'var(--bg2)' : (i % 2 === 0 ? 'var(--card)' : 'var(--card2)');
            const activeBar = isSelected ? `<div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:${row.color};"></div>` : '';
            
            // Стрелка-спойлер для 'invest_total'
            const investArrow = row.key === 'invest_total'
                ? `<span style="display:inline-block; width:14px; text-align:center; margin-right:2px; cursor:pointer; user-select:none;" onclick="event.stopPropagation(); window.toggleInvestSpoiler();">${window._statsUI.investSpoiler ? '▶' : '▼'}</span>`
                : '';
            
            // Стрелка-спойлер для 'cushion'
            const cushionArrow = row.key === 'cushion'
                ? `<span onclick="event.stopPropagation(); window.toggleStatsSpoiler('cushion');" style="cursor:pointer; padding:4px 8px; display:inline-block; font-size:10px; color:var(--muted);">${!window._statsUI.spoilers.cushion ? '▼' : '▶'}</span>`
                : '';
            
            tableHtml += `<tr style="background:${bg}; border-bottom:1px solid var(--border); transition: background 0.2s; position:relative;">
                <td onclick="window.toggleTableRow('${row.key}')" 
                    style="position:sticky; left:0; background:${bg}; z-index:2; padding:10px; text-align:left; font-weight:${row.bold ? '700' : '400'}; color:${row.color || 'inherit'}; cursor:pointer; user-select:none; border-right:1px solid var(--border); width: 110px; min-width: 110px; max-width: 110px; ${isSelected ? 'box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);' : ''}">
                    ${activeBar}
                    <div style="white-space: normal; word-break: break-word; line-height: 1.2; padding-left: ${row.indent * 10}px;">
                        ${investArrow}${cushionArrow}${row.label}
                    </div>
                </td>`;
            
            periods.forEach(p => {
                const monthsArr = p.months ? p.months : [p.dateStr];
                let val = calcTableRow(row.key, monthsArr);
                let display = (val === 0 || val === null || val === undefined) ? '-' : (row.suffix ? formatPercent(val) : fmtPlain(val));
                if (row.key === 'capital' && (val === 0 || val === null || val === undefined)) display = '-';
                tableHtml += `<td style="padding:10px; min-width: 90px; white-space: nowrap;">${display}</td>`;
            });

            // Calculate Total
            let totalVal = 0;
            if (['income', 'active', 'passive', 'expense', 'taxes', 'saved', 'fcf'].includes(row.key) || row.key === 'invest_total' || row.key.startsWith('inv_bank_') || row.key.startsWith('inv_acc_')) {
                totalVal = periods.reduce((sum, p) => {
                    const monthsArr = p.months ? p.months : [p.dateStr];
                    return sum + calcTableRow(row.key, monthsArr);
                }, 0);
            } else if (row.key === 'rate') {
                let totalInc = 0, totalSav = 0;
                periods.forEach(p => {
                    const monthsArr = p.months ? p.months : [p.dateStr];
                    S.transactions.filter(t => monthsArr.some(m => t.date.startsWith(m)) && !t.ignoreInStats).forEach(t => {
                        if (t.type === 'income') totalInc += t.amount;
                        if (t.type === 'transfer') {
                            const k = t.savingsKind || classifyTransfer(t.accountId, t.toAccountId);
                            if (k === 'savings' || k === 'investment') totalSav += t.amount;
                        }
                    });
                });
                totalVal = totalInc > 0 ? Math.min(100, (totalSav / totalInc * 100)) : 0;
            } else {
                const lastPeriod = periods[periods.length - 1];
                if (lastPeriod) {
                    const monthsArr = lastPeriod.months ? lastPeriod.months : [lastPeriod.dateStr];
                    totalVal = calcTableRow(row.key, monthsArr);
                }
            }

            let displayTotal = (totalVal === 0 || totalVal === null || totalVal === undefined) ? '-' : (row.suffix ? formatPercent(totalVal) : fmtPlain(totalVal));
            if (row.key === 'capital' && (totalVal === 0 || totalVal === null || totalVal === undefined)) displayTotal = '-';

            tableHtml += `<td style="position:sticky; right:0; background:${bg}; z-index:2; padding:10px; font-weight:700; border-left:1px solid var(--border); min-width: 110px; text-align:right; white-space: nowrap;">${displayTotal}</td>`;
            tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;

        el.innerHTML = `
            <div id="donutChartContainer" class="card" style="margin-bottom:16px;"></div>
            
            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('topBlock')">
                    <div class="fw-header-left">
                        <span id="stats-icon-topBlock">${window._statsUI.topBlock ? '▶' : '▼'}</span> Итог за период
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation();">
                        ${selectHtml}
                    </div>
                </div>
                <div class="fw-body" id="stats-body-topBlock" style="display: ${window._statsUI.topBlock ? 'none' : 'block'};">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="analytic-item" onclick="window.openStatsList('income')">
                            <div class="label">Доходы</div><div class="val pos">${fmt(m.inc)}</div>${getTrendHtml(m.inc, p.inc, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openStatsList('expense')">
                            <div class="label">Расходы</div><div class="val neg">${fmt(m.exp)}</div>${getTrendHtml(m.exp, p.exp, false)}
                        </div>
                        <div class="analytic-item" onclick="window.openStatsList('saved')">
                            <div class="label">В накопления</div><div class="val pos">${fmt(m.sav)}</div>${getTrendHtml(m.sav, p.sav, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openStatsList('invest')">
                            <div class="label">Инвестировано</div><div class="val pos">${fmt(calcTableRow('invest_total', [today().slice(0,7)]))}</div>
                            <div style="font-size:10px; color:var(--muted);">За текущий месяц</div>
                        </div>
                        <div class="analytic-item" onclick="window.openStatsFCF()">
                            <div class="label">Свободный поток</div><div class="val pos">${fmt(m.inc - m.exp)}</div>${getTrendHtml(m.inc - m.exp, p.inc - p.exp, true)}
                        </div>
                        <div class="analytic-item" onclick="window.openAnalyticsInfo()">
                            <div class="label">Норма сбережений</div><div class="val">${formatPercent(m.rate)}</div>${getTrendHtml(m.rate, p.rate, true)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('reportWidget')">
                    <div class="fw-header-left">
                        <span id="stats-icon-reportWidget">${window._statsUI.reportWidget ? '▶' : '▼'}</span> Конструктор отчётов
                    </div>
                    <button class="btn-small btn-secondary" onclick="event.stopPropagation(); window.resetReportChart()">Сбросить всё</button>
                </div>
                <div class="fw-body" id="stats-body-reportWidget" style="display: ${window._statsUI.reportWidget ? 'none' : 'block'}; padding-top:0;">
                    <div style="padding: 12px 0;">
                        <div style="position:relative; height:300px; width:100%;">
                            <canvas id="reportDynamicChart"></canvas>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom:12px; overflow-x:auto; padding-bottom:4px;">
                        <select onchange="window.changeTableFilter('group', this.value)" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card2); color: var(--text); border: 1px solid var(--border); outline:none; font-weight:600;">
                            <option value="month" ${window._statsTableGroup==='month'?'selected':''}>По месяцам</option>
                            <option value="quarter" ${window._statsTableGroup==='quarter'?'selected':''}>По кварталам</option>
                            <option value="year" ${window._statsTableGroup==='year'?'selected':''}>По годам</option>
                        </select>
                        <select onchange="window.changeTableFilter('period', this.value)" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; background: var(--card2); color: var(--text); border: 1px solid var(--border); outline:none; font-weight:600;">
                            <option value="all" ${window._statsTablePeriod==='all'?'selected':''}>Весь период</option>
                            <option value="1y" ${window._statsTablePeriod==='1y'?'selected':''}>За 1 год</option>
                            <option value="5y" ${window._statsTablePeriod==='5y'?'selected':''}>За 5 лет</option>
                            <option value="ytd" ${window._statsTablePeriod==='ytd'?'selected':''}>С начала года</option>
                        </select>
                    </div>
                    <div style="font-size: 11px; color: var(--muted); margin-bottom: 8px;">💡 Нажмите на параметр в таблице, чтобы отобразить его на графике.</div>
                    ${topScrollbarHtml}${tableHtml}
                </div>
            </div>

            <div class="fullwidth-widget" style="margin-bottom:16px;">
                <div class="fw-header" onclick="window.toggleStatsBlock('snapshots')">
                    <div class="fw-header-left">
                        <span id="stats-icon-snapshots">${window._statsUI.snapshots ? '▶' : '▼'}</span> Отчёт (снимки)
                    </div>
                </div>
                <div class="fw-body" id="stats-body-snapshots" style="display: ${window._statsUI.snapshots ? 'none' : 'block'};">
                    ${snapHTML}
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof window.renderDonutChart === 'function') {
                window.renderDonutChart();
            }
            renderReportChart();

            // Синхронизация ползунков
            const tableContainer = document.getElementById('stats-table-container');
            const topScroll = document.getElementById('stats-top-scroll');
            const topScrollInner = document.getElementById('stats-top-scroll-inner');

            if (tableContainer && topScroll && topScrollInner) {
                topScrollInner.style.width = tableContainer.scrollWidth + 'px';

                topScroll.onscroll = function() {
                    tableContainer.scrollLeft = topScroll.scrollLeft;
                };

                tableContainer.onscroll = function() {
                    topScroll.scrollLeft = tableContainer.scrollLeft;
                };

                if (tableContainer.scrollWidth > tableContainer.clientWidth) {
                    topScroll.style.display = 'block';
                } else {
                    topScroll.style.display = 'none';
                }
            }
        }, 50);
    };

    function renderReportChart() {
        const canvas = document.getElementById('reportDynamicChart');
        if (!canvas) return;
        
        if (reportChartInstance) reportChartInstance.destroy();

        if (window._statsSelectedRows.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const periods = generateTablePeriods();
        const labels = periods.map(p => p.label);
        
        const datasets = [];
        let hasRub = false;
        let hasPct = false;
        const cushionShades = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

        window._statsSelectedRows.forEach((key, idx) => {
            let label = '';
            let type = 'bar';
            let isPct = false;
            let color = COLORS.invest;

            if (key === 'income') { label = 'Доходы'; color = COLORS.income; }
            else if (key === 'active') { label = 'Активный'; color = COLORS.active; }
            else if (key === 'passive') { label = 'Пассивный'; color = COLORS.passive; }
            else if (key === 'expense') { label = 'Расходы'; color = COLORS.expense; }
            else if (key === 'taxes') { label = 'Налоги'; color = COLORS.taxes; }
            else if (key === 'saved') { label = 'Отложено'; color = COLORS.saved; }
            else if (key === 'invest_total') { label = 'Инвестировано (Всего)'; color = COLORS.invest; }
            else if (key.startsWith('inv_bank_') || key.startsWith('inv_acc_')) { 
                label = 'Инвестиции'; color = COLORS.invest;
                const rowDef = document.querySelector(`td[onclick*="'${key}'"]`);
                if (rowDef) label = rowDef.textContent.trim().replace('↳', '').trim();
            }
            else if (key === 'fcf') { label = 'Свободный поток'; color = COLORS.fcf; }
            else if (key === 'rate') { label = 'Норма сбережений'; type = 'line'; isPct = true; color = COLORS.rate; }
            else if (key === 'capital') { label = 'Капитал'; type = 'line'; color = COLORS.capital; }
            else if (key === 'cushion') { label = 'Подушка'; color = COLORS.cushion; }
            else if (key.startsWith('cushion_acc_')) {
                const accId = key.replace('cushion_acc_', '');
                const acc = getAcc(accId);
                label = acc ? acc.name : 'Счет';
                color = cushionShades[accId.charCodeAt(accId.length - 1) % cushionShades.length];
                type = 'bar';
            }
            else if (key === 'pds') { label = 'ПДС'; color = COLORS.pds; }
            else if (key === 'stocks') { label = 'Фондовый рынок'; color = COLORS.stocks; }
            else if (key === 'savings') { label = 'Накопления'; color = COLORS.savings; }
            else if (key === 'debt') { label = 'Долги'; color = COLORS.debt; }
            else return; 

            if (isPct) hasPct = true; else hasRub = true;

            const data = periods.map(p => {
                const monthsArr = p.months ? p.months : [p.dateStr];
                return calcTableRow(key, monthsArr);
            });

            datasets.push({
                type: type,
                label: label,
                data: data,
                backgroundColor: type === 'bar' ? color : color + '33',
                borderColor: color,
                borderWidth: type === 'line' ? 2 : 0,
                fill: type === 'line',
                tension: 0.3,
                yAxisID: isPct ? 'y1' : 'y',
                maxBarThickness: 30
            });
        });

        reportChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: {size: 11} } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const val = ctx.parsed.y;
                                if (ctx.dataset.yAxisID === 'y1') return ctx.dataset.label + ': ' + formatPercent(val);
                                return ctx.dataset.label + ': ' + fmtPlain(val);
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: {size: 10} } },
                    y: { 
                        type: 'linear', display: hasRub, position: 'left',
                        beginAtZero: true, ticks: { font: {size: 10} }
                    },
                    y1: { 
                        type: 'linear', display: hasPct, position: 'right',
                        beginAtZero: true, max: 100, grid: { drawOnChartArea: false },
                        ticks: { font: {size: 10}, callback: function(v) { return v + '%'; } }
                    }
                }
            }
        });
    }
})();
