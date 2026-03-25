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
```

## Features

### 👤 User Management
- Register and create an account with username, phone number, email, and password  
- Secure login and logout functionality  
- View and update user profile information  

### 🐾 Pet Management
- Add multiple pets under a single user account  
- View, edit, and delete pet information  
- Manage pet profiles with detailed attributes  

### 📡 IoT Device Integration
- Connect IoT devices using a unique device code  
- View device status and disconnect devices when needed  
- Link IoT devices with specific pets for tracking  

### 📍 Real-time Tracking
- Track pet location in real-time via interactive map  
- Display live GPS data from IoT device  

### 🗺️ Route Recording & History
- Start and stop route recording with customizable time range  
- Prevent device switching during active recording  
- View route history on map with playback visualization  

### 🚧 Geofencing & Alerts
- Define safe zones (geofence) for pets  
- Receive instant notifications when pets leave the defined area  

### 📊 Activity Analytics
- View total distance traveled by the pet  
- Track duration of movement  
- Monitor number of times the pet exits the safe zone

## Screenshots

<p>
   <img width="151" height="325" alt="image" src="https://github.com/user-attachments/assets/700daeba-dedb-4a49-8bd0-0f30099e2107" />

</p>
