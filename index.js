require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Подключение к MongoDB успешно'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, default: null },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  workplace: { type: String, required: true },
  citizenship: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const userStates = new Map();

const STATES = {
  WAITING_FOR_NAME: 'waiting_for_name',
  WAITING_FOR_AGE: 'waiting_for_age',
  WAITING_FOR_WORKPLACE: 'waiting_for_workplace',
  WAITING_FOR_CITIZENSHIP: 'waiting_for_citizenship',
  COMPLETED: 'completed'
};

const MESSAGES = {
  welcome: `🇳🇴 Приветствуем вас!

Вы обратились в компанию «Heads» по набору персонала в Норвегию! 🇳🇴

💰 Заработная плата по нашим вакансиям: 3300-7400€/мес
🏠 Жилье бесплатное

Чтобы мы смогли вас детально проконсультировать, начнем с заполнения анкеты.

Укажите ваше имя:`,
  askAge: '📅 Спасибо! Теперь укажите ваш возраст (только цифры):',
  askWorkplace: '💼 Укажите ваше последнее/актуальное место работы:',
  askCitizenship: '🌍 Укажите ваше гражданство:',
  invalidAge: '❌ Пожалуйста, введите корректный возраст (число от 16 до 65):',
  formCompleted: '✅ Анкета заполнена! Ваши данные переданы нашим специалистам.',
  contactManager: '📞 Наш менеджер свяжется с вами в ближайшее время для детальной консультации:',
  alreadyRegistered: '✅ Вы уже зарегистрированы в нашей системе!\n\n👤 Имя: {name}\n📅 Возраст: {age}\n💼 Место работы: {workplace}\n🌍 Гражданство: {citizenship}\n📱 Username: {username}',
  error: '❌ Произошла ошибка. Попробуйте еще раз или обратитесь к администратору.'
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const existingUser = await User.findOne({ telegramId: userId });
    
    if (existingUser) {
      const message = MESSAGES.alreadyRegistered
        .replace('{name}', existingUser.name)
        .replace('{username}', existingUser.username ? `@${existingUser.username}` : 'не указан')
        .replace('{age}', existingUser.age)
        .replace('{workplace}', existingUser.workplace)
        .replace('{citizenship}', existingUser.citizenship);
      
      await bot.sendMessage(chatId, message);
      await sendManagerContact(chatId);      
      return;
    }

    userStates.set(userId, { 
      state: STATES.WAITING_FOR_NAME, 
      data: { username: msg.from.username || null } 
    });
    await bot.sendMessage(chatId, MESSAGES.welcome);
    
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
    const userState = userStates.get(userId);
    
    if (!userState) {
      await bot.sendMessage(chatId, '👋 Привет! Для начала работы введите команду /start');
      return;
    }    switch (userState.state) {
      case STATES.WAITING_FOR_NAME:
        await handleNameInput(chatId, userId, text, userState);
        break;
        
      case STATES.WAITING_FOR_AGE:
        await handleAgeInput(chatId, userId, text, userState);
        break;
        
      case STATES.WAITING_FOR_WORKPLACE:
        await handleWorkplaceInput(chatId, userId, text, userState);
        break;
        
      case STATES.WAITING_FOR_CITIZENSHIP:
        await handleCitizenshipInput(chatId, userId, text, userState);
        break;
        
      default:
        await bot.sendMessage(chatId, '🤔 Что-то пошло не так. Попробуйте начать сначала с команды /start');
        userStates.delete(userId);
    }
    
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, MESSAGES.error);
  }
});

async function handleNameInput(chatId, userId, text, userState) {
  if (!text || text.trim().length < 2) {
    await bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное имя (минимум 2 символа):');
    return;
  }

  userState.data.name = text.trim();
  userState.state = STATES.WAITING_FOR_AGE;
  userStates.set(userId, userState);
  
  await bot.sendMessage(chatId, MESSAGES.askAge);
}

async function handleAgeInput(chatId, userId, text, userState) {
  const age = parseInt(text);
  
  if (isNaN(age) || age < 16 || age > 65) {
    await bot.sendMessage(chatId, MESSAGES.invalidAge);
    return;
  }

  userState.data.age = age;
  userState.state = STATES.WAITING_FOR_WORKPLACE;
  userStates.set(userId, userState);
  
  await bot.sendMessage(chatId, MESSAGES.askWorkplace);
}

async function handleWorkplaceInput(chatId, userId, text, userState) {
  if (!text || text.trim().length < 2) {
    await bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное место работы (минимум 2 символа):');
    return;
  }

  userState.data.workplace = text.trim();
  userState.state = STATES.WAITING_FOR_CITIZENSHIP;
  userStates.set(userId, userState);
  
  await bot.sendMessage(chatId, MESSAGES.askCitizenship);
}

async function handleCitizenshipInput(chatId, userId, text, userState) {
  if (!text || text.trim().length < 2) {
    await bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное гражданство (минимум 2 символа):');
    return;
  }

  userState.data.citizenship = text.trim();
    try {
    const newUser = new User({
      telegramId: userId,
      username: userState.data.username,
      name: userState.data.name,
      age: userState.data.age,
      workplace: userState.data.workplace,
      citizenship: userState.data.citizenship
    });
      await newUser.save();
    console.log(`✅ Новый пользователь сохранен: ${newUser.name}, ${newUser.age} лет, ${newUser.workplace}, ${newUser.citizenship}`);
    
    userState.state = STATES.COMPLETED;
    userStates.delete(userId);
    
    await bot.sendMessage(chatId, MESSAGES.formCompleted);
    await sendManagerContact(chatId);
    
  } catch (error) {
    console.error('Ошибка сохранения пользователя:', error);
    await bot.sendMessage(chatId, MESSAGES.error);
  }
}

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