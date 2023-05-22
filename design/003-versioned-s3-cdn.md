---
created: 2023-05-22
---

# versioned-s3-cdn

Thinking about hosting multiple static websites in an S3 bucket behind a CDN and having one version which is "live".

Put assets into S3 under an instances folder where each instance is a unique hash, then setup a gateway to serve the assets based on the hash and also serve from a primary domain from CNAME records.

There could be a S3 structure like this:

```
instances
└── dog-conf
    ├── static
    │   ├── favicon.png
    │   └── opengraph.png
    ├── uploads
    │   ├── a-doc.pdf
    │   ├── another-pic.jpg
    │   └── some-pic.png
    └── versions
        ├── abcdef
        │   ├── index.html
        │   ├── schedule.html
        │   ├── script.js
        │   └── style.css
        └───ghijkl
            └── ...
```

Then the routing would need to work like this

- https://abcdef.dog-conf.deconf.app → `s3://instances/dog-conf/versions/abcdef/index.html`
- https://abcdef.dog-conf.deconf.app/_ → `s3://instances/dog-conf/versions/abcdef/_`
- https://dog-conf.deconf.app/static/favicon.png → `s3://instances/dog-conf/static/favicon.png`
- https://dog-conf.net → `s3://instances/dog-conf/versions/abcdef/index.html`
  - when "abcdef" is the "active version"
