#!/usr/bin/env python3
"""Build a deterministic store ZIP from an explicit production-file allowlist."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXTENSION = ROOT / 'extension'
FILES = [
    'manifest.json', '_locales/pl/messages.json',
    'background.js', 'core.js', 'layout.js', 'post-controls.js', 'loading.js',
    'content.js', 'content.css', 'joined-data.js', 'popup.html', 'popup.js', 'popup.css',
    'privacy.html', 'privacy.css',
    'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png',
]


def build():
    manifest = json.loads((EXTENSION / 'manifest.json').read_text())
    package = json.loads((ROOT / 'package.json').read_text())
    assert manifest['version'] == package['version'], 'Package/manifest version mismatch'
    actual = {p.relative_to(EXTENSION).as_posix() for p in EXTENSION.rglob('*') if p.is_file() and p.name != '.DS_Store'}
    assert actual == set(FILES), f'Unexpected or missing production files: {actual.symmetric_difference(FILES)}'
    assert manifest['manifest_version'] == 3
    assert manifest['permissions'] == ['storage'], 'Review any permission changes before packaging'
    destination = ROOT / 'dist'
    destination.mkdir(exist_ok=True)
    output = destination / f'facebook-unhook-{manifest["version"]}-edge.zip'
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(FILES):
            source = EXTENSION / name
            assert not source.is_symlink(), f'Symlink not allowed: {name}'
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert 'manifest.json' in archive.namelist()
        assert set(archive.namelist()) == set(FILES)
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.zip.sha256').write_text(f'{checksum}  {output.name}\n')
    print(f'{output.relative_to(ROOT)}: {len(FILES)} files, {output.stat().st_size} bytes')
    print(f'SHA-256: {checksum}')


if __name__ == '__main__':
    build()
