var synaptic = require('synaptic');
var Architect = synaptic.Architect;
var perceptron = new Architect.Perceptron(2, 3, 1);
var myTrainer = new synaptic.Trainer(perceptron);

myTrainer.XOR();
console.log(perceptron.activate([0,0]));