# Contributing to OpenSecretary

Thank you for your interest in contributing to OpenSecretary! We welcome contributions from the community to help make this the best AI agent for Obsidian.

## Contributor License Agreement (CLA)

**Before submitting any contributions, you must agree to our [Contributor License Agreement (CLA)](CLA.md).**

By submitting a pull request, you agree to the terms of the CLA, which grants us the rights to use your contributions under both our open source (AGPLv3) and commercial licenses. This is necessary for our dual-licensing model.

**Key points:**
- Your GitHub username serves as your electronic signature
- You retain copyright to your contributions
- You grant us a perpetual, royalty-free license to use, modify, and relicense your work
- This enables us to offer the project under both AGPLv3 and commercial terms

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/open-secretary.git
   cd open-secretary
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start development build**:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

We strive for a clean, maintainable codebase.

- **No `any`**: Avoid using `any` types. Use proper interfaces and types.
- **No "Slop"**: Avoid excessive comments (internal monologue), redundant defensive checks, or dead code.
- **Linting**: Ensure your code passes linting checks (if configured).

### Copyright Headers

All source files must include the copyright header:

```typescript
/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */
```

### Pull Request Process

1. Create a new branch for your feature or fix: `git checkout -b feature/my-feature`
2. Ensure your code includes the copyright header
3. Commit your changes with clear, descriptive messages
4. Push to your fork and submit a Pull Request to the `main` branch
5. Describe your changes in detail in the PR description

**By submitting a PR, you confirm that:**
- You have read and agree to the [CLA](CLA.md)
- Your contribution is your original work (or you have rights to submit it)
- Your code includes the required copyright headers

## Reporting Bugs

If you find a bug, please open an issue on GitHub with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (Obsidian version, OS)

## Feature Requests

We welcome feature requests! Please open an issue describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## License

This project is dual-licensed:

- **Open Source**: [GNU AGPLv3](LICENSE) for community use
- **Commercial**: Contact [shane@mto.sh](mailto:shane@mto.sh) for proprietary use

By contributing, you agree that your contributions will be licensed under the same terms and may be included in both the open source and commercial versions of the project.
