#!/bin/bash

# Step-by-Step SSO Test Runner
# Tests each fix incrementally to ensure they work

set -e  # Exit on any error

echo "🚀 ITERATIVE SSO FIX TESTING"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

run_test() {
    local test_name="$1"
    local test_pattern="$2"
    
    echo -e "${BLUE}🔍 Testing: ${test_name}${NC}"
    echo "Pattern: ${test_pattern}"
    echo ""
    
    if npm test src/components/auth/__tests__/SSOProvider.test.tsx -t "$test_pattern" --run; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        echo ""
        return 1
    fi
}

echo "Step 1: Basic State Initialization"
echo "--------------------------------"
run_test "Initial state setup" "should initialize with default values"

echo "Step 2: Hook Error Handling"
echo "---------------------------"
run_test "Context validation" "should throw error when used outside provider"

echo "Step 3: Authentication Success"
echo "------------------------------"
run_test "Successful authentication" "should authenticate successfully with valid token"

echo "Step 4: Authentication Failure"
echo "------------------------------"
run_test "Failed authentication" "should handle authentication failure"

echo "Step 5: URL Token Processing"
echo "----------------------------"
run_test "URL token detection" "should detect and process token from URL"

echo "Step 6: Session Management"
echo "--------------------------"
run_test "Logout functionality" "should logout successfully"
run_test "Session restoration" "should validate saved session on refresh"

echo "Step 7: Permission System"
echo "------------------------"
run_test "Permission checks" "should check permissions correctly"
run_test "Unauthenticated permissions" "should return false for permissions when not authenticated"

echo "Step 8: Error Handling"
echo "----------------------"
run_test "Network error handling" "should handle authentication errors gracefully"
run_test "Error clearing" "should clear errors"

echo "Step 9: Session Storage"
echo "----------------------"
run_test "Session info retrieval" "should get session info correctly"
run_test "Corrupted data handling" "should handle corrupted session data"

echo ""
echo "🎯 FINAL VALIDATION"
echo "==================="
echo "Running all SSOProvider tests..."
echo ""

if npm test src/components/auth/__tests__/SSOProvider.test.tsx --run; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Phase 3 SSO Provider implementation is complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "- Run full test suite: npm test"
    echo "- Proceed to Phase 4: Global Game Loader Token Generation"
else
    echo -e "${RED}❌ Some tests are still failing${NC}"
    echo ""
    echo "Debug steps:"
    echo "1. Check that SSOProvider.tsx is updated with the fixed version"
    echo "2. Check that SSOProvider.test.tsx is updated with the fixed tests"
    echo "3. Verify that utils.test.ts file exists"
    echo "4. Run individual failing tests for detailed error messages"
fi
