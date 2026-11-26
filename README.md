# Lunea – Realistischer Pillenblister & Zyklustracker

Eine mobil-optimierte Web-App (PWA) sowie fertige native **Android-** und **iOS-Projekte** (Capacitor) zum Tracken der Antibabypille und Periode – inklusive Profil-Erstellung, 4 interaktiven Blister-Designs (u. a. **Katzen-Versteck** & **Katzen-Napf** mit laufender Katze), Pillenwecker, Zykluskalender & Ratgeber.

---

## 1. Lokal im Browser / auf dem Handy testen

```bash
npm install
npm run dev
```

Öffne `http://localhost:5175` (oder im selben WLAN über die angezeigte Netzwerk-IP auf dem Smartphone). Auf dem iPhone lässt sich die Web-App in Safari über **Teilen → „Zum Home-Bildschirm“** sofort wie eine echte App nutzen.

---

## 2. Kostenlos fertige Android-APK & iOS-IPA in der Cloud bauen (ohne Mac & ohne App Store!)

Da die App nicht im App Store veröffentlicht werden soll, kannst du die fertige **`Lunea-Android.apk`** und die unsignierte **`Lunea-iOS-unsigned.ipa`** komplett kostenlos in der Cloud bauen lassen:

### Option A: GitHub Actions (komplett kostenlos, 1 Klick)
Der Workflow [`.github/workflows/build-apps.yml`](.github/workflows/build-apps.yml) ist bereits fertig eingerichtet:

1. Erstelle auf [github.com](https://github.com/new) ein neues Repository (am einfachsten **Public** für unbegrenzte kostenlose macOS-Build-Minuten, oder **Private** mit kostenlosem Monatskontingent).
2. Lade dieses Projekt hoch:
   ```bash
   git remote add origin https://github.com/<DEIN-NUTZERNAME>/<DEIN-REPO>.git
   git push -u origin main
   ```
3. Öffne auf GitHub den Reiter **Actions** → **„Build Lunea (Android APK & iOS IPA)“**.
4. Nach ca. 3–5 Minuten findest du unten unter **Artifacts** direkt zum Herunterladen:
   - **`Lunea-Android-APK`** → enthält `Lunea-Android.apk` (direkt auf Android installieren!)
   - **`Lunea-iOS-IPA`** → enthält `Lunea-iOS-unsigned.ipa` (für dein iPhone!)

### Option B: Codemagic (500 kostenlose Mac-M2-Minuten/Monat, auch für private Repos)
Die Datei [`codemagic.yaml`](codemagic.yaml) ist bereits enthalten:
1. Mit GitHub bei [codemagic.io](https://codemagic.io) anmelden (kostenloser Tarif).
2. Repository auswählen → Workflow **`lunea-ios-unsigned`** und/oder **`lunea-android-apk`** starten.
3. Fertige `.ipa` / `.apk` direkt herunterladen.

---

## 3. So installierst du die iOS-`.ipa` gratis auf deinem iPhone (Sideloading)

Ohne App Store und ohne 99-$-Apple-Developer-Account:
- **Sideloadly** (Windows/Mac, sehr einfach): iPhone per USB anschließen, `Lunea-iOS-unsigned.ipa` hineinziehen, mit normaler Apple-ID signieren → fertig!
- **AltStore / SideStore**: `Lunea-iOS-unsigned.ipa` direkt auf dem iPhone in AltStore/SideStore öffnen → installiert und erneuert sich auf Wunsch automatisch im WLAN.

*(Hinweis: Bei kostenlosen Apple-IDs müssen gesideloadete Apps alle 7 Tage kurz neu signiert werden – AltStore/SideStore erledigen das automatisch im Hintergrund.)*

---

## 4. Lokal auf einem Mac / Android Studio bauen (falls vorhanden)

```bash
npm run build
npx cap sync
npx cap open ios      # öffnet Xcode
npx cap open android  # öffnet Android Studio
```
