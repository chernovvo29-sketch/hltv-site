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
    setTheme(isDark);           // применяем сохранённую тему
    toggle.checked = isDark;    // синхронизируем переключатель
} else {
    setTheme(false);            // светлая тема по умолчанию
    toggle.checked = false;     // переключатель выключен
}

// ===== ШАГ 4: Слушаем будущие клики пользователя =====
toggle.addEventListener('change', function () {
    setTheme(toggle.checked);
});

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (без перезагрузки страницы) =====
// Находим все кнопки вкладок и все блоки с контентом
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Функция, которая показывает выбранную вкладку
function switchTab(tabId) {
    // Скрыть все блоки контента
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    // Убрать активный класс со всех кнопок
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    // Показать выбранный блок контента
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    // Подсветить нажатую кнопку
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Навесить обработчики кликов на каждую кнопку
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    });
});

switchTab('info');

function updateAverageAge() {
    const baseDate = new Date(2026, 4, 12);   // было Data → Date, baseData → baseDate
    const baseAge = 18.7;
    const today = new Date();
    const diffYears = (today - baseDate) / (1000 * 60 * 60 * 24 * 365.25);
    let currentAge = baseAge + diffYears;     // убрал лишний знак =
    currentAge = Math.round(currentAge * 10) / 10;
    const ageSpan = document.getElementById('averageAgeValue').textContent = currentAge;
    ageSpan.textContent = `Average player age: ${currentAge}`;

}

updateAverageAge();


// ===== ЗАГРУЗКА И ОТОБРАЖЕНИЕ МАТЧЕЙ =====
const matchesContainer = document.getElementById('matches');
if (matchesContainer) {
    let allMatches = [];
    let displayedCount = 15;
    let isLoading = false;

    // Функция расчёта винрейта и винстрик
    function calculateStats(matches) {
        if (!matches.length) return { winRate: 0, winStreak: 0 };
        let wins = 0;
        let currentStreak = 0;
        // Считаем победы
        for (const match of matches) {
            if (match.teamDoctorsScore > match.teamOpponentScore) wins++;
        }
        const winRate = (wins / matches.length) * 100;
        // Идём по массиву с начала (предполагаем, что матчи отсортированы от новых к старым)
        for (const match of matches) {
            if (match.teamDoctorsScore > match.teamOpponentScore) {
                currentStreak++;
            } else {
                break; // первое же поражение обрывает серию
            }
        }
        return { winRate: winRate.toFixed(1), winStreak: currentStreak };
    }

    // Функция отрисовки блоков статистики
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

    // Группировка матчей по турнирам
    function groupMatchesByTournament(matches) {
        const groups = {};
        for (const match of matches) {
            const tournament = match.tournament || 'Other';
            if (!groups[tournament]) groups[tournament] = [];
            groups[tournament].push(match);
        }
        return groups;
    }

    // Отрисовка списка матчей (с группировкой по турнирам)
    function renderMatchesTable(matches, limit) {
        const displayMatches = matches.slice(0, limit);
        const groups = groupMatchesByTournament(displayMatches);
        let html = renderStats(calculateStats(displayMatches));
        for (const [tournament, matchesList] of Object.entries(groups)) {
            html += `<div class="tournament-group">
                        <div class="tournament-header">${tournament}</div>
                        <div class="matches-list">`;
            for (const match of matchesList) {
                // преобразуем дату из "день.месяц.год" в "день/месяц/год"
                const dateFormatted = match.date.replace(/\./g, '/');
                html += `
    <div class="match-item">
        <div class="match-date">${dateFormatted}</div>
        <div class="match-team-doctors">Doctors</div>
        <div class="match-score">${match.teamDoctorsScore || 0} : ${match.teamOpponentScore || 0}</div>
        <div class="match-opponent">${match.opponent || '?'}</div>
        <button class="match-detail-btn" data-match-file="${match.fileName}">Match</button>
    </div>
`;
            }
            html += `</div></div>`;
        }
        // Кнопка "Загрузить ещё", если есть неотображённые матчи
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
                    match.fileName = fileName; // сохраняем имя файла
                    matchesData.push(match);
                } else {
                    console.warn(`Не удалось загрузить ${fileName}`);
                }
            }

            // --- НОВАЯ СОРТИРОВКА ПО НОМЕРУ ИЗ ИМЕНИ ФАЙЛА ---
            matchesData.sort((a, b) => {
                // Извлекаем число до первого подчёркивания из fileName
                const getNumber = (fileName) => {
                    const parts = fileName.split('_');
                    return parseInt(parts[0], 10);
                };
                const numA = getNumber(a.fileName);
                const numB = getNumber(b.fileName);
                // Сортируем от большего номера к меньшему (новые матчи сверху)
                return numB - numA;
            });
            // --- КОНЕЦ СОРТИРОВКИ ---
            allMatches = matchesData;
            displayedCount = 15;
            renderMatchesTable(allMatches, displayedCount);
        } catch (err) {
            console.error(err);
            matchesContainer.innerHTML = '<p>Ошибка загрузки матчей</p>';
        }
    }
    loadMatches();
}

