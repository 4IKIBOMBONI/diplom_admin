# HelpDesk — Система управления заявками

Полнофункциональное web-приложение для управления внутренними заявками (тикетами) предприятия/ВУЗа.

## Стек технологий

| Компонент | Технология |
|-----------|-----------|
| Фронтенд | React 18, Vite, Tailwind CSS, React Router v6 |
| Бэкенд | Node.js, Express.js |
| БД | PostgreSQL (Prisma ORM) |
| Реалтайм | Socket.IO |
| Авторизация | JWT (access + refresh tokens), bcrypt |
| Telegram-бот | node-telegram-bot-api |
| MAX-бот | собственный клиент botapi.max.ru (axios, long-polling) |

## Быстрый старт

### 1. Запуск PostgreSQL

```bash
docker-compose up -d
```

### 2. Настройка переменных окружения

```bash
cp server/.env.example server/.env
# Отредактируйте server/.env при необходимости
```

### 3. Запуск сервера

```bash
cd server
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 4. Запуск клиента

```bash
cd client
npm install
npm run dev
```

### 5. Запуск Telegram-бота (опционально)

```bash
# Установите TELEGRAM_BOT_TOKEN в server/.env
cd bot
npm install
npm run dev
```

### 6. Запуск MAX-бота (опционально)

```bash
# 1. Получите токен у @MasterBot в мессенджере MAX
# 2. Установите MAX_BOT_TOKEN в server/.env
# 3. Примените миграцию:
cd server && npx prisma migrate deploy
# 4. Запустите:
cd ../bot-max
npm install
npm run dev
```

Подробнее — `bot-max/README.md`.

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Суперадмин | admin@helpdesk.ru | admin123 |
| Админ | ivanov@helpdesk.ru | admin123 |
| Пользователь | sidorova@mail.ru | user123 |

## Функциональность

- Создание и отслеживание заявок через веб-интерфейс и Telegram-бот
- Система ролей: пользователь, администратор, суперадмин
- Фильтрация, поиск и пагинация заявок
- История статусов и комментарии
- Реалтайм-уведомления (Socket.IO)
- Дашборд со статистикой и графиками
- Управление пользователями и категориями
- Адаптивный дизайн (мобильные устройства)

## API Endpoints

### Auth
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `POST /api/auth/refresh` — Обновление токена
- `POST /api/auth/logout` — Выход
- `GET /api/auth/me` — Текущий пользователь

### Tickets
- `GET /api/tickets` — Список тикетов (с фильтрами и пагинацией)
- `GET /api/tickets/:id` — Детали тикета
- `POST /api/tickets` — Создать тикет
- `PATCH /api/tickets/:id` — Обновить тикет
- `DELETE /api/tickets/:id` — Удалить тикет (superadmin)
- `POST /api/tickets/:id/comments` — Добавить комментарий
- `GET /api/tickets/:id/comments` — Комментарии тикета

### Users
- `GET /api/users` — Список пользователей (admin+)
- `PATCH /api/users/:id` — Обновить пользователя (superadmin)
- `PATCH /api/users/profile` — Обновить свой профиль

### Stats
- `GET /api/stats/overview` — Общая статистика
- `GET /api/stats/by-category` — По категориям
- `GET /api/stats/by-period` — По периодам

### Categories
- `GET /api/categories` — Список категорий
- `POST /api/categories` — Создать категорию (superadmin)
- `PATCH /api/categories/:id` — Обновить (superadmin)
