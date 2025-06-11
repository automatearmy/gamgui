# Frontend-Backend Middleware Architecture

## Overview

This backend serves as a middleware layer between the frontend and the Python API. Instead of duplicating routes in both the Python API and the frontend-backend, we now use a proxy middleware approach that forwards requests to the Python API.

## How It Works

1. The frontend makes requests to the frontend-backend at `/api/*` endpoints
2. The frontend-backend authenticates the request using Google Auth
3. The proxy middleware intercepts the request and forwards it to the corresponding Python API endpoint
4. The Python API processes the request and returns a response
5. The proxy middleware forwards the response back to the frontend

## Key Components

### Proxy Middleware (`utils/proxy-middleware.js`)

The proxy middleware is responsible for:

- Intercepting requests to `/api/*` endpoints
- Forwarding the request to the corresponding Python API endpoint
- Adding authentication headers
- Including user information in the request body when needed
- Forwarding the response back to the frontend

### Server Configuration (`server.js`)

The server is configured to:

- Use the proxy middleware for all API routes
- Apply authentication middleware to all API routes
- Handle auth routes separately (not proxied)
- Serve static files for the frontend

## Making API Calls

To make API calls from the frontend:

1. Import and use the API client from `/lib/api.js`
2. Use the same routes as defined in the Python API
3. The middleware will automatically handle authentication and forwarding
