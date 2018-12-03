import * as synaptic from './synaptic-master/src/synapticE.mjs';
var perceptron = synaptic.Architect.Perceptron(2,3,1);
perceptron.trainer.XOR();
console.log(perceptron.activate([0,1]));