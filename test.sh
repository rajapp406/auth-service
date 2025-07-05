#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:3101/api"

# Function to make API calls and check responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local version=$4
    local expected_status=$5
    local auth_header=$6

    echo -e "\n${GREEN}Testing $method $endpoint (API $version)${NC}"
    
    if [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -X $method "$BASE_URL/$version$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_header" \
                -d "$data" \
                -w "\n%{http_code}")
        else
            response=$(curl -s -X $method "$BASE_URL/$version$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -w "\n%{http_code}")
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -X $method "$BASE_URL/$version$endpoint" \
                -H "Authorization: Bearer $auth_header" \
                -w "\n%{http_code}")
        else
            response=$(curl -s -X $method "$BASE_URL/$version$endpoint" \
                -w "\n%{http_code}")
        fi
    fi

    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ Status code $status_code matches expected $expected_status${NC}"
    else
        echo -e "${RED}✗ Status code $status_code does not match expected $expected_status${NC}"
    fi

    echo "Response:"
    echo "$response_body" | json_pp
}

echo -e "${GREEN}Starting API tests...${NC}"

# Test API version redirect
echo -e "\n${GREEN}Testing API version redirect${NC}"
curl -i "$BASE_URL"

# Test v1 endpoints
test_endpoint "POST" "/auth/register" '{"email":"test@example.com","password":"Password123!","firstName":"John","lastName":"Doe"}' "v1" 201

# Store tokens from registration
register_response=$(curl -s -X POST "$BASE_URL/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test2@example.com","password":"Password123!","firstName":"Jane","lastName":"Doe"}')

access_token=$(echo $register_response | jq -r '.data.tokens.accessToken')
refresh_token=$(echo $register_response | jq -r '.data.tokens.refreshToken')

# Test login
test_endpoint "POST" "/auth/login" '{"email":"test2@example.com","password":"Password123!"}' "v1" 200

# Test refresh token
test_endpoint "POST" "/auth/refresh" "{\"refreshToken\":\"$refresh_token\"}" "v1" 200 "$access_token"

# Test logout
test_endpoint "POST" "/auth/logout" "{\"refreshToken\":\"$refresh_token\"}" "v1" 200 "$access_token"

# Test v2 specific endpoints
test_endpoint "POST" "/auth/logout-all" "{}" "v2" 200 "$access_token"

echo -e "\n${GREEN}API tests completed${NC}" 