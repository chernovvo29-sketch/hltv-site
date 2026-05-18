// ===== ШАГ 1: Находим элементы на странице =====
const toggle = document.getElementById('themeSwitch');
const body = document.body;

// ===== ШАГ 2: Функция, которая меняет тему =====
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

// ===== ШАГ 3: Восстанавливаем сохранённую тему (выполняется сразу при загрузке) =====
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    const isDark = savedTheme === 'dark';
    setTheme(isDark);
    toggle.checked = isDark;
} else {
    setTheme(false);
    toggle.checked = false;
}

// ===== ШАГ 4: Слушаем будущие клики пользователя =====
toggle.addEventListener('change', function () {
    setTheme(toggle.checked);
});

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (без перезагрузки страницы) =====
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabId) {
    tabContents.forEach(content => content.classList.remove('active'));
    tabBtns.forEach(btn => btn.classList.remove('active'));
    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    });
});
switchTab('info');

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

// ===== ЗАГРУЗКА И ОТОБРАЖЕНИЕ МАТЧЕЙ =====
const matchesContainer = document.getElementById('matches');
if (matchesContainer) {
    let allMatches = [];
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

    async function loadMatches() {
        matchesContainer.innerHTML = '<p>Загрузка матчей...</p>';
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
            // Сортировка по номеру в имени файла (от большего к меньшему – новые сверху)
            matchesData.sort((a, b) => {
                const getNumber = (fileName) => parseInt(fileName.split('_')[0], 10);
                return getNumber(b.fileName) - getNumber(a.fileName);
            });
            allMatches = matchesData;
            displayedCount = 15;
            renderMatchesTable(allMatches, displayedCount);
            updateRosterFromMatches(allMatches); // обновить таблицу Roster
        } catch (err) {
            console.error(err);
            matchesContainer.innerHTML = '<p>Ошибка загрузки матчей</p>';
        }
    }
    loadMatches();
}

// ===== ОБНОВЛЕНИЕ ТАБЛИЦЫ ROSTER НА ОСНОВЕ МАТЧЕЙ =====
function updateRosterFromMatches(matches) {
    // Соответствие между никами в JSON и каноническими никами в HTML
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

    // Сбор статистики по игрокам: количество карт и сумма рейтингов
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

    // Время в команде (одинаковое для всех)
    const teamTime = getTeamTime();

    // Обновляем строки таблицы Roster
    const rosterRows = document.querySelectorAll('#roster .roster-row');
    rosterRows.forEach(row => {
        const nickElement = row.querySelector('.player-nick');
        if (!nickElement) return;
        let displayNick = nickElement.innerText.trim();
        let stats = playerStats[displayNick];

        // Поиск через обратный маппинг, если не нашли
        if (!stats) {
            const originalNick = Object.keys(reverseNickMapping).find(key => reverseNickMapping[key] === displayNick);
            if (originalNick && playerStats[originalNick]) stats = playerStats[originalNick];
        }

        // Обновляем колонку "Maps played"
        const mapsCell = row.querySelector('.col-maps');
        if (mapsCell) {
            mapsCell.textContent = stats ? stats.maps : '0';
        }

        // Обновляем колонку "Rating"
        const ratingCell = row.querySelector('.col-rating');
        if (ratingCell) {
            if (stats) {
                const avgRating = (stats.totalRating / stats.maps).toFixed(2);
                ratingCell.textContent = avgRating;
            } else {
                ratingCell.textContent = '0.00';
            }
        }

        // Обновляем колонку "Time on team"
        const timeCell = row.querySelector('.col-time');
        if (timeCell) {
            timeCell.textContent = teamTime;
        }
    });
}

// ===== ФУНКЦИЯ РАСЧЁТА ВРЕМЕНИ В КОМАНДЕ (от 18.02.2026) =====
function getTeamTime() {
    const start = new Date(2026, 1, 18); // 18 февраля 2026
    const now = new Date();
    const diffMs = now - start;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const rounded = Math.round(diffYears * 10) / 10;
    return `${rounded.toFixed(1)} year${rounded !== 1.0 ? 's' : ''}`;
}