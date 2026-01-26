# pgAdmin Setup Guide

## Quick Access

**pgAdmin URL:** http://localhost:5050

**Login Credentials:**
- Email: `admin@ecommerce.com`
- Password: `admin123`

---

## Step-by-Step Server Registration

### Step 1: Open pgAdmin

1. Open your browser
2. Navigate to http://localhost:5050
3. Login with credentials above

### Step 2: Register Server

1. Right-click **"Servers"** in the left sidebar
2. Select **"Register"** → **"Server..."**

### Step 3: Fill in Details

#### **General Tab**
- **Name:** `Ecommerce Database`
- **Server Group:** Servers (default)
- **Comments:** (optional) "Local ecommerce API database"

#### **Connection Tab**
- **Host name/address:** `ecommerce-postgres`
- **Important:** Use `ecommerce-postgres` (container name), NOT `localhost`
- This is because pgAdmin is running inside Docker and needs to use the container network
- **Port:** `5432`
- **Maintenance database:** `ecommerce_db`
- **Username:** `postgres`
- **Password:** `postgres123`
- **Save password?** Check this box

#### **SSL Tab** (optional, leave as default)
- **SSL mode:** Prefer

#### **Advanced Tab** (optional, leave as default)
- **DB restriction:** (leave empty)

### Step 4: Save

Click the **"Save"** button at the bottom right

---

## Verify Connection

After saving, you should see:

\`\`\`
Servers
Ecommerce Database (connected)
Databases (1)
ecommerce_db
Schemas (1)
public
Tables (2)
categories
products
Views
Functions
Sequences
Statistics
\`\`\`

---

## Exploring Your Data

### View Categories Table

1. Expand: **Servers** → **Ecommerce Database** → **Databases** → **ecommerce_db** → **Schemas** → **public** → **Tables**
2. Right-click **categories**
3. Select **"View/Edit Data"** → **"All Rows"**

### View Products Table

1. Right-click **products**
2. Select **"View/Edit Data"** → **"All Rows"**

### Run Custom Queries

1. Click on **ecommerce_db** in the tree
2. Click **"Tools"** menu → **"Query Tool"** (or press F5)
3. Type your SQL query:

\`\`\`sql
-- View all products with category names
SELECT
p.id,
p.name as product_name,
p.price,
p.stock,
c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;
\`\`\`

4. Click the **Execute** button () or press F5

---

## Useful Queries to Try

### Products by Category

\`\`\`sql
SELECT
c.name as category,
COUNT(p.id) as product_count,
AVG(p.price)::numeric(10,2) as avg_price,
SUM(p.stock) as total_stock
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY c.name;
\`\`\`

### Most Expensive Products

\`\`\`sql
SELECT
p.name,
p.price,
c.name as category,
p.stock
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY p.price DESC
LIMIT 10;
\`\`\`

### Low Stock Alert

\`\`\`sql
SELECT
p.name,
p.stock,
c.name as category,
p.price
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock < 100
ORDER BY p.stock;
\`\`\`

### Category Statistics

\`\`\`sql
SELECT
c.name as category,
COUNT(p.id) as products,
COALESCE(MIN(p.price), 0) as min_price,
COALESCE(MAX(p.price), 0) as max_price,
COALESCE(AVG(p.price), 0)::numeric(10,2) as avg_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY products DESC;
\`\`\`

---

## Common Tasks in pgAdmin

### Insert New Category

\`\`\`sql
INSERT INTO categories (name, description)
VALUES ('Gaming', 'Video games and gaming accessories');
\`\`\`

### Insert New Product

\`\`\`sql
INSERT INTO products (name, description, price, category_id, stock)
VALUES (
'Mechanical Keyboard',
'RGB mechanical gaming keyboard',
129.99,
1, -- Electronics category ID
75
);
\`\`\`

### Update Product Price

\`\`\`sql
UPDATE products
SET price = 799.99
WHERE name = 'Laptop 15-inch';
\`\`\`

### Delete a Product

\`\`\`sql
DELETE FROM products
WHERE id = 41;
\`\`\`

### View Table Structure

Right-click table → **"Properties"** → **"Columns"** tab

---

## Troubleshooting

### Cannot Connect to Server

**Error:** "could not connect to server"

**Solution:**
- Make sure you used `ecommerce-postgres` as hostname, NOT `localhost`
- Verify containers are running: `docker ps`
- Check network: `docker network ls`

### Connection Timeout

**Solution:**
\`\`\`bash
# Restart containers
docker-compose restart

# Check logs
docker logs ecommerce-postgres
docker logs ecommerce-pgadmin
\`\`\`

### Forgot Password

**Solution:**
\`\`\`bash
# Stop and remove pgAdmin container
docker stop ecommerce-pgadmin
docker rm ecommerce-pgadmin

# Remove volume to reset
docker volume rm ecommerce-api_pgadmin_data

# Start again
docker-compose up -d
\`\`\`

---

## pgAdmin Features

### Dashboard
- Click on database name to see dashboard
- View statistics, graphs, and server activity

### Data Export
1. Right-click table
2. Select **"Import/Export Data"**
3. Choose format (CSV, JSON, etc.)

### SQL History
- View menu → **"Query History"**
- See all previously executed queries

### ERD (Entity Relationship Diagram)
1. Right-click **ecommerce_db**
2. Select **"Generate ERD"**
3. View visual database schema

### Backup Database
1. Right-click **ecommerce_db**
2. Select **"Backup..."**
3. Choose filename and format
4. Click **"Backup"**

### Restore Database
1. Right-click **ecommerce_db**
2. Select **"Restore..."**
3. Choose backup file
4. Click **"Restore"**

---

## pgAdmin Shortcuts

| Action | Shortcut |
|--------|----------|
| Query Tool | F5 |
| Execute Query | F5 (in query tool) |
| New Query Tab | Ctrl + T |
| Save Query | Ctrl + S |
| Find | Ctrl + F |
| Refresh | F5 |
| Properties | Alt + Enter |

---

## Access from Other Machines

If you want to access pgAdmin from another computer on your network:

1. Find your machine's IP address:
\`\`\`bash
# Windows
ipconfig

# Linux/Mac
ifconfig
\`\`\`

2. Access pgAdmin from other machine:
\`\`\`
http://YOUR_IP_ADDRESS:5050
\`\`\`

---

## Security Notes

**Development Only**: These credentials are for local development.

For production:
- Change default passwords
- Use environment variables
- Enable SSL/TLS
- Restrict network access
- Use strong authentication

---

## Additional Resources

- pgAdmin Documentation: https://www.pgadmin.org/docs/
- PostgreSQL Tutorial: https://www.postgresqltutorial.com/
- SQL Reference: https://www.postgresql.org/docs/current/sql.html

---

## Quick Reference

**pgAdmin URL:** http://localhost:5050
**Login:** admin@ecommerce.com / admin123

**Database Connection:**
- Host: `ecommerce-postgres`
- Port: 5432
- Database: `ecommerce_db`
- User: `postgres`
- Password: `postgres123`

**Docker Commands:**
\`\`\`bash
# View containers
docker ps

# Restart pgAdmin
docker restart ecommerce-pgadmin

# View logs
docker logs ecommerce-pgadmin

# Stop all
docker-compose down

# Start all
docker-compose up -d
\`\`\`

---

**Created:** January 23, 2026
**Status:** Ready to use
**Access:** http://localhost:5050
