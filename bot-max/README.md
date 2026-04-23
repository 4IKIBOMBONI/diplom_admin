# HelpDesk — бот для MAX Messenger

Бот для мессенджера **MAX** (botapi.max.ru) с функционалом, полностью идентичным Telegram-боту из `bot/`:

- регистрация/авторизация по `user_id` MAX,
- создание заявок с категорией, аудиторией, темой, описанием и фото,
- просмотр собственных заявок и их статусов,
- панель администратора: модерация (одобрить/отклонить), список открытых и в работе, назначение исполнителя, смена статуса.

Бот общается с тем же Node.js-сервером (`server/`) по REST API и использует JWT-токен, выданный по `POST /api/auth/max`.

---

## 1. Создание бота в MAX

1. Установите приложение **MAX** (мессенджер от VK/OK) на смартфон или ПК: https://max.ru
2. Найдите в MAX встроенного бота **@MasterBot** и откройте с ним чат.
3. Отправьте команду `/create` и следуйте инструкциям:
   - Имя бота — например, `HelpDesk Bot`.
   - Уникальный username, например `helpdesk_diploma_bot`.
   - Краткое описание: «Бот для подачи заявок в IT-отдел».
4. После создания `@MasterBot` пришлёт **access_token** (длинная строка вида `abc123...xyz`).
   - Сохраните его — это секрет, его нельзя публиковать.
5. Опционально через `@MasterBot`:
   - `/setcommands` — список команд (`start`, `status`, `admin`);
   - `/setdescription` — описание бота;
   - `/setavatar` — аватарка.

> Если `@MasterBot` недоступен, актуальную ссылку на создание бота и документацию Bot API смотрите на https://dev.max.ru/

---

## 2. Применение миграции БД

MAX-бот требует новых полей в таблице `User` (`maxId`, `maxUsername`) и значения `MAX` в enum `TicketSource`. Миграция уже добавлена — `server/prisma/migrations/20260416100000_add_max_support/`.

```bash
cd server
npx prisma migrate deploy   # в продакшене
# или для разработки:
npx prisma migrate dev
npx prisma generate
```

> Если БД уже свежая (после `prisma migrate reset`), ничего делать не нужно — миграция применится автоматически.

---

## 3. Настройка переменных окружения

В `server/.env` добавьте строки:

```
MAX_BOT_TOKEN=полученный_от_MasterBot_токен
MAX_API_URL=https://botapi.max.ru
```

(см. пример в `server/.env.example`)

---

## 4. Запуск бота

```bash
cd bot-max
npm install
npm run dev     # с автоперезапуском
# или
npm start
```

Логи пишутся в `bot-max/bot.log` и в stdout.

При первом запуске бот:
- вызывает `GET /me` у `botapi.max.ru` для проверки токена,
- запускает long-polling через `GET /updates`.

---

## 5. Архитектура

```
bot-max/
├── package.json
├── src/
│   ├── bot.js            # точка входа: long-polling, маршрутизация событий
│   ├── maxClient.js      # тонкий клиент MAX Bot API (getMe, sendMessage, uploads, updates)
│   ├── api.js            # клиент HelpDesk-сервера (axios, JWT, все методы)
│   ├── keyboards.js      # конструкторы inline-кнопок
│   └── handlers/
│       ├── start.js      # /start, регистрация через /api/auth/max
│       ├── newTicket.js  # мастер «Новая заявка» (категория → аудитория → тема → описание → фото)
│       ├── status.js     # /status, список своих заявок
│       └── admin.js      # /admin — модерация, назначение, смена статуса
```

### Жизненный цикл запроса

1. Пользователь отправляет сообщение в MAX.
2. Сервер MAX отдаёт обновление в ответе на long-polling запрос `GET /updates`.
3. `MaxClient` маршрутизирует событие:
   - `message_created` с текстом `/команда` → соответствующий обработчик;
   - `message_created` без команды → `onMessage` (шаг мастера создания заявки);
   - `message_callback` (нажатие inline-кнопки) → `onCallback` (ответ через `/answers`).
4. Обработчик вызывает REST API HelpDesk (`server/`) с JWT из сессии.
5. Результат отправляется обратно пользователю через `POST /messages`.

### Отличия от Telegram-бота

| Аспект | Telegram | MAX |
|---|---|---|
| Библиотека | `node-telegram-bot-api` | собственный `MaxClient` (axios) |
| Доставка | `TelegramBot({polling:true})` | `GET /updates?marker=...` в цикле |
| Кнопки | `inline_keyboard` → `callback_data` | `attachments[].type = 'inline_keyboard'`, `payload` вместо `callback_data` |
| Ответ на callback | `answerCallbackQuery` | `POST /answers?callback_id=...` |
| Файлы | `bot.getFile` → URL | `attachments[].payload.url` напрямую, загрузка через `POST /uploads?type=image` |
| Auth endpoint | `POST /api/auth/telegram` | `POST /api/auth/max` |
| `source` заявки | `TELEGRAM` | `MAX` |

---

## 6. Команды пользователя

| Команда | Описание |
|---|---|
| `/start` | Регистрация/авторизация, главное меню. |
| `/status` | Мои последние 5 заявок и их статусы. |
| `/admin` | Панель администратора (только для ADMIN/SUPERADMIN). |

### Главное меню (inline-кнопки)

- **Новая заявка** — мастер создания.
- **Мои заявки** — то же, что `/status`.
- **Помощь** — справка по командам.

### Мастер «Новая заявка»

1. Выбор категории (кнопки).
2. Ввод аудитории/кабинета (текстом, `нет` — если не нужно).
3. Тема (текст).
4. Описание (текст; можно прислать вместе с фото-вложением).
5. Заявка создаётся со статусом `PENDING` (на модерации), фото загружаются как attachments.

### Админ-меню

- **На модерации** — список `PENDING`-заявок с кнопками «Одобрить» / «Отклонить».
- **Открытые** / **В работе** — список с кнопкой «Подробнее», откуда можно:
  - перевести статус (OPEN → IN_PROGRESS → COMPLETED → CLOSED),
  - назначить исполнителя (из списка ADMIN/SUPERADMIN).

---

## 7. Диагностика

- **`MAX_BOT_TOKEN is not set`** — проверьте `server/.env`, значение `MAX_BOT_TOKEN`.
- **`getMe failed: Request failed with status code 401`** — токен невалиден, получите новый у `@MasterBot`.
- **`findOrCreateUser ERROR: status=404`** — сервер не запущен или не применена миграция, `/api/auth/max` не существует.
- **`uploadImage ERROR`** — проверьте, что сервер MAX доступен (`MAX_API_URL`). При корпоративной прокси может потребоваться настройка `HTTPS_PROXY`.
- **Бот не отвечает** — `tail -f bot-max/bot.log`.

---

## 8. Запуск в продакшене (пример systemd)

```ini
# /etc/systemd/system/helpdesk-max-bot.service
[Unit]
Description=HelpDesk MAX Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/diplom_admin/bot-max
ExecStart=/usr/bin/node src/bot.js
Restart=on-failure
EnvironmentFile=/opt/diplom_admin/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now helpdesk-max-bot
```
