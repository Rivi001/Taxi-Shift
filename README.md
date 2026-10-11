# Taxi Shift

A playable 3D arcade taxi game set in the fictional coastal city of Sunbay. Built with JavaScript and Three.js, with keyboard and simultaneous touch controls.

## Install the Windows PC version

Download `Taxi-Shift-1.0.0-Windows-Setup.exe` from this repository's Releases once published, run the installer, and open **Taxi Shift** from the desktop or Start menu. Alternatively, extract the entire `Taxi-Shift-1.0.0-win-x64.zip` and run `Taxi Shift.exe`. Keep its accompanying files together. No Node.js or server is needed to play. This build is for 64-bit Windows and requires working graphics acceleration. It has no commercial publisher certificate, so Windows may show an unknown-publisher warning; install only a release you trust. F11 toggles fullscreen. Uninstall through Windows Settings → Apps.

## Install the Android version

Download `Taxi-Shift-1.0.0.apk` from Releases once published, open it on your phone, and tap Install. If Android asks, allow your file manager to install this app; you can revoke that permission afterward. Open **Taxi Shift**: it launches in landscape with touch controls. Android 7.0/API 24+, System WebView 100+, and WebGL 2 graphics support are required. Update Chrome and Android System WebView if startup fails.

The packaged game works offline without nginx/ngrok. The `.aab` is for Google Play Console, not direct installation. Android back closes a menu, pauses gameplay, then exits when pressed while paused. Saves stay on the device; uninstalling or clearing app data can erase progress. Switching between a sideloaded APK and a Play-signed installation may require uninstalling because their signing certificates differ.

## Play locally from source

With Node.js installed, double-click **Start Game.cmd**, then open **http://localhost:5173**.

Alternatively:

```sh
npm install
npm run dev
```

Use Node.js 22 or newer and `npm ci` for a reproducible installation. For phone testing, connect the phone and computer to the same Wi-Fi network and open `http://<computer-LAN-IP>:5173` on the phone. Allow the Node server through the Windows firewall if needed. The server listens on all network interfaces. Mobile play is landscape-only; portrait displays a rotate prompt and pauses gameplay.

The game detects touch capability automatically, including tablets using a desktop browser identity. Phones and tablets get labeled steering/pedal controls, a touch-friendly menu, and space for screen notches. The ☰ menu includes help, sound, camera switching, recovery, and full screen when supported. Menus pause the drive and hide the pedals; interrupted touches release their controls. Desktop keyboard controls stay available. Keep the computer and development server running for local Wi-Fi play; localhost links only work on the computer running the server.

If a phone shows a blank page, open `diagnostics.html` on the same host. This standalone page tests JavaScript, WebGL 2 rendering, storage, and game asset responses without starting the city. Results stay on the device unless you copy and share them. If the public diagnostic is blank too, compare it with the direct Wi-Fi address to isolate the tunnel from the game. The game displays module/startup failures with a link to this diagnostic, and external fonts load optionally so they cannot block its first screen.

## Gameplay

- Start in the City Cab. Accept a passenger fare, follow the yellow street route, and stop within the glowing zone for one second below 10 km/h. Repeat at the drop-off location to earn the fare.
- Complete a trip without a collision for a 20% smooth-driving bonus.
- Unlock three additional vehicles: Metro Sport ($650), Trail Nomad ($1,200), and Comet GT ($2,200). Each has different speed, acceleration, and handling.
- Customize paint, classic/sport wheels, and a racing stripe in the garage. Customization is free and applies to your selected vehicle; the style is shared across the fleet.
- Enter three timed checkpoint races. Wide purple gates sit on straight road sections, at least 30 metres from intersections. Gold road arrows, roadside signs, and a turn-distance HUD guide the bends. Drive through gates at speed; stopping is only required for passenger jobs. Complete the course within its target time for a cash reward. Best times save locally. Finish an active fare before racing.
- The circular, north-up radar follows your car and pins distant destinations to its edge. It previews the route beyond your next race gate so upcoming turns are visible early.
- Normal top speeds are 166 km/h (City Cab), 202 km/h (Metro Sport), 187 km/h (Trail Nomad), and 248 km/h (Comet GT), with temporary boost available. Slow before bends; stronger brakes help shed speed.
- Hold the handbrake through a bend to break traction: the tail swings out into a slide with tyre smoke, fading skid marks, a leaning camera, and a drift score that keeps counting until the tyres grip again.
- The race view uses a slim timer/gate strip in the upper-left, with turn guidance underneath. The large shift panel and floating checkpoint labels stay hidden during races so the road remains visible.
- Original die-cast-inspired cars have sculpted body panels, open wheel arches, glossy metallic paint, reflective glass, chrome rims, brake discs, grilles, splitters, and diffusers. Each vehicle has its own silhouette. The cartoon city and passengers retain their illustrated look. Garage thumbnails render the actual vehicle and customization.
- Explore a connected street grid, two parks, coastal promenade, marina, and different city districts. Buildings have collision boundaries and traffic reacts to bumps. Traffic is simple arcade scenery and does not obey a full traffic-light simulation.
- Earnings, completed trips, unlocks, current car, customization, and race records save to browser storage on the current device. Active trips and races restart when you reload. There are no accounts, cloud saves, or multiplayer in this prototype.

## Controls

| Control | Action |
| --- | --- |
| W / Up | Accelerate |
| S / Down | Brake, then reverse |
| A D / Left Right | Steer |
| Space | Handbrake; hold it into a bend to drift |
| Shift | Temporary boost; recharges when released |
| C | Chase / first-person driver camera |
| G | Garage |
| R | Recover to nearest road |
| P / Escape | Pause / resume; Escape closes open menus |

To drift, build up speed, hold the accelerator, steer into a bend, and hold Space (or the Drift button on mobile). Release the handbrake and straighten the steering to regain grip. S / Down or the ▼ pedal brakes normally. Touch buttons support steering and pedals at the same time. Optional engine sound is enabled with the music button on desktop. Opening menus pauses the simulation, including race timers. Switching away from the browser pauses automatically.

## Build and validation

```sh
npm test
npm run test:web
npm run build
```

The build creates a self-contained static game in `dist/`, including the Three.js runtime. Serve `dist/` with any static HTTP server. ES modules need HTTP; opening the HTML directly through `file://` is not supported. Google Fonts are cosmetic; system fallbacks work without them. No game assets depend on a CDN.

The browser test suite uses installed Microsoft Edge and a running dev server. Change `channel` in `playwright.config.mjs` to test another installed Chromium browser. Browser tests cover passenger stops/rewards, purchase gates, customization persistence, driving, camera views, pause, race rewards, touch input, and responsive layouts. Test-only state controls are enabled exclusively with `?test=1` on localhost.

## Build the Windows app

After `npm ci`, run `npm run build` and `npm run desktop` to test the standalone app. Run `npm run desktop:build` on Windows to generate the installer and portable ZIP in `release/windows/`.

## Build Android and prepare Google Play

App identity: **Taxi Shift**, **com.riviproj.taxishift**, version **1.0.0**. The native project is included. It uses Capacitor 8, JDK 21, Gradle 8.14.3 and Android SDK 36. On Windows:

```sh
npm ci
npm run android:tools
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-android-sdk.ps1
npm run android:key
npm run android:build
```

Review the SDK license prompts during setup. Alternatively, install JDK 21 and Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools yourself, then set `JAVA_HOME` and `ANDROID_HOME`. `npm run android:sync` copies updated web assets; `npx cap open android` opens Android Studio.

The release build creates `release/android/Taxi-Shift-1.0.0.apk` for direct installation and `release/android/Taxi-Shift-1.0.0.aab` for Play Console. **Back up the entire `.signing/` folder securely.** It contains your upload key and password; never commit, publish, or serve it. The key-generation script preserves existing keys. Restore the same signing folder on another build machine for updates. Increase Android `versionCode` with every Play upload and update version names/output filenames together.

Before store release, test the APK on the Samsung S21: offline launch, both landscape rotations, multi-touch, fares, races, customization, background/resume, persistence, frame rate and heat. Supply your public support contact and host `privacy.html` at a stable HTTPS URL. See [the Play Store checklist](docs/PLAY-STORE.md) and [listing text](store-assets/listing.md). A browser check does not replace physical-device testing or guarantee Play acceptance. No Play submission has been made.

## Repository and release distribution

Commit source, native Android project and Gradle wrapper, desktop entry point, lockfile, tests, store assets and documentation. Attach Windows installers/ZIP and Android APK/AAB to a repository Release rather than committing binaries. Generated builds, SDK downloads, dependencies and signing credentials are excluded by `.gitignore`. Public web hosting must serve only `dist/`, never the whole repository. Packaged builds remove external font requests and include all gameplay assets locally. Third-party notices are in `store-assets/THIRD-PARTY-NOTICES.txt`; the Windows distribution includes Electron/Chromium notices.

## Source layout

- `src/core.js`: driving physics, roads/navigation, missions, garage economy, and save validation.
- `src/world.js`: procedural city, lighting materials, passenger markers, and optimized traffic geometry.
- `src/models.js`: cartoon characters and rendered garage/passenger portraits.
- `src/vehicles.js`: sculpted vehicle geometry, automotive materials, wheels, and accessories.
- `src/navigation-visuals.js`: straightaway checkpoint gates and road/roadside turn arrows.
- `src/main.js`: 3D renderer, cameras, game loop, menus, touch/keyboard input, races, map, sound, and persistence.
- `style.css`: responsive game HUD and menus.
- `scripts/server.mjs`: local development server.
- `scripts/build.mjs`: static production build.
- `tests/`: gameplay and browser integration checks.
