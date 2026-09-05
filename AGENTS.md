# This repo is the webapp

`webapp/` (React + Vite, deployed to GitHub Pages) is the only product in this repo. There is no native/Expo app anymore.

# Protect user data in local storage

Before making any code change (bug fix, refactor, improvement, dependency bump, etc.), consider whether it could affect data already stored in the user's local storage (e.g. schema/shape changes, key renames, storage migrations, clearing/resetting storage, changing serialization format).

If there is any chance of data loss, corruption, or incompatibility with existing stored data, STOP and explicitly prompt the user about it before proceeding — describe what data is at risk and how. Do not silently make the change or bury the risk in a summary after the fact.

# Tag every issue fix

Every GitHub issue fix that gets committed and pushed to `main` must have a corresponding `v*.*.*` release tag (see `.github/workflows/deploy-webapp.yml`, which deploys on tag push). After pushing the fix commit(s):

- Create an annotated tag at that commit: `git tag -a vX.Y.Z <sha> -m "..."`, bumping the version from the latest existing tag (minor for a new feature, patch for a fix-only change — check with the user if ambiguous).
- Push it: `git push origin vX.Y.Z`.
- If several issue fixes land in a batch before tagging, one tag covering all of them at HEAD is fine — it doesn't need to be one tag per commit, just no fix left untagged.
