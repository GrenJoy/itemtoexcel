# Гайд по деплою Warframe Inventory App на Render

## Подготовка проекта

### 1. Обновите package.json для деплоя
Убедитесь, что у вас есть правильные скрипты:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push"
  }
}
```

### 2. Создайте render.yaml (опционально)
```yaml
services:
  - type: web
    name: warframe-inventory
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: warframe-inventory-db
          property: connectionString

databases:
  - name: warframe-inventory-db
    databaseName: warframe_inventory
    user: warframe_user
```

## Деплой на Render

### Шаг 1: Создание PostgreSQL базы данных

1. Зайдите на [render.com](https://render.com) и создайте аккаунт
2. Нажмите "New +" → "PostgreSQL"
3. Заполните:
   - **Name:** `warframe-inventory-db`
   - **Database:** `warframe_inventory`
   - **User:** `warframe_user`
   - **Region:** выберите ближайший к вашим пользователям
   - **Plan:** Free (для начала)

4. Нажмите "Create Database"
5. **ВАЖНО:** Скопируйте "External Database URL" - это ваш DATABASE_URL

### Шаг 2: Деплой веб-сервиса

1. Нажмите "New +" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Заполните настройки:
   - **Name:** `warframe-inventory-app`
   - **Environment:** `Node`
   - **Region:** тот же, что и для базы данных
   - **Branch:** `main` (или ваша основная ветка)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Шаг 3: Переменные окружения

В разделе "Environment Variables" добавьте:

```
NODE_ENV=production
DATABASE_URL=[вставьте External Database URL из шага 1]
SESSION_SECRET=your-super-secret-session-key-here
GEMINI_API_KEY=ваш-ключ-gemini-api
```

### Шаг 4: Первоначальная настройка базы данных

После деплоя выполните миграцию:

1. В Dashboard Render → ваш сервис → "Console"
2. Выполните: `npm run db:push`

## Управление PostgreSQL на Render

### Подключение к базе данных

**Через веб-интерфейс Render:**
- Dashboard → PostgreSQL service → "Connect" → "External Connection"

**Через командную строку (локально):**
```bash
psql [External Database URL]
```

**Через GUI клиенты:**
- **pgAdmin:** используйте External Database URL
- **DBeaver:** Host, Port, Database, User, Password из URL
- **TablePlus:** подключение через PostgreSQL

### Полезные SQL команды

```sql
-- Посмотреть все таблицы
\dt

-- Посмотреть количество записей в таблицах
SELECT 'inventory_items' as table_name, COUNT(*) as count FROM inventory_items
UNION ALL
SELECT 'processing_jobs' as table_name, COUNT(*) as count FROM processing_jobs;

-- Очистить все данные (если нужно)
TRUNCATE TABLE inventory_items, processing_jobs;

-- Посмотреть размер базы данных
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Бэкап (экспорт) данных
pg_dump [DATABASE_URL] > backup.sql

-- Восстановление из бэкапа
psql [DATABASE_URL] < backup.sql
```

### Мониторинг и обслуживание

**Просмотр логов:**
- Render Dashboard → ваш сервис → "Logs"

**Мониторинг базы данных:**
- Render Dashboard → PostgreSQL service → "Metrics"

**Масштабирование:**
- Free план: 256MB RAM, общий CPU
- Starter план: 512MB RAM, 0.1 CPU
- Standard план: 2GB RAM, 0.5 CPU

## Важные моменты

### Лимиты Free плана Render:
- **Web Service:** 750 часов/месяц (засыпает после 15 минут неактивности)
- **PostgreSQL:** 1GB хранилища, до 97 подключений
- **Bandwidth:** 100GB/месяц

### Советы по оптимизации:
1. **Кэширование:** Warframe Market API уже кэшируется в памяти
2. **Сессии:** Настроены на 24 часа
3. **Автоочистка:** Рассмотрите добавление cron-задач для очистки старых сессий

### Безопасность:
- Используйте сильный `SESSION_SECRET`
- Не коммитьте секретные ключи в Git
- Регулярно обновляйте зависимости

## Альтернативные хостинги

Если Render не подходит:

1. **Railway:** Похожий на Render, но с другими лимитами
2. **Heroku:** Классический PaaS (платный)
3. **Vercel + PlanetScale:** Для статических сайтов + serverless функции
4. **DigitalOcean App Platform:** Больше контроля
5. **AWS/GCP:** Для высоких нагрузок

## Мониторинг в продакшене

Добавьте эти инструменты:
- **Логирование:** Winston или Pino
- **Мониторинг ошибок:** Sentry
- **Метрики:** Prometheus + Grafana
- **Uptime:** UptimeRobot или Pingdom

---

**Готово!** Ваше приложение будет доступно по адресу `https://warframe-inventory-app.onrender.com`