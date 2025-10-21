require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Подключение к MongoDB успешно'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, default: null },
  city: { type: String, required: true },
  age: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function formatCity(city) {
  if (!city) return '';
  return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
}

const MESSAGES = {
  welcome: `Для связи с нашим менеджером заполните анкету по примеру:

1.Ваш город
2.Ваш возраст

Например: Москва, 41`,
  invalidFormat: '❌ Неверный формат. Введите данные так: <b>Город, Возраст</b>\nПример: <i>Москва 41</i>',
  invalidAge: '❌ Укажите корректный возраст (от 16 до 65 лет).',
  alreadyRegistered: '✅ Вы уже зарегистрированы!\n\n📍 Город: {city}\n📅 Возраст: {age}\n📱 Username: {username}',
  formCompleted: 'Спасибо , ваши данные отправлены ✅\nНапишите вашему менеджеру 📩',
  contactManager: '📞 Для связи с менеджером используйте кнопку ниже:',
  error: '❌ Произошла ошибка. Попробуйте позже.'
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const existingUser = await User.findOne({ telegramId: userId });
    
    if (existingUser) {
      const message = MESSAGES.alreadyRegistered
        .replace('{city}', existingUser.city)
        .replace('{age}', existingUser.age)
        .replace('{username}', existingUser.username ? `@${existingUser.username}` : 'не указан');
      
      await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      await sendManagerContact(chatId);      
      return;
    }

    await bot.sendMessage(chatId, MESSAGES.welcome, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('Ошибка в /start:', error);
    await bot.sendMessage(chatId, MESSAGES.error);
  }
});

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  try {
    const existingUser = await User.findOne({ telegramId: userId });
    if (existingUser) return;

    const parts = text.includes(',') ? text.split(',') : text.split(' ');
    if (parts.length < 2) {
      await bot.sendMessage(chatId, MESSAGES.invalidFormat, { parse_mode: 'HTML' });
      return;
    }

    const city = formatCity(parts[0].trim());
    const age = parseInt(parts[1].trim());

    if (!city || city.length < 2) {
      await bot.sendMessage(chatId, MESSAGES.invalidFormat, { parse_mode: 'HTML' });
      return;
    }

    if (isNaN(age) || age < 16 || age > 65) {
      await bot.sendMessage(chatId, MESSAGES.invalidAge, { parse_mode: 'HTML' });
      return;
    }

    const newUser = new User({
      telegramId: userId,
      username: msg.from.username || null,
      city,
      age
    });

    await newUser.save();
    console.log(`✅ Новый пользователь: ${city}, ${age} лет`);

    await bot.sendMessage(chatId, MESSAGES.formCompleted, { parse_mode: 'HTML' });
    await sendManagerContact(chatId);

  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, MESSAGES.error);
  }
});

async function sendManagerContact(chatId) {
  const managerTelegram = process.env.MANAGER_TELEGRAM || '@manager';
  
  const keyboard = {
    inline_keyboard: [[
      {
        text: '💬 Написать менеджеру',
        url: `https://t.me/${managerTelegram.replace('@', '')}`
      }
    ]]
  };
  
  await bot.sendMessage(chatId, MESSAGES.contactManager, {
    reply_markup: keyboard,
    parse_mode: 'HTML'
  });
}

bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error);
});

console.log('🚀 Бот запущен и готов к работе!');


