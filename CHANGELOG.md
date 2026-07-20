# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 1.1.0 - 2026-07-19

### Added

- Added every documented NPPES 2.1 query parameter and response field.
- Added raw success and error response types for consumers that preserve the upstream envelope.
- Added an exhaustive contract fixture checked against the CMS JSON conversion map and live response shapes.

### Fixed

- Corrected foreign and military address type codes and nullable taxonomy and identifier fields.

## 1.0.0 - 2026-07-19

### Added

- Added typed NPPES lookup, search, and bounded pagination.
- Added local NPI normalization and check-digit validation.
- Added timeouts, cancellation, transient-failure retries, and typed errors.
