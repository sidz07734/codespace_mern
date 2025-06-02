#!/bin/bash

# CodeSpace Backend Test Runner Script
# This script runs all tests with proper setup and teardown

echo "🧪 CodeSpace Backend Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MongoDB is required (for integration tests)
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB is not installed. Tests will use in-memory database.${NC}"
fi

# Check if Ollama is running (for AI tests)
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama is not running. AI analysis tests will be skipped.${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting first
echo -e "\n📝 Running ESLint..."
npm run lint
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Linting failed! Fix issues before running tests.${NC}"
    exit 1
fi

# Run tests based on argument
case "$1" in
    "unit")
        echo -e "\n🧪 Running unit tests only..."
        jest --testPathPattern="auth\.test\.js" --coverage
        ;;
    "integration")
        echo -e "\n🧪 Running integration tests..."
        jest --testPathPattern="(code|admin)\.test\.js" --coverage
        ;;
    "watch")
        echo -e "\n👀 Running tests in watch mode..."
        jest --watch
        ;;
    "coverage")
        echo -e "\n📊 Running all tests with coverage report..."
        jest --coverage --coverageReporters="text-summary"
        echo -e "\n📄 Detailed coverage report available at: coverage/lcov-report/index.html"
        ;;
    "ci")
        echo -e "\n🤖 Running tests in CI mode..."
        NODE_ENV=test jest --ci --coverage --maxWorkers=2
        ;;
    *)
        echo -e "\n🧪 Running all tests..."
        jest --runInBand
        ;;
esac

TEST_EXIT=$?

# Show results
if [ $TEST_EXIT -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed!${NC}"
fi

# Cleanup
echo -e "\n🧹 Cleaning up..."
# Kill any remaining test database connections
pkill -f "mongodb-memory-server" 2>/dev/null || true

echo -e "\n✨ Done!"
exit $TEST_EXIT