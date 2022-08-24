# oci-registry

## goal

Can an OCI image-spec registry be used to store versioned static websites?

## structure

- `app/` — A static web app to be bundled and distrobuted.
- `images/` — (git-ignored) Oci image-spec complaint images are built here.
- `registry/` — (git-ignored) A volume for the docker-compose registry's data,
  for easy inspection and debugging.
- `bundle.mjs` — A script that takes a version argument (`$1`) and creates an oci image-spec container in the `images/` folder.
- `upload.mjs` — A script that takes a version argument (`$1`) and uploads an `images/` version to the registry.
- `serve.mjs` — A server that pulls static images from the registry and servers them over http.
- `docker-compose.yml` — A docker-compose stack that deploys a registry for experimentation.

## notes

- A static site can be stored in an OCI image-spec complaint registry.
- A custom config file can be stored too, `application/vnd.alembic.app.config.v1+json` in this case which could
  be used by the runtime to determine how to serve the static site.
- This implementation stores the site as a single tar in a blob/layer,
  indivisdual files could be stored which might enable blob reuse and reduce overall filesizes.
- A container in the registry can have many slashes in it (`/`), which could be useful for namespacing.
  They must have an interesting routing algorithm, with many slashes in the middle of URLs.
- A special tar/gzip combo is needed to remove timestamps from tars and improve caching.
- A digest is just a sha prefixed with the algorithm used to generate it, e.g. `sha256:abcdef...`
- The index is the only named file and everything else is a blob, including the manifest.
- The index can be an index or a manifest which can be confusing, it relies on the `mediaType` field.
- Something needs to be written to handle the other side, pulling an "image" and serving it.
  - Ideally, a plain nginx container would be the best thing to serve these assets.
- Creating a regular image might make more sense as kubernetes can just run them.
- Its probably easier and simpler to generate the files and upload them to an S3 bucket then setup a CDN to serve the correct assets.
- It feels like there are too many steps and not many benefits to this approach.

## links

- [https://opencontainers.org/](Open Container Initiative)
- [https://github.com/opencontainers/image-spec/blob/main/spec.md](opencontainers/image-spec)
- [https://github.com/opencontainers/distribution-spec/blob/main/spec.md](opencontainers/distribution-spec)
- [https://docs.docker.com/registry/spec/api/](Docker registry API)

## experiment

**prerequisites**

- [Node.js v18+](https://nodejs.org/en/)
- [httpie](https://httpie.io/cli)
- [Docker desktop](https://docs.docker.com/desktop/)

```sh
# cd to/this/folder

# start the docker-compose stack
# → Stop later with "docker-compose down -v"
docker-compose up -d

# install npm dependencies
npm install
```

**commands**

```sh
# cd to/this/folder

# create a static-site image and put it into the images/ folder
./bundle.mjs v1

# take the v1 image from the images/ folder and upload it to the registry
./upload.mjs v1

# serve the static sites in the registry
# → runs on http://localhost:8080
./serve.mjs

# View the static app
open http://localhost:8080/my-app/v1

# retrieve image catalog from the registry
http :5000/v2/_catalog

# list app refs (tags)
http :5000/v2/my-app/tags/list

# retrieve a manifest
http :5000/v2/my-app/manifests/v1 \
  Accept:application/vnd.oci.image.index.v1+json

# get a blob
DIGEST=...
http :5000/v2/my-app/blobs/$DIGEST
```

`http :5000/v2/_catalog`

```json
{
  "repositories": ["my-app"]
}
```

`http :5000/v2/my-app/tags/list`

```json
{
  "name": "my-app",
  "tags": ["v1", "v2"]
}
```

`http :5000/v2/my-app/manifests/v1 Accept:application/vnd.oci.image.index.v1+json`

```json
{
  "manifests": [
    {
      "digest": "sha256:396c6612ae36ea38b99e6d503c0084f35fce4017e85caf2d29d5431b56b72529",
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "size": 581
    }
  ],
  "mediaType": "application/vnd.oci.image.index.v1+json",
  "schemaVersion": 2
}
```

`http :5000/v2/my-app/blobs/sha256:396c6612ae36ea38b99e6d503c0084f35fce4017e85caf2d29d5431b56b72529`

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "config": {
    "mediaType": "application/vnd.alembic.app.config.v1+json",
    "size": 83,
    "digest": "sha256:57da3d5e6864dd20281f3e102267801094fcb2f8a77cefcc72f5307eb93acc5b"
  },
  "layers": [
    {
      "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
      "size": 1275,
      "digest": "sha256:3b109fddb59f60ebdfd93843cae0a652db64425f1272770983dc7e3f2714fbc1"
    }
  ],
  "annotations": {
    "dev.openlab.deconf": "0.1",
    "org.opencontainers.image.ref.name": "v1"
  }
}
```

`http :5000/v2/my-app/blobs/sha256:57da3d5e6864dd20281f3e102267801094fcb2f8a77cefcc72f5307eb93acc5b`

```json
{
  "mediaType": "application/vnd.alembic.app.config.v1+json",
  "rootDir": "app"
}
```

`http :5000/v2/my-app/blobs/sha256:3b109fddb59f60ebdfd93843cae0a652db64425f1272770983dc7e3f2714fbc1`

```
+-----------------------------------------+
| NOTE: binary data not shown in terminal |
+-----------------------------------------+
```

```sh
mkdir tmp
cd tmp

# Get the app blob and untar into the current folder
http :5000/v2/my-app/blobs/sha256:3b109fddb59f60ebdfd93843cae0a652db64425f1272770983dc7e3f2714fbc1 | tar -xz
```
