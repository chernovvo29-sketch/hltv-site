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







