# Use SQLite for Single Runtime Host State

Routely uses SQLite for MVP state because one Routely server session manages one runtime host. SQLite is enough for the app registry, recipes, domains, env metadata, runs, logs references, and bounded monitoring samples without introducing a distributed database before Routely supports multi-host operation.
