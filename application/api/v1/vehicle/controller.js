'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'gateway', 'basicConnection.json'); // TODO: make it modular
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// Create a new file system based wallet for managing identities.
const walletPath = path.join(process.cwd(), 'wallet');
const wallet = new FileSystemWallet(walletPath);
console.log(`Wallet path: ${walletPath}`);

exports.createVehicle = async (req, res) => {
  try {
    const enrollmentID = req.headers['enrollment-id'];

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists(enrollmentID);
    if (!userExists) {
      return res.status(401).send({
        message: `An identity for the user ${enrollmentID} does not exist in the wallet`
      });
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: enrollmentID, discovery: { enabled: false } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('SampleApplicationBlockchain');

    // Submit the specified transaction.
    // createVehicle transaction - requires 5 argument, ex: ('createVehicle', 'Vehicle12', 'Honda', 'Accord', 'Black', 'Tom')
    await contract.submitTransaction(
      'createVehicle',
      req.body.vehicleID,
      req.body.manufacturer,
      req.body.model,
      req.body.color,
      req.body.owner);

    // Disconnect from the gateway.
    await gateway.disconnect();
    return res.send({
      message: `Vehicle with ID ${req.body.vehicleID} has been created`,
      details: req.body
    });
  } catch (err) {
    console.log(err);
    return res.status(err.statusCode).send(err.message);
  }
};

exports.getVehicle = async (req, res) => {
  try {
    const enrollmentID = req.headers['enrollment-id'];

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists(enrollmentID);
    if (!userExists) {
      return res.status(401).send({
        message: `An identity for the user ${enrollmentID} does not exist in the wallet`
      });
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: enrollmentID, discovery: { enabled: false } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('SampleApplicationBlockchain');

    // Evaluate the specified transaction.
    let result, rawResult;

    if (req.params.id) {
    // if vehicle id specified queryVehicle transaction - requires 1 argument, ex: ('queryVehicle', 'Vehicle4')
      result = await contract.evaluateTransaction('queryVehicle', req.params.id);
      rawResult = result.toString();
    } else {
      // queryAllVehicles transaction - requires no arguments, ex: ('queryAllVehicless')
      result = await contract.evaluateTransaction('queryAllVehicles');
      rawResult = result.toString();
    }
    const json = JSON.parse(rawResult);
    const obj = JSON.parse(json);
    return res.send({
      result: obj
    });
  } catch (err) {
    console.log(err);
    return res.status(err.statusCode).send(err.message);
  }
};
