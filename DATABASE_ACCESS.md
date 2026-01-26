# Database Access Guide

## PostgreSQL Database Access

### Connection Details

\`\`\`
Host: localhost
Port: 5432
Database: ecommerce_db
Username: postgres
Password: postgres123
\`\`\`

---

## Method 1: Docker Exec (Recommended)

### Access Interactive PostgreSQL Shell

\`\`\`bash
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce_db
\`\`\`

### Common PostgreSQL Commands

Once inside the psql shell:

\`\`\`sql
-- List all databases
\l

-- List all tables
\dt

-- Describe table structure
\d categories
\d products

-- View table indexes
\di

-- Show current database
SELECT current_database();

-- Show current user
SELECT current_user;

-- Exit
\q
\`\`\`

---

## Method 2: Quick Queries (Non-Interactive)

### View All Categories

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "SELECT * FROM categories;"
\`\`\`

### View All Products

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "SELECT * FROM products;"
\`\`\`

### Count Records

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "
SELECT
(SELECT COUNT(*) FROM categories) as categories_count,
(SELECT COUNT(*) FROM products) as products_count;
"
\`\`\`

### Products by Category

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "
SELECT
c.name as category,
COUNT(p.id) as product_count,
COALESCE(SUM(p.stock), 0) as total_stock
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY c.name;
"
\`\`\`

### Most Expensive Products

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "
SELECT
p.name,
p.price,
c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY p.price DESC
LIMIT 5;
"
\`\`\`

---

## Method 3: Using psql Client (Host Machine)

If you have PostgreSQL client installed:

\`\`\`bash
# Install psql client (if not installed)
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Then connect
psql -h localhost -p 5432 -U postgres -d ecommerce_db
# Password: postgres123
\`\`\`

---

## Method 4: GUI Database Tools

### DBeaver (Free, Cross-Platform)

1. Download from https://dbeaver.io
2. Create New Connection → PostgreSQL
3. Enter connection details:
- Host: `localhost`
- Port: `5432`
- Database: `ecommerce_db`
- Username: `postgres`
- Password: `postgres123`
4. Test connection and click Finish

### pgAdmin (Official PostgreSQL GUI)

1. Download from https://www.pgadmin.org
2. Add New Server:
- General → Name: `Ecommerce Local`
- Connection → Host: `localhost`
- Connection → Port: `5432`
- Connection → Database: `ecommerce_db`
- Connection → Username: `postgres`
- Connection → Password: `postgres123`
3. Save password and connect

### TablePlus (macOS/Windows)

1. Download from https://tableplus.com
2. Create Connection → PostgreSQL
3. Enter connection details
4. Click Connect

---

## Method 5: VS Code Extension

### PostgreSQL Extension by Chris Kolkman

1. Install extension in VS Code
2. Click PostgreSQL icon in sidebar
3. Add connection:
- Host: `localhost`
- Port: `5432`
- Database: `ecommerce_db`
- Username: `postgres`
- Password: `postgres123`
4. Browse tables and run queries

---

## Useful SQL Queries

### View Database Schema

\`\`\`sql
-- Table structures
SELECT
table_name,
column_name,
data_type,
is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
\`\`\`

### View All Products with Category Names

\`\`\`sql
SELECT
p.id,
p.name,
p.description,
p.price,
p.stock,
c.name as category_name,
p.created_at
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;
\`\`\`

### Find Products by Price Range

\`\`\`sql
SELECT
p.name,
p.price,
c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.price BETWEEN 20 AND 100
ORDER BY p.price;
\`\`\`

### Low Stock Products

\`\`\`sql
SELECT
p.name,
p.stock,
c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock < 100
ORDER BY p.stock;
\`\`\`

### Category Statistics

\`\`\`sql
SELECT
c.name as category,
COUNT(p.id) as product_count,
AVG(p.price)::numeric(10,2) as avg_price,
SUM(p.stock) as total_stock,
MIN(p.price) as min_price,
MAX(p.price) as max_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY product_count DESC;
\`\`\`

---

## Database Backup and Restore

### Backup Database

\`\`\`bash
# Backup to SQL file
docker exec ecommerce-postgres pg_dump -U postgres ecommerce_db > backup.sql

# Backup with compression
docker exec ecommerce-postgres pg_dump -U postgres ecommerce_db | gzip > backup.sql.gz
\`\`\`

### Restore Database

\`\`\`bash
# Restore from SQL file
docker exec -i ecommerce-postgres psql -U postgres -d ecommerce_db < backup.sql

# Restore from compressed file
gunzip -c backup.sql.gz | docker exec -i ecommerce-postgres psql -U postgres -d ecommerce_db
\`\`\`

---

## Database Management

### Create New Database

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -c "CREATE DATABASE test_db;"
\`\`\`

### Drop Database

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -c "DROP DATABASE test_db;"
\`\`\`

### List All Databases

\`\`\`bash
docker exec ecommerce-postgres psql -U postgres -c "\l"
\`\`\`

### View Active Connections

\`\`\`sql
SELECT
pid,
usename,
application_name,
client_addr,
state,
query_start
FROM pg_stat_activity
WHERE datname = 'ecommerce_db';
\`\`\`

---

## Troubleshooting

### Cannot Connect to Database

\`\`\`bash
# Check if container is running
docker ps | grep ecommerce-postgres

# Check container logs
docker logs ecommerce-postgres

# Restart container
docker restart ecommerce-postgres

# Check PostgreSQL is listening
docker exec ecommerce-postgres pg_isready -U postgres
\`\`\`

### Reset Database to Seed Data

\`\`\`bash
# Using npm script
npm run reset-db

# Or manually
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "
TRUNCATE TABLE categories CASCADE;
"
# Then restart the server to reload seed data
\`\`\`

### View Container Network

\`\`\`bash
# Inspect container
docker inspect ecommerce-postgres

# View networks
docker network ls

# Inspect network
docker network inspect ecommerce-api_default
\`\`\`

---

## Quick Reference Commands

\`\`\`bash
# Access database shell
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce_db

# Run single query
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "YOUR_QUERY"

# View logs
docker logs ecommerce-postgres

# Stop container
docker stop ecommerce-postgres

# Start container
docker start ecommerce-postgres

# Remove container (data persists in volume)
docker rm ecommerce-postgres

# Remove container and volume (deletes all data)
docker-compose down -v
\`\`\`

---

## Connection String Format

For applications:

\`\`\`
postgresql://postgres:postgres123@localhost:5432/ecommerce_db
\`\`\`

For Node.js (pg library):

\`\`\`javascript
const pool = new Pool({
user: 'postgres',
password: 'postgres123',
host: 'localhost',
port: 5432,
database: 'ecommerce_db'
});
\`\`\`

---

## Security Notes

**Important**: The credentials in this guide are for **local development only**.

For production:
- Use strong passwords
- Enable SSL/TLS connections
- Restrict network access
- Use environment variables
- Enable connection encryption
- Set up proper user permissions

---

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- psql Commands: https://www.postgresql.org/docs/current/app-psql.html
- SQL Tutorial: https://www.postgresqltutorial.com/

---

**Created:** January 23, 2026
**Database:** ecommerce_db
**Container:** ecommerce-postgres
**Status:** Running
