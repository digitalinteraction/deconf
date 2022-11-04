# debug

**remote dev tools**

```sh
ssh -L 0.0.0.0:9223:localhost:9222 -o ProxyJump=openlab pi@ol-pi-erkki -N
```

Then open `http://localhost:9223` to get the dev tools
