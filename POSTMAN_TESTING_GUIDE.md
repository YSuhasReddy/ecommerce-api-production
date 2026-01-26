# Postman Testing Guide - E-commerce API

Complete guide for testing the production-ready e-commerce API using Postman.

---

## Quick Setup (2 Minutes)

### Step 1: Import the Collection

1. **Open Postman**
2. Click **Import** (top left)
3. Select **File** tab
4. Choose `postman-collection.json` from this directory
5. Click **Import**

### Step 2: Set Base URL (if needed)

The collection uses `http://localhost:5000` by default.

To change it:
1. Click on the collection name
2. Go to **Variables** tab
3. Update `baseUrl` to your server URL
4. Click **Save**

### Step 3: Start Testing!

Run "Get All Categories" first to auto-populate category IDs for other tests.

---

## Test Execution Order

### **Recommended Order for First-Time Testing:**

```
1. Health & Monitoring
Health Check 
Prometheus Metrics 
API Documentation 

2. Categories (Read-Only)
Get All Categories ← RUN THIS FIRST (sets categoryId variable)
Get Category by ID 

3. Products - CRUD Operations
Get All Products (Basic) 
Get Products with Limit 
Get Products by Category 
Create Product ← Sets productId variable
Get Product by ID 
Update Product 
Delete Product 

4. Security Tests (all should fail gracefully)
Test SQL Injection (Blocked) → 400
Test XSS in Product Name → 400
Test Malformed JSON → 400
Test Negative ID → 400

5. Validation Tests (all should return 400)
Test Zero Price (Rejected) → 400
Test Negative Stock (Rejected) → 400
Test Missing Required Fields → 400
Test Invalid Category ID → 400

6. Pagination Tests
Test Limit = 0 (Min 1) → Returns 1+ items
Test Limit > 100 (Max 100) → Returns ≤100 items
Test Invalid Cursor → 400
Test Cursor Beyond Dataset → hasMore: false

7. Rate Limiting Test
Normal Request → 200 (check headers)
```

---

## Key Features to Test

### 1. **Cursor-Based Pagination**

**Test:** Get Products with Limit
```
GET /api/products?limit=5

Response:
{
"success": true,
"data": [...],
"pagination": {
"cursor": 340, ← Use this for next page
"hasMore": true,
"limit": 5
},
"requestId": "uuid"
}
```

**Next Page:**
```
GET /api/products?cursor=340&limit=5
```

**What to verify:**
- Returns correct number of items
- Cursor value changes with each page
- `hasMore` becomes `false` on last page
- No duplicate items across pages

---

### 2. **Request ID Tracking**

Every response includes a unique `requestId`:

```json
{
"success": true,
"data": {...},
"requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Use this for:**
- Debugging specific requests
- Correlating with server logs
- Tracking errors in Sentry

**Check response headers:**
- `X-Request-ID`: Same UUID as in response body

---

### 3. **Security Headers (Helmet)**

**Check Response Headers** (in any request):

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
```

**What it protects against:**
- XSS attacks
- Clickjacking
- MIME type sniffing
- Protocol downgrade attacks

---

### 4. **Rate Limiting**

**Limit:** 100 requests per 15 minutes per IP

**Test:**
1. Make repeated requests to `/api/products?limit=1`
2. After ~100 requests, you'll get:

```json
{
"success": false,
"error": "Too many requests, please try again later",
"retryAfter": 897
}
HTTP Status: 429 Too Many Requests
```

**Check Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: <timestamp>
```

**Exempt Endpoints:**
- `/health` - For monitoring
- `/metrics` - For Prometheus

---

### 5. **Error Handling (No Stack Traces)**

**Test malformed JSON:**
```
POST /api/products
Body: {invalid json}

Response (400):
{
"success": false,
"error": "Invalid JSON format in request body",
"code": "INVALID_JSON",
"requestId": "uuid"
}
```

** No stack traces exposed**
** Clear error messages**
** Consistent error format**

---

### 6. **Input Validation**

All validation errors return **400 Bad Request** with descriptive messages:

**Example: Invalid Category**
```json
POST /api/products
{
"name": "Test",
"price": 10,
"category_id": 99999,
"stock": 5
}

Response (400):
{
"success": false,
"error": "Invalid category_id: category does not exist",
"code": "INVALID_CATEGORY",
"requestId": "uuid"
}
```

**Validation Rules:**
- `price` > 0
- `stock` ≥ 0
- `category_id` must exist
- `name` is required (1-255 chars)
- IDs must be positive integers

---

## Testing Specific Features

### **Test 1: Cursor Pagination Performance**

```javascript
// In Postman Pre-request Script:
pm.collectionVariables.set("startTime", Date.now());

// In Tests tab:
const elapsed = Date.now() - pm.collectionVariables.get("startTime");
console.log(`Response time: ${elapsed}ms`);
pm.test("Response time < 100ms", () => {
pm.expect(elapsed).to.be.below(100);
});
```

**Expected:** < 50ms for cached responses

---

### **Test 2: Cache Invalidation**

1. **GET** `/api/products/1` (cached)
2. **PUT** `/api/products/1` (updates product, invalidates cache)
3. **GET** `/api/products/1` (fresh data from DB)

**Verify:** Updated data returned immediately

---

### **Test 3: Concurrent Requests**

Use **Postman Runner**:

1. Select "Get All Products" request
2. Click **Run** → Set iterations to **10**
3. Enable **Delay: 0ms**
4. Click **Run**

**Expected:**
- All requests succeed (200 OK)
- No 500 errors
- Consistent data across requests

---

### **Test 4: Category Filtering**

```
1. GET /api/categories → Note category IDs
2. GET /api/products?category_id=<ID>&limit=10
3. Verify all returned products have that category_id
```

---

### **Test 5: Request ID Correlation**

1. Make any request
2. Note the `requestId` from response
3. Check server logs for that ID:
```bash
grep "550e8400-e29b-41d4-a716-446655440000" /tmp/server-clean.log
```

---

## Monitoring with Postman

### **Prometheus Metrics Endpoint**

```
GET /metrics

Returns (text/plain):
# HELP ecommerce_api_http_requests_total Total HTTP requests
# TYPE ecommerce_api_http_requests_total counter
ecommerce_api_http_requests_total{method="GET",route="/api/products",status="200"} 1523

# HELP ecommerce_api_http_request_duration_seconds HTTP request duration
# TYPE ecommerce_api_http_request_duration_seconds histogram
ecommerce_api_http_request_duration_seconds_bucket{le="0.005"} 1200
ecommerce_api_http_request_duration_seconds_bucket{le="0.01"} 1450
...
```

**Track:**
- Request counts per endpoint
- Response time distribution
- Database query performance
- Cache hit/miss ratios (if Redis enabled)

---

## Common Test Scenarios

### **Scenario 1: Create-Read-Update-Delete Flow**

```
1. POST /api/products → Save productId
2. GET /api/products/{productId} → Verify creation
3. PUT /api/products/{productId} → Update
4. GET /api/products/{productId} → Verify update
5. DELETE /api/products/{productId} → Remove
6. GET /api/products/{productId} → Should return 404
```

---

### **Scenario 2: Pagination Complete Flow**

```javascript
// Postman Tests Script:
let response = pm.response.json();
let products = [];

// Collect all pages
while (response.pagination.hasMore) {
products.push(...response.data);

// Get next page
pm.sendRequest({
url: pm.variables.get("baseUrl") +
"/api/products?cursor=" +
response.pagination.cursor +
"&limit=20",
method: "GET"
}, (err, res) => {
response = res.json();
});
}

console.log(`Total products: ${products.length}`);
```

---

### **Scenario 3: Security Penetration Testing**

Test all security vulnerabilities:

1. **SQL Injection**
```
GET /api/products/1' OR '1'='1
→ Should return 400
```

2. **XSS**
```
POST /api/products
Body: {"name": "<script>alert(1)</script>", ...}
→ Should return 400 or sanitize
```

3. **Buffer Overflow**
```
POST /api/products
Body: {"name": "A".repeat(10000), ...}
→ Should return 400
```

4. **Malformed JSON**
```
POST /api/products
Body: {invalid json}
→ Should return 400 (not 500!)
```

---

## What to Look For (Red Flags)

### **Bad Signs:**
- Stack traces in error responses
- 500 errors for invalid input
- Missing `requestId` in responses
- No rate limiting headers
- Slow response times (>100ms for simple queries)
- Inconsistent error formats

### **Good Signs:**
- All errors return proper status codes (400, 404, 429)
- Clean error messages without internal details
- Request IDs in every response
- Fast pagination (cursor-based)
- Rate limiting working correctly
- Security headers present

---

## Performance Benchmarks

| Operation | Expected Time | Status |
|-----------|--------------|--------|
| GET /health | < 10ms | |
| GET /api/products (cached) | < 20ms | |
| GET /api/products (uncached) | < 50ms | |
| POST /api/products | < 100ms | |
| Pagination (next page) | < 30ms | |

**Test:** Use Postman Runner with 50 iterations to measure average response times.

---

## Troubleshooting

### **Issue: All requests return 429**
**Solution:** Wait 15 minutes for rate limit to reset, or restart server

### **Issue: Category ID variable not set**
**Solution:** Run "Get All Categories" request first

### **Issue: Product creation fails with 400**
**Solution:** Ensure you've run "Get All Categories" to set valid category_id

### **Issue: Can't see response headers**
**Solution:** In Postman, click response body dropdown → select "Headers"

---

## Additional Resources

- **Swagger UI:** http://localhost:5000/api-docs
- **Health Endpoint:** http://localhost:5000/health
- **Metrics:** http://localhost:5000/metrics
- **Test Report:** See `TEST_REPORT.md` for comprehensive security analysis

---

## Complete Test Checklist

Use this to verify all features:

### Core Functionality
- [ ] Get all products
- [ ] Get product by ID
- [ ] Create product
- [ ] Update product
- [ ] Delete product
- [ ] Filter by category

### Pagination
- [ ] Cursor pagination works
- [ ] Limit enforcement (min 1, max 100)
- [ ] Invalid cursor returns 400
- [ ] End of dataset returns hasMore: false

### Security
- [ ] SQL injection blocked
- [ ] XSS input rejected
- [ ] Malformed JSON returns 400 (not 500)
- [ ] No stack traces in responses
- [ ] Security headers present

### Performance
- [ ] Response times < 100ms
- [ ] Concurrent requests handled
- [ ] Caching works (if Redis enabled)

### Monitoring
- [ ] Request ID in every response
- [ ] Health endpoint works
- [ ] Prometheus metrics available
- [ ] Rate limiting functional

---

## Pro Tips

1. **Use Collection Variables:** Auto-populate IDs between requests
2. **Write Tests:** Add assertions in the Tests tab
3. **Use Pre-request Scripts:** Set up dynamic data
4. **Run in Runner:** Test concurrent load with iterations
5. **Monitor Console:** Check for warnings/errors
6. **Export Results:** Save test runs for documentation

---

**Last Updated:** 2026-01-25
**API Version:** 1.0.0
**Test Coverage:** 100% of endpoints

**Happy Testing! **
