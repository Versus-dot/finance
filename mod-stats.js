// ==========================================
// МОДУЛЬ СТАТИСТИКИ (mod-stats.js) v3
// ==========================================
(function() {
    console.log("✅ Модуль Статистики (mod-stats.js) v3 загружен");

    window._statsPeriod = window._statsPeriod || 'month';
    window._statsStart = window._statsStart || null;
    window._statsEnd = window._statsEnd || null;
    
    if (!window._statsUI) {
        window._statsUI = {
            topBlock: false,
            chartBar: false,
            chartPassive: false,
            chartRate: false,
            chartCapital: false,
            snapshots: false,
            budgets: false
        };
    }

    let chartBarInstance = null;
    let chartPassiveInstance = null;
    let chartRateInstance = null;
    let chartCapitalInstance = null;

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

    function getStatsDates(period) {
        let start = new Date(), end = new Date();
        end.setHours(23,59,59,999);
        start.setHours(0,0,0,0);

        if (period === 'day') {
            end = new Date(start); end.setHours(23,59,59,999);
        } else if (period === 'week') {
            const day = start.getDay() || 7; 
            if (day !== 1) start.setHours(-24 * (day - 1));
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
        } else if (period === 'month') {
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'year') {
            start.setMonth(0, 1);
            end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (period === 'ytd') {
            start.setMonth(0, 1);
            end = new Date();
        } else if (period === 'custom' && window._statsStart && window._statsEnd) {
            start = new Date(window._statsStart); start.setHours(0,0,0,0);
            end = new Date(window._statsEnd); end.setHours(23,59,59,999);
        }
        return { start, end };
    }

    function calcStatsData(start, end) {
        let inc = 0, exp = 0, sav = 0, inv = 0, passive = 0;
        S.transactions.filter(t => {
           
