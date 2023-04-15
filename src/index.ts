import { MerkleTree } from 'merkletreejs'
// @ts-ignore
import { buildPoseidon } from 'circomlibjs'

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

const getInitSMT = async () => {
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
  return {
    layers,
    leaves,
  }
}

const updateSMT = async (leaves: any[], layers: string[][], data: {index: number; value: any}[]) => {
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
  return {
    layers: newLayers,
    leaves: leaves,
  }
}

const proofByIndex = (index: number, value: any, layers: string[][]) => {
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
