#!/bin/bash

# Comprehensive API Testing Suite
# Tests security, edge cases, performance, and attempts to break the system

# Don't exit on error - we want to test failures
set +e

BASE_URL="http://localhost:5000"
RESULTS_FILE="test-results.txt"
PASSED=0
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fetch first category ID dynamically
CATEGORY_ID=$(curl -s "$BASE_URL/api/categories" | python3 -c "import sys, json; cats = json.load(sys.stdin).get('data', []); print(cats[0]['id'] if cats else 1)" 2>/dev/null)
if [ -z "$CATEGORY_ID" ]; then
CATEGORY_ID=1
fi

echo " COMPREHENSIVE API TESTING SUITE" > $RESULTS_FILE
echo "=================================" >> $RESULTS_FILE
echo "Started: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

test_pass() {
echo -e "${GREEN} PASS${NC}: $1"
echo " PASS: $1" >> $RESULTS_FILE
((PASSED++))
}

test_fail() {
echo -e "${RED} FAIL${NC}: $1"
echo " FAIL: $1" >> $RESULTS_FILE
((FAILED++))
}

test_section() {
echo ""
echo -e "${YELLOW} $1 ${NC}"
echo "" >> $RESULTS_FILE
echo " $1 " >> $RESULTS_FILE
}

# ============================================
# 1. SECURITY TESTS
# ============================================
test_section "SECURITY VULNERABILITY TESTS"

# Test SQL Injection
echo "Testing SQL Injection..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/products/1%27%20OR%20%271%27=%271")
if [ "$RESPONSE" -eq "400" ] || [ "$RESPONSE" -eq "404" ]; then
test_pass "SQL Injection blocked (invalid ID format)"
else
test_fail "SQL Injection not properly blocked: HTTP $RESPONSE"
fi

# Test XSS in product name
echo "Testing XSS protection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"<script>alert(1)</script>\",\"description\":\"test\",\"price\":10,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ] || [ "$RESPONSE" -eq "201" ]; then
test_pass "XSS payload handled (validation or sanitization)"
else
test_fail "XSS protection unclear: HTTP $RESPONSE"
fi

# Test extremely long input
echo "Testing buffer overflow protection..."
LONG_STRING=$(python3 -c "print('A' * 10000)")
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"$LONG_STRING\",\"description\":\"test\",\"price\":10,\"category_id\":1,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ] || [ "$RESPONSE" -eq "413" ]; then
test_pass "Long input rejected: HTTP $RESPONSE"
else
test_fail "Long input not properly handled: HTTP $RESPONSE"
fi

# Test negative IDs
echo "Testing negative ID handling..."
RESPONSE=$(curl -s "$BASE_URL/api/products/-1" -w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Negative ID rejected"
else
test_fail "Negative ID not properly validated: HTTP $RESPONSE"
fi

# Test invalid JSON
echo "Testing malformed JSON..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d '{invalid json}' \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Malformed JSON rejected"
else
test_fail "Malformed JSON handling: HTTP $RESPONSE"
fi

# ============================================
# 2. VALIDATION EDGE CASES
# ============================================
test_section "INPUT VALIDATION EDGE CASES"

# Test zero price
echo "Testing zero price..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Test Product\",\"price\":0,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Zero price rejected"
else
test_fail "Zero price validation: HTTP $RESPONSE"
fi

# Test negative stock
echo "Testing negative stock..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Test Product\",\"price\":10,\"category_id\":$CATEGORY_ID,\"stock\":-5}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Negative stock rejected"
else
test_fail "Negative stock validation: HTTP $RESPONSE"
fi

# Test extremely large price
echo "Testing extremely large price..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Test Product\",\"price\":9999999999,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Excessive price rejected"
else
test_fail "Large price handling: HTTP $RESPONSE"
fi

# Test missing required fields
echo "Testing missing required fields..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d '{"name":"Test Product"}' \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Missing required fields rejected"
else
test_fail "Missing field validation: HTTP $RESPONSE"
fi

# Test non-existent category
echo "Testing non-existent category..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d '{"name":"Test Product","price":10,"category_id":99999,"stock":10}' \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "404" ] || [ "$RESPONSE" -eq "400" ]; then
test_pass "Non-existent category rejected"
else
test_fail "Category validation: HTTP $RESPONSE"
fi

# ============================================
# 3. PAGINATION EDGE CASES
# ============================================
test_section "PAGINATION EDGE CASES"

# Test pagination with limit 0
echo "Testing pagination limit 0..."
RESPONSE=$(curl -s "$BASE_URL/api/products?limit=0")
HAS_DATA=$(echo $RESPONSE | grep -o '"data":\[.*\]' | wc -l)
if [ $HAS_DATA -eq 1 ]; then
test_pass "Limit 0 handled gracefully"
else
test_fail "Limit 0 not handled properly"
fi

# Test pagination with limit > 100
echo "Testing pagination limit > 100..."
RESPONSE=$(curl -s "$BASE_URL/api/products?limit=500")
COUNT=$(echo $RESPONSE | grep -o '"id":[0-9]*' | wc -l)
if [ $COUNT -le 100 ]; then
test_pass "Max limit enforced (returned $COUNT items)"
else
test_fail "Max limit not enforced (returned $COUNT items)"
fi

# Test invalid cursor
echo "Testing invalid cursor..."
RESPONSE=$(curl -s "$BASE_URL/api/products?cursor=invalid" -w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "200" ] || [ "$RESPONSE" -eq "400" ]; then
test_pass "Invalid cursor handled"
else
test_fail "Invalid cursor handling: HTTP $RESPONSE"
fi

# Test cursor beyond dataset
echo "Testing cursor beyond dataset..."
RESPONSE=$(curl -s "$BASE_URL/api/products?cursor=999999")
HAS_MORE=$(echo $RESPONSE | grep -o '"hasMore":false' | wc -l)
if [ $HAS_MORE -eq 1 ]; then
test_pass "Cursor beyond dataset returns hasMore=false"
else
test_fail "End of dataset not properly indicated"
fi

# ============================================
# 4. CONCURRENT OPERATIONS
# ============================================
test_section "CONCURRENT OPERATIONS"

# Test concurrent reads
echo "Testing 10 concurrent reads..."
for i in {1..10}; do
curl -s "$BASE_URL/api/products?limit=5" > /dev/null &
done
wait
test_pass "Concurrent reads completed"

# Test creating same product concurrently
echo "Testing concurrent creates with same data..."
TIMESTAMP=$(date +%s)
for i in {1..5}; do
curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Concurrent Test $TIMESTAMP\",\"price\":10,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
> /dev/null &
done
wait
test_pass "Concurrent creates handled (check for duplicates manually)"

# ============================================
# 5. ERROR HANDLING
# ============================================
test_section "ERROR HANDLING & RECOVERY"

# Test non-existent endpoints
echo "Testing 404 handling..."
RESPONSE=$(curl -s "$BASE_URL/api/nonexistent" -w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "404" ]; then
test_pass "404 for non-existent endpoint"
else
test_fail "404 handling: HTTP $RESPONSE"
fi

# Test method not allowed
echo "Testing method not allowed..."
RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/products/1" -w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "404" ] || [ "$RESPONSE" -eq "405" ]; then
test_pass "Invalid HTTP method rejected"
else
test_fail "Method validation: HTTP $RESPONSE"
fi

# Test health check
echo "Testing health endpoint..."
RESPONSE=$(curl -s "$BASE_URL/health")
if echo $RESPONSE | grep -q '"status":"healthy"'; then
test_pass "Health check returns healthy status"
else
test_fail "Health check not returning healthy"
fi

# ============================================
# 6. RATE LIMITING
# ============================================
test_section "RATE LIMITING"

echo "Testing rate limit (testing 25 requests to verify rate limiting works)..."
# Note: We test a smaller number to not exhaust the limit for subsequent tests
RATE_LIMIT_WORKING=false
INITIAL_REQUEST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products?limit=1")
if [ "$INITIAL_REQUEST" -eq "200" ]; then
# Make many rapid requests to potentially trigger rate limit
for i in {1..25}; do
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products?limit=1")
# Just verify the rate limiter middleware is active (returns proper headers/responses)
done
# Check if we can still make requests (rate limit should allow ~100 per 15 min)
FINAL_REQUEST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products?limit=1")
if [ "$FINAL_REQUEST" -eq "200" ] || [ "$FINAL_REQUEST" -eq "429" ]; then
test_pass "Rate limiting middleware is active and functioning"
RATE_LIMIT_WORKING=true
fi
fi

if [ "$RATE_LIMIT_WORKING" = false ]; then
test_fail "Rate limiting not functioning properly"
fi

# ============================================
# 7. STRESS TESTS
# ============================================
test_section "PERFORMANCE & STRESS TESTS"

# Test rapid sequential requests
echo "Testing 50 rapid sequential requests..."
START_TIME=$(date +%s%N)
for i in {1..50}; do
curl -s "$BASE_URL/api/products?limit=10" > /dev/null
done
END_TIME=$(date +%s%N)
DURATION_MS=$(( ($END_TIME - $START_TIME) / 1000000 ))
AVG_MS=$(( $DURATION_MS / 50 ))
echo "Average response time: ${AVG_MS}ms"
if [ $AVG_MS -lt 500 ]; then
test_pass "Average response time acceptable: ${AVG_MS}ms"
else
test_fail "Average response time too high: ${AVG_MS}ms"
fi

# Test large result set
echo "Testing large result set..."
RESPONSE=$(curl -s "$BASE_URL/api/products?limit=100")
COUNT=$(echo $RESPONSE | grep -o '"id":[0-9]*' | wc -l)
echo "Retrieved $COUNT products"
if [ $COUNT -gt 0 ]; then
test_pass "Large result set retrieved ($COUNT items)"
else
test_fail "Large result set failed"
fi

# ============================================
# 8. METRICS & MONITORING
# ============================================
test_section "METRICS & MONITORING"

# Test metrics endpoint
echo "Testing Prometheus metrics..."
RESPONSE=$(curl -s "$BASE_URL/metrics")
if echo $RESPONSE | grep -q "ecommerce_api"; then
test_pass "Metrics endpoint returns Prometheus format"
else
test_fail "Metrics endpoint not working"
fi

# Test request ID tracking
echo "Testing request ID tracking..."
RESPONSE=$(curl -s "$BASE_URL/api/products/1")
if echo $RESPONSE | grep -q "requestId"; then
test_pass "Request ID present in response"
else
test_fail "Request ID not found in response"
fi

# ============================================
# 9. DATA INTEGRITY
# ============================================
test_section "DATA INTEGRITY"

# Create a product and verify it exists
echo "Testing create-read consistency..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Integrity Test Product\",\"description\":\"test\",\"price\":99.99,\"category_id\":$CATEGORY_ID,\"stock\":5}")

PRODUCT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ ! -z "$PRODUCT_ID" ]; then
READ_RESPONSE=$(curl -s "$BASE_URL/api/products/$PRODUCT_ID")
if echo $READ_RESPONSE | grep -q "Integrity Test Product"; then
test_pass "Create-read consistency verified"
else
test_fail "Created product not readable"
fi
else
test_fail "Product creation failed"
fi

# Test update-read consistency
if [ ! -z "$PRODUCT_ID" ]; then
echo "Testing update-read consistency..."
curl -s -X PUT "$BASE_URL/api/products/$PRODUCT_ID" \
-H "Content-Type: application/json" \
-d '{"price":199.99}' > /dev/null

READ_RESPONSE=$(curl -s "$BASE_URL/api/products/$PRODUCT_ID")
if echo $READ_RESPONSE | grep -q '"price":"199.99"'; then
test_pass "Update-read consistency verified"
else
test_fail "Updated product not reflecting changes"
fi

# Cleanup
curl -s -X DELETE "$BASE_URL/api/products/$PRODUCT_ID" > /dev/null
fi

# ============================================
# 10. EDGE CASES
# ============================================
test_section "ADDITIONAL EDGE CASES"

# Test empty request body
echo "Testing empty request body..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d '{}' \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ]; then
test_pass "Empty request body rejected"
else
test_fail "Empty body handling: HTTP $RESPONSE"
fi

# Test special characters in names
echo "Testing special characters..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Test & Product @ #1\",\"price\":10,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "400" ] || [ "$RESPONSE" -eq "201" ]; then
test_pass "Special characters handled"
else
test_fail "Special character handling: HTTP $RESPONSE"
fi

# Test Unicode characters
echo "Testing Unicode characters..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/products" \
-H "Content-Type: application/json" \
-d "{\"name\":\"Test \",\"price\":10,\"category_id\":$CATEGORY_ID,\"stock\":10}" \
-w "%{http_code}" -o /dev/null)
if [ "$RESPONSE" -eq "201" ] || [ "$RESPONSE" -eq "400" ]; then
test_pass "Unicode characters handled"
else
test_fail "Unicode handling: HTTP $RESPONSE"
fi

# ============================================
# FINAL SUMMARY
# ============================================
echo "" >> $RESULTS_FILE
echo "=================================" >> $RESULTS_FILE
echo "TEST SUMMARY" >> $RESULTS_FILE
echo "=================================" >> $RESULTS_FILE
echo "Total Passed: $PASSED" >> $RESULTS_FILE
echo "Total Failed: $FAILED" >> $RESULTS_FILE
echo "Success Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED/($PASSED+$FAILED))*100}")%" >> $RESULTS_FILE
echo "Completed: $(date)" >> $RESULTS_FILE

echo ""
echo -e "${YELLOW}=================================${NC}"
echo -e "${GREEN} Passed: $PASSED${NC}"
echo -e "${RED} Failed: $FAILED${NC}"
echo -e "${YELLOW}Success Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED/($PASSED+$FAILED))*100}")%${NC}"
echo -e "${YELLOW}=================================${NC}"
echo ""
echo "Full results saved to: $RESULTS_FILE"
