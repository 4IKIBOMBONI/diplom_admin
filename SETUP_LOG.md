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

**ВАЖНО:** в .env должна быть ТОЛЬКО ОДНА строка API_URL. Если есть дубликат — dotenv берет первый, что ломает бота.

**client/vite.config.js:**
- proxy '/api' -> http://localhost:3001
- proxy '/socket.io' -> http://localhost:3001

**docker-compose.yml:**
- ports: "5233:5432" (НЕ 5432 и НЕ 5433, именно 5233)

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

---

## Хронология проблем и решений

### Проблема 1: Порт 5432 занят
- **Симптом:** `docker-compose up -d` — ошибка "port is already allocated"
- **Причина:** Проект cifra-db уже использует порт 5432 (контейнер cifra-db-1)
- **Решение:** В docker-compose.yml порт изменен на 5233:5432. В server/.env DATABASE_URL обновлен на порт 5233.
- **Статус:** РЕШЕНО

### Проблема 2: Порт 5000 занят
- **Симптом:** `npm run dev` в server — ошибка EADDRINUSE port 5000
- **Причина:** macOS AirPlay Receiver занимает порт 5000
- **Решение:** В server/.env PORT=3001. В client/vite.config.js прокси обновлен на localhost:3001.
- **Статус:** РЕШЕНО

### Проблема 3: npm install в корне проекта
- **Симптом:** `npm install` — ENOENT no package.json
- **Причина:** Нет package.json в корне, он лежит в server/, client/, bot/ отдельно
- **Решение:** Всегда cd в нужную папку перед npm install
- **Статус:** РЕШЕНО

### Проблема 4: git pull конфликт
- **Симптом:** `git pull` — ошибка "локальные изменения будут перезаписаны"
- **Причина:** docker-compose.yml и client/vite.config.js изменены локально (порты)
- **Решение:** git stash -> git pull -> git stash pop
- **Статус:** РЕШЕНО (повторяется при каждом pull)

### Проблема 5: Бот — ошибка 403 при /start
- **Симптом:** `API error (findOrCreateUser): Request failed with status code 403`
- **Причина:** Дубликат API_URL в server/.env — две строки: 3001 и 5000. dotenv берет первую при одинаковых ключах, но при git stash pop добавлялась старая строка в конец. Бот использовал 5000 (последнюю), сервер на 3001.
- **Диагностика:** `grep -n "API_URL" server/.env` показал строки 19 и 22.
- **Решение:** `sed -i '' '22d' server/.env` — удалена дублирующая строка.
- **Как избежать:** После git stash pop всегда проверять `grep -n "API_URL" server/.env`
- **Статус:** РЕШЕНО

### Проблема 6: CORS блокирует запросы бота
- **Симптом:** Бот не мог обращаться к серверу
- **Причина:** CORS в server/src/app.js разрешал только CLIENT_URL
- **Решение:** CORS обновлен — разрешены запросы без origin (server-to-server)
- **Статус:** РЕШЕНО

### Проблема 7: Миграция PENDING enum — ошибка PostgreSQL
- **Симптом:** `npx prisma migrate dev` — ошибка P3018 "unsafe use of new value PENDING of enum type TicketStatus"
- **Причина:** PostgreSQL не позволяет добавить значение в enum и использовать его как default в одной транзакции
- **Решение:** 
  1. Изменен schema.prisma — default остается OPEN (PENDING устанавливается в коде контроллера)
  2. Создана кастомная миграция (20260405120000_add_pending_status) с SQL: `ALTER TYPE "TicketStatus" ADD VALUE 'PENDING';`
  3. Порядок применения:
     ```bash
     npx prisma migrate resolve --rolled-back 20260405112243_add_pending_status
     npx prisma db execute --file prisma/migrations/20260405120000_add_pending_status/migration.sql
     npx prisma migrate resolve --applied 20260405120000_add_pending_status
     npx prisma generate
     ```
- **Статус:** В ПРОЦЕССЕ — пользователь еще не выполнил команды

### Проблема 8: Бот — ошибка при создании тикета
- **Симптом:** Бот отправляет категорию, аудиторию, тему, описание — ответ "Не удалось создать заявку"
- **Причина:** Миграция для PENDING enum не применена, сервер не знает статус PENDING
- **Решение:** Применить миграцию (см. Проблема 7)
- **Статус:** В ПРОЦЕССЕ

---

## Текущий статус (2026-04-05 15:21 MSK)
- **Сервер:** работает (порт 3001)
- **Клиент:** работает (порт 5173), вход по admin@helpdesk.ru / admin123 работает
- **БД:** работает (Docker, порт 5233), seed загружен (18 тикетов, 5 пользователей)
- **Бот:** подключается к серверу, регистрация работает, категории загружаются. Создание тикета НЕ работает — нужна миграция PENDING.
- **Лог бота:** bot/bot.log
- **Модерация:** код готов, миграция не применена

## Следующие шаги
1. Применить миграцию PENDING (см. Проблема 7)
2. Проверить создание тикета через бота
3. Проверить что тикет появляется на странице "Модерация" в веб-панели
4. Проверить одобрение/отклонение тикета

---

## Сессия 2026-04-15

### Установка с нуля (после pull)
- Удалена вложенная папка `diplom_admin/diplom_admin` (случайный клон в клоне)
- Удалён `package-lock.json` в корне (npm install в корне)
- Удалены локальные `bot/package-lock.json`, `server/package-lock.json`, `client/package-lock.json` — они появились в ремоуте, мешали pull
- Удалена сломанная миграция `20260405112243_add_pending_status`
- После pull в migrations/ осталось: `20260405082733_init`, `20260405120000_add_pending_status`, `20260405160000_add_features`
- `npx prisma migrate reset --force` — применил все миграции и seed (18 тикетов, 30 статей KB)
- Сервер (3001), клиент (5173), бот — все запущены и работают

### Проверка бота
- Созданы 2 тестовые заявки через Telegram (id 19 и 20)
- В логе бота: `createTicket OK: ticketId=19`, `createTicket OK: ticketId=20`
- Заявки **не показываются** в основном списке — это корректно, они в статусе PENDING
- Для просмотра нужна страница `/moderation` в веб-панели
- Если в сайдбаре нет пункта "Модерация" — хард-рефреш браузера (Cmd+Shift+R) или открыть напрямую `http://localhost:5173/moderation`

### Добавлено: публичная веб-форма подачи заявки
**Зачем:** пользователь запросил возможность подать заявку без регистрации/логина (как через бота, только в вебе).

**Backend (server/src/):**
- `controllers/tickets.controller.js`: добавлена функция `createPublicTicket`. Принимает `fullName`, `email`/`phone`, `categoryId`, `title`, `description`, `location`. Находит или создаёт пользователя (по email, затем по phone). Создаёт тикет со статусом `PENDING` (идёт в модерацию).
- `routes/tickets.routes.js`: добавлен роут `POST /api/tickets/public` **до** `router.use(authMiddleware)` — публичный, без авторизации.

**Frontend (client/src/):**
- `pages/PublicSubmitPage.jsx` — новая страница с формой: ФИО, email/телефон, категория, аудитория, тема, описание. Использует `axios` напрямую (не через сервис с JWT-интерсептором). Категории загружаются с `/api/categories/public`. После отправки показывает номер заявки и сообщение "На модерации".
- `App.jsx`: добавлен публичный роут `<Route path="/submit" element={<PublicSubmitPage />} />` вне `ProtectedRoute`.
- `pages/LoginPage.jsx`: добавлена ссылка "Подать заявку без регистрации" → `/submit`.

**Как проверить:**
1. Открыть `http://localhost:5173/submit` (или с логина — ссылка внизу формы).
2. Заполнить и отправить заявку.
3. Залогиниться админом → "Модерация" → появится новая заявка со статусом PENDING.
4. Одобрить → заявка перейдёт в OPEN и появится в основном списке.
