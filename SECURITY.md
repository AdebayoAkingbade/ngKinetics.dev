# Security Policy

Angular Motion is a client-side animation library. It does not authenticate
users, store secrets, process payments, or run a server runtime. Security work
therefore focuses on protecting applications that install it, the packages that
ship it, and the documentation/playground surfaces around it.

## Supported Versions

Until the first stable release, security fixes are made on `main` and released
with the next prerelease package. After `1.0.0`, supported release lines should
be documented here with explicit maintenance windows.

## Reporting Vulnerabilities

Please report suspected vulnerabilities privately through GitHub Security
Advisories for this repository. If private reporting is unavailable, open a
public issue with only a minimal impact summary and request a private channel;
do not include exploit details, proof-of-concept payloads, or information about
affected downstream applications in the public issue.

Useful reports include:

- affected package and version
- browser, Angular, Node, and package manager versions
- a minimal reproduction
- expected and observed behavior
- security impact and any preconditions

## Security Principles

- Keep runtime dependencies small and intentional.
- Keep browser-only APIs behind platform checks so SSR and hydration stay safe.
- Treat motion targets as developer-owned configuration, not trusted user input.
- Validate runtime style properties and values before writing to the DOM.
- Run tests, typecheck, lint, build, and production dependency audits before
  release.
- Prefer static documentation with no client JavaScript unless interactivity is
  required.
- Publish with provenance and least-privilege release credentials when package
  publishing is enabled.

## Non-Goals

Angular Motion is not a sanitizer, WAF, authentication layer, bot defense
system, or server authorization framework. Applications must still sanitize
untrusted content, enforce authorization on the server, and protect their own
data flows.
