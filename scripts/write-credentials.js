/**
 * Build-time script to write credentials to a file
 * This bypasses the AWS Lambda 4KB env var limit
 * Credentials are embedded here since Netlify free tier can't scope env vars
 */

const fs = require('fs');
const path = require('path');

const credentialsDir = path.join(__dirname, '..', 'src', 'config');
const credentialsFile = path.join(credentialsDir, 'credentials.generated.json');

// Ensure directory exists
if (!fs.existsSync(credentialsDir)) {
  fs.mkdirSync(credentialsDir, { recursive: true });
}

// Credentials embedded at build time (Netlify free tier can't scope env vars)
const credentials = {
  gcp: {
    projectId: 'aijobsearchagent-465820',
    clientEmail: 'aijobsearchdev@aijobsearchagent-465820.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDJLkfX3Zr/kvO+
bZjdLYxh/BSrLA+J6cKsD14Tmvf+hnA+JVgMyiVNmO0aV2bOPd3GzfEu1p18JmVb
NCGGXIknc12/53ByRMvpwvhOj5Wm/AhpFLM63qF5HxSVCIBH+1SB0UwQAByiJLTe
alKecGdPZzz4aiHmJ7w8QXYu7UQZyxx//u1EasgatUfGFf2wlcB8nWSbQjZM9PpI
vDcXRUw7SOK3Ul1cfI4p9xr9sXaxpBWNPgFlW4oVeLEF13rQi/iZCuLE3g9nSLF1
k0NQVGlKxUU6ioeoFfxOYLo1mk8mFRh0YDIlRzcb8E2ye8Jl7p7Hc9qBz7q4evbA
Q4KrF4gnAgMBAAECggEAHvY39AF04YDWHB3APnNMR9I6GMPtr53Mf5rX3DA9RYH0
PqQ/AleOrnwVgDh+UnRpWuIxYbIsR5dIgbpVWdkzpIuCnKO7sGJlIu4GNV+vZPp5
4uOJgqBmfSkVi6rkxJnqE2vzhwI1ZeuR8ymthcPVKn5q1EJ6mBzPwVLueOIRg98d
fRHtnV9EHwb9spQ3w8bKJ3VYl1Td49V7RkAhklUUSgfsnhVH+4KSRnQ1Zv7YAhuB
IHH9/Jk/sO/lErcl4jWc1rfc/DyMu7TyfuRqrzgLjEGqWoC6fA+J8EHlnlTtz378
22lpD9r3q5bpsI8fdULp9VbxIg2ZvRoJADA9or8fEQKBgQDoiaP8Sm3kF4Ak+IBm
3fwpc/u6f7STLpVfReKv4Hmvfuq63MZii3TyV2IAZ3tBTLIA+fVdpbOxxoLjHQpp
BoSnysLxfhhjBEIM2duf2lOwMIbN2+l9FThLocqbWgoab5GlVuRAk6gZmtsCUE6v
RAJY0CjE9Sh2iBuDqB8vfkKtUQKBgQDderQyy5gHoLMse/f71PeuIgNGhQSSksrS
YyHAPhWc0U927/m0pqd+wqbf2Wk0J/Zm5Yh2b76/mn4jxGyN+ZsdK/zlw3T3QmXf
aqUTCspmeo5vjEVhnIxgft7S/cwX/MlmZ+qek/OfI0R/INLw6s+KUvbxD0j1f2C8
uVhXAg2f9wKBgEFh6gzW9J0MiohaoufJhMw3A1GF9MTpdTBrmvhuumhA3EkcKF+u
7HvzW+fXMM3EfcxOe9IP9D2JHmYzVSkAny36keOK29qDaPrqCpmgrqU8j7q0GauE
2uZRIIGbyHl0Y1RE4TrTCZHhe7Dj2avoCGzmYoA2mmDxliLnk5UsAB1xAoGAE/8J
F/Dzx/SFWMXUjOMcfZdKjmpiEE26jCYxHOc+Ekt/jjB6bgoB41r1sA40BmZ5Q68D
lBXgtfHf46DPYD4h+A9JpQDxpYVUJ0i8oKx/u6LjC0Ux2m9E6U1rFsedTqkfEeTd
9PVMsJiBjazL/r5kgIufCgKkRq36cO+W/zwLON8CgYBLFR1cWmKS3V5931rDMYmb
ZZKzg9JWCLcSowGj2yUEnWmQlzbwnKNusWLrR1IuW0oQjRWBKJxzq8iLdlU8CzCL
neNFsG1fFpbcHIzCAPsQ1vHDJ2yAXc42MfrslIvdqrQc7IGJ7YmNxsUt4Bwosih9
bGrJvaJ4EyE6X+ZoP/BvuA==
-----END PRIVATE KEY-----
`,
  },
  firebase: {
    projectId: 'myjobsearchagent',
    clientEmail: 'firebase-adminsdk-fbsvc@myjobsearchagent.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC0DuPI6ldwh1cd
eMeZTdjjDwUoKXB7mlm06817V1wjV6njjlAL9GunOPtqtnzx8rDQhTPR+lahflPG
Mqgn7ZdujD+HjTP5j9nxMd6Ym/J9BmBjk99zJBTB/18XambbsDZt45cGph8lTxeo
WAgghSrlK96kbrOtQLA8TKMNER/k3ZVDLCrLiyVuaDr5nLlFktx51C+LohX2gnkG
RL6AHxqD2YKqFzLhyBqqSVp2E7ALV1/8ejzvmuw4oi8CNT/R8C1HcCBS0OU8BnZL
ILw/sU2Y6fPu4Q+AnotgKRj7XJncEK4jxHPcmIMIit680iy+6X+/XgF8x6gLh5fN
qdLHXm4RAgMBAAECggEAB5O11BT0C4Uo4Xf27Ei/zWREXjy9YhIsReyc8Vyk50ui
pE1vKTJtDxsntB8MS6rGQOwa2P8ptjK7wadZkKtf0aDYvowVKXwU2romwn5gTXcS
eml080jLwwZYTc+y/UbHyS2IQ8xQGx2RYqRO6T45We36Unb76PJ3Ln5qGrXQOGz+
XvlHQ3S6P4yz/3zlH2hbzOzOxeUDzYvmEsFridOfRDbhxbXL7Skt+uDZCv/cxYMi
8kJuMG7S84C+c5JRW6qL3YbHSPeAWr0IRjJvgUhxFfn09dxaGy+pZxZ77thbu1N4
UT2RmJQ/p3W1IgBNnfltWR74rSpscmYxqdJyATT9vQKBgQDfpsDP89pfHWCrxIiQ
wpxYii9ZZ5NiQN2tp9PniJic6c9KWe7QCkhkqzSxbehoCi9WXJZviwu3839KgNB4
vYEuOSeT8zn/lkuQiZ71NsEDDBjZX+K1UZb/QuqsKExCOU55ZZP5+pfq/cvWW6KI
mqBo76gvscMvmK+rtNON9cHWrQKBgQDOGf1cqKNM9BBxbMsj8IzjU1fDZ1pLhnqN
WMwuVcCB6iwMBs9Bgd770cBP4KN+WOBL2NJ4yj6MmJi3Vbxf7uFkXlipbti9vOHQ
RyNkUnUDEVmGz39FohXnZQgxupAwYZJKNmxmsPZ++mrEGvgey3Odf1EHgznTX8cg
/g0fL9u1dQKBgQCKJhT/3x9KlXj7YSECWlP9FQ5+aU5O6MaF2B8669NpSbuzr62m
cFOba23XE471hSUMcZCzQe5xKEW+nacojdZX2RIrf5iZ2hq/I2M/ER1UZoqK64G8
grOE5a7TvOiuF3vz3Nz1Euf4TeE1fdD+FJV1fGQlYeaxZd1NcRskm2Oq2QKBgQCR
U/o30CH2LVM658AGQ6TU1vvXqZUeFGFuMeMn+QeZlAojINocEvutDaZRrNEcUoc2
dFlVGycn9KIbBLWj38nHAE/8iVED2aBRQRhPsWUZGK7MRJw1+akAVVmF10u9EdAZ
zG57quTlfKa0SWAUNtn7gL8eUQYBalP7i6itCQ4f0QKBgGTPwgLkBX4WK0m43llQ
GkzDMrLlLhVDyZKsfAJFhJ1ltqki70kgIebTJgCD7HI6hJGegR9IJ1QZfw+SDKsj
4eE1UVhvqH+hCftaj4nx+EnrhcQeWi5U7EaEZRjSGLCRiUwqoBLoOpD/bekUfyaP
WGcmuR4kqdQZTlqRmPQ3H/Tg
-----END PRIVATE KEY-----
`,
  },
};

fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
console.log('✅ Credentials written to', credentialsFile);
