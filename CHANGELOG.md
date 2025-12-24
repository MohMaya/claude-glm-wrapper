# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-12-24

### 🚀 Major Rewrite (The "30x" Release)
This release is a complete reimagining of the project, rewriting the entire codebase from Bash/PowerShell to **Bun/TypeScript**.

### Added
- **Single Binary (`ccx`)**: Replaced 5+ wrapper scripts with a single, standalone executable. No dependencies required.
- **Interactive Setup (`ccx setup`)**: Beautiful CLI wizard to configure keys and aliases safely.
- **Self-Healing Diagnostics (`ccx doctor`)**: Checks for API keys, Claude installation, shell paths, and configuration health.
- **Auto-Discovery**: Automatically detects API keys (`ZAI_API_KEY`, `OPENAI_API_KEY`, etc.) from your environment.
- **Smart Proxy**: `ccx` acts as a transparent proxy for OpenAI, Gemini, Minimax, and GLM models.
- **Port Hunting**: Automatically finds an available port if 17870 is busy.
- **Binary Hunting**: Robustly locates the `claude` binary in standard locations (Homebrew, NVM, npm global) even if it's missing from PATH.
- **PowerShell Integration**: Native support for PowerShell profiles and aliases.

### Changed
- **Renamed**: Project package name changed to `cc-x10ded`.
- **Runtime**: Switched from Node.js to **Bun** for instant startup performance.
- **Config**: Moved from hardcoded script variables to `~/.config/claude-glm/config.json`.
- **Proxy**: Migrated from Fastify to `Bun.serve()` for lower latency streaming.

### Removed
- Removed legacy `install.sh` and `install.ps1` scripts.
- Removed dependency on user having Node.js installed (for binary usage).

## [Unreleased]

### Added
- GLM-4.7 model support as new default
- GLM-4.6 wrapper (ccg46) for backward compatibility

### Changed
- Updated default model from GLM-4.6 to GLM-4.7

## [1.0.3] - 2025-10-01

### Changed
- Removed global installation support - npx only
- Updated preinstall script to block ALL installation methods (local and global)
- Clearer error messaging emphasizing npx as the only supported method

## [1.0.2] - 2025-10-01

### Added
- Preinstall check to prevent incorrect installation method
- Error message directing users to use `npx` instead of `npm i`
- Support for global installation with `-g` flag

### Changed
- Installation now blocks when users try `npm i claude-glm-installer` locally
- Improved user guidance for correct installation method

## [1.0.1] - 2025-10-01

### Changed
- Updated package description to include npx usage instructions
- Clarified installation method in npm package listing

## [1.0.0] - 2025-10-01

### Added
- Windows PowerShell support with full feature parity
- Cross-platform npm package installer (`npx claude-glm-installer`)
- Automatic detection and cleanup of old wrapper installations
- GLM-4.6 model support as new default
- GLM-4.5 wrapper (ccg45) for backward compatibility
- Universal bootstrap script for OS auto-detection
- Comprehensive Windows documentation and troubleshooting
- Platform-specific installation paths and configuration
- Bash installer for Unix/Linux/macOS
- Support for GLM-4.5 and GLM-4.5-Air models
- Isolated configuration directories per model
- Shell aliases (ccg, ccg45, ccf, cc)
- No sudo/admin required installation
- Wrapper scripts in ~/.local/bin
- Z.AI API key integration
- Separate chat histories per model
- Error reporting system with GitHub issue integration
- Test mode for error reporting (`--test-error` flag)
- Debug mode (`--debug` flag)
- User consent prompts for error reporting

### Changed
- Updated default model from GLM-4.5 to GLM-4.6
- Renamed aliases: removed `cca`, kept `cc` for regular Claude
- Improved installation flow with old wrapper detection
- Enhanced README with collapsible platform-specific sections
- Updated cross-platform support documentation

### Fixed
- PATH conflicts when multiple wrapper installations exist
- Version mismatches from old wrapper files
- Installation detection across different locations
- PowerShell parsing errors when piping through `iex`
- Nested here-string issues in PowerShell
- Subexpression parsing errors in piped contexts
- Terminal/PowerShell window persistence after errors

[Unreleased]: https://github.com/JoeInnsp23/claude-glm-wrapper/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/JoeInnsp23/claude-glm-wrapper/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/JoeInnsp23/claude-glm-wrapper/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/JoeInnsp23/claude-glm-wrapper/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/JoeInnsp23/claude-glm-wrapper/releases/tag/v1.0.0
