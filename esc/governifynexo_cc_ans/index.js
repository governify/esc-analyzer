
var ESC = require("../../esc_core");
const yargs = require('yargs');
const JSONStream = require('JSONStream');
const governify = require('governify-commons');
const logger = governify.getLogger().tag('index');
const diff = require('deep-diff');

let config = {
  conexionPath: "./network/organizations/peerOrganizations/org1.example.com/connection-org1.json",
  resultsPath: "./esc/governifynexo_cc_ans/results",
  identityName: "admin",
  channelName: "escchannel",
  chaincodeName: "governifynexo_cc_ans",
  csvResultsCalculationsHeader: "RESPONSES,TOTAL_TIME,FREQUENCY,TIME_DATA,FREQUENCY_DATA,RESPONSES_STORED,FROM_DATE,TO_DATE,MINIMUM_TIME,MAXIMUM_TIME\n",
  csvResultsExperimentHeader: "FREQUENCY,TIME_DATA,MIN_TIME,MAX_TIME,AVG_TIME,STD_TIME,SUCCESFUL_CALCULATIONS,CALCULATIONS_OVER_MAX\n",


  executionTime: 600,
  analysisFrequency: 10,
  harvestFrequency: 3,
  dataTimeLimit: 60,
  frequencyControlCalculate: 1,
  maximumTimeAnalysis: 15,
  minimumTimeAnalysis: 10,
  elasticityMode: "harvestFrequency",
  experimentName: "test",
    
  updateDataContract: "updateData2",
  evaluateWindowTimeContract: "evaluateHistory2",
  evaluateHarvestFrequencyContract: "evaluateFrequency2",
  queryAnalysisHolderContract: "queryDataCalculation2",
  analysisHolderId: 2,
  analysisContract: "analysis2",
  dataStorageContract: "createData2",
  calculationStorageContract: "createDataCalculation2",



}

let harvesterHookParams = {
  dataNumber: 1
}

let analyserParams = {
  dataNumbers: 1
}

var stop = false;
var interval = "";
var timeout = "";


async function hookData(metricQueries, agreement){
  
  var compositeResponse = [];
  let requests = metricQueries.map( metricQuery => {
    const collector = metricQuery.collector;
    const urlParams = metricQuery.urlParams;
    const metric = metricQuery.metric;
    return new Promise(async (resolve) => {
      if(metricQuery.collector.type === 'PPINOT-V1'){
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const requestMetric = await governify.infrastructure.getService(collector.infrastructurePath).request({
            url: collector.endpoint + '/' + collector.name.replace(/^\//, '') + '?' + encodeURI(urlParams),
            method: 'GET',
            responseType: 'stream'
        }).catch(err => {
            const errorString = 'Error in PPINOT Computer response ' + err.response.status + ':' + err.response.data;
            logger.error(errorString)
        });
        const requestStream = requestMetric.data;
        requestStream.pipe(JSONStream.parse()).on('data', monthMetrics => {
            try {
                // Check if computer response is correct
                if (monthMetrics && Array.isArray(monthMetrics)) {
                  // For each state returned by computer map the scope
                  monthMetrics.forEach(function (metricState) {
                      if (metricState.log) {
                      // Getting the correct log for mapping scope
                      const logId = Object.keys(metricState.log)[0];
                      const log = agreement.context.definitions.logs[logId];
                      // doing scope mapping
                      metricState.scope = computerToRegistryParser(metricState.scope, log.scopes);
                      }
                      metricState.id = metric
                      // aggregate metrics in order to return all
                      compositeResponse.push(metricState);
                  });
                } else {
                  const errorString = 'Error in computer response for metric: ' + metric + '. Response is not an array:  ' + JSON.stringify(monthMetrics);
                  logger.error(errorString)
                }
            } catch (err) {
                const errorString = 'Error processing computer response for metric: ' + metric;
                logger.error(errorString)
            }
        }).on('end', function () {
            resolve();
        });
      }else if(metricQuery.collector.type === 'POST-GET-V1'){
        const requestMetric = await governify.infrastructure.getService(collector.infrastructurePath).request({
          url: collector.endpoint,
          method: 'POST',
          data: { config: collector.config, metric: urlParams }
        }).catch(err => {
          const errorString = 'Error in Collector response ' + err.response.status + ':' + err.response.data;
          logger.error(errorString)
        });
        const collectorResponse = requestMetric.data;
        const monthMetrics = await getComputationV2(collector.infrastructurePath, '/' + collectorResponse.computation.replace(/^\//, ''), 60000).catch(err => {
          const errorString = 'Error obtaining computation from computer: (' + err + ')';
          logger.error(errorString)
        });

        try {
          // Check if computer response is correct
          if (monthMetrics && Array.isArray(monthMetrics)) {
            // For each state returned by computer map the scope
            monthMetrics.forEach(function (metricState) {
              if (metricState.log && agreement.terms.metrics[metric]) {
                // Getting the correct log for mapping scope
                const logId = Object.keys(metricState.log)[0];
                const log = agreement.context.definitions.logs[logId];
                // doing scope mapping
                metricState.scope = computerToRegistryParser(metricState.scope, log.scopes);
              }
              // aggregate metrics in order to return all
              metricState.id = metric
              compositeResponse.push(metricState);
            });
            resolve();
          }
        } catch (err) {
          logger.error(err)
        }
      }
    });

  });

  return Promise.all(requests).then(() => {
    let timedScopes = [];
    let metricValues = [];

    compositeResponse.forEach(function (metricValue) {
      const ts = {
        scope: metricValue.scope,
        period: metricValue.period
      };
      // We check if a timedScope exists
      let tsIndex = containsObject(ts, timedScopes);
      if (tsIndex == -1) {
        // If no exists, we create it
        tsIndex = timedScopes.push(ts) - 1;
        logger.debug('New TimedScope with index: ', tsIndex);
      } else {
        logger.debug('TimedScope already exists in array index: ', tsIndex);
      }

      // If array metricValues has no values for the index yet, we initialize it
      if (metricValues[tsIndex] == null) {
        metricValues[tsIndex] = {};
      }
      // Finally, we store current value (most recent value) of the metric
      metricValues[tsIndex][metricValue.id] = metricValue;
    });

    let newData = {
      dataCollectedDateTime: Date.now(),
      numberResponses: 1,
      timedScopes: timedScopes,
      responses: metricValues,
      agreement: agreement
    };

    return newData;
  })
}

function containsObject (obj, array) {
  for (let i = 0; i < array.length; i++) {
    const difs = diff(array[i], obj);
    if (difs === undefined || difs === null) {
      return i;
    }
  }
  return -1;
}

function computerToRegistryParser (computerScope, mapping) {
  const mappedScope = {};
  // reversing mapping
  const mappingReversed = {};
  for (const field in mapping) {
    mappingReversed[mapping[field]] = field;
  }

  for (const scopeField in computerScope) {
    const mappedScopeField = mappingReversed[scopeField];

    if (mappingReversed && mappedScopeField) {
      mappedScope[mappedScopeField] = computerScope[scopeField];
    } else {
      mappedScope[scopeField] = computerScope[scopeField];
    }
  }

  return mappedScope;
}

function getComputationV2 (infrastructurePath, computationURL, ttl) {
  return new Promise((resolve, reject) => {
    try {
      if (ttl < 0) { reject('Retries time surpased TTL.'); return; }
      const realTimeout = 1000; // Minimum = firstTimeout
      const firstTimeout = 500;
      setTimeout(async () => {
        governify.infrastructure.getService(infrastructurePath).get(computationURL).then(response => {
          if (response.status === 202) {
            logger.debug('Computation ' + computationURL.split('/').pop + ' not ready jet. Retrying in ' + realTimeout + ' ms.');
            setTimeout(() => {
              resolve(getComputationV2(infrastructurePath, computationURL, ttl - realTimeout));
            }, realTimeout - firstTimeout);
          } else if (response.status === 200) {
            resolve(response.data.computations);
          } else {
            reject(new Error('Invalid response status from collector. Response: \n', response));
          }
        }).catch(err => {
          if (err?.response?.status === 400) {
            logger.error('Failed obtaining computations from collector: ' + err.response.data.errorMessage + '\nCollector used: ' + infrastructurePath + '\nEndpoint: ' + computationURL);
            resolve([]);
          } else {
            logger.error('Error when obtaining computation response from collector: ', infrastructurePath, ' - ComputationURL: ', computationURL, '- ERROR: ', err);
            reject(err);
          }
        });
      }, firstTimeout);
    } catch (err) {
      reject(err);
    }
  });
}



const argv = yargs
  .command('start', 'start the esc', {
    }
  )
.help().alias('help', 'h').argv; 



/**
 * Call the harvester in esc_core/index regularly with the frequency given and in case of having an elastic frequency it monitors any changes in it and applies it. 
 * 
 * In this function it is defined from where and how the data is taken to introduce it in the blockchain.
 * @function
 * @param {number} frequency - The initial frequency in seconds to harvest data.
 */
async function intervalHarvester(frequency, metricQueries, agreement) {

  if(config.elasticityMode == "harvestFrequency"){
    ESC.frequencyChanged(config.chaincodeName);
    interval = await setInterval(() => {
  
      ESC.getNewFrequency(config.chaincodeName).then(async (res) =>{
  
        if(res.change){
  
          clearInterval(interval);

          if(!stop){
            intervalHarvester(res.newFrequency, metricQueries, agreement)
          }
          
  
        }else{
  
          let newData = await hookData(metricQueries, agreement);
  
          ESC.harvesterHook(harvesterHookParams, newData,config.chaincodeName);

        }
      })
      
    }, frequency*1000);
  }else{
    interval = await setInterval(async () => {
    
      let newData = await hookData(metricQueries, agreement);
  
      ESC.harvesterHook(harvesterHookParams, newData,config.chaincodeName);
  
    }, frequency*1000);
  
    timeout = setTimeout(() => {
      clearInterval(interval);
      logger.info("************** EXECUTION COMPLETED, SHUTING DOWN ********************")
    }, config.executionTime*1000 + 100);
  }

}

function start(metricQueries, agreement){

  ESC.configurate(config,config.chaincodeName)

  stop = false;
  
  ESC.connect(config.chaincodeName).then(() =>{
  
    ESC.analyser(analyserParams,config.chaincodeName);
  
    ESC.harvesterListener(config.chaincodeName);
  
    intervalHarvester(config.harvestFrequency, metricQueries, agreement);

    if(config.elasticityMode == "harvestFrequency") {
      timeout = setTimeout(() => {
        stop = true;
        logger.info("************** EXECUTION COMPLETED, SHUTING DOWN ********************")
      }, config.executionTime*1000 + 100);
    }
    
  
  })

}



module.exports.config = config;
module.exports.chaincodeName = function(){
  console.log(config.chaincodeName)
};
module.exports.start = start;
module.exports.stop = stop;
module.exports.getIntervals= function() {
  return [interval,timeout];
};