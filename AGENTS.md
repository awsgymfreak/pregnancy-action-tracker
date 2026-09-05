# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Protect user data in local storage

Before making any code change (bug fix, refactor, improvement, dependency bump, etc.), consider whether it could affect data already stored in the user's local storage (e.g. schema/shape changes, key renames, storage migrations, clearing/resetting storage, changing serialization format).

If there is any chance of data loss, corruption, or incompatibility with existing stored data, STOP and explicitly prompt the user about it before proceeding — describe what data is at risk and how. Do not silently make the change or bury the risk in a summary after the fact.
