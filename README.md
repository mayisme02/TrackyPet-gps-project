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

```bash
├── app
│   ├── _layout.tsx
│   ├── (auth)
│   │   ├── _layout.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Resetpassword.tsx
│   ├── (modals)
│   │   ├── _layout.tsx
│   │   ├── AddPet.tsx
│   │   ├── EditPet.tsx
│   │   ├── Editprofile.tsx
│   │   ├── PetDetail.tsx
│   │   ├── PetList.tsx
│   │   ├── PetMatch.tsx
│   │   ├── RouteHistory.tsx
│   │   ├── RouteHistoryList.tsx
│   │   └── RouteHistoryPet.tsx
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── devices.tsx
│   │   ├── home.tsx
│   │   ├── maps.tsx
│   │   ├── notification.tsx
│   │   └── profile.tsx
│   ├── index.tsx
│   └── log.tsx
├── app.json
├── assets
│   ├── constants
│   │   ├── api.ts
│   │   ├── breedData.ts
│   │   ├── Colors.ts
│   │   └── deviceData.ts
│   ├── fonts
│   │   ├── Fredoka-VariableFont.ttf
│   │   ├── Mitr-Bold.ttf
│   │   ├── Mitr-Light.ttf
│   │   ├── Mitr-Medium.ttf
│   │   ├── Mitr-Regular.ttf
│   │   ├── Mitr-SemiBold.ttf
│   │   └── SpaceMono-Regular.ttf
│   ├── images
│   │   ├── 01.png
│   │   ├── adaptive-icon.png
│   │   ├── clock.png
│   │   ├── destination.png
│   │   ├── favicon.png
│   │   ├── flag.png
│   │   ├── homecover.jpg
│   │   ├── icon.png
│   │   ├── location.png
│   │   ├── LogoApp.png
│   │   ├── partial-react-logo.png
│   │   ├── petcover.jpg
│   │   ├── react-logo.png
│   │   ├── react-logo@2x.png
│   │   ├── react-logo@3x.png
│   │   ├── splash-icon.png
│   │   ├── warning.png
│   │   └── way.png
│   └── styles
│       ├── addPet.styles.ts
│       ├── devices.styles.ts
│       ├── editPet.styles.ts
│       ├── editProfile.styles.ts
│       ├── home.styles.ts
│       ├── index.styles.ts
│       ├── login.styles.ts
│       ├── maps.styles.ts
│       ├── notification.styles.ts
│       ├── petDetail.styles.ts
│       ├── petList.styles.ts
│       ├── petMatch.styles.ts
│       ├── profile.styles.ts
│       ├── register.styles.ts
│       ├── resetPassword.styles.ts
│       ├── RouteHistory.styles.ts
│       ├── RouteHistoryList.styles.ts
│       └── RouteHistoryPet.styles.ts
├── babel.config.js
├── backend_tb
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── cloud
│   └── uploadToCloudinary.tsx
├── components
│   ├── ExternalLink.tsx
│   ├── ParallaxScrollView.tsx
│   ├── ProfileHeader.tsx
│   ├── ThemedView.tsx
│   └── ui
│       ├── IconSymbol.ios.tsx
│       ├── IconSymbol.tsx
│       ├── TabBarBackground.ios.tsx
│       └── TabBarBackground.tsx
├── eas.json
├── eslint.config.js
├── expo-env.d.ts
├── firebase
│   └── firebase.js
├── firebase.json
├── functions
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
├── hooks
│   ├── useColorScheme.ts
│   ├── useColorScheme.web.ts
│   ├── useNotificationBadge.ts
│   └── useThemeColor.ts
├── ios
│   ├── appiotpet
│   │   ├── AppDelegate.swift
│   │   ├── appiotpet-Bridging-Header.h
│   │   ├── appiotpet.entitlements
│   │   ├── Images.xcassets
│   │   ├── Info.plist
│   │   ├── PrivacyInfo.xcprivacy
│   │   ├── SplashScreen.storyboard
│   │   └── Supporting
│   ├── appiotpet.xcodeproj
│   │   ├── project.pbxproj
│   │   └── xcshareddata
│   ├── appiotpet.xcworkspace
│   │   ├── contents.xcworkspacedata
│   │   └── xcuserdata
│   ├── Podfile
│   ├── Podfile.lock
│   ├── Podfile.properties.json
│   ├── TrackyPeT
│   │   ├── Images.xcassets
│   │   └── Supporting
│   └── TrackyPeT.xcodeproj
│       ├── project.xcworkspace
│       └── xcshareddata
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
└── utils
    ├── alertService.ts
    └── pushNotifications.ts
```
