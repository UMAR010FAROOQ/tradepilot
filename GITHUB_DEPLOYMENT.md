# GitHub Deployment Setup

Repository: `UMAR010FAROOQ/tradepilot`  
Firebase project and Hosting site: `tradepilot-3591a`

## 1. Add repository variables

Open GitHub → repository **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**. Add:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID` (`tradepilot-3591a`)
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FOREX_API_BASE_URL` (`https://tradepilot-forex-proxy.umarffcallback02.workers.dev`)
- `VITE_SUPPORT_EMAIL` (optional)

These are browser-visible configuration values, not server secrets. Do not add `TWELVE_DATA_API_KEY`.

## 2. Add the Firebase deployment secret

Use the Firebase-supported setup from the repository root:

```bash
firebase login
firebase init hosting:github
```

Select `UMAR010FAROOQ/tradepilot` and project `tradepilot-3591a`. The Firebase CLI creates/authorizes the Hosting deployment service account and stores its JSON as a GitHub Actions secret. Ensure the final secret name is exactly:

`FIREBASE_SERVICE_ACCOUNT_TRADEPILOT_3591A`

If the generated name differs, rename the secret in GitHub or update only the workflow reference. Never download the JSON into this repository, paste it into a workflow, or print it in logs.

## 3. Enable Actions and branch protection

In **Settings** → **Actions** → **General**, allow repository actions. In **Settings** → **Branches** (or Rulesets), protect `main` and require the `CI / validate` status check before merging. Require pull requests if desired.

## 4. Verify behavior

1. Push a branch and open a pull request; confirm CI runs lint, tests, and build.
2. Merge only after CI succeeds.
3. Confirm the main deployment workflow validates again and deploys the `live` Hosting channel.
4. Open `https://tradepilot-3591a.web.app` and verify the short build ID on Support.

The workflow deploys Hosting only. Deploy Firestore changes manually after reviewing them:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Preview decision

No pull-request preview workflow is included. Without a separate Firebase project, preview code would use production Authentication and Firestore. Add preview Hosting only after creating an isolated Firebase environment and separate repository variables.

## Cloudflare allowlist

Keep these origins allowed by the Forex Worker: `http://localhost:5173`, `https://tradepilot-3591a.web.app`, and optionally `https://tradepilot-3591a.firebaseapp.com`. No Worker change is performed by these workflows.

