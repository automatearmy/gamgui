# Contributing to GAMGUI

Thanks for taking the time to contribute to GAMGUI!

We're excited to have you join our community of contributors helping to make Google IT administration easier and more secure.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Coding Standards](#coding-standards)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Ways to Contribute

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new features or improvements
- **Documentation**: Improve our docs, README, or code comments
- **Code**: Submit bug fixes or new features
- **Testing**: Help us improve test coverage
- **Community**: Help other users in discussions and issues

### Before You Start

1. Check existing [issues](https://github.com/automatearmy/gamgui/issues) and [pull requests](https://github.com/automatearmy/gamgui/pulls)
2. For major changes, please open an issue first to discuss your approach
3. Make sure you agree to license your contributions under our [License](LICENSE)

## Development Setup

### Prerequisites

- **Node.js** (>= 18.0.0) - for frontend development
- **Python** (>= 3.10) - for backend development
- **Docker** - for local development environment
- **Git** - for version control

### Project Structure

```
gamgui/
├── backend/         # Python FastAPI backend
├── frontend/        # React TypeScript frontend
├── infra/           # Terraform infrastructure
├── ci/              # CI/CD infrastructure
├── docker/          # Docker configurations
└── docs/            # Documentation assets
```

## Contributing Guidelines

### Branch Naming

Use descriptive branch names with prefixes:
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

Examples:
- `feature/user-authentication`
- `bugfix/session-timeout`
- `docs/api-documentation`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelog generation:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that don't affect code meaning (formatting, etc.)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat(auth): add Google OAuth integration
fix(session): resolve session timeout issues
docs(readme): update installation instructions
```

## Pull Request Process

1. **Create a Fork**: Fork the repository to your GitHub account
2. **Create a Branch**: Create a feature branch from `main`
3. **Make Changes**: Implement your changes with proper tests
4. **Test Locally**: Ensure all tests pass locally
5. **Commit**: Use conventional commit messages
6. **Push**: Push your branch to your fork
7. **Pull Request**: Create a PR with a clear description

### PR Requirements

- [ ] Clear description of changes
- [ ] Reference related issues (if applicable)
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated (if needed)
- [ ] Code follows our style guidelines
- [ ] All CI checks pass

### PR Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: PR gets approved by maintainers
5. **Merge**: We'll merge your contribution

## Issue Reporting

### Bug Reports

When reporting bugs, please include:
- **Environment**: OS, browser, versions
- **Steps to Reproduce**: Clear step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Logs**: Relevant error messages or logs

### Feature Requests

For feature requests, please include:
- **Problem**: What problem does this solve?
- **Solution**: Describe your proposed solution
- **Alternatives**: Any alternatives you've considered
- **Additional Context**: Mockups, examples, etc.

## Coding Standards

### Backend (Python)

- Use [Ruff](https://docs.astral.sh/ruff/) for linting and formatting
- Use type hints for better code documentation

**Run linting:**
```bash
cd backend
ruff check .
ruff format .
```

### Frontend (TypeScript/React)

- Follow our linting configuration
- Use TypeScript
- Use semantic HTML and accessible components

**Run linting:**
```bash
cd frontend
npm run lint
npm run lint:fix
```

### General Guidelines

- **Code Comments**: Explain why, not what
- **Function Size**: Keep functions small and focused
- **Variable Names**: Use descriptive names
- **Error Handling**: Always handle errors gracefully
- **Security**: Never commit secrets or sensitive data

## Community

### Getting Help

- **Email**: team@automatearmy.com
- **Discussions**: GitHub Discussions tab
- **Issues**: GitHub Issues for bugs and features

### Stay Connected

- **Star the repo** to show your support
- **Watch the repo** for updates
- **Fork the repo** to contribute

### Recognition

We value all contributions and maintain a [Contributors](https://github.com/automatearmy/gamgui/graphs/contributors) page. Notable contributors may be featured in our documentation and announcements.

---

## Thank You! 🙏

Every contribution, no matter how small, makes GAMGUI better for Google IT administrators worldwide. We appreciate your time and effort in helping us build better tools for the community.

**Questions?** Don't hesitate to reach out to us at team@automatearmy.com or open a discussion on GitHub.
