#!/bin/bash

# Start the worker in the background
echo "Starting worker..."
npm run dev &
WORKER_PID=$!

# Wait for the worker to start
sleep 5

# Base URL for the API
API_URL="http://localhost:8787"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Running integration tests..."

# Function to check if a test passed
check_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo -e "${RED}✗ $1${NC}"
    kill $WORKER_PID
    exit 1
  fi
}

# Step 1: Create a new API key
echo "Creating new API key..."
CREATE_RESPONSE=$(curl -s -X POST $API_URL/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "owner": "test@example.com",
    "scopes": ["read:data", "write:data"]
  }')
check_result "Create API key"

# Extract the key ID and value from the response
KEY_ID=$(echo $CREATE_RESPONSE | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
API_KEY=$(echo $CREATE_RESPONSE | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')

echo "Created key ID: $KEY_ID"
echo "API key value: $API_KEY"

# Step 2: List all keys
echo "Listing all keys..."
curl -s $API_URL/keys | grep -q "$KEY_ID"
check_result "List keys"

# Step 3: Get specific key details
echo "Getting key details..."
curl -s $API_URL/keys/$KEY_ID | grep -q "Test API Key"
check_result "Get key details"

# Step 4: Validate the key
echo "Validating key..."
VALIDATE_RESPONSE=$(curl -s -X POST $API_URL/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"$API_KEY\",
    \"scopes\": [\"read:data\"]
  }")
echo $VALIDATE_RESPONSE | grep -q '"valid":true'
check_result "Validate key"

# Step 5: Validate with incorrect scope
echo "Validating key with incorrect scope..."
VALIDATE_RESPONSE=$(curl -s -X POST $API_URL/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"$API_KEY\",
    \"scopes\": [\"delete:data\"]
  }")
echo $VALIDATE_RESPONSE | grep -q '"valid":false'
check_result "Validate key with incorrect scope"

# Step 6: Revoke the key
echo "Revoking key..."
curl -s -X DELETE $API_URL/keys/$KEY_ID | grep -q "revoked successfully"
check_result "Revoke key"

# Step 7: Validate the revoked key
echo "Validating revoked key..."
VALIDATE_RESPONSE=$(curl -s -X POST $API_URL/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"$API_KEY\"
  }")
echo $VALIDATE_RESPONSE | grep -q '"valid":false'
check_result "Validate revoked key"

# All tests passed
echo -e "${GREEN}All integration tests passed!${NC}"

# Kill the worker process
kill $WORKER_PID || true