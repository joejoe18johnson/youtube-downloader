#!/bin/bash

# GitHub Repository Setup Script
# Run this script to initialize Git and prepare for GitHub push

echo "🚀 Setting up GitHub repository..."
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if .git already exists
if [ -d ".git" ]; then
    echo "⚠️  Git repository already initialized in this folder"
    read -p "Do you want to continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    # Initialize Git repository
    echo "📦 Initializing Git repository..."
    git init
fi

# Add all files
echo "➕ Adding files to Git..."
git add .

# Check status
echo ""
echo "📋 Files to be committed:"
git status --short

# Ask for commit message
echo ""
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Initial commit: YouTube Downloader Web App"
fi

# Create initial commit
echo "💾 Creating commit..."
git commit -m "$commit_msg"

# Ask for GitHub repository URL
echo ""
echo "📝 Now you need to create a GitHub repository:"
echo "   1. Go to https://github.com"
echo "   2. Click '+' → 'New repository'"
echo "   3. Name it: youtube-downloader (or any name)"
echo "   4. DO NOT check any boxes (README, .gitignore, license)"
echo "   5. Click 'Create repository'"
echo "   6. Copy the repository URL"
echo ""
read -p "Paste your GitHub repository URL here: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Add remote
echo "🔗 Adding GitHub remote..."
git remote remove origin 2>/dev/null  # Remove if exists
git remote add origin "$repo_url"

# Rename branch to main
echo "🌿 Setting branch to main..."
git branch -M main

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
echo "   (You may be asked for your GitHub username and password/token)"
echo ""
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "   Visit your repository at: $repo_url"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "   1. Repository URL is correct"
    echo "   2. You have access to the repository"
    echo "   3. Use Personal Access Token instead of password"
    echo ""
    echo "See GITHUB_SETUP.md for detailed instructions."
fi


