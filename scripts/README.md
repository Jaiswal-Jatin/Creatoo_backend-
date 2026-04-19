# Scripts Directory

इस folder में सभी utility scripts हैं जो database और system maintenance के लिए use होते हैं।

## 📋 Available Scripts

### Database Scripts

#### `setup_database.sh`
- **Purpose**: Database setup और initialization
- **Usage**: `npm run setup-db`
- **Description**: MySQL database create करता है और basic setup करता है

#### `sync-db.ts`
- **Purpose**: Database synchronization
- **Usage**: `npm run sync-db`
- **Description**: Database models को sync करता है

#### `recalculate-tiers.ts`
- **Purpose**: Visit tiers recalculate करना
- **Usage**: `npm run recalculate-tiers`
- **Description**: User visit tiers को重新 calculate करता है

### Maintenance Scripts

#### `clear-invalid-tokens.ts`
- **Purpose**: Invalid JWT tokens clear करना
- **Usage**: `npm run clear-invalid-tokens`
- **Description**: Database से expired या invalid tokens remove करता है

#### `diagnose-failed-notifications.ts`
- **Purpose**: Failed notifications diagnose करना
- **Usage**: `npm run diagnose-notifications`
- **Description**: Notification failures का analysis करता है

#### `inspect-schema.ts`
- **Purpose**: Database schema inspection
- **Usage**: `npm run inspect-schema`
- **Description**: Database schema को inspect करता है

### Testing Scripts

#### `test-payment-charges.sh`
- **Purpose**: Payment charges testing
- **Usage**: `npm run test-payment-charges`
- **Description**: Payment flow और charges को test करता है

## 🚀 How to Use

सभी scripts को npm के through run कर सकते हैं:

```bash
# Database setup
npm run setup-db

# Sync database
npm run sync-db

# Recalculate tiers
npm run recalculate-tiers

# Clear invalid tokens
npm run clear-invalid-tokens

# Diagnose notifications
npm run diagnose-notifications

# Inspect schema
npm run inspect-schema

# Test payment charges
npm run test-payment-charges
```

## ⚠️ Important Notes

- सभी scripts run करने से पहले `.env` file properly configure करें
- Production environment में scripts run करने से पहले backup लें
- कुछ scripts को admin privileges चाहिए हो सकते हैं

## 📁 File Structure

```
scripts/
├── README.md                    # यह file
├── setup_database.sh           # Database setup script
├── sync-db.ts                  # Database sync
├── recalculate-tiers.ts        # Tier recalculation
├── clear-invalid-tokens.ts     # Token cleanup
├── diagnose-failed-notifications.ts # Notification diagnostics
├── inspect-schema.ts           # Schema inspection
└── test-payment-charges.sh     # Payment testing
```
