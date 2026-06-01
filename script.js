// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
const toggle = document.getElementById('themeSwitch');
const body = document.body;
let allMatches = [];

// ===== ТЕМА =====
function setTheme(isDark) {
    if (isDark) {
        body.classList.add('dark');
        body.classList.remove('light');
    } else {
        body.classList.remove('dark');
        body.classList.add('light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    const isDark = savedTheme === 'dark';
    setTheme(isDark);
    toggle.checked = isDark;
} else {
    setTheme(false);
    toggle.checked = false;
}
toggle.addEventListener('change', function () {
    setTheme(toggle.checked);
});

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (с сохранением последней) =====
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabId) {
    tabContents.forEach(content => content.classList.remove('active'));
    tabBtns.forEach(btn => btn.classList.remove('active'));
    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    localStorage.setItem('lastTab', tabId);
    if (tabId === 'stats') updateStats();
}
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    });
});
const lastTab = localStorage.getItem('lastTab');
if (lastTab && document.getElementById(lastTab)) {
    switchTab(lastTab);
} else {
    switchTab('info');
}

// ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СРЕДНЕГО ВОЗРАСТА =====
function updateAverageAge() {
    const baseDate = new Date(2026, 4, 12);
    const baseAge = 18.6;
    const today = new Date();
    const diffYears = (today - baseDate) / (1000 * 60 * 60 * 24 * 365.25);
    let currentAge = baseAge + diffYears;
    currentAge = Math.round(currentAge * 10) / 10;
    const ageSpan = document.getElementById('averageAgeValue');
    if (ageSpan) ageSpan.textContent = currentAge;
}
updateAverageAge();

// ===== ГЛОБАЛЬНАЯ ЗАГРУЗКА МАТЧЕЙ (доступна из других страниц) =====
async function getAllMatches() {
    if (allMatches.length > 0) return allMatches;
    try {
        const indexResp = await fetch('matches/index.json');
        if (!indexResp.ok) throw new Error('Не удалось загрузить список матчей');
        const { matches: matchFiles } = await indexResp.json();
        const matchesData = [];
        for (const fileName of matchFiles) {
            const res = await fetch(`matches/${fileName}`);
            if (res.ok) {
                const match = await res.json();
                match.fileName = fileName;
                matchesData.push(match);
            } else {
                console.warn(`Не удалось загрузить ${fileName}`);
            }
        }
        matchesData.sort((a, b) => {
            const getNumber = (fileName) => parseInt(fileName.split('_')[0], 10);
            return getNumber(b.fileName) - getNumber(a.fileName);
        });
        allMatches = matchesData;
        return allMatches;
    } catch (err) {
        console.error(err);
        return [];
    }
}

// ===== ЗАГРУЗКА И ОТОБРАЖЕНИЕ МАТЧЕЙ ВО ВКЛАДКЕ MATCHES =====
const matchesContainer = document.getElementById('matches');
if (matchesContainer) {
    let displayedCount = 15;
    let isLoading = false;

    function calculateStats(matches) {
        if (!matches.length) return { winRate: 0, winStreak: 0 };
        let wins = 0;
        let currentStreak = 0;
        for (const match of matches) {
            if (match.teamDoctorsScore > match.teamOpponentScore) wins++;
        }
        const winRate = (wins / matches.length) * 100;
        for (const match of matches) {
            if (match.teamDoctorsScore > match.teamOpponentScore) {
                currentStreak++;
            } else {
                break;
            }
        }
        return { winRate: winRate.toFixed(1), winStreak: currentStreak };
    }

    function renderStats(stats) {
        return `
            <div class="stats-blocks">
                <div class="stat-block">
                    <div class="stat-value">${stats.winStreak}</div>
                    <div class="stat-label">Current win streak</div>
                </div>
                <div class="stat-block">
                    <div class="stat-value">${stats.winRate}%</div>
                    <div class="stat-label">Win rate</div>
                </div>
            </div>
        `;
    }

    function groupMatchesByTournament(matches) {
        const groups = {};
        for (const match of matches) {
            const tournament = match.tournament || 'Other';
            if (!groups[tournament]) groups[tournament] = [];
            groups[tournament].push(match);
        }
        return groups;
    }

    function renderMatchesTable(matches, limit) {
        const displayMatches = matches.slice(0, limit);
        const groups = groupMatchesByTournament(displayMatches);
        let html = renderStats(calculateStats(displayMatches));
        for (const [tournament, matchesList] of Object.entries(groups)) {
            html += `<div class="tournament-group">
                        <div class="tournament-header">${tournament}</div>
                        <div class="matches-list">`;
            for (const match of matchesList) {
                const dateFormatted = match.date.replace(/\./g, '/');
                html += `
                    <div class="match-item">
                        <div class="match-date">${dateFormatted}</div>
                        <div class="match-team-doctors">
                            <span class="match-team-name">Doctors</span>
                            <img class="match-team-logo" src="team-doctors.jpg" alt="Doctors">
                        </div>
                        <div class="match-score">${match.teamDoctorsScore || 0} : ${match.teamOpponentScore || 0}</div>
                        <div class="match-team-opponent">
                            <img class="match-team-logo" src="opponent-logo.jpg" alt="Opponent">
                            <span class="match-team-name">${match.opponent || '?'}</span>
                        </div>
                        <button class="match-detail-btn" data-match-file="${match.fileName}">Match</button>
                    </div>
                `;
            }
            html += `</div></div>`;
        }
        if (limit < matches.length) {
            html += `<div class="load-more-container"><button id="loadMoreMatches" class="load-more-btn">Загрузить ещё</button></div>`;
        }
        matchesContainer.innerHTML = html;
        attachMatchButtons();
    }

    function attachMatchButtons() {
        document.querySelectorAll('.match-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = btn.getAttribute('data-match-file');
                if (fileName) window.location.href = `match.html?match=${fileName}`;
            });
        });
        const loadMoreBtn = document.getElementById('loadMoreMatches');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                if (!isLoading) {
                    isLoading = true;
                    displayedCount += 15;
                    renderMatchesTable(allMatches, displayedCount);
                    isLoading = false;
                }
            });
        }
    }

    async function initMatches() {
        matchesContainer.innerHTML = '<p>Загрузка матчей...</p>';
        await getAllMatches();
        if (allMatches.length === 0) {
            matchesContainer.innerHTML = '<p>Ошибка загрузки матчей</p>';
            return;
        }
        displayedCount = 15;
        renderMatchesTable(allMatches, displayedCount);
        updateRosterFromMatches(allMatches);
        updateStats();
    }
    initMatches();
}

// ===== ЦВЕТА ДЛЯ ROSTER =====
function getRatingColorStyle(rating) {
    if (rating >= 1.50) return '#4096e0';
    if (rating >= 1.25) return '#31b605';
    if (rating >= 1.05) return '#88cc44';
    if (rating >= 0.96) return '';
    return '#ff6666';
}

// ===== ОБНОВЛЕНИЕ ROSTER =====
function updateRosterFromMatches(matches) {
    const nickMapping = {
        '_map1ks_': 'map1ks',
        'fak_zhresko': 'dark_sasi',
        'd1amp0': 'D1amp0',
        'Iightwork': 'lightwork',
        'fortyfortea1': 'Dew1erMode'
    };
    const reverseNickMapping = {
        'map1ks': '_map1ks_',
        'dark_sasi': 'fak_zhresko',
        'D1amp0': 'd1amp0',
        'lightwork': 'Iightwork',
        'Dew1erMode': 'fortyfortea1'
    };

    const playerStats = {};
    for (const match of matches) {
        const players = match.playersDoctors;
        if (!players) continue;
        for (const player of players) {
            let nick = player.nick;
            if (nickMapping[nick]) nick = nickMapping[nick];
            if (!playerStats[nick]) {
                playerStats[nick] = { maps: 0, totalRating: 0 };
            }
            playerStats[nick].maps++;
            playerStats[nick].totalRating += (player.rating || 0);
        }
    }

    const teamTime = getTeamTime();

    const rosterRows = document.querySelectorAll('#roster .roster-row');
    rosterRows.forEach(row => {
        const nickElement = row.querySelector('.player-nick');
        if (!nickElement) return;
        let displayNick = nickElement.innerText.trim();
        let stats = playerStats[displayNick];

        if (!stats) {
            const originalNick = Object.keys(reverseNickMapping).find(key => reverseNickMapping[key] === displayNick);
            if (originalNick && playerStats[originalNick]) stats = playerStats[originalNick];
        }

        const mapsCell = row.querySelector('.col-maps');
        if (mapsCell) mapsCell.textContent = stats ? stats.maps : '0';

        const ratingCell = row.querySelector('.col-rating');
        if (ratingCell) {
            if (stats) {
                const avgRating = (stats.totalRating / stats.maps).toFixed(2);
                ratingCell.textContent = avgRating;
                const color = getRatingColorStyle(parseFloat(avgRating));
                if (color) ratingCell.style.color = color;
                else ratingCell.style.color = '';
            } else {
                ratingCell.textContent = '0.00';
                ratingCell.style.color = '';
            }
        }

        const timeCell = row.querySelector('.col-time');
        if (timeCell) timeCell.textContent = teamTime;
    });
    initPlayerClickHandlers();
}

// ===== ВРЕМЯ В КОМАНДЕ =====
function getTeamTime() {
    const start = new Date(2026, 1, 18);
    const now = new Date();
    const diffMs = now - start;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const rounded = Math.round(diffYears * 10) / 10;
    return `${rounded.toFixed(1)} year${rounded !== 1.0 ? 's' : ''}`;
}

// ===== ФУНКЦИЯ ДЛЯ ЦВЕТА ПРОЦЕНТОВ =====
function getPercentColorStyle(percent) {
    if (percent > 52.5) return '#2ecc71';
    if (percent < 47.5) return '#e74c3c';
    return '';
}

// ===== ФУНКЦИЯ ДЛЯ ЦВЕТА ПОЛОСКИ В ГИСТОГРАММЕ =====
function getMapBarColor(mapName) {
    return '#5dade2';
}

// ===== СТАТИСТИКА (ВКЛАДКА STATS) =====
function updateStats() {
    const statsContainer = document.getElementById('stats');
    if (!statsContainer) return;
    if (!allMatches.length) return;

    statsContainer.innerHTML = '';

    const mapAliases = {
        'ancient': 'Ancient',
        'anubis': 'Anubis',
        'dust2': 'Dust2',
        'dust ii': 'Dust2',
        'inferno': 'Inferno',
        'mirage': 'Mirage',
        'nuke': 'Nuke',
        'overpass': 'Overpass'
    };
    const mapOrder = ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Overpass'];
    const mapStats = {};
    mapOrder.forEach(map => {
        mapStats[map] = {
            played: 0, wins: 0, roundsWon: 0,
            roundsWonCt: 0, roundsWonT: 0,
            lostCt: 0, lostT: 0,
            players: {}
        };
    });

    for (const match of allMatches) {
        let mapName = (match.map || '').trim().toLowerCase();
        const canonical = mapAliases[mapName];
        if (!canonical) continue;
        const stats = mapStats[canonical];
        stats.played++;
        if (match.teamDoctorsScore > match.teamOpponentScore) stats.wins++;
        stats.roundsWon += match.teamDoctorsScore;
        stats.roundsWonCt += match.scoreCtDoctors || 0;
        stats.roundsWonT += match.scoreTDoctors || 0;
        stats.lostCt += match.lostCtDoctors || 0;
        stats.lostT += match.lostTDoctors || 0;

        if (match.playersDoctors) {
            for (const player of match.playersDoctors) {
                let nick = player.nick;
                const nickMap = {
                    '_map1ks_': 'map1ks',
                    'fak_zhresko': 'dark_sasi',
                    'd1amp0': 'D1amp0',
                    'Iightwork': 'lightwork',
                    'fortyfortea1': 'Dew1erMode'
                };
                if (nickMap[nick]) nick = nickMap[nick];
                if (!stats.players[nick]) {
                    stats.players[nick] = { totalRating: 0, matches: 0 };
                }
                stats.players[nick].totalRating += (player.rating || 0);
                stats.players[nick].matches++;
            }
        }
    }

    const playedList = mapOrder.filter(m => mapStats[m].played > 0);
    playedList.sort((a,b) => mapStats[b].played - mapStats[a].played);
    const maxPlayed = playedList.length ? Math.max(...playedList.map(m => mapStats[m].played)) : 1;
    const MAX_BAR_PERCENT = 75;
    let barsHtml = '<div class="stats-distribution"><div class="stats-distribution-header">Distribution of played maps</div><div class="stats-distribution-bars">';
    for (const map of playedList) {
        const played = mapStats[map].played;
        const percent = (played / maxPlayed) * MAX_BAR_PERCENT;
        const barColor = getMapBarColor(map);
        barsHtml += `
            <div class="stats-distribution-row">
                <span class="stats-distribution-label">${map}</span>
                <div class="stats-distribution-bar-container">
                    <div class="stats-distribution-bar" style="width: ${percent}%; background-color: ${barColor};"></div>
                </div>
                <span class="stats-distribution-count">${played}</span>
            </div>
        `;
    }
    barsHtml += `</div></div>`;
    statsContainer.innerHTML = barsHtml;

    const mapsContainer = document.createElement('div');
    mapsContainer.id = 'stats-maps-container';
    mapsContainer.className = 'stats-maps-container';
    statsContainer.appendChild(mapsContainer);

    for (const map of playedList) {
        const data = mapStats[map];
        const card = document.createElement('div');
        card.className = 'stats-map-card';
        card.id = `stats-map-${map.toLowerCase()}`;
        card.setAttribute('data-map', map);
        card.style.backgroundImage = `url('maps/background_${map.toLowerCase()}.jpg')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';

        const totalCt = data.roundsWonCt + data.lostCt;
        const totalT = data.roundsWonT + data.lostT;
        const ctWinPercent = totalCt ? ((data.roundsWonCt / totalCt) * 100).toFixed(1) : 0;
        const tWinPercent = totalT ? ((data.roundsWonT / totalT) * 100).toFixed(1) : 0;
        const winPercentRaw = (data.wins / data.played) * 100;
        const winPercentRounded = Math.round(winPercentRaw);

        let mvpNick = null;
        let mvpAvgRating = 0;
        for (const [nick, stats] of Object.entries(data.players)) {
            if (stats.matches > 0) {
                const avg = stats.totalRating / stats.matches;
                if (avg > mvpAvgRating) {
                    mvpAvgRating = avg;
                    mvpNick = nick;
                }
            }
        }
        let mvpHtml = '';
        if (mvpNick) {
            const avatarMap = {
                'dark_sasi': 'player1.jpg',
                'map1ks': 'player2.jpg',
                'D1amp0': 'player4.jpg',
                'Dew1erMode': 'player3.jpg',
                'lightwork': 'player5.jpg'
            };
            const avatarSrc = avatarMap[mvpNick] || 'player1.jpg';
            mvpHtml = `
                <div class="stats-map-mvp">
                    <div class="mvp-label">Map MVP</div>
                    <div class="mvp-player">
                        <img class="mvp-avatar" src="${avatarSrc}" alt="${mvpNick}">
                        <span class="mvp-nick">${mvpNick}</span>
                        <span class="mvp-rating">${mvpAvgRating.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="stats-map-overlay"></div>
            <div class="stats-map-left">
                <div class="stats-map-name">${map}</div>
                <div class="stats-map-stats">
                    <div><span class="stat-label">Times played:</span> <span class="stat-value stats-played">${data.played}</span></div>
                    <div><span class="stat-label">WinRate:</span> <span class="stat-value stats-win-percent" style="color: ${getPercentColorStyle(winPercentRaw)}">${winPercentRounded}</span>%</div>
                    <div><span class="stat-label">Rounds won:</span> <span class="stat-value stats-rounds-won">${data.roundsWon}</span></div>
                    <div><span class="stat-label"><span class="stat-label-ct">CT</span> round win percent:</span> <span class="stat-value stats-ct-percent" style="color: ${getPercentColorStyle(ctWinPercent)}">${ctWinPercent}</span>%</div>
                    <div><span class="stat-label"><span class="stat-label-t">T</span> round win percent:</span> <span class="stat-value stats-t-percent" style="color: ${getPercentColorStyle(tWinPercent)}">${tWinPercent}</span>%</div>
                </div>
            </div>
            <div class="stats-map-right">
                <div class="stats-donut-title">Distribution of won rounds</div>
                <canvas class="stats-donut-canvas" width="200" height="200"></canvas>
                ${mvpHtml}
            </div>
        `;
        mapsContainer.appendChild(card);

        const canvas = card.querySelector('.stats-donut-canvas');
        if (canvas && data.roundsWon > 0) {
            drawDonutChart(canvas, data.roundsWonCt, data.roundsWonT);
            canvas.setAttribute('data-ct', data.roundsWonCt);
            canvas.setAttribute('data-t', data.roundsWonT);
        }
    }
    attachDonutInteractivity();
}

// ===== РИСОВАНИЕ ПОНЧИКА =====
function drawDonutChart(canvas, ct, t) {
    const total = ct + t;
    if (total === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 95;
    const innerRadius = 65;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, w, h);

    const ctAngle = (ct / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + ctAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = '#3498db';
    ctx.fill();

    const tAngle = (t / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle + ctAngle, startAngle + ctAngle + tAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = '#e67e22';
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

let donutTooltip = null;
function getDonutTooltip() {
    if (!donutTooltip) {
        donutTooltip = document.createElement('div');
        donutTooltip.className = 'donut-tooltip';
        donutTooltip.style.position = 'fixed';
        donutTooltip.style.backgroundColor = 'rgba(0,0,0,0.8)';
        donutTooltip.style.color = '#fff';
        donutTooltip.style.padding = '0.3vw 0.6vw';
        donutTooltip.style.borderRadius = '0.4vw';
        donutTooltip.style.fontSize = '0.8vw';
        donutTooltip.style.pointerEvents = 'none';
        donutTooltip.style.zIndex = '1000';
        document.body.appendChild(donutTooltip);
    }
    return donutTooltip;
}

function attachDonutInteractivity() {
    const canvases = document.querySelectorAll('.stats-donut-canvas');
    canvases.forEach(canvas => {
        canvas.removeEventListener('mousemove', onDonutHover);
        canvas.removeEventListener('mouseleave', onDonutLeave);
        canvas.addEventListener('mousemove', onDonutHover);
        canvas.addEventListener('mouseleave', onDonutLeave);
    });
}

function onDonutHover(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 100;
    const innerRadius = 65;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < innerRadius || dist > radius) {
        getDonutTooltip().style.display = 'none';
        resetDonutHighlight(canvas);
        return;
    }
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI/2) angle += 2 * Math.PI;
    const startAngle = -Math.PI/2;
    const ct = parseFloat(canvas.getAttribute('data-ct') || 0);
    const t = parseFloat(canvas.getAttribute('data-t') || 0);
    const total = ct + t;
    if (total === 0) return;
    const ctEnd = startAngle + (ct / total) * 2 * Math.PI;
    let sector = null;
    if (angle >= startAngle && angle < ctEnd) sector = 'ct';
    else if (angle >= ctEnd && angle < ctEnd + (t / total) * 2 * Math.PI) sector = 't';
    else {
        getDonutTooltip().style.display = 'none';
        resetDonutHighlight(canvas);
        return;
    }
    const tooltip = getDonutTooltip();
    const percent = sector === 'ct' ? ((ct / total) * 100).toFixed(1) : ((t / total) * 100).toFixed(1);
    tooltip.textContent = sector === 'ct' ? `CT: ${percent}%` : `T: ${percent}%`;
    tooltip.style.left = (e.clientX + 10) + 'px';
    tooltip.style.top = (e.clientY - 20) + 'px';
    tooltip.style.display = 'block';
    highlightDonutSector(canvas, sector, ct, t);
}

function resetDonutHighlight(canvas) {
    const ct = parseFloat(canvas.getAttribute('data-ct') || 0);
    const t = parseFloat(canvas.getAttribute('data-t') || 0);
    drawDonutChart(canvas, ct, t);
}

function highlightDonutSector(canvas, sector, ct, t) {
    const total = ct + t;
    if (total === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const centerX = w/2, centerY = h/2;
    const radius = 95, innerRadius = 65;
    const startAngle = -Math.PI/2;
    const ctAngle = (ct / total) * 2 * Math.PI;
    const tAngle = (t / total) * 2 * Math.PI;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#2a2e3f';
    ctx.fill();

    if (sector === 'ct') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + ctAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#5dade2';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle + ctAngle, startAngle + ctAngle + tAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#e67e22';
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + ctAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle + ctAngle, startAngle + ctAngle + tAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#f39c12';
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

function onDonutLeave(e) {
    const tooltip = getDonutTooltip();
    tooltip.style.display = 'none';
    const canvas = e.currentTarget;
    resetDonutHighlight(canvas);
}

// ===== ОБРАБОТЧИКИ ДЛЯ ПЕРЕХОДА НА СТРАНИЦУ ИГРОКА =====
function initPlayerClickHandlers() {
    document.querySelectorAll('.player-card .avatar, .player-card .nickname, #roster .roster-avatar, #roster .player-nick').forEach(el => {
        el.removeEventListener('click', playerClickHandler);
        el.addEventListener('click', playerClickHandler);
    });
}

function playerClickHandler(e) {
    const target = e.currentTarget;
    let nick = null;
    if (target.closest('.player-card')) {
        const card = target.closest('.player-card');
        nick = card.querySelector('.nickname')?.innerText;
    } else if (target.closest('.roster-row')) {
        const row = target.closest('.roster-row');
        nick = row.querySelector('.player-nick')?.innerText;
    }
    if (nick) {
        window.location.href = `player-stats.html?nick=${encodeURIComponent(nick)}`;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    initPlayerClickHandlers();
});