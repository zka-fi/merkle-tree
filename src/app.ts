import express from 'express'
import bodyParser from 'body-parser'
import { createSMT, proofByIndex } from '.'

const app = express()

app.use(bodyParser.json())

app.post('/smt', (req, res) => {
  const data = []
  for (let i = 0; i < req.body.length; i += 1) {
    data.push({ index: i, value: req.body[i] })
  }

  createSMT(data, { user: 'admin', password: 'WsonEYErSarDsODisHALigUN', host: '35.161.69.148' })
    .then(result => {
      res.status(200).send({ root: result.layers[result.layers.length - 1][0] })
    })
    .catch(e => {
      res.status(500).send(e)
    })
})

app.get('/proof/cert_value', (req, res) => {
  const data = []
  for (let i = 0; i < req.body.length; i += 1) {
    data.push({ index: i, value: req.body[i] })
  }
  const { root, value } = req.query

  proofByIndex(4, value, root as string, { user: 'admin', password: 'WsonEYErSarDsODisHALigUN', host: '35.161.69.148' })
    .then(result => {
      res.status(200).send(result)
    })
    .catch(e => {
      res.status(500).send(e)
    })
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
