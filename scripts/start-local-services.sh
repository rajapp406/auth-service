#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    if lsof -i :$port > /dev/null; then
        echo -e "${GREEN}✓ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to start PostgreSQL
start_postgres() {
    echo -e "\n${YELLOW}Starting PostgreSQL...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if brew services list | grep postgresql@14 | grep started > /dev/null; then
            echo -e "${GREEN}PostgreSQL is already running${NC}"
        else
            brew services start postgresql@17
            # Wait for PostgreSQL to start
            sleep 5
        fi
    else
        # Linux
        if systemctl is-active --quiet postgresql; then
            echo -e "${GREEN}PostgreSQL is already running${NC}"
        else
            sudo systemctl start postgresql
            # Wait for PostgreSQL to start
            sleep 5
        fi
    fi
    
    # Grant necessary permissions to postgres user
    echo -e "\n${YELLOW}Setting up PostgreSQL permissions...${NC}"
    psql -U postgres -c "ALTER DATABASE auth_db OWNER TO postgres;" || echo -e "${YELLOW}Warning: Could not set owner of auth_db to postgres${NC}"
    psql -U postgres -d auth_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;" || echo -e "${YELLOW}Warning: Could not grant table privileges${NC}"
    psql -U postgres -d auth_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;" || echo -e "${YELLOW}Warning: Could not grant sequence privileges${NC}"
    psql -U postgres -d auth_db -c "GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;" || echo -e "${YELLOW}Warning: Could not grant database privileges${NC}"
    echo -e "${GREEN}PostgreSQL permissions updated${NC}"
}

# Function to start Redis
start_redis() {
    echo -e "\n${YELLOW}Starting Redis...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if brew services list | grep redis | grep started > /dev/null; then
            echo -e "${GREEN}Redis is already running${NC}"
        else
            brew services start redis
        fi
    else
        # Linux
        if systemctl is-active --quiet redis; then
            echo -e "${GREEN}Redis is already running${NC}"
        else
            sudo systemctl start redis
        fi
    fi
}

echo -e "${YELLOW}Checking services...${NC}"

# Check PostgreSQL
if ! check_service "PostgreSQL" 5432; then
    start_postgres
    sleep 2
    check_service "PostgreSQL" 5432
fi

# Check Redis
if ! check_service "Redis" 6379; then
    start_redis
    sleep 2
    check_service "Redis" 6379
fi

# Create PostgreSQL database if it doesn't exist
echo -e "\n${YELLOW}Setting up PostgreSQL database...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if psql -lqt | cut -d \| -f 1 | grep -qw auth_db; then
        echo -e "${GREEN}Database 'auth_db' already exists${NC}"
    else
        createdb auth_db
        echo -e "${GREEN}Created database 'auth_db'${NC}"
    fi
else
    # Linux
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw auth_db; then
        echo -e "${GREEN}Database 'auth_db' already exists${NC}"
    else
        sudo -u postgres createdb auth_db
        echo -e "${GREEN}Created database 'auth_db'${NC}"
    fi
fi

echo -e "\n${GREEN}All services are running!${NC}"
echo -e "${YELLOW}PostgreSQL:${NC} localhost:5432"
echo -e "${YELLOW}Redis:${NC} localhost:6379"
