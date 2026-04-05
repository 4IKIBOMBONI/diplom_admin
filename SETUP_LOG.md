# Лог настройки HelpDesk

## Конфигурация на машине пользователя (MacBook)

### Порты
- **PostgreSQL (Docker):** localhost:5233 (контейнер helpdesk_db, маппинг 5233:5432)
- **Сервер Express:** localhost:3001 (PORT=3001 в .env)
- **Клиент Vite:** localhost:5173
- **Локальный PostgreSQL** занимает порт 5432 (другой проект cifra-db)

### Файлы конфигурации (на Mac пользователя)

**server/.env:**
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://helpdesk:helpdesk123@localhost:5233/helpdesk_db
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=8528245626:AAG3apkEgqhytP-i_wEXOzh1FLiR1pK_RMo
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:3001/api
```

**client/vite.config.js:**
- proxy '/api' -> http://localhost:3001
- proxy '/socket.io' -> http://localhost:3001

**docker-compose.yml:**
- ports: "5233:5432" (НЕ 5432 и НЕ 5433, именно 5233)

### Проблемы и решения

1. **Порт 5432 занят** — проект cifra-db использует его. Решение: Docker на порту 5233.
2. **Порт 5000 занят** — macOS AirPlay. Решение: PORT=3001.
3. **npm install в корне** — нет package.json в корне, нужно cd server/client/bot.
4. **git pull конфликт** — docker-compose.yml изменен локально. Решение: git stash / git stash pop.
5. **Бот 403 ошибка** — дубликат API_URL в .env (5000 и 3001). dotenv берет первый.
6. **CORS** — обновлен для разрешения запросов от бота (без origin).

### Порядок запуска

```bash
# Терминал 1: сервер
cd /Users/aleksandrkonsenko/diplom_admin/server
npm run dev

# Терминал 2: клиент
cd /Users/aleksandrkonsenko/diplom_admin/client
npm run dev

# Терминал 3: бот
cd /Users/aleksandrkonsenko/diplom_admin/bot
npm run dev
```

### Тестовые аккаунты
- Суперадмин: admin@helpdesk.ru / admin123
- Админ: ivanov@helpdesk.ru / admin123
- Пользователь: sidorova@mail.ru / user123

### Текущий статус
- Сервер: работает (порт 3001)
- Клиент: работает (порт 5173), логин работает
- БД: работает (Docker, порт 5233), seed загружен (18 тикетов)
- Бот: ошибка 403 при POST /api/auth/telegram — отладка в процессе
- Лог бота: bot/bot.log
