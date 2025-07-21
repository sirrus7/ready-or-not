# Test the previously failing URL token test
npx vitest run --testNamePattern="should detect and process token from URL" src/components/auth/__tests__/SSOProvider.test.tsx

# Test the previously failing permission test
npx vitest run --testNamePattern="should check permissions correctly" src/components/auth/__tests__/SSOProvider.test.tsx

# Test the complete suite - should now show 13/13 passing
npx vitest run src/components/auth/__tests__/SSOProvider.test.tsx

# Verify consistency with multiple runs
for i in {1..3}; do echo "🧪 Run #$i"; npx vitest run src/components/auth/__tests__/SSOProvider.test.tsx; done