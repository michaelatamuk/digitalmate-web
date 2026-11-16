# Installing the native DigitalMate HAP on a HarmonyOS device

Status as of 2026-11-16: **installed and running on the phone and the 2-in-1
laptop.**

## Result

| Device | Type | OS | Install | Launch |
| --- | --- | --- | --- | --- |
| HBP-AL00 | `phone` | HarmonyOS 7.0.0.111, API 26 | ok | ok, ~650 ms cold start |
| HAD-W32 | `2in1` | HarmonyOS 7.0.0.115, API 26 | ok | ok, windowed desktop app |

- Signed HAP: `digitalmate\entry\build\default\outputs\default\entry-default-signed.hap`
  (43.9 MB)
- `hdc install -r` → `install bundle successfully` on both devices
- `hdc shell aa start -a EntryAbility -b com.jiuwen.digitalmate` →
  `start ability successfully` on both devices
- First screen on both: the native login gate
  (`登录 DigitalMate` / `使用华为账号登录` / `手机号登录`), which confirms the
  app is not account-free.
- On the 2-in-1 the app opens as a normal resizable desktop window with a
  title bar, not a stretched phone layout, and it appears in the dock.

The same UDID-whitelisted profile covers both devices, so one build serves the
phone and the laptop.

## What already works

- Project builds cleanly with DevEco 6.1.1.280:

  ```powershell
  $env:DEVECO_SDK_HOME='C:\Program Files\Huawei\DevEco Studio\sdk'
  $env:PATH='C:\Program Files\Huawei\DevEco Studio\tools\ohpm\bin;C:\Program Files\Huawei\DevEco Studio\tools\hvigor\bin;' + $env:PATH
  ohpm install --all
  hvigorw.bat assembleHap --mode module -p product=default --no-daemon
  ```

- Output: `digitalmate\entry\build\default\outputs\default\entry-default-unsigned.hap`
- Only `entry` is a HAP; `agent_core`, `cloud_adapter`, `file_service` and
  `ownedwebprobe` are HARs, so a single HAP install is enough.
- App declares `deviceTypes: phone, tablet, 2in1`, so the same HAP targets the
  phone and the 2-in-1 laptop.
- Test device: HBP-AL00, API 26 / HarmonyOS 7.0.0.111, visible to
  `hdc list targets`.

## Signing: what was missing and how it was fixed

`hdc install entry-default-unsigned.hap` failed with:

```text
error: code:9568320 error: no signature file.
```

The machine already had DevEco automatic-signing material, but it belonged to a
different app (`com.hopa.agent`), and a provisioning profile is bound to exactly
one bundle name. Reusing it was rejected by hvigor:

```text
00303074 Configuration Error
The bundleName in app.json5/hvigorfile.ts does not match the bundleName in the
generated SigningConfigs.
```

Fix used: **DevEco automatic signing** for this bundle. DevEco created fresh
material under `~/.ohos/config/default_DigitalMate_*.{p12,cer,p7b}` and wrote a
`signingConfigs` block into the project `build-profile.json5`. The generated
profile contains `bundle-name: com.jiuwen.digitalmate` and the phone's UDID in
`debug-info.device-ids`, which is what makes installation legal on a retail
HarmonyOS device. There is no self-signed path.

## Path A — DevEco automatic signing (recommended)

1. Open `C:\Workspace\openjiuwenothers\DigitalMate` in DevEco Studio.
2. Sign in with the Huawei ID that owns the AGC project.
3. **File → Project Structure → Signing Configs**.
4. Toggle **Automatically generate signature** (project product `default`).
5. Apply. DevEco creates a `signingConfigs` block in `build-profile.json5`.

Then build and install:

```powershell
hvigorw.bat assembleHap --mode module -p product=default --no-daemon
hdc install -r digitalmate\entry\build\default\outputs\default\entry-default-signed.hap
hdc shell aa start -a EntryAbility -b com.jiuwen.digitalmate
```

## Path B — profile from the AGC console (no IDE)

1. AGC → **Certificates, APP IDs and Profiles → Profile → Add**.
2. App: `com.jiuwen.digitalmate`, type **debug**, certificate: the existing
   debug certificate, devices: the phone's UDID
   (`hdc shell bm get --udid`).
3. Download the `.p7b` and point `build-profile.json5 → app.signingConfigs →
   material.profile` at it, keeping the existing cert/keystore paths.

Add the laptop UDID to the same profile when the 2-in-1 is connected
(`hdc shell bm get --udid`), then rebuild and install the same HAP. A brand-new
2-in-1 will not launch apps until its first-boot setup finishes: the log shows
`isAppConfigReady: false` and the OOBE trust-list check blocking the start.

## Notes

- The native app needs a Huawei account and a reachable cloud backend
  (`wss://onlineswarm.openjiuwen.com:20005/digitalmate/ws`); it is not
  account-free like the web app.
- `app_config.json` is generated from `app_config.example.json` on first build.
- `agconnect-services.json` is present and its client config validates.
