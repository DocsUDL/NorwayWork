# 🚀 Быстрый старт для разработчиков

## Настройка за 5 минут

### 1. Получение токена бота
```bash
# 1. Найдите @BotFather в Telegram
# 2. Отправьте: /newbot
# 3. Назовите бота: "Test Work Bot"
# 4. Username: "test_work_bot"
# 5. Сохраните токен
```

### 2. MongoDB Atlas (бесплатно)
```bash
# 1. Регистрация: https://www.mongodb.com/atlas
# 2. Create Free Cluster
# 3. Username: botuser
# 4. Password: сгенерируйте
# 5. Network Access: 0.0.0.0/0
# 6. Скопируйте connection string
```

### 3. Настройка .env
```env
TELEGRAM_BOT_TOKEN="ваш_токен_от_botfather"
MONGODB_URI=""
MANAGER_TELEGRAM="@ваш_username"
```

### 4. Запуск
```bash
npm install
npm start
```

## Railway деплой (1 клик)

### Подготовка
1. Загрузите код на GitHub
2. Зарегистрируйтесь на railway.app
3. Connect GitHub

### Деплой
1. New Project → Deploy from GitHub
2. Выберите репозиторий
3. Добавьте переменные окружения в Variables
4. Deploy!

## Полезные команды

### Проверка подключения к MongoDB
```bash
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ OK')).catch(err => console.error('❌', err));"
```

### Проверка токена бота
```bash
curl "https://api.telegram.org/bot{TOKEN}/getMe"
```

### Просмотр пользователей в БД
```javascript
// Добавьте в index.js для дебага
setTimeout(async () => {
  const users = await User.find({});
  console.log('Пользователи:', users);
}, 5000);
```

## Структура ответов API

### Успешная регистрация
```json
{
  "_id": "...",
  "telegramId": 123456789,
  "username": "john_doe",
  "name": "Иван",
  "age": 25,
  "city": "Москва",
  "createdAt": "2025-09-30T..."
}
```

### Типичные ошибки

| Код | Ошибка | Решение |
|-----|---------|---------|
| 401 | Bot token invalid | Проверьте токен |
| 500 | MongoDB error | Проверьте строку подключения |
| - | User state undefined | Перезапустите бота |

## Тестирование

### Локальное тестирование
1. Запустите бота: `npm start`
2. Найдите бота в Telegram
3. Отправьте `/start`
4. Заполните форму
5. Проверьте БД

### Тест деплоя на Railway
1. Проверьте логи в Railway Dashboard
2. Убедитесь что переменные окружения установлены
3. Протестируйте бота в Telegram

## Monitoring

### Логи Railway
```bash
# В Railway Dashboard:
# 1. Откройте ваш проект
# 2. Перейдите в Logs
# 3. Фильтруйте по времени
```

### Важные логи
```
✅ Подключение к MongoDB успешно  # БД работает
🚀 Бот запущен и готов к работе!   # Бот готов
✅ Новый пользователь сохранен:    # Регистрация прошла
❌ Ошибка подключения к MongoDB:   # Проблема с БД
❌ Ошибка бота:                   # Проблема с Telegram API
```
