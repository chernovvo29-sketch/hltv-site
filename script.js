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
    if (tabId === 'news') loadNews();
    if (tabId === 'info') updateInfo();
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
                    <div class="stat-label">WinRate</div>
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
            const profileUrl = `player-stats.html?nick=${encodeURIComponent(mvpNick)}`;
            mvpHtml = `
                <div class="stats-map-mvp">
                    <div class="mvp-label">Map MVP</div>
                    <div class="mvp-player">
                        <a href="${profileUrl}" style="display: inline-block; text-decoration: none; color: inherit;">
                            <img class="mvp-avatar" src="${avatarSrc}" alt="${mvpNick}" style="cursor: pointer;">
                        </a>
                        <a href="${profileUrl}" style="text-decoration: none; color: inherit;">
                            <span class="mvp-nick" style="cursor: pointer;">${mvpNick}</span>
                        </a>
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

// ===== ЗАГРУЗКА НОВОСТЕЙ =====
async function loadNews() {
    const newsContainer = document.getElementById('news');
    if (!newsContainer) return;
    try {
        const response = await fetch('news/index.json');
        if (!response.ok) throw new Error('Не удалось загрузить список новостей');
        const data = await response.json();
        if (!data.articles || !data.articles.length) {
            newsContainer.innerHTML = '<p style="text-align:center; padding: 2vw; color: #8899bb;">Новостей пока нет.</p>';
            return;
        }
        let html = '<div style="display:flex; flex-wrap:wrap; gap:3vw; padding:1vw 8vw; margin-top: 4vh; margin-bottom: 2vh">';
        for (const article of data.articles) {
            html += `
                <div onclick="window.location.href='news/${article.file}'" style="cursor:pointer; background-color:rgba(0,0,0,0.2); border-radius:0.5vw; overflow:hidden; flex:0 0 calc(50% - 4vw); max-width:calc(50% - 3vw); transition:transform 0.2s; min-width:23vw;">
                    <img src="news/${article.image}" alt="${article.title}" style="width:100%; height:auto; display:block;" onerror="this.style.display='none'">
                    <div style="padding:0.7vw;">
                        <div style="font-weight:bold; font-size:0.9vw; margin-bottom:0.3vh;">${article.title}</div>
                        <div style="font-size:0.7vw; color:#8899bb; margin-bottom:0.5vh;">${article.date}</div>
                        <div style="font-size:0.75vw; color:#cbd5e6;">${article.summary}</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        newsContainer.innerHTML = html;
    } catch (err) {
        console.error(err);
        newsContainer.innerHTML = '<p style="text-align:center; padding:2vw; color:#ff6666;">Ошибка загрузки новостей</p>';
    }
}

// ===== ИНФО: ГРАФИК ПОСЛЕДНИХ 30 МАТЧЕЙ С ПРЕРЫВАНИЕМ ЛИНИЙ =====
async function updateInfo() {
    const infoContainer = document.getElementById('info');
    if (!infoContainer) return;

    if (!allMatches || allMatches.length === 0) {
        try {
            await getAllMatches();
        } catch (e) {
            infoContainer.innerHTML = '<p style="text-align:center; padding:2vw; color:#ff6666;">Не удалось загрузить данные матчей</p>';
            return;
        }
    }
    if (!allMatches || allMatches.length === 0) {
        infoContainer.innerHTML = '<p style="text-align:center; padding:2vw; color:#8899bb;">Нет данных о матчах</p>';
        return;
    }

    let matches = allMatches.filter(m => m.playersDoctors && m.playersDoctors.length > 0);
    if (matches.length === 0) {
        infoContainer.innerHTML = '<p style="text-align:center; padding:2vw; color:#8899bb;">Нет матчей с составом Doctors</p>';
        return;
    }
    matches.sort((a, b) => {
        const numA = parseInt(a.fileName.split('_')[0], 10);
        const numB = parseInt(b.fileName.split('_')[0], 10);
        return numA - numB;
    });

    const recentMatches = matches.slice(-30);

    const mainPlayers = ['dark_sasi', 'map1ks', 'Dew1erMode', 'D1amp0', 'lightwork'];
    const playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

    const teamAvgRatings = [];
    const playerRatingsData = {};
    mainPlayers.forEach(nick => { playerRatingsData[nick] = []; });

    for (const match of recentMatches) {
        const totalRating = match.playersDoctors.reduce((sum, p) => sum + (p.rating || 0), 0);
        const avgRating = totalRating / match.playersDoctors.length;
        teamAvgRatings.push(avgRating);

        for (const nick of mainPlayers) {
            const player = match.playersDoctors.find(p => p.nick === nick);
            playerRatingsData[nick].push(player ? (player.rating || 0) : null);
        }
    }

    // По умолчанию только Average активен
    const visibility = {
        avg: true,
        dark_sasi: false,
        map1ks: false,
        Dew1erMode: false,
        D1amp0: false,
        lightwork: false
    };

    function drawChart(container, teamAvgRatings, playerRatingsData, mainPlayers, playerColors, visibility) {
        const canvas = container.querySelector('#ratingChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const padding = { top: 40, bottom: 100, left: 70, right: 30 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const allValues = [];
        for (const val of teamAvgRatings) allValues.push(val);
        for (const nick of mainPlayers) {
            const vals = playerRatingsData[nick].filter(v => v !== null);
            for (const v of vals) allValues.push(v);
        }
        const maxVal = Math.max(...allValues);
        const maxY = Math.ceil(maxVal * 10) / 10;
        const minY = 0;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#8899bb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.stroke();

        ctx.fillStyle = '#8899bb';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        let yStep = 0.1;
        if (maxY > 3) yStep = 0.2;
        if (maxY > 6) yStep = 0.5;
        if (maxY > 10) yStep = 1.0;
        for (let val = minY; val <= maxY; val += yStep) {
            const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
            ctx.fillText(val.toFixed(1), padding.left - 10, y);
            ctx.beginPath();
            ctx.moveTo(padding.left - 5, y);
            ctx.lineTo(padding.left, y);
            ctx.stroke();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xStep = Math.max(1, Math.floor(recentMatches.length / 10));
        for (let i = 0; i < recentMatches.length; i += xStep) {
            const x = padding.left + (i / (recentMatches.length - 1 || 1)) * chartW;
            ctx.fillText(`#${i+1}`, x, padding.top + chartH + 8);
        }

        // Храним точки для тултипа
        const linesData = [];

        // Функция рисования линии с прерыванием при null
        function drawLine(values, color, lineWidth = 1.5, dash = [], label = '') {
            const points = [];
            // Собираем все точки, игнорируя null
            for (let i = 0; i < values.length; i++) {
                const val = values[i];
                if (val === null) continue;
                const x = padding.left + (i / (values.length - 1 || 1)) * chartW;
                const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
                points.push({ x, y, value: val, matchIndex: i });
            }
            if (points.length < 2) return;

            // Разбиваем на сегменты, где разница индексов > 1 (был пропуск)
            let start = 0;
            for (let i = 1; i < points.length; i++) {
                if (points[i].matchIndex - points[i-1].matchIndex > 1) {
                    // Рисуем сегмент от start до i-1
                    if (i - start >= 2) { // если хотя бы две точки
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash(dash);
                        ctx.moveTo(points[start].x, points[start].y);
                        for (let j = start + 1; j < i; j++) {
                            ctx.lineTo(points[j].x, points[j].y);
                        }
                        ctx.stroke();
                        ctx.setLineDash([]);
                        // Сохраняем точки сегмента для тултипа
                        for (let j = start; j < i; j++) {
                            linesData.push({ label, color, point: points[j] });
                        }
                    }
                    start = i;
                }
            }
            // Последний сегмент
            if (points.length - start >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.setLineDash(dash);
                ctx.moveTo(points[start].x, points[start].y);
                for (let j = start + 1; j < points.length; j++) {
                    ctx.lineTo(points[j].x, points[j].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                for (let j = start; j < points.length; j++) {
                    linesData.push({ label, color, point: points[j] });
                }
            }
        }

        // Линии игроков
        for (let idx = 0; idx < mainPlayers.length; idx++) {
            const nick = mainPlayers[idx];
            if (visibility[nick]) {
                const color = playerColors[idx];
                const data = playerRatingsData[nick];
                drawLine(data, color, 1.5, [], nick);
            }
        }

        // Средняя линия (без прерываний)
        if (visibility.avg) {
            const points = [];
            for (let i = 0; i < teamAvgRatings.length; i++) {
                const val = teamAvgRatings[i];
                const x = padding.left + (i / (teamAvgRatings.length - 1 || 1)) * chartW;
                const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
                points.push({ x, y, value: val, matchIndex: i });
            }
            if (points.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
                // Сохраняем точки для тултипа
                for (const p of points) {
                    linesData.push({ label: 'Average', color: '#ffffff', point: p });
                }
            }
        }

        ctx.fillStyle = '#cbd5e6';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Player ratings', w / 2, padding.top - 5);

        // Сохраняем данные для тултипа в canvas
        canvas._linesData = linesData;
    }

    // Интерфейс
    let html = `
        <div style="padding:0 1vw; text-align:center; margin-top: 6vh; margin-bottom:4vh; padding-bottom: 150px;">
            <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:1.5vw; margin-bottom:1vh;">
    `;
    const legendItems = [
        { label: 'Average', key: 'avg', color: '#ffffff', isBold: true }
    ];
    mainPlayers.forEach((nick, idx) => {
        legendItems.push({ label: nick, key: nick, color: playerColors[idx], isBold: false });
    });
    for (const item of legendItems) {
        html += `
            <div class="legend-item" data-key="${item.key}" style="display:flex; align-items:center; gap:0.5vw; font-size:0.8vw; color:#cbd5e6; cursor:pointer; opacity:${visibility[item.key] ? '1' : '0.3'}; transition:opacity 0.2s;">
                <span style="display:inline-block; width:1.2vw; height:${item.isBold ? '0.3vw' : '0.2vw'}; background-color:${item.color};"></span>
                <span>${item.label}</span>
            </div>
        `;
    }
    html += `
            </div>
            <div style="position:relative; display:inline-block; width:100%; max-width:60vw; margin:0 auto;">
                <canvas id="ratingChart" width="800" height="700" style="width:100%; height:auto; background:transparent; border-radius:0.5vw; display:block; margin:0 auto;"></canvas>
                <div id="chartTooltip" style="position:absolute; pointer-events:none; background:rgba(0,0,0,0.7); color:#fff; padding:0.2vw 0.5vw; border-radius:0.2vw; font-size:0.9vw; display:none; z-index:100; font-weight:bold;"></div>
            </div>
        </div>
    `;

    infoContainer.innerHTML = html;

    const canvas = document.getElementById('ratingChart');
    if (!canvas) return;

    drawChart(infoContainer, teamAvgRatings, playerRatingsData, mainPlayers, playerColors, visibility);

    // Клики по легенде
    const legendItemsElements = infoContainer.querySelectorAll('.legend-item');
    legendItemsElements.forEach(el => {
        el.addEventListener('click', function() {
            const key = this.dataset.key;
            visibility[key] = !visibility[key];
            this.style.opacity = visibility[key] ? '1' : '0.3';
            drawChart(infoContainer, teamAvgRatings, playerRatingsData, mainPlayers, playerColors, visibility);
        });
    });

    // Тултип
    const tooltip = document.getElementById('chartTooltip');
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = mouseX * scaleX;
        const canvasY = mouseY * scaleY;

        const data = canvas._linesData;
        if (!data || data.length === 0) { tooltip.style.display = 'none'; return; }

        let closest = null;
        let minDist = Infinity;
        for (const entry of data) {
            const p = entry.point;
            const dx = canvasX - p.x;
            const dy = canvasY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }

        if (closest && minDist < 10) {
            tooltip.textContent = closest.value.toFixed(2);
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
            tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    });

    canvas.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    initPlayerClickHandlers();
});