
(async () => {
  const tree = await createSMT([
    { index: 0, value: 'aaaaa' },
    { index: 1, value: 'BBBBB' },
    { index: 2, value: 123 },
    { index: 3, value: 456 },
    { index: 4, value: 9999 },
    { index: 5, value: true },
  ])
  console.log(await proofByIndex(5, 9999, tree.layers[3][0]))
})().then(console.log).catch((e) => { console.error(e); process.exit(1) })
