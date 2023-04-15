import { MerkleTree } from 'merkletreejs'
// @ts-ignore
import { buildPoseidon } from 'circomlibjs'
import nano from 'nano'

interface couchdbConfigType {user: string; password: string; host: string; port?: number}

const getCouchdb = (config: couchdbConfigType) => nano(`http://${config.user}:${config.password}@${config.host}:${config.port || 5984}`).use('merkle-tree')
const insertIfNotExist = async (root: string, layers: string[][], leaves: any[], couchdbConfig: couchdbConfigType) => {
  const couchdb = getCouchdb(couchdbConfig)
  try {
    await couchdb.get(root)
  } catch (err) {
    if (err) {
      // @ts-ignore
      if (err?.statusCode === 404) {
        await couchdb.insert({
          // @ts-ignore
          layers,
          leaves,
        }, root)
      } else {
        throw err
      }
    }
  }
}

const getPoseidonHashFunction = async () => {
  const poseidon = await buildPoseidon()
  return (inputs: any) => {
    const inputsArray = Array.isArray(inputs) ? inputs : [inputs]
    return MerkleTree.bufferify(MerkleTree.bigNumberify(
      poseidon.F.toString(poseidon(inputsArray.map(MerkleTree.bigNumberify))),
    ))
  }
}

const anyToBigNumber = (input: any) => {
  if (typeof input === 'string') {
    return MerkleTree.bigNumberify(MerkleTree.bufferToHex(Buffer.from(input)))
  } else if (typeof input === 'boolean') {
    return MerkleTree.bigNumberify(input ? 1 : 0)
  } else if (typeof input === 'number') {
    return MerkleTree.bigNumberify(input)
  } else {
    throw new Error('not support type')
  }
}

const getInitSMT = async (couchdbConfig: couchdbConfigType) => {
  const couchdb = getCouchdb(couchdbConfig)
  try {
    // @ts-ignore
    const { leaves, layers } = await couchdb.get('0x2f194faeacf4af40d85a0990eb479cae2bc7f60e8be98153430bc352bbd12da3')
    return { leaves, layers }
  } catch (e) {}

  const hashFunction = await getPoseidonHashFunction()
  const leaves = [
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
  ]
  const tree = new MerkleTree(leaves, hashFunction, { hashLeaves: true, concatenator: (hashes) => hashes })
  const layers = (tree.getLayers() as unknown as Buffer[][]).map(layer => layer.map(node => MerkleTree.bufferToHex(node)))
  await insertIfNotExist(layers[layers.length - 1][0], layers, leaves, couchdbConfig)
  return {
    layers,
    leaves,
  }
}

const createSMT = async (data: {index: number; value: any}[], couchdbConfig: couchdbConfigType) => {
  const couchdb = getCouchdb(couchdbConfig)
  const { leaves, layers } = await getInitSMT(couchdbConfig)
  const hashFunction = await getPoseidonHashFunction()

  const newLayers: string[][] = []

  for (let i = 0; i < layers.length; i += 1) {
    newLayers[i] = []
    for (let j = 0; j < layers[i].length; j += 1) {
      newLayers[i][j] = layers[i][j]
    }
  }

  data.forEach(({ index, value }) => {
    newLayers[0][index] = MerkleTree.bufferToHex(hashFunction(anyToBigNumber(value)))
    leaves[index] = value
  })

  for (let i = 1; i < layers.length; i += 1) {
    for (let j = 0; j < layers[i].length; j += 1) {
      if (newLayers[i - 1][2 * j] !== layers[i - 1][2 * j] || newLayers[i - 1][2 * j + 1] !== layers[i - 1][2 * j + 1]) {
        newLayers[i][j] = MerkleTree.bufferToHex(hashFunction([newLayers[i - 1][2 * j], newLayers[i - 1][2 * j + 1]]))
      }
    }
  }
  await insertIfNotExist(newLayers[newLayers.length - 1][0], newLayers, leaves, couchdbConfig)
  return {
    layers: newLayers,
    leaves: leaves,
  }
}

const proofByIndex = async (index: number, value: any, root: string, couchdbConfig: couchdbConfigType) => {
  const couchdb = getCouchdb(couchdbConfig)
  const key = ([
    'certUrl',
    'certId',
    'certIssuer',
    'certExpired',
    'certValue',
    'certRevoke',
    'slotA',
    'slotB',
  ])[index]

  // @ts-ignore
  const { layers } = await couchdb.get(root)

  const path: string[] = []
  const idx: number[] = []

  for (let i = 0; i < layers.length; i += 1) {
    const isRightNode = index % 2
    if (isRightNode) {
      path.push(layers[i][index - 1])
      idx.push(1)
    } else {
      if (index + 1 < layers[i].length) {
        path.push(layers[i][index + 1])
        idx.push(0)
      }
    }
    index = (index / 2) | 0
  }

  return { [key]: value, path, idx, accountRoot: layers[layers.length - 1][0] }
}
