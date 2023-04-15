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
