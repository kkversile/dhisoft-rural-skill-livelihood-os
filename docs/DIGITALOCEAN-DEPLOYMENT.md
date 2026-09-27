# DigitalOcean deployment preparation

Deployment is intentionally not executed by this task. The later target is the existing server reached by `ssh dvi-server`; it already has approximately 15 GiB RAM, 4 GiB swap and `vm.swappiness=10`. No server connection, deployment or Nginx change belongs in the local implementation phase.

## Intended topology

```text
public 80/443
      |
      v
existing Nginx configuration (preserve and extend deliberately)
      |
      +--> frontend :7000 (internal)
      +--> backend  :7006 (internal)
                    |
                    +--> PostgreSQL (persistent internal volume)
                    +--> Redis (internal, bounded memory)
                    +--> Redpanda (internal, persistent data)
                    +--> LocalStack/S3-compatible object storage (internal)
```

Only Nginx/HTTP/HTTPS should be public. Database, Redis, Kafka, SQS-compatible and object-storage ports remain on a private Docker network or loopback.

## Deployment preparation requirements

- bounded memory limits and `restart: unless-stopped` policies;
- persistent volumes for PostgreSQL, Redpanda, Redis where needed and object data;
- preflight checks for disk, memory, ports, secrets and existing containers;
- application/database backup before a change;
- build, start and readiness checks;
- rollback to the previous image/configuration if health fails;
- additive Nginx changes only after inspecting the existing configuration;
- no database reset, migration deletion or application-service restart outside the planned deployment window.

The deployment script must be reviewed and approved before execution. It is not a substitute for a backup or a tested rollback.
