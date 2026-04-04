const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.statusHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  // Create users
  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@helpdesk.ru',
      password: passwordHash,
      fullName: 'Петров Алексей Сергеевич',
      role: 'SUPERADMIN',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'ivanov@helpdesk.ru',
      password: passwordHash,
      fullName: 'Иванов Дмитрий Николаевич',
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'sidorova@mail.ru',
      password: userPasswordHash,
      fullName: 'Сидорова Мария Павловна',
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'kuznetsov@mail.ru',
      password: userPasswordHash,
      fullName: 'Кузнецов Андрей Викторович',
      role: 'USER',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'volkova@mail.ru',
      password: userPasswordHash,
      fullName: 'Волкова Елена Игоревна',
      role: 'USER',
    },
  });

  console.log('Users created');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Почта', description: 'Проблемы с электронной почтой' } }),
    prisma.category.create({ data: { name: 'Сеть/VPN', description: 'Проблемы с сетевым подключением и VPN' } }),
    prisma.category.create({ data: { name: 'Оборудование', description: 'Проблемы с компьютерами, принтерами и другим оборудованием' } }),
    prisma.category.create({ data: { name: 'Программное обеспечение', description: 'Установка, обновление и настройка ПО' } }),
    prisma.category.create({ data: { name: 'Доступы/Учётные записи', description: 'Создание, блокировка и восстановление учётных записей' } }),
    prisma.category.create({ data: { name: 'Прочее', description: 'Прочие запросы' } }),
  ]);

  console.log('Categories created');

  const [catMail, catNet, catHW, catSW, catAccess, catOther] = categories;
  const users = [user1, user2, user3];
  const admins = [admin, superadmin];

  // Create tickets with different statuses and priorities
  const ticketData = [
    { title: 'Не приходят письма на корпоративную почту', description: 'С утра не получаю письма на почту. Отправка работает нормально, а входящие не поступают уже 3 часа.', categoryId: catMail.id, priority: 'HIGH', creator: user1, status: 'IN_PROGRESS', assignee: admin, location: '201' },
    { title: 'Не работает VPN', description: 'При попытке подключения к VPN выдаёт ошибку "Connection timeout". Пробовал перезагрузить компьютер, не помогло.', categoryId: catNet.id, priority: 'HIGH', creator: user2, status: 'OPEN', location: '305' },
    { title: 'Замена картриджа в принтере HP LaserJet', description: 'В кабинете 412 закончился тонер в принтере HP LaserJet Pro M404. Нужна замена картриджа.', categoryId: catHW.id, priority: 'LOW', creator: user1, status: 'COMPLETED', assignee: admin, location: '412' },
    { title: 'Установить Microsoft Office', description: 'На новом компьютере нужно установить Microsoft Office 2021. Компьютер уже подключён к сети.', categoryId: catSW.id, priority: 'MEDIUM', creator: user3, status: 'OPEN', location: '118' },
    { title: 'Не могу войти в 1С', description: 'При входе в 1С:Бухгалтерию выдаёт ошибку "Неверный пароль", хотя пароль точно правильный. Пробовала сбросить через ИТ-портал.', categoryId: catAccess.id, priority: 'HIGH', creator: user1, status: 'IN_PROGRESS', assignee: superadmin, location: '203' },
    { title: 'Медленно работает компьютер', description: 'Компьютер очень медленно загружается и зависает при открытии нескольких программ. Работает так уже неделю.', categoryId: catHW.id, priority: 'MEDIUM', creator: user2, status: 'OPEN', location: '310' },
    { title: 'Нет доступа к сетевой папке', description: 'Не могу открыть сетевую папку \\\\server\\shared. Пишет "Отказано в доступе". Раньше доступ был.', categoryId: catNet.id, priority: 'MEDIUM', creator: user3, status: 'COMPLETED', assignee: admin, location: '215' },
    { title: 'Создать учётную запись для нового сотрудника', description: 'Нужно создать учётную запись AD и почтовый ящик для нового сотрудника Козлова А.В., отдел маркетинга.', categoryId: catAccess.id, priority: 'MEDIUM', creator: user1, status: 'CLOSED', assignee: admin },
    { title: 'Не работает проектор в аудитории 501', description: 'Проектор не включается. Лампочка мигает красным. Нужен для лекции завтра утром.', categoryId: catHW.id, priority: 'CRITICAL', creator: user2, status: 'IN_PROGRESS', assignee: admin, location: '501' },
    { title: 'Обновить антивирус', description: 'На нескольких компьютерах в кабинете 220 устарела база антивируса. Нужно обновить Kaspersky на 5 машинах.', categoryId: catSW.id, priority: 'LOW', creator: user3, status: 'OPEN', location: '220' },
    { title: 'Настроить WiFi в новом кабинете', description: 'В кабинете 415 после ремонта нет WiFi. Нужно установить и настроить точку доступа.', categoryId: catNet.id, priority: 'MEDIUM', creator: user1, status: 'COMPLETED', assignee: superadmin, location: '415' },
    { title: 'Заблокирована учётная запись', description: 'После нескольких попыток входа заблокировалась моя учётная запись Windows. Не могу войти в систему.', categoryId: catAccess.id, priority: 'HIGH', creator: user2, status: 'CLOSED', assignee: admin, location: '307' },
    { title: 'Не печатает принтер Canon', description: 'Принтер Canon i-SENSYS в кабинете 105 перестал печатать. Задания уходят в очередь, но не печатаются.', categoryId: catHW.id, priority: 'MEDIUM', creator: user3, status: 'OPEN', location: '105' },
    { title: 'Установить Zoom и Teams', description: 'Нужно установить Zoom и Microsoft Teams для проведения онлайн-совещаний. Компьютер в кабинете ректора.', categoryId: catSW.id, priority: 'HIGH', creator: user1, status: 'COMPLETED', assignee: admin, location: '101' },
    { title: 'Проблема с отправкой вложений', description: 'При попытке отправить письмо с вложением больше 5 МБ выходит ошибка. Раньше отправлял файлы до 25 МБ без проблем.', categoryId: catMail.id, priority: 'MEDIUM', creator: user2, status: 'IN_PROGRESS', assignee: admin, location: '209' },
    { title: 'Перенести данные на новый компьютер', description: 'Получил новый компьютер, нужно перенести данные со старого: документы, настройки почты, закладки браузера.', categoryId: catOther.id, priority: 'LOW', creator: user3, status: 'OPEN', location: '402' },
    { title: 'Не работает телефония', description: 'IP-телефон не регистрируется на сервере. Не могу принимать и совершать звонки уже 2 день.', categoryId: catNet.id, priority: 'HIGH', creator: user1, status: 'OPEN', location: '208' },
    { title: 'Нужен доступ к CRM-системе', description: 'Перешёл в отдел продаж, нужен доступ к CRM-системе Bitrix24 с правами менеджера.', categoryId: catAccess.id, priority: 'MEDIUM', creator: user2, status: 'COMPLETED', assignee: superadmin },
  ];

  for (const td of ticketData) {
    const createdDaysAgo = Math.floor(Math.random() * 30) + 1;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - createdDaysAgo);

    const ticket = await prisma.ticket.create({
      data: {
        title: td.title,
        description: td.description,
        categoryId: td.categoryId,
        priority: td.priority,
        status: td.status,
        source: Math.random() > 0.8 ? 'TELEGRAM' : 'WEB',
        location: td.location || null,
        creatorId: td.creator.id,
        assigneeId: td.assignee?.id || null,
        createdAt,
        closedAt: td.status === 'CLOSED' ? new Date(createdAt.getTime() + 86400000 * Math.floor(Math.random() * 5 + 1)) : null,
      },
    });

    // Create status history
    await prisma.statusHistory.create({
      data: { newStatus: 'OPEN', ticketId: ticket.id, changedById: td.creator.id, createdAt },
    });

    if (td.status !== 'OPEN') {
      const statusDate = new Date(createdAt.getTime() + 3600000 * Math.floor(Math.random() * 24 + 1));
      await prisma.statusHistory.create({
        data: {
          oldStatus: 'OPEN',
          newStatus: td.status === 'CLOSED' ? 'IN_PROGRESS' : td.status,
          ticketId: ticket.id,
          changedById: (td.assignee || admin).id,
          createdAt: statusDate,
        },
      });

      if (td.status === 'COMPLETED' || td.status === 'CLOSED') {
        const completeDate = new Date(statusDate.getTime() + 3600000 * Math.floor(Math.random() * 48 + 1));
        await prisma.statusHistory.create({
          data: {
            oldStatus: 'IN_PROGRESS',
            newStatus: 'COMPLETED',
            ticketId: ticket.id,
            changedById: (td.assignee || admin).id,
            createdAt: completeDate,
          },
        });

        if (td.status === 'CLOSED') {
          await prisma.statusHistory.create({
            data: {
              oldStatus: 'COMPLETED',
              newStatus: 'CLOSED',
              ticketId: ticket.id,
              changedById: (td.assignee || admin).id,
              createdAt: new Date(completeDate.getTime() + 3600000 * 2),
            },
          });
        }
      }
    }

    // Add some comments
    if (Math.random() > 0.3) {
      await prisma.comment.create({
        data: {
          text: getRandomComment(td.status),
          ticketId: ticket.id,
          authorId: (td.assignee || admin).id,
          createdAt: new Date(createdAt.getTime() + 3600000 * Math.floor(Math.random() * 12 + 1)),
        },
      });
    }

    if (Math.random() > 0.5) {
      await prisma.comment.create({
        data: {
          text: getRandomUserReply(),
          ticketId: ticket.id,
          authorId: td.creator.id,
          createdAt: new Date(createdAt.getTime() + 3600000 * Math.floor(Math.random() * 24 + 6)),
        },
      });
    }

    // Internal comment for some tickets
    if (Math.random() > 0.7) {
      await prisma.comment.create({
        data: {
          text: getRandomInternalComment(),
          isInternal: true,
          ticketId: ticket.id,
          authorId: admin.id,
          createdAt: new Date(createdAt.getTime() + 3600000 * 2),
        },
      });
    }
  }

  console.log(`${ticketData.length} tickets created with history and comments`);
  console.log('Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  Superadmin: admin@helpdesk.ru / admin123');
  console.log('  Admin:      ivanov@helpdesk.ru / admin123');
  console.log('  User:       sidorova@mail.ru / user123');
}

function getRandomComment(status) {
  const comments = {
    OPEN: [
      'Заявка принята, рассмотрим в ближайшее время.',
      'Спасибо за обращение, изучаем проблему.',
      'Уточняем детали, свяжемся с вами.',
    ],
    IN_PROGRESS: [
      'Работаем над решением. Ожидайте.',
      'Обнаружили причину проблемы, исправляем.',
      'Проблема на стороне сервера, устраняем.',
      'Выезжаем на место для диагностики.',
    ],
    COMPLETED: [
      'Проблема решена. Проверьте, пожалуйста.',
      'Выполнено. Если возникнут вопросы, обращайтесь.',
      'Готово! Перезагрузите компьютер для применения изменений.',
    ],
    CLOSED: [
      'Заявка закрыта. Спасибо за обращение.',
      'Подтверждено решение. Заявка закрыта.',
    ],
  };
  const pool = comments[status] || comments.OPEN;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomUserReply() {
  const replies = [
    'Спасибо, жду.',
    'Хорошо, спасибо за оперативность!',
    'Когда примерно будет готово?',
    'Понял, спасибо.',
    'Проблема всё ещё сохраняется.',
    'Всё ��аботает, спасибо!',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function getRandomInternalComment() {
  const notes = [
    'Нужно заказать запчасть у поставщика.',
    'Проблема связана с обновлением сервера вче��а.',
    'Передал задачу Дмитрию.',
    'Требуется согласование с руководством.',
    'Аналогичная проблема была в прошлом месяце — решение в базе знаний.',
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
