# 🐾 Tracky PeT - Mobile Application 
![CI](https://github.com/mayisme02/TrackyPet-gps-project/actions/workflows/main.yml/badge.svg)

Tracky PeT for mobile is a cross-platform application built in [React Native](https://reactnative.dev).

## Getting Started

Follow these instructions to build and run the project

### Prerequisites
- React Native `0.84`
- TypeScript `6.0.2`

> Tip: To ensure compatibility, use Node Version Manager (nvm) to manage Node.js versions and maintain a consistent React Native development environment.

### Setup React Native

A detailed guide for multiple platforms setup can be found [in the React Native installation guide](https://reactnative.dev/docs/environment-setup)

### Setup Project

- Clone this repository using `git clone https://github.com/mayisme02/TrackyPet-gps-project.git`.
- `cd` into `app-iot-pet`.

### Running the app

1. Install dependencies
   ```bash
   npm install

2. Start the development server
   ```bash
   npx expo start

3. Run the application

Scan the QR code using [Expo Go](https://expo.dev/go) on your mobile device (iOS/Android) Or press the following keys in the terminal

- i → Open iOS simulator
- a → Open Android emulator
- w → Open in web browser
  
Make sure your mobile device and computer are connected to the same network.

## Project Structure

```text
TrackyPet-gps-project/
├── app/                        # Main application screens using Expo Router
│   ├── (auth)/                 # Authentication screens
│   ├── (modals)/               # Modal screens
│   ├── (tabs)/                 # Bottom tab screens
│   ├── _layout.tsx
│   ├── index.tsx
│   └── log.tsx
├── assets/
│   ├── constants/              # Static constants and config values
│   ├── images/                 # App images and icons
│   ├── fonts/                  # Custom fonts
│   └── styles/                 # Screen-specific styles
├── backend_tb/                 # Node.js backend for ThingsBoard integration
│   ├── package.json
│   └── server.js
├── cloud/
│   └── uploadToCloudinary.tsx  # Cloudinary upload utility
├── components/                 # Reusable UI components
│   ├── ui/
│   └── ProfileHeader.tsx
├── firebase/
│   └── firebase.js             # Firebase configuration
├── functions/                  # Firebase Cloud Functions
│   ├── index.js
│   └── package.json
├── hooks/                      # Custom React hooks
├── ios/                        # Native iOS project files
├── utils/                      # Utility functions and notification services
├── package.json
├── app.json
├── eas.json
└── README.md
