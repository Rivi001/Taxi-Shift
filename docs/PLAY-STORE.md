# Google Play submission

The Android App Bundle belongs in Play Console. The APK is for installing and testing on an Android device; the Windows installer is a separate distribution.

## Owner details still needed

- Developer/studio name and public support email.
- A stable public HTTPS URL hosting `privacy.html`. The same policy is included in the app.
- Your verified Play Console account and completed app-content declarations.
- Back up the generated upload key and its password securely before your first upload. They are excluded from Git and the development server.

## Listing assets

Use `store-assets/icon-512.png` for the Play icon and `store-assets/feature-graphic-1024x500.png` for the feature graphic. Use the genuine landscape gameplay captures in `store-assets/screenshots/` as phone screenshots. Listing text is in `store-assets/listing.md`.

## App-content answers to review

This version has no login, ads, analytics, location access, user-generated content, online interaction, or in-app purchases. Progress stays on the device. No application data is collected or shared by the packaged game. Confirm that these answers still match the exact build you upload; platform-managed Play diagnostics are separate. Complete the content-rating and age-audience questionnaires yourself; no legal/rating declarations have been submitted on your behalf.

## Release sequence

1. Install the APK on the Samsung S21 and test launch, both landscape rotations, gestures/notches, touch controls, fares, all races, garage, offline play, background/resume and save persistence.
2. Create the new Play app using `com.riviproj.taxishift`, choose Racing, and fill the listing and app-content sections.
3. Enroll in Play App Signing, upload the signed `.aab` to an internal testing release, and review Play's pre-launch report and device compatibility.
4. Complete any closed-testing requirement shown for your account before requesting production access.
5. Publish only after the physical-device checks and Play Console validation pass.

The bundle targets Android API 36. Store acceptance cannot be guaranteed before Play processes the upload. An emulator/browser screenshot is not proof of a physical-device test.

Official references checked 9 October 2026:
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.android.com/studio/publish/app-signing
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10787469
