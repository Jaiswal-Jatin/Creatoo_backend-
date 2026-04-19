#!/bin/bash

echo "🔧 Setting up MySQL database for Creatoo Backend..."

# Database configuration from .env file
DB_HOST="localhost"
DB_PORT="3306"
DB_USER=""
DB_PASS=""
DB_NAME="creato"

echo "📦 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER (empty user)"
echo "   Database: $DB_NAME"
echo ""

# Check if MySQL is running
echo "🔍 Checking if MySQL is running..."
if ! mysqladmin ping -h"$DB_HOST" --silent 2>/dev/null; then
    echo "❌ MySQL is not running. Please start MySQL service first."
    echo "   On macOS: brew services start mysql"
    echo "   Or: sudo systemctl start mysql"
    exit 1
fi

echo "✅ MySQL is running!"
echo ""

# Create database if it doesn't exist
echo "🏗️  Creating database '$DB_NAME' if it doesn't exist..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || {
    echo "⚠️  Could not create database with root user. Trying with existing credentials..."
}

# Test connection with configured credentials (empty user/password)
echo "🔗 Testing database connection with configured credentials..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection successful!"
    echo ""
    echo "🎉 Database setup completed successfully!"
    echo "   You can now run: npm run dev"
else
    echo "❌ Database connection failed with empty credentials!"
    echo ""
    echo "🔧 Let's create a proper user for the application..."
    echo "   Creating user 'admin' with password 'admin123'..."
    
    # Create admin user
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -e "
    CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'admin123';
    GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'admin'@'localhost';
    FLUSH PRIVILEGES;
    " 2>/dev/null || {
        echo "⚠️  Could not create user. Please run manually:"
        echo "   mysql -u root -p"
        echo "   CREATE DATABASE IF NOT EXISTS $DB_NAME;"
        echo "   CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'admin123';"
        echo "   GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'admin'@'localhost';"
        echo "   FLUSH PRIVILEGES;"
        exit 1
    }
    
    echo "✅ Admin user created successfully!"
    echo ""
    echo "📝 Please update your .env file with these credentials:"
    echo "   DB_HOST=localhost"
    echo "   DB_PORT=3306"
    echo "   DB_USER=admin"
    echo "   DB_PASS=admin123"
    echo "   DB_NAME=$DB_NAME"
    echo ""
    echo "🎉 Then run: npm run dev"
fi
