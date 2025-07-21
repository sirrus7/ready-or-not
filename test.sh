# Test the previously failing test
npx vitest run --testNamePattern="should handle authentication failure" src/components/auth/__tests__/SSOProvider.test.tsx

# Test all authentication tests
npx vitest run --testNamePattern="Authentication Flow" src/components/auth/__tests__/SSOProvider.test.tsx

# Test the complete suite
npx vitest run src/components/auth/__tests__/SSOProvider.test.tsx