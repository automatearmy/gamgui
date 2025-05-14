# Authorized Domains Fix

## Problem

Users with email addresses from the `gedu.demo.automatearmy.com` domain were unable to log in to the application, receiving the following error:

```
Login failed: Access denied: Your email domain is not authorized
```

## Root Cause

The application has a domain authorization check in the authentication process. The `AUTHORIZED_DOMAINS` environment variable was properly set in the local `.env` file but was not being passed to the Cloud Run service during deployment.

## Solution

We implemented the following fixes:

1. Created a script to update the existing Cloud Run service with the `AUTHORIZED_DOMAINS` environment variable:
   - `gamgui-app/gamgui-server/scripts/deployment/update-authorized-domains.sh`

2. Updated the `deploy-cloud-run.sh` script to include the `AUTHORIZED_DOMAINS` environment variable for future deployments.

3. Updated the Terraform configuration in `main.tf` to include the `AUTHORIZED_DOMAINS` environment variable for the server service.

## How to Apply the Fix

### Immediate Fix

To immediately fix the issue on the currently deployed service, run:

```bash
cd gamgui-app/gamgui-server/scripts/deployment
./update-authorized-domains.sh
```

This will update the Cloud Run service with the correct `AUTHORIZED_DOMAINS` environment variable without requiring a full redeployment.

### For Future Deployments

The fix is already incorporated into:

1. The `deploy-cloud-run.sh` script for direct Cloud Run deployments
2. The Terraform configuration for infrastructure-as-code deployments

## Verification

After applying the fix, users with email addresses from the `gedu.demo.automatearmy.com` domain should be able to log in successfully.

## Technical Details

The authentication check is implemented in the `isAuthorizedDomain` function in `gamgui-app/gamgui-server/middleware/auth.js`. This function checks if the user's email domain is included in the `AUTHORIZED_DOMAINS` environment variable.

```javascript
// List of authorized domains
const AUTHORIZED_DOMAINS = (process.env.AUTHORIZED_DOMAINS || 'automatearmy.com').split(',');

/**
 * Check if the user's email domain is authorized
 * @param {string} email - The user's email address
 * @returns {boolean} Whether the domain is authorized
 */
function isAuthorizedDomain(email) {
  if (!email) return false;
  
  const domain = email.split('@')[1];
  return AUTHORIZED_DOMAINS.includes(domain);
}
```

The fix ensures that both `automatearmy.com` and `gedu.demo.automatearmy.com` domains are included in the `AUTHORIZED_DOMAINS` environment variable.
