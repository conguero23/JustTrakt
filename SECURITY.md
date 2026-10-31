# Security

Supported version: the latest GitHub release. Updates are manual for unpacked installs.

Do not post OAuth tokens, credentials, full local-storage dumps, or private account
data in issues. For a vulnerability, use the repository's **Security → Report a
vulnerability** feature if enabled. The maintainer must enable GitHub private
vulnerability reporting before public release. If it is unavailable, open a
minimal issue requesting a private contact channel without exploit details.

The extension has no remote-code loading, developer backend, or bundled client
secret. Its manifest `key` is a public key used only to keep unpacked extension
IDs stable; it is not a secret or signing private key.
