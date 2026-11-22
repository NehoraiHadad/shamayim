# Merge-tooling check

The existing stills runner successfully combined main's `@hide` segment with the ownership branch's
`--flat`, `--describe` and `--crop4x` options. The image is labelled **Offline flat 100 m**, 375 CSS px,
DPR 2, with `sky.band` hidden. It uses bundled data and blocks external requests. The PNG was visually inspected.

- [Still](il-31.6607-35.1415-1200-no-sky.band-flat100m.png)
- [Geometry](il-31.6607-35.1415-1200-no-sky.band-flat100m.json)
- [4× crop](il-31.6607-35.1415-1200-no-sky.band-flat100m-crop4x.png)

```powershell
$env:NODE_PATH = 'C:/Users/Nehorai/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules'
$env:SCENE_CHROMIUM = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/merge-stills `
  'il-31.6607-35.1415@12:00@@0@@sky.band' '--flat=31.66073,35.14148,אלעזר' --dpr=2 --describe --crop4x
```

No package/browser download or live service was used. R3/R4 evidence is preserved separately.
