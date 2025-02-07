# Firebase Configuration

This directory contains all Firebase-related configuration files.

## Files

- `firebase.json` - Main Firebase configuration file
- `firestore.rules` - Firestore security rules
- `storage.rules` - Storage security rules
- `.firebaserc` - Firebase project configuration

## Environment Setup

1. Copy `.env.example` to `.env` in the root directory
2. Update the values in `.env` with your Firebase project settings
3. Run `firebase login` to authenticate with your Firebase account
4. Run `firebase use <project-id>` to set the active project 