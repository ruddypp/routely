# Use Compose as the Primary Runtime Model

Routely uses Docker Compose as the primary internal runtime model for managed apps and services, even when the user starts from a GitHub repo, local folder, Dockerfile, Node project, or manual recipe. This keeps the app model placement-neutral across local machines and VPS hosts, gives Routely one foundation for proxy routing, databases, logs, monitoring, and lifecycle controls, and follows Dokploy's operational shape without copying Dokploy internals.

**Consequences**

- Every supported runtime recipe must become an executable Compose-backed service definition before it is treated as ready.
- Local usage needs Docker available for the primary MVP path.
- Native command support can exist later as an explicit fallback, but it is not the primary MVP runtime.
