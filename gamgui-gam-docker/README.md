# Docker GAM7

A Docker container with Google Apps Manager (GAM7) pre-installed for easy Google Workspace administration.

## Description

This Docker container provides a ready-to-use environment with GAM7 (Google Apps Manager) installed. GAM is a command-line tool for Google Workspace administrators that allows you to manage users, groups, and other Google Workspace resources.

## Prerequisites

- Docker installed on your system
- Google Workspace admin credentials
- OAuth credentials from Google Cloud Console

## Quick Start

1. First, ensure you have your GAM credentials ready. You'll need:
   - `client_secrets.json`
   - `oauth2.txt`
   - `oauth2service.json`

2. Run the container with your credentials mounted as volumes:

```bash
docker run -it \
  -v /path/to/your/credentials:/root/.gam \
  your-image-name
```

3. You can now run GAM commands inside the container:

```bash
gam info domain
gam print users
```

## Building the Image

To build the image yourself:

```bash
docker build -t docker-gam7 .
```

## Notes

- The container uses Debian 12 slim as the base image
- GAM7 is installed in the `/gam/gam7` directory
- The container runs with bash as the entrypoint for interactive use

## Security Note

Never commit your credential files to version control. Always mount them as volumes when running the container.

## License

This project is open source. GAM itself is licensed under Apache License 2.0.

## Links

- [GAM Project](https://github.com/GAM-team/GAM)
- [GAM Documentation](https://github.com/GAM-team/GAM/wiki)
