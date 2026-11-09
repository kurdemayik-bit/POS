# Custom distribution branding

This fork uses Posnic's public runtime brand hooks for the application name and logos, and keeps distribution artwork outside the source tree. The normal merchant name, outlet details, logo, and receipt layout stay in the merchant's own settings.

## Prepare a brand pack

Create a folder outside this repository containing:

- `brand.json` with `enabled: true` and a non-empty `name`.
- `brand-logo.png` for the main application mark.
- `brand-login-logo.png` for the sign-in screen. If omitted, the main logo is used there too.
- Optional `website` with an `http://` or `https://` URL. Leave it empty to omit a distributor URL from receipts.

Example:

```json
{
  "enabled": true,
  "name": "Your POS Name",
  "version": "custom-1",
  "website": ""
}
```

Each logo must be a PNG file no larger than 8 MB. The build fails before clearing the existing seed if the selected pack is missing or invalid.

## Select the pack for a build

The `prebuild` step empties the brand seed for a stock build. Set `POSNIC_BRAND_SEED_SOURCE` to a folder outside `builds/brand-seed` to stage one explicitly selected brand before packaging.

PowerShell:

```powershell
$env:POSNIC_BRAND_SEED_SOURCE = 'C:\path\to\your-brand'
npm run build
Remove-Item Env:POSNIC_BRAND_SEED_SOURCE
```

The seed contains only the descriptor and two logo files. Keep real brand artwork outside this public source tree unless you intend to release it as part of your fork.

## Receipt behavior

The merchant's branch or outlet identity remains the primary receipt identity. When its footer is enabled and the saved footer text is blank, a branded build prints a small `Powered by <distribution name>` line. A merchant's saved footer text continues to override that default. A custom distributor website is printed only when one is configured and the existing URL option is enabled. A stock build retains Posnic's existing default footer.

This change does not configure country-specific taxes, invoice numbering, legal wording, or mandatory receipt fields. Confirm those requirements for each target country before preparing a customer release.

## Release identity and source

The sample brand changes the runtime brand name and logos. It does not change the installer identifier, executable name, application icons, update URLs, or `package.json` product name; set those together after selecting the permanent product identity and upgrade path. Preserve the AGPL-3.0 notices and provide the corresponding modified source with customer installations as required by the license. Review every bundled dependency's separate license for the release being built.
