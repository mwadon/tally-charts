# Security policy

## Supported versions

Security fixes go into the latest release line of `tally-charts` on npm (the `latest` dist-tag, and
`rc` while 1.0 is in prerelease). Older versions don't get backports.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub:
<https://github.com/mwadon/tally-charts/security/advisories/new>.

Include the affected version, what an attacker can do, and a minimal reproduction if you have one.
You should get a first answer within a week. Once a fix is released, the advisory is published and
credits you unless you ask otherwise.

## Scope

The library renders SVG and HTML from the data and props an application passes to it. It makes no
network requests and stores nothing. Reports about the published package and about the
documentation site in `apps/docs` are both welcome.
