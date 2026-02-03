# LLM Moderation Analysis - Android Companion App

This is a React Native (Expo) app that monitors the content moderation benchmarks. It is configured to run on **Android** and iOS.

## Prerequisites

- **Node.js**
- **Android Studio** (for Emulator) OR **Expo Go** app on your Android device.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Ensure your **Web Dashboard** is running:
    The app fetches data from your local computer.
    Make sure to run the web app in a separate terminal:
    ```bash
    cd ../web
    npm run dev
    ```

3.  Run the App:
    ```bash
    npx expo start
    ```
    - Press `a` in the terminal to launch the **Android Emulator**.
    - OR Scan the QR code with the **Expo Go** app on your real Android phone.
    (Note: If using a real phone, your phone and computer must be on the same Wi-Fi).

## Architecture

- **Stack**: Expo Router, NativeWind (Tailwind), React Native.
- **Data**: Fetches raw CSV/JSON from the running web server.
- **Android Config**: configured to automatically use `10.0.2.2` to talk to localhost from the emulator.
