'use strict'

function sendRes(response, code, message) {
  response.send({
    code: code,
    message: message
  });
}

module.exports.setUpAgreement = async function setUpAgreement(req, res, next) {
  const { exec } = require('child_process');
  const fse = require('fs-extra');
  const fs = require('fs');
  const path = require('path');
  require('dotenv').config();
  const dt = req.undefined.value;
  const file = dt.agreement.id;
  const errorMessage = 'Server Error';

  function os_func() {
    this.execCommand = function (cmd) {
      return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
          console.log(stdout)
          if (error) {
            reject(error);
            return;
          }
          resolve()
        });
      })
    }
  }
  var os = new os_func();
  const agreement = dt.agreement
  const metricQueries = dt.metricQueries;

  const agreementName = file.replace(/[\d\.]+$/, '');
  let escPath = path.join(__dirname, "../esc",file);
  // Create the new agreement based on the agreement template
  fse.copy(path.join(__dirname, `../esc-template`), escPath, function (err) {
    if (err) {
      console.error(err);
      sendRes(res, 500, errorMessage);
      return;
    }

    // Path files
    let escIndexPath = path.join(escPath, "index.js");
    let chaincodePath = path.join(escPath, "chaincode/src");
    let chaincodeIndexPath = path.join(chaincodePath, "index.js");

    fs.readFile(escIndexPath, 'utf8', function (err, dataIndexESC) {
      if (err) {
        console.log(err);
        sendRes(res, 500, errorMessage);
        return;
      }

      // Modify the agreement template with the new agreement data
      const regAux = new RegExp(agreementName + "X", "g");
      const idESC = file.replace(agreementName, "");

      let resultESC = dataIndexESC.replace(/createData"/g, "createData" + idESC + '"').
        replace(/queryDataCalculation"/g, "queryDataCalculation" + idESC + '"').
        replace(/createDataCalculation"/g, "createDataCalculation" + idESC + '"').
        replace(/updateData"/g, "updateData" + idESC + '"').
        replace(/analysis"/g, "analysis" + idESC + '"').
        replace(/evaluateHistory"/g, "evaluateHistory" + idESC + '"').
        replace(/evaluateFrequency"/g, "evaluateFrequency" + idESC + '"').
        replace(regAux, file);

      // Update ESC index file with the new agreement data
      fs.writeFile(escIndexPath, resultESC, 'utf8', function (err) {
        if (err) {
          console.log(err);
          sendRes(res, 500, errorMessage);
          return;
        }

        fs.readFile(chaincodeIndexPath, 'utf8', function (err, dataIndexChaincode) {
          if (err) {
            console.log(err);
            sendRes(res, 500, errorMessage);
            return;
          }

          // Install ESC dependencies
          os.execCommand("cd " + escPath + " && npm install").then(resInstallESC => {
            const { config, start } = require(escIndexPath);

            // Modify the chaincode template with the new agreement data
            let resultChaincode = dataIndexChaincode.replace(/queryData\(/g, "queryData" + idESC + "(").
              replace(/createData\(/g, config.dataStorageContract + "(").
              replace(/queryDataCalculation\(/g, config.queryAnalysisHolderContract + "(").
              replace(/createDataCalculation\(/g, config.calculationStorageContract + "(").
              replace(/updateData\(/g, config.updateDataContract + "(").
              replace(/analysis\(/g, config.analysisContract + "(").
              replace(/evaluateHistory\(/g, config.evaluateWindowTimeContract + "(").
              replace(/evaluateFrequency\(/g, config.evaluateHarvestFrequencyContract + "(").
              replace(/queryWithQueryString\(/g, "queryWithQueryString" + idESC + "(");

            // Update chaincode index file with the new agreement data
            fs.writeFile(chaincodeIndexPath, resultChaincode, 'utf8', function (err) {
              if (err) {
                console.log(err);
                sendRes(res, 500, errorMessage);
                return;
              }

              // Install Chaincode dependencies
              os.execCommand("cd " + chaincodePath + " && npm install").then(resInstallChaincode => {

                // Execute setup for agreement
                os.execCommand("./setup2.sh " + file).then(resultSetup => {
                  console.log("Agreement set up");
                  sendRes(res, 200, 'Agreement set up');
                  start(metricQueries, agreement);
                }).catch(err => {
                  console.log(err);
                  sendRes(res, 500, errorMessage);
                  return;
                });

              }).catch(err => {
                console.log(err);
                sendRes(res, 500, errorMessage);
                return;
              });

            });

          }).catch(err => {
            console.log(err);
            sendRes(res, 500, errorMessage);
            return;
          });

        });
      });
    });
  });
};