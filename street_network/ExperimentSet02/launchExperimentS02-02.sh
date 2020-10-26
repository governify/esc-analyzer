
#!/bin/bash

cd ..
echo "#### STARTING EXPERIMENT NUMBER 2: FREQUENCY OF FLOW CALCULATION INCREASED EXPONENTIALLY ###"
for i in $(seq 0 1 6); do                                             
    frequency=$((2**i))
    echo ======================= ITERATION NUMBER $i: $frequency seconds frequency ======================
    ./launchExperiment.sh  4  512  1  $frequency  32 1 exp2
    sleep 5
done
echo "############ EXPERIMENT FINISHED ############"
cd ExperimentSet02