'use strict'

module.exports.setUpAgreement = async function setUpAgreement(req, res, next) {
  const { exec } = require('child_process');
  const fse = require('fs-extra');
  const fs = require('fs');
  const path = require('path');
  require('dotenv').config()
  const file = req.undefined.value.agreement.id

  function os_func() {
    this.execCommand = function (cmd) {
        return new Promise((resolve, reject)=> {
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

  const dt = req;
  const agreement = dt.undefined.value.agreement
  const metricQueries = dt.undefined.value.metricQueries;

os.execCommand("./setup2.sh " + file).then(result3=> {
  console.log("Agreement set up")
  res.send({
    code: 200,
    message: 'Agreement set up'
  });
  let esc = require(path.join(__dirname ,"../esc", file, 'index.js'))
  esc.start(metricQueries,agreement)
}).catch(err6=> {
  console.log(err6)
  res.send({
    code: 500,
    message: 'Server Error'
  });
});
}