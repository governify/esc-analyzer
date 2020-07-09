/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';


const yargs = require('yargs');
const { Gateway, Wallets, } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');

const argv = yargs
    .command('launchDetections', 'Generate detections during the given time', {
        numberSensors: {
            description: 'number of sensors detecting at the same time',
            alias: 'n',
            type: 'number',
        },
        minutes: {
            description: 'minutes of execution',
            alias: 'm',
            type: 'number',
        },
        streetKilometers: {
            description: 'number of kilometers of the street',
            alias: 's',
            type: 'number',
        },
        numberSensor: {
            description: 'number of the sensor',
            alias: 'j',
            type: 'number',
        },
        dataFrequency: {
            description: 'frequency to insert data by sensors in seconds',
            alias: 'd',
            type: 'number',
        }
      }
    )
.help().alias('help', 'h').argv;


async function main(numberSensor, numberDetection, numberSensors, streetKilometers, minutes, dataFrequency) {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('sensor'+ numberSensor);
        if (!identity) {
            console.log(`An identity for the user "sensor${numberSensor}" does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'sensor'+ numberSensor, discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('street_network');

        // Submit the specified transaction.
        // 


        //const detections = await contract.evaluateTransaction('queryAllDetections');
        //await contract.submitTransaction('calculateFlow', 'CARFLOW1', 2, "ASCENDENT", 7, 7, 1588698495684);
        let count = numberDetection;

        let velocities = [];
        let timeStart = [];
        let inde = []
        await csv().fromFile('./cars.csv').then((res) => {
            for (let i = 0; i < res.length; i++){
                velocities.push(res[i].VELOCITY);
                timeStart.push(res[i].TIME_START);
                inde.push(i);
            }
        });

        let initialTime = Date.now();

        let interval = setInterval(() => {

            let totalBeginHR = process.hrtime();
            let totalBegin = totalBeginHR[0] * 1000000 + totalBeginHR[1] / 1000;

            contract.submitTransaction('createDetection', numberSensor, 'DETECTION' + count, (streetKilometers*numberSensor)/numberSensors, 'ascendent',
             inde.filter((i) => {
                 return (velocities[i] * (Date.now() - initialTime - timeStart[i])/3600000) >= (streetKilometers*numberSensor)/numberSensors &&
                  (velocities[i] * (Date.now() - initialTime - 1000 - timeStart[i])/3600000) < (streetKilometers*numberSensor)/numberSensors;
             }).length).then(() => {
                let totalEndHR = process.hrtime()
                let totalEnd = totalEndHR[0] * 1000000 + totalEndHR[1] / 1000;
                let totalDuration = (totalEnd - totalBegin) / 1000;

            console.log('Transaction has been submitted with an execution time of '+ totalDuration + ' ms');
            });
            count = count+ numberSensors;
        }, dataFrequency*1000);
        
        setTimeout(() => {
            clearInterval(interval);
            setTimeout(() => {
                gateway.disconnect();
                console.log("Disconnected");


            }, 5000);
        }, minutes*1000 + 100);


    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

async function getDetections() {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('admin');
        if (!identity) {
            console.log('An identity for the user "admin" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('street_network');

        // Evaluate the specified transaction.
        const result = await contract.evaluateTransaction('queryAllDetections');
        let a = JSON.parse(result.toString()).length;
        gateway.disconnect();
        return a;

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

if (argv._.includes('launchDetections')) {



    getDetections().then(res => {

        main(argv.numberSensor, res + argv.numberSensor, argv.numberSensors, argv.streetKilometers, argv.minutes, argv.dataFrequency);
            
        

    });
}
