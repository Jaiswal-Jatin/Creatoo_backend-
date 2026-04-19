# Database Initialization and Migration System

This document describes the automatic database initialization and migration system implemented for the Creatoo backend.

## 🚀 Overview

The database system provides automatic:
- **Database Connection**: Enhanced connection management with logging and pooling
- **Schema Migration**: Automatic table creation and column addition without data loss
- **Seed Data**: Default data insertion for essential records
- **Error Handling**: Comprehensive error handling and logging

## 📁 File Structure

```
src/config/
├── database.ts      # Database connection manager
├── migration.ts     # Migration system (tables/columns)
├── seed.ts          # Seed data system
├── db-init.ts       # Unified initialization orchestrator
└── db.ts           # Legacy compatibility layer

.env.example         # Example environment configuration
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=creatoo
DB_USER=root
DB_PASS=your_mysql_password
```

### Database Setup

1. **Install MySQL**
   ```bash
   # On macOS with Homebrew
   brew install mysql
   brew services start mysql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE creatoo;
   ```

3. **Create User (Optional)**
   ```sql
   CREATE USER 'creatoo_user'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON creatoo.* TO 'creatoo_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

## 🔄 How It Works

### 1. Server Startup Flow

When the server starts, it follows this sequence:

```
Server Start → Database Connect → Run Migrations → Seed Data → Start API Server
```

### 2. Migration Process

The migration system:
- ✅ **Checks existing tables** in the database
- ✅ **Creates missing tables** based on Sequelize models
- ✅ **Adds missing columns** to existing tables
- ✅ **Preserves existing data** (no data loss)
- ✅ **Logs all changes** to console

### 3. Seed Data Process

The seed system:
- ✅ **Inserts default settings** (tax rates, platform fees)
- ✅ **Creates business types** (Restaurant, Retail, etc.)
- ✅ **Adds default plans** (Basic, Professional, Enterprise)
- ✅ **Prevents duplicates** by checking existing data

## 📊 Database Features

### Connection Management
- **Connection Pooling**: Up to 10 connections
- **Retry Logic**: Automatic retry on connection failures
- **Logging**: SQL query logging in development mode
- **Timezone Support**: IST timezone (+05:30)

### Migration Safety
- **Non-destructive**: Never deletes or overwrites existing data
- **Incremental**: Only adds missing tables/columns
- **Rollback Safe**: Each operation is atomic
- **Type Safe**: Proper MySQL data type mapping

### Seed Data
- **Idempotent**: Safe to run multiple times
- **Conditional**: Only inserts if data doesn't exist
- **Comprehensive**: Covers essential default data

## 🛠️ Usage Examples

### Manual Database Initialization

```typescript
import databaseInitializer from './config/db-init';

// Initialize database manually
const result = await databaseInitializer.initialize();

if (result.success) {
  console.log('Database initialized successfully');
  console.log(`Changes made: ${result.totalChanges}`);
} else {
  console.error('Database initialization failed:', result.message);
}
```

### Check Database Status

```typescript
import databaseInitializer from './config/db-init';

const status = databaseInitializer.getStatus();
console.log('Database Status:', status);
```

### Get Detailed Report

```typescript
import databaseInitializer from './config/db-init';

const report = databaseInitializer.getDetailedReport();
console.log(report);
```

## 📋 Console Output Examples

### Successful Initialization
```
🚀 Starting database initialization...
📡 Step 1: Connecting to database...
✅ Database connection established successfully
🔄 Step 2: Running database migrations...
📋 Found 15 existing tables
✨ Table 'new_table' created
➕ Column 'new_column' added to table 'existing_table'
✅ Migration completed. 2 changes made.
🌱 Step 3: Running seed data operations...
🌱 Default settings created
✅ Seed operations completed. 1 changes made.
✅ Database initialization completed in 2.34s
📊 Total changes: 3
```

### Server Startup Banner
```
--------------------------------------------------
🚀 Creatoo Backend Server Started!
--------------------------------------------------
👉 Status:      DEVELOPMENT
👉 Local:       http://localhost:3000
👉 Network:     http://192.168.1.100:3000
--------------------------------------------------
📦 Database:    creatoo (localhost)
📦 DB Status:   ✅ Database initialized successfully in 2.34s
📦 Firebase:    ✅ Firebase connected
--------------------------------------------------
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check MySQL service is running
   - Verify database credentials in .env
   - Ensure database exists

2. **Migration Errors**
   - Check model definitions for syntax errors
   - Verify MySQL data types are compatible
   - Check database permissions

3. **Seed Errors**
   - Ensure tables exist before seeding
   - Check foreign key constraints
   - Verify data format

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

This will show:
- SQL queries being executed
- Detailed error messages
- Migration progress

## 🚀 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database credentials
3. Ensure database user has proper privileges

### Migration Strategy
- **Staging**: Test migrations on staging first
- **Backup**: Always backup production database
- **Rollback**: Have rollback plan ready
- **Monitoring**: Monitor migration logs

### Performance Considerations
- **Connection Pool**: Adjust pool size based on traffic
- **Query Logging**: Disable in production for performance
- **Indexing**: Ensure proper database indexes

## 🔄 Migration from Old System

If you're upgrading from the old system:

1. **Backup existing database**
2. **Update code** to use new initialization system
3. **Test** on staging environment
4. **Deploy** to production

The new system is **backward compatible** and will work with existing databases.

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify environment configuration
3. Review this documentation
4. Check existing database state

---

**Note**: This system is designed to be safe, automatic, and production-ready. It will never delete existing data and only makes additive changes to your database schema.
