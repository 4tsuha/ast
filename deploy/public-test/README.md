# Public test deployment

This deployment is a disposable, Internet-facing test instance. It is isolated from the
development/pasture stack by all of the following:

- Compose project: `activitypub-public-test`
- application image tag: `activitypub-server:public-test`
- Docker network: `activitypub-public-test-backend` (`172.30.40.0/24`)
- project-scoped PostgreSQL, MinIO, and ClamAV volumes
- host-only application listener: `127.0.0.1:2972`
- secret directory outside the repository: `/etc/mkdotnet-public-test`
- a deployment-specific certificate protecting the database-backed Data Protection key ring

It does not attach to `fediverse-pasture` and it does not reuse any pasture volume. The public
edge is the host nginx process, which terminates TLS and proxies only to the loopback listener.
The generated Vault token and Data Protection files are mode `0400`, owned by the numeric
non-root application UID, and stored beneath the root-only mode `0700` secret directory.

## Operations

```sh
sudo bash eng/public-test.sh init
sudo bash eng/public-test.sh config
sudo bash eng/public-test.sh install-nginx
sudo bash eng/public-test.sh up
sudo bash eng/public-test.sh verify
sudo bash eng/public-test.sh status
```

The first visit displays the Misskey-compatible initial administrator setup because ordinary
registration is disabled. Do not treat this Staging deployment as a production installation.
In particular, the bundled Vault runs in development mode and its transit state is ephemeral;
restarting or recreating it can make previously created actor keys unusable. Back up or retain
test data only for debugging, never as the authoritative instance record.

`down` removes the public-test containers and its dedicated network but deliberately preserves
all named volumes. It never removes pasture resources:

```sh
sudo bash eng/public-test.sh down
```

Cloudflare DNS, Tunnel, proxy mode, and zone settings are intentionally outside this deployment.
Configure those separately only after `verify` passes. The public origin currently terminates TLS
on host ports 80/443 and uses the wildcard `*.exekey.net` certificate already installed on nginx.
