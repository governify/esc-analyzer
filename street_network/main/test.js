
const csv = require('csvtojson');
const fs = require('fs');
const request = require('postman-request');
const { constants } = require('buffer');

let velocities = [1,2,3];
let timeStart = velocities;
velocities = [];
let distance = [];
let inde = "";



async function main() {
   let a = [];
   a.push(Date.now())
   
    console.log(JSON.stringify(a));
}

main()

/*csv().fromFile('./cars.csv').then((res) => {
    for (let i = 82; i < res.length; i++){
        velocities.push(res[i].VELOCITY);
        timeStart.push(res[i].TIME_START);
        distance.push((res[i].VELOCITY/3.6)*(256-(res[i].TIME_START/1000)));
        let v = (Math.random()*50+20);
        
        
    }
    console.log(distance);
});

let initialTime = Date.now();

let interval = setInterval(() => {

    
    console.log(inde.filter((i) => {
         return (velocities[i] * (Date.now() - initialTime - timeStart[i])/3600000) >= (1*1)/3 &&
          (velocities[i] * (Date.now() - initialTime - 1000 - timeStart[i])/3600000) < (1*1)/3;
     }).length);
}, 1000);

setTimeout(() => {
    clearInterval(interval);
}, 1*60000 + 100);
/*arra = [50, 60, 70, 30, 30];
console.log(arra.filter((number) => {
    return number > 50;
}).length);
console.log(arra.indexOf(30));
let csvBody = "";
fs.readFile('./cars.csv', (err, data) => {
    if(err){
    }else{
        csvBody = data.toString();
    }
});
setTimeout(() => {
    for(i=0; i<75; i++){
        csvBody += ((Math.random()*50+20).toFixed(0) +"," + (Math.random()*106000+60000).toFixed(0) + "\n");
    
    }
}, 1000);

setTimeout(() => {
    fs.writeFileSync('./cars.csv', csvBody,'utf8');
  
}, 3000);*/


/*request('http://localhost:9090/api/v1/query?query=ledger_blockchain_height&time=1594288905', function (error, response, body) {
    if(!error){
        console.log(JSON.parse(body).data.result);
    } else {
        console.log(error);
    }
});*/
