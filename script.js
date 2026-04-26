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