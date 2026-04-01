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
## IoT Module 

The system integrates an IoT-based tracking device to collect real-time GPS data and transmit it to the mobile application through cloud services. 

- ESP32-based development board: [LILYGO TTGO T-A7670E with GPS](https://lilygo.cc/products/t-sim-a7670e)
- Built-in GPS module
- 4G LTE connectivity (SIM-based)
- External battery power supply

### Device 
> The actual IoT device used in this project for real-time GPS tracking. 
<p> 
   <img width="273" height="640" src="https://github.com/user-attachments/assets/4bbe7e45-0e14-4eb2-afc4-379f1f48ccca" /> 
   <img width="220" height="570" src="https://github.com/user-attachments/assets/0e63a9c7-6b89-4b2f-acbe-74adc371eb68" /> 
</p> 

## Features

### 👤 User Management
- Register and create an account with username, phone number, email, and password  
- Secure login and logout functionality  
- View and update user profile information
  
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/700daeba-dedb-4a49-8bd0-0f30099e2107" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/d755f0c8-8462-4b21-a378-e7b6fb005806" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/646245b1-0800-4344-91e0-27ca337117bf" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/5d383313-e62d-4955-9142-0c20a461c955" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/eaf6a7dc-e33e-4a63-8845-8fa0425df6fc" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/dddf3ade-dfcb-4523-8758-ae2b4c7212a6" />
</p>

### 🐾 Pet Management
- Add multiple pets under a single user account  
- View, edit, and delete pet information  
- Manage pet profiles with detailed attributes

<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/eee9208a-ec61-4ad9-a3dc-979325dd11ac" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/e3f77b30-7b60-4d9d-8579-a59b4693617c" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/53fba087-9471-4879-b789-fc85a7611c6d" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/d995ed89-beea-4aee-8797-f56e3b983575" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/4016e304-62d9-40db-bc4f-3592f961ca54" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/a7aa432f-bace-4f35-9512-179786d55127" />

</p>

### 📡 IoT Device Integration
- Connect IoT devices using a unique device code  
- View device status and disconnect devices when needed

<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/2ccf6c24-465e-4eba-8e1c-84582f570b25" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/11145a01-9177-4951-99be-d72730c0217d" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/d5b8d109-c85d-4fb3-89e1-3c226664d393" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/75036ff1-6c2c-4231-8fca-fabe8f49c79a" />
</p>
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/cd5889ed-d5e7-4449-9e8f-71ae018701b1" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/3c3d0ca0-92ae-4128-a8e9-1799daf35a3c" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/2c5b6eee-74ed-46a3-bb67-d4bcfa825616" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/94736c52-9a01-442e-8d26-d57736d80c77" />
</p>

### 🔗 Device–Pet Mapping
- Link IoT devices with specific pets for tracking
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/0e765fd2-7e0a-4382-b8b2-1cf2e36d3dd9" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/79f92bef-6e66-45ba-9d58-a47faf94556e" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/b786bf9c-70ca-452e-a01b-743c6e21b02f" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/9d13d5ff-e8f4-46e1-aa06-183abbf28152" />
</p>
  
### 📍 Real-time Tracking
- Track pet location in real-time via interactive map  
- Display live GPS data from IoT device
<P>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/2f9e915a-ed8d-40d4-b7a5-bd99bc12c380" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/104d2983-ccaf-4721-8769-158576635c28" />

</P>

### 🚧 Geofencing & Alerts
- Define safe zones (geofence) for pets  
- Receive instant notifications when pets leave the defined area
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/4feb93c2-39d8-46dd-ac79-a6547ed505b9" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/ed4132eb-340b-434f-928e-9255fd941579" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/013dbed5-34db-4529-ab73-2146a8b264e8" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/84673cc0-fb6e-46bb-903e-5c1b7ebd83ab" />
</p>
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/25e9712d-c0cb-45c3-95d7-d4193d1d215f" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/3ed1b912-222f-4b72-b052-20f58035d014" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/d14b23ac-2e29-49ea-9209-e0e2ec2140e5" />
</p>

### 🗺️ Route Recording & History
- Start and stop route recording with customizable time range  
- Prevent device switching during active recording  
- View route history on map with playback visualization
- View total distance traveled by the pet  
- Track duration of movement  
- Monitor number of times the pet exits the safe zone
<p>
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/06fa5b3a-6919-4b56-a549-6fcedb7c7594" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/bc620e35-60cd-4538-b9ac-f515bbf65ce6" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/9821833d-264e-4489-8bc0-cbbef077ce54" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/b26658cc-0a54-4753-8a88-a639054814dd" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/a31f0342-256f-42bb-aced-c084e9d3d778" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/7b7aa294-5bfb-4b44-9ffa-0d549919d346" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/1b603093-cba2-4ab5-94da-b93c970caa5a" />
   <img width="173" height="371" alt="image" src="https://github.com/user-attachments/assets/20ed26d0-3f03-4c41-8c38-d1eb7cf917b6" />

</p>

## 👩‍💻 Authors

`May Manitchaya Thamanunpongsa`  
`Nui Sroithongthae Auinok`
> 🎓 Computer Science, College of Computing Khon Kaen University (2026)

**Connect with me on**
</br>

[![Github](https://img.shields.io/badge/-Github-000?style=flat&logo=Github&logoColor=white)](https://github.com/mayisme02 )
[![Linkedin](https://img.shields.io/badge/-LinkedIn-blue?style=flat&logo=Linkedin&logoColor=white)](www.linkedin.com/in/manitchaya-th-943ab73a9)
[![Gmail](https://img.shields.io/badge/-Gmail-c14438?style=flat&logo=Gmail&logoColor=white)](mailto:manitchaya.tha02@gmail.com)
