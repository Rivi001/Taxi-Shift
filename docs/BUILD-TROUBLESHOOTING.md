# Windows build troubleshooting

## Gradle reports “Unable to establish loopback connection”

On the release workstation, Microsoft JDK 21's Windows Unix-domain socket connection failed before Gradle could build the project. This process-local option made the JDK fall back to TCP for its internal pipe and allowed the build to proceed:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djdk.net.unixdomain.tmpdir=invalid:unix-socket-path'
npm run android:build
Remove-Item Env:JAVA_TOOL_OPTIONS
```

The intentionally unusable Unix socket directory is limited to this shell and its child processes. It does not change firewall settings or the Android app. If you already use `JAVA_TOOL_OPTIONS`, preserve and restore its original value instead of removing it. Most development machines should use the normal README build command first.

## First build takes a long time

The first Gradle run downloads its distribution and Android build dependencies. AGP can also install Build Tools 35 alongside the version 36 tools used for signature verification. Later builds reuse `.gradle-cache/` and `.android-tools/`. Windows packaging compresses Electron into the portable ZIP and installer separately.

Do not upload a release file while the packaging command is still writing it. Source, release downloads, and private signing keys have different destinations; `.signing/` must stay private.
