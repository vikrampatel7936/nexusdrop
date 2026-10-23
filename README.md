# NexusDrop 🚀
### Your Own Local & Secure Zero-Loss File Sharing System
#### Works WITH a PC or WITHOUT a PC directly across Android & iPhone

**NexusDrop** is your own self-hosted, private file sharing application. It allows you to share original photos, 4K/8K videos, and documents between **Windows PC, Mac, Android, and iPhone** with **0% quality loss, original EXIF metadata retention, and bit-exact SHA-256 verification**.

---

## 🌟 How It Works

NexusDrop gives you two modes in one single codebase:

| Mode | Where It Runs | Best For |
|---|---|---|
| **Mode 1: PC Hub Mode** | On your Windows/Mac PC (`start.bat`) | Sharing between PC, iPhone, Android at home/office |
| **Mode 2: Mobile P2P Mode** | Directly inside mobile browsers (PWA) | Sharing **directly between Android & iPhone** with **NO PC** |

---

## 🖥️ Scenario 1: Using WITH PC (PC + Phones)

1. Double-click `start.bat` in this folder (or run `npm start`).
2. Your PC starts the local network server and opens `http://localhost:7788`.
3. Click **"Connect Phone"** to display the QR Code.
4. Scan the QR code with your iPhone or Android camera.
5. All devices appear on each other's live Radar screen!
6. Drag and drop any files to beam them at full Wi-Fi speed (50–100+ MB/s).

---

## 📱 Scenario 2: Using WITHOUT PC (Android ⇄ iPhone Direct)

To use your own app on mobile without keeping a PC turned on, you can run **NexusDrop Mobile P2P** (`mobile-p2p.html`):

### Step 1: Host it on Free GitHub Pages / Vercel (Takes 2 minutes)
Since the mobile mode runs 100% client-side using direct device-to-device **WebRTC DataChannels**, no backend server is needed to store your files:
1. Create a free GitHub repository (e.g. `nexusdrop`) and upload these files.
2. Go to repository **Settings** → **Pages** → select `main` branch → click **Save**.
3. You now have your own permanent personal link:
   `https://<your-username>.github.io/nexusdrop/mobile-p2p.html`

### Step 2: Install as an App on both Phones (PWA)
1. **On iPhone (Safari):** Open your URL → tap the **Share** button → tap **"Add to Home Screen"**.
2. **On Android (Chrome):** Open your URL → tap the **Three Dots (⋮)** → tap **"Install App"** (or "Add to Home screen").
3. Now both phones have your custom **NexusDrop** app icon on their home screens!

### Step 3: Beam Files Phone-to-Phone
1. Open the NexusDrop app on your iPhone and Android phone.
2. Phone 1 displays a pairing QR code.
3. Phone 2 scans the QR code with its camera.
4. An encrypted WebRTC link connects the two phones directly.
5. Pick any 4K video, RAW photo, or document:
   - Data streams **directly device-to-device** over local Wi-Fi or Personal Hotspot.
   - **Zero compression**: EXIF tags, camera details, timestamps, and full bit-exact resolution are 100% preserved.
   - Green **"✔ Bit-Exact SHA-256 Verified"** badge confirms identical binary bytes on arrival.

---

### Alternative: Run the Server on Android without Internet (Termux)
If you are traveling with no internet and no PC:
1. Install [Termux](https://termux.dev/) on your Android phone.
2. Run: `pkg install nodejs git` then `node server.js`.
3. Turn on Android Personal Hotspot and connect your iPhone.
4. Open `http://192.168.43.1:7788` on the iPhone Safari browser.
5. You now have your full NexusDrop server running on your Android phone with zero PC and zero internet!
