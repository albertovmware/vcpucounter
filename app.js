const express = require('express');
const { exec } = require('child_process');
const app = express();

const maxVCPUs = process.env.MAX_VCPU || 100;


app.get('/vcpusage', (req, res) => {


  const shellCommand = `
    total_cpus=0
    vm_info=$(kubectl get virtualmachine -A -o custom-columns=NAME:.metadata.name,VMCLASS:.spec.className,NS:.metadata.namespace --no-headers)

    while IFS= read -r line; do
        name=$(echo "$line" | awk '{print $1}')
        vmclass=$(echo "$line" | awk '{print $2}')
        namespace=$(echo "$line" | awk '{print $3}')
        cpu=$(kubectl get virtualmachineclass "$vmclass" -n "$namespace" -o json | jq -r '.spec.hardware.cpus')
        total_cpus=$((total_cpus + cpu))
    done <<< "$vm_info"

    control_plane_cpus=$(kubectl get nodes -l node-role.kubernetes.io/control-plane= --no-headers -o custom-columns=CPUS:.status.capacity.cpu | awk '{sum+=$1} END {print sum}')
    total_cpus=$((total_cpus + control_plane_cpus))
    echo $total_cpus
  `;

  exec(shellCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during script execution: ${error.message}`);
      return res.status(500).send('Si è verificato un errore durante l\'esecuzione dello script.');
    }
    if (stderr) {
      console.error(`Errore nello stderr: ${stderr}`);
      return res.status(500).send('Si è verificato un errore durante l\'esecuzione dello script.');
    }

    const totalvCPUs = parseInt(stdout.trim());
    const percentageInUse = ((totalvCPUs / maxVCPUs) * 100).toFixed(2);


    res.json({ totalvCPUs, maxVCPUs });
    //res.send(`${totalvCPUs}`);
    // res.json({ totalCPUs });
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(3000, () => {
  console.log('Server running on port: 3000');
});
