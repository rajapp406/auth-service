#!/bin/bash

# Function to generate a random string using OpenSSL
generate_secret() {
    openssl rand -base64 32
}

# Function to check if OpenSSL is installed
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        echo "Error: OpenSSL is not installed. Please install it first."
        exit 1
    fi
}

# Main execution
echo "Generating secure JWT secret key..."
check_openssl

# Generate the secret
SECRET=$(generate_secret)

echo -e "\nGenerated JWT secret key:"
echo "$SECRET"

echo -e "\nTo use this key:"
echo "1. Copy the key above"
echo "2. Update your .env file's JWT_SECRET with this value"
echo "3. Keep this key secure and never commit it to version control" 