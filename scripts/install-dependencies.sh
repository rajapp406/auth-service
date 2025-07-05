#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}Homebrew is already installed${NC}"
    echo -e "${YELLOW}Updating Homebrew...${NC}"
    brew update
fi

# Install PostgreSQL
echo -e "\n${YELLOW}Installing PostgreSQL...${NC}"
if brew list postgresql@14 &>/dev/null; then
    echo -e "${GREEN}PostgreSQL is already installed${NC}"
else
    brew install postgresql@14
    echo -e "${GREEN}PostgreSQL installed successfully${NC}"
fi

# Add PostgreSQL to PATH if not already added
if ! grep -q 'postgresql@14' ~/.zshrc; then
    echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
fi

# Install Redis
echo -e "\n${YELLOW}Installing Redis...${NC}"
if brew list redis &>/dev/null; then
    echo -e "${GREEN}Redis is already installed${NC}"
else
    brew install redis
    echo -e "${GREEN}Redis installed successfully${NC}"
fi

# Print installation status and next steps
echo -e "\n${GREEN}Installation completed!${NC}"
echo -e "\n${YELLOW}Installation Summary:${NC}"
echo -e "PostgreSQL: $(brew list postgresql@14 &>/dev/null && echo "${GREEN}Installed${NC}" || echo "${RED}Failed${NC}")"
echo -e "Redis: $(brew list redis &>/dev/null && echo "${GREEN}Installed${NC}" || echo "${RED}Failed${NC}")"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Start the services:"
echo -e "   ${GREEN}./scripts/start-local-services.sh${NC}"
echo -e "2. Verify services are running:"
echo -e "   ${GREEN}brew services list${NC}"
echo -e "3. Connect to PostgreSQL:"
echo -e "   ${GREEN}psql postgres${NC}"
echo -e "4. Connect to Redis:"
echo -e "   ${GREEN}redis-cli${NC}" 