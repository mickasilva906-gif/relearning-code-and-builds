# Life Quest

## Build the Windows app

Install Node.js LTS, Rust, and Microsoft C++ Build Tools with **Desktop development with C++** selected. Windows 10 and 11 include WebView2 by default. See the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) for details.

From this folder, run:

```powershell
npm install
npm run desktop:build
```

The NSIS installer is created under `src-tauri/target/release/bundle/nsis/`. Share the generated `.exe` with your laptop and run it to install Life Quest.

To launch the desktop app while developing, run `npm run desktop:dev`.

The desktop app stores its data in its own local WebView storage, separately from the browser version. Financial information remains unencrypted on the device. Spotify embeds and Alpha Vantage price updates need an internet connection.