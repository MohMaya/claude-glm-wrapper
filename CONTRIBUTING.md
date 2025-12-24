# Contributing to Claude-GLM Wrapper

Thank you for your interest in contributing to Claude-GLM Wrapper! This is a community-maintained project, and we welcome contributions of all kinds.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding New Providers or Models](#adding-new-providers-or-models)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different experience levels

## How Can I Contribute?

There are many ways to contribute:

- 🐛 **Report bugs**: Found an issue? Let us know!
- 💡 **Suggest features**: Have an idea? We'd love to hear it!
- 📝 **Improve documentation**: Help make the docs clearer
- 🔧 **Fix bugs**: Submit pull requests for bug fixes
- ✨ **Add features**: Implement new providers or models
- 🧪 **Write tests**: Help improve test coverage
- 📢 **Spread the word**: Share the project with others

## Development Setup

### Prerequisites

- **Node.js** (v18+): Required for TypeScript compilation and running the proxy
- **Git**: For version control
- **Claude Code**: For testing the wrappers (optional but recommended)

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-glm-wrapper.git
   cd claude-glm-wrapper
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up your development environment**:
   - Create a `.env` file in `~/.claude-proxy/` for testing ccx proxy:
     ```bash
     mkdir -p ~/.claude-proxy
     # Add your API keys for testing
     ```

5. **Test your changes**:
   ```bash
   # Test the proxy locally
   npm run start:proxy
   
   # Test installation scripts (be careful - this will install!)
   bash install.sh --help
   ```

## Project Structure

```
claude-glm-wrapper/
├── adapters/              # Proxy adapters for different providers
│   ├── anthropic-gateway.ts  # Main Fastify server
│   ├── map.ts                # Provider/model parsing utilities
│   ├── types.ts              # TypeScript type definitions
│   ├── sse.ts                # SSE streaming utilities
│   └── providers/            # Provider-specific adapters
│       ├── anthropic-pass.ts # Anthropic-compatible pass-through
│       ├── gemini.ts         # Google Gemini adapter
│       ├── openai.ts         # OpenAI adapter
│       └── openrouter.ts     # OpenRouter adapter
├── bin/                   # Executable scripts
│   ├── cli.js             # Main CLI entry point
│   ├── ccx                 # Bash wrapper for ccx proxy
│   ├── ccx.ps1             # PowerShell wrapper for ccx proxy
│   └── preinstall.js       # Pre-install checks
├── install.sh              # Unix/Linux/macOS installer
├── install.ps1              # Windows PowerShell installer
├── README.md               # Main documentation
├── CONTRIBUTING.md         # This file
├── CHANGELOG.md            # Version history
├── package.json            # NPM package configuration
└── tsconfig.json           # TypeScript configuration
```

## Adding New Providers or Models

### Adding a New Provider

To add a new provider (e.g., a new AI service):

1. **Update type definitions** (`adapters/types.ts`):
   - Add the provider name to `ProviderKey` type union

2. **Update provider mapping** (`adapters/map.ts`):
   - Add provider to `PROVIDER_PREFIXES` array
   - Update `warnIfTools()` if the provider supports tools

3. **Create provider adapter** (`adapters/providers/`):
   - Create a new file (e.g., `newprovider.ts`)
   - Implement the adapter following existing patterns
   - Export a function that handles requests (similar to `chatOpenAI`, `chatGemini`, etc.)

4. **Add routing** (`adapters/anthropic-gateway.ts`):
   - Add routing logic in the `/v1/messages` endpoint
   - Validate API keys before routing
   - Handle errors appropriately

5. **Update installation scripts**:
   - Add provider configuration to `.env` templates in `bin/ccx` and `bin/ccx.ps1`
   - Update help text to include the new provider

6. **Update documentation**:
   - Add provider to README.md
   - Update examples and usage instructions

### Adding a New Model Variant

To add a new model variant (e.g., a new GLM version):

1. **Create wrapper function** in `install.sh` and `install.ps1`:
   - Follow the pattern of existing wrappers (`create_claude_glm_wrapper`, etc.)
   - Set appropriate environment variables
   - Use a unique config directory

2. **Add shell aliases**:
   - Update `create_shell_aliases()` in `install.sh`
   - Update `Add-PowerShellAliases()` in `install.ps1`

3. **Update documentation**:
   - Add to command table in README.md
   - Update examples and configuration sections

## Code Style Guidelines

### TypeScript

- Use **TypeScript** for all new code in `adapters/`
- Follow existing patterns and conventions
- Use explicit types (avoid `any` when possible)
- Add JSDoc comments for public functions

### Shell Scripts (Bash)

- Use `#!/bin/bash` shebang
- Follow existing indentation (4 spaces)
- Use meaningful variable names
- Add comments for complex logic
- Use `set -euo pipefail` for error handling

### PowerShell Scripts

- Use proper PowerShell conventions
- Follow existing indentation (4 spaces)
- Use meaningful variable names
- Add comments for complex logic
- Use `$ErrorActionPreference = "Stop"` for error handling

### General

- **Keep it simple**: Prefer clarity over cleverness
- **Be consistent**: Follow existing code patterns
- **Add comments**: Explain *why*, not *what*
- **Test your changes**: Make sure it works before submitting

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(minimax): add Minimax M2.1 model support

Add dedicated wrapper command (ccm) and ccx proxy integration
for Minimax M2.1 model. Follows same pattern as GLM models.

Closes #123
```

```
fix(installer): handle missing API keys gracefully

Previously, installer would fail if API key was not provided.
Now it shows a warning and continues with placeholder values.

Fixes #456
```

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Write clean, tested code
   - Follow code style guidelines
   - Update documentation as needed

3. **Test your changes**:
   - Test on your platform (macOS/Linux/Windows)
   - Verify installation scripts work
   - Test proxy functionality if applicable

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**:
   - Use a clear, descriptive title
   - Describe what changes you made and why
   - Reference any related issues
   - Add screenshots if applicable

7. **Respond to feedback**:
   - Be open to suggestions
   - Make requested changes promptly
   - Ask questions if something is unclear

### PR Checklist

Before submitting, make sure:

- [ ] Code follows project style guidelines
- [ ] Changes are tested on at least one platform
- [ ] Documentation is updated (README.md, etc.)
- [ ] Commit messages follow Conventional Commits
- [ ] No sensitive information (API keys, etc.) is committed
- [ ] Installation scripts work correctly
- [ ] Proxy functionality works (if applicable)

## Reporting Bugs

### Before Reporting

1. **Check existing issues**: Your bug might already be reported
2. **Test latest version**: Make sure you're on the latest code
3. **Gather information**: Collect error messages, logs, system info

### Bug Report Template

When creating a bug report, please include:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. See error

**Expected behavior**
What you expected to happen.

**Screenshots/Logs**
If applicable, add screenshots or error logs.

**Environment:**
- OS: [e.g., macOS 14.0, Windows 11, Ubuntu 22.04]
- Shell: [e.g., zsh, bash, PowerShell]
- Node.js version: [e.g., 18.17.0]
- Claude Code version: [if applicable]

**Additional context**
Any other relevant information.
```

## Suggesting Features

We welcome feature suggestions! When suggesting a feature:

1. **Check existing issues**: Your idea might already be discussed
2. **Be specific**: Describe the feature clearly
3. **Explain the use case**: Why would this be useful?
4. **Consider alternatives**: Are there workarounds?

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other relevant information.
```

## Documentation

Good documentation is crucial! When updating docs:

- **Be clear and concise**: Use simple language
- **Add examples**: Show, don't just tell
- **Keep it up to date**: Update docs when code changes
- **Test examples**: Make sure code examples work

### Documentation Files

- **README.md**: Main project documentation
- **CONTRIBUTING.md**: This file
- **CHANGELOG.md**: Version history and changes
- **Code comments**: Inline documentation for complex logic

## Testing

While we don't have formal test suites yet, please test your changes:

1. **Manual testing**: Test on your platform
2. **Cross-platform**: If possible, test on multiple platforms
3. **Edge cases**: Test error conditions and edge cases
4. **User workflows**: Test common user workflows

### Testing Checklist

- [ ] Installation works correctly
- [ ] Wrapper commands launch Claude Code
- [ ] API keys are handled securely
- [ ] Error messages are helpful
- [ ] Proxy routing works (if applicable)
- [ ] Documentation examples work

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and discussions
- **Pull Requests**: For code contributions

## Recognition

Contributors will be recognized in:
- `package.json` contributors field
- Release notes
- Project documentation

Thank you for contributing to Claude-GLM Wrapper! 🎉

