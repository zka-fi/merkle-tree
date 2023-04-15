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
  const tree = new MerkleTree(leaves, hashFunction, { hashLeaves: true })
  const layers = (tree.getLayers() as unknown as Buffer[][]).map(layer => layer.map(node => node.toString('hex')))
  return {
    layers,
    leaves,
  }
}
