#!/bin/bash

# ============================================
# Environment Setup Script
# ============================================
# Helps configure .env file for different environments
# Usage: ./scripts/setup-env.sh [local|aws|staging|test]

set -e

ENVIRONMENT=${1:-local}
ENV_FILE=".env"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Ecommerce API - Environment Setup${NC}"
echo -e "${BLUE}================================================${NC}\n"

case $ENVIRONMENT in
local)
echo -e "${GREEN}Setting up LOCAL DEVELOPMENT environment...${NC}\n"

if [ -f "$ENV_FILE" ]; then
echo "Backing up existing .env to .env.backup"
cp "$ENV_FILE" ".env.backup"
fi

cp ".env.local" "$ENV_FILE"
echo -e "${GREEN} Created .env from .env.local${NC}"
echo -e "${GREEN} Ready for local development with Docker${NC}\n"

echo "Next steps:"
echo "1. Start Docker: docker-compose up -d"
echo "2. Start API: npm start"
echo "3. Test health: curl http://localhost:5000/health"
;;

aws)
echo -e "${RED}Setting up AWS PRODUCTION environment${NC}\n"
echo "WARNING: This configures production secrets!"
echo "Do NOT commit .env file with real credentials to git."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
echo "Cancelled."
exit 1
fi

cp ".env.aws" "$ENV_FILE"
echo -e "${GREEN} Created .env from .env.aws${NC}\n"

echo "Now configure these credentials:"
echo " - DB_PASSWORD: Your RDS master password"
echo " - DB_HOST: Your RDS endpoint"
echo " - CORS_ORIGIN: Your frontend domain"
echo ""

# Try to open editor
if [ -n "$EDITOR" ]; then
read -p "Open .env in editor? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
$EDITOR "$ENV_FILE"
fi
fi

echo -e "${GREEN} Remember to add to AWS Secrets Manager or CI/CD${NC}"
;;

staging)
echo -e "${BLUE}Setting up STAGING environment...${NC}\n"

cp ".env.aws" "$ENV_FILE"

# Modify for staging
sed -i.bak 's/NODE_ENV=production/NODE_ENV=staging/g' "$ENV_FILE"
sed -i.bak 's/LOG_LEVEL=WARN/LOG_LEVEL=INFO/g' "$ENV_FILE"
sed -i.bak 's/DB_POOL_MAX=50/DB_POOL_MAX=30/g' "$ENV_FILE"

echo -e "${GREEN} Created .env from .env.aws (staging optimized)${NC}\n"
echo "Configuration for staging:"
echo " - NODE_ENV: staging"
echo " - LOG_LEVEL: INFO"
echo " - DB_POOL_MAX: 30"
;;

test)
echo -e "${BLUE}Setting up TEST environment...${NC}\n"

cat > "$ENV_FILE" << 'EOF'
# Test Environment
DB_USER=postgres
DB_PASSWORD=testpass123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_test

DB_POOL_MAX=5
DB_POOL_MIN=1
DB_STATEMENT_TIMEOUT=10000
DB_QUERY_TIMEOUT=10000

NODE_ENV=test
PORT=5001
CORS_ORIGIN=http://localhost:3000

LOG_LEVEL=ERROR
SEED_ON_STARTUP=false

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000
EOF

echo -e "${GREEN} Created .env for testing${NC}\n"
echo "Test configuration ready"
;;

*)
echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}\n"
echo "Usage: ./scripts/setup-env.sh [local|aws|staging|test]"
echo ""
echo "Examples:"
echo " ./scripts/setup-env.sh local # Local development"
echo " ./scripts/setup-env.sh aws # AWS production"
echo " ./scripts/setup-env.sh staging # Staging environment"
echo " ./scripts/setup-env.sh test # Testing environment"
exit 1
;;
esac

echo ""
echo -e "${GREEN} Environment setup complete!${NC}"
echo ""
echo "Current .env configuration:"
echo " - NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
echo " - DB_HOST: $(grep DB_HOST .env | cut -d'=' -f2)"
echo " - LOG_LEVEL: $(grep LOG_LEVEL .env | cut -d'=' -f2)"
echo ""
echo "Review .env and adjust as needed."
