#!/bin/zsh

###############################################################################
# Hisabify - Setup and Run Script
# 
# This script sets up the development environment and runs the application
# on localhost.
#
# Usage:
#   chmod +x setup-and-run.sh
#   ./setup-and-run.sh [command]
#
# Commands:
#   setup    - Initial setup (install dependencies, configure environment)
#   dev      - Start development server
#   build    - Build for production
#   preview  - Preview production build
#   lint     - Run linter
#   clean    - Clean node_modules and reinstall
#   help     - Show this help message
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="Hisabify"
DEV_PORT=8080
REQUIRED_NODE_VERSION="18.0.0"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                   ${PROJECT_NAME}                          ║"
    echo "║            Personal Finance Tracker                       ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo "${NC}"
}

print_success() {
    echo "${GREEN}✓ $1${NC}"
}

print_error() {
    echo "${RED}✗ $1${NC}"
}

print_warning() {
    echo "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo "${BLUE}ℹ $1${NC}"
}

print_step() {
    echo ""
    echo "${BLUE}▶ $1${NC}"
    echo "-----------------------------------------------------------"
}

###############################################################################
# Check Requirements
###############################################################################

check_requirements() {
    print_step "Checking system requirements"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js from https://nodejs.org/"
        print_info "Recommended: Use nvm (https://github.com/nvm-sh/nvm)"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    print_success "Node.js ${NODE_VERSION} is installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_success "npm ${NPM_VERSION} is installed"
    
    # Check if git is installed
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d ' ' -f 3)
        print_success "git ${GIT_VERSION} is installed"
    else
        print_warning "git is not installed (optional but recommended)"
    fi
}

###############################################################################
# Environment Setup
###############################################################################

setup_environment() {
    print_step "Setting up environment"
    
    # Check if .env exists
    if [ -f .env ]; then
        print_warning ".env file already exists"
        echo -n "Do you want to overwrite it? (y/N): "
        read answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi
    
    # Check if .env.example exists
    if [ ! -f .env.example ]; then
        print_error ".env.example not found"
        exit 1
    fi
    
    # Copy .env.example to .env
    cp .env.example .env
    print_success "Created .env from .env.example"
    
    print_warning "IMPORTANT: You need to configure your .env file with:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_PUBLISHABLE_KEY"
    echo "  - VITE_SUPABASE_PROJECT_ID"
    echo ""
    print_info "Get these values from your Supabase project dashboard"
    print_info "Visit: https://supabase.com/dashboard"
    echo ""
    
    echo -n "Do you want to open .env in your default editor now? (y/N): "
    read answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        ${EDITOR:-nano} .env
    fi
}

###############################################################################
# Install Dependencies
###############################################################################

install_dependencies() {
    print_step "Installing dependencies"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        print_info "node_modules directory exists"
        echo -n "Do you want to reinstall dependencies? (y/N): "
        read answer
        if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
            print_info "Skipping dependency installation"
            return
        fi
        print_info "Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    # Install dependencies
    print_info "This may take a few minutes..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

###############################################################################
# Validate Configuration
###############################################################################

validate_config() {
    print_step "Validating configuration"
    
    if [ ! -f .env ]; then
        print_error ".env file not found"
        print_info "Run './setup-and-run.sh setup' first"
        exit 1
    fi
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Check required environment variables
    MISSING_VARS=()
    
    if [ -z "$VITE_SUPABASE_URL" ]; then
        MISSING_VARS+=("VITE_SUPABASE_URL")
    fi
    
    if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
        MISSING_VARS+=("VITE_SUPABASE_PUBLISHABLE_KEY")
    fi
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        print_info "Please configure your .env file"
        exit 1
    fi
    
    print_success "Configuration is valid"
}

###############################################################################
# Check Port Availability
###############################################################################

check_port() {
    print_step "Checking port availability"
    
    if lsof -Pi :$DEV_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $DEV_PORT is already in use"
        print_info "Attempting to find and kill the process..."
        
        PID=$(lsof -ti:$DEV_PORT)
        if [ ! -z "$PID" ]; then
            echo -n "Kill process $PID on port $DEV_PORT? (y/N): "
            read answer
            if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
                kill -9 $PID
                print_success "Process killed"
            else
                print_error "Cannot start server - port is in use"
                exit 1
            fi
        fi
    else
        print_success "Port $DEV_PORT is available"
    fi
}

###############################################################################
# Main Commands
###############################################################################

cmd_setup() {
    print_header
    check_requirements
    setup_environment
    install_dependencies
    
    echo ""
    print_success "Setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Configure your .env file with Supabase credentials"
    echo "  2. Run './setup-and-run.sh dev' to start the development server"
    echo ""
}

cmd_dev() {
    print_header
    check_requirements
    
    # Check if node_modules exists, install if missing
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        install_dependencies
    fi

    validate_config
    check_port
    
    print_step "Starting development server"
    print_info "Server will be available at: http://localhost:$DEV_PORT"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    
    # Start the development server
    npm run dev
}

cmd_build() {
    print_header
    check_requirements
    validate_config
    
    print_step "Building for production"
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Build completed successfully"
        print_info "Build files are in the 'dist' directory"
    else
        print_error "Build failed"
        exit 1
    fi
}

cmd_preview() {
    print_header
    check_requirements
    
    if [ ! -d "dist" ]; then
        print_error "No build found. Run './setup-and-run.sh build' first"
        exit 1
    fi
    
    print_step "Starting preview server"
    print_info "Preview will be available at: http://localhost:4173"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    
    npm run preview
}

cmd_lint() {
    print_header
    check_requirements
    
    print_step "Running linter"
    npm run lint
    
    if [ $? -eq 0 ]; then
        print_success "No linting errors found"
    else
        print_warning "Linting issues found (see above)"
    fi
}

cmd_clean() {
    print_header
    
    print_step "Cleaning project"
    
    print_warning "This will remove:"
    echo "  - node_modules directory"
    echo "  - dist directory"
    echo "  - package-lock.json"
    echo ""
    echo -n "Are you sure you want to continue? (y/N): "
    read answer
    
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        print_info "Clean cancelled"
        exit 0
    fi
    
    print_info "Removing directories..."
    rm -rf node_modules dist package-lock.json
    
    print_success "Project cleaned"
    print_info "Run './setup-and-run.sh setup' to reinstall"
}

cmd_help() {
    print_header
    echo "Usage: ./setup-and-run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup    - Initial setup (install dependencies, configure environment)"
    echo "  dev      - Start development server on port $DEV_PORT"
    echo "  build    - Build for production"
    echo "  preview  - Preview production build"
    echo "  lint     - Run ESLint to check code quality"
    echo "  clean    - Clean node_modules and build files"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./setup-and-run.sh setup     # First time setup"
    echo "  ./setup-and-run.sh dev       # Start development server"
    echo "  ./setup-and-run.sh build     # Build for production"
    echo ""
    echo "For more information, see README.md"
}

###############################################################################
# Main Script Entry Point
###############################################################################

# Check if script is being run from project directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Parse command
COMMAND=${1:-help}

case $COMMAND in
    setup)
        cmd_setup
        ;;
    dev|start)
        cmd_dev
        ;;
    build)
        cmd_build
        ;;
    preview)
        cmd_preview
        ;;
    lint)
        cmd_lint
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        cmd_help
        exit 1
        ;;
esac

exit 0
