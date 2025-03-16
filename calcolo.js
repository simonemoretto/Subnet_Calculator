document.addEventListener('DOMContentLoaded', function() {
  // Seleziona gli elementi del DOM
  const calculateBtn = document.getElementById("calculate");
  const networkAddressInput = document.getElementById("networkAddress");
  const subnetCountInput = document.getElementById("subnetCount");
  const resultContainer = document.getElementById("resultContainer");
  const table = document.getElementById("resultTable");
  const tbody = table.querySelector("tbody");
  const notificationElement = document.getElementById("notification");
  
  // Elementi del riepilogo rete
  const networkClassElement = document.getElementById("networkClass");
  const defaultNetworkBitsElement = document.getElementById("defaultNetworkBits");
  const subnetBitsElement = document.getElementById("subnetBits");
  const newPrefixElement = document.getElementById("newPrefix");
  const hostsPerSubnetElement = document.getElementById("hostsPerSubnet");
  const networkSummaryElement = document.getElementById("networkSummary");
  const exportButtons = document.getElementById("exportButtons");

  // Aggiungi effetto di focus alle label
  document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  });

  // Effetti sul pulsante
  calculateBtn.addEventListener("mousedown", function() {
    this.style.transform = "scale(0.97)";
  });
  document.addEventListener("mouseup", function() {
    calculateBtn.style.transform = "";
  });

  // Effetto ripple e chiamata al calcolo
  calculateBtn.addEventListener("click", function(e) {
    let x = e.clientX - e.target.getBoundingClientRect().left;
    let y = e.clientY - e.target.getBoundingClientRect().top;

    let ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";

    this.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 600);

    // Avvia il calcolo delle subnet
    calculateSubnets();
  });

  // Gestisci il tasto Enter per avviare il calcolo
  [networkAddressInput, subnetCountInput].forEach(input => {
    input.addEventListener("keyup", function(e) {
      if (e.key === "Enter") {
        calculateBtn.click();
      }
    });
  });

  // Funzione per mostrare notifiche
  function showNotification(message, type = 'success') {
    notificationElement.textContent = message;
    notificationElement.className = 'notification show ' + type;
    setTimeout(() => {
      notificationElement.classList.remove('show');
    }, 3000);
  }

  // Funzioni di conversione IP <-> Intero
  function ipToInt(ip) {
    return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
  }

  function intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  }

  // Funzione per validare l'indirizzo IP
  function validateIp(ip) {
    const octets = ip.split('.');
    if(octets.length !== 4) return false;
    for(let oct of octets) {
      if(isNaN(oct) || oct < 0 || oct > 255) return false;
    }
    return true;
  }

  // Funzione principale di calcolo delle subnet
  function calculateSubnets() {
    // Pulisci risultati precedenti
    tbody.innerHTML = '';
    networkSummaryElement.classList.remove("visible");
    networkSummaryElement.classList.add("hidden");

    const networkAddress = networkAddressInput.value.trim();
    const subnetCount = parseInt(subnetCountInput.value.trim());

    if(!validateIp(networkAddress)) {
      showNotification("Indirizzo di rete non valido.", "error");
      return;
    }

    if(isNaN(subnetCount) || subnetCount < 1) {
      showNotification("Numero di sottoreti non valido.", "error");
      return;
    }

    // Determina la classe e la maschera predefinita
    const firstOctet = parseInt(networkAddress.split('.')[0], 10);
    let defaultMask, networkClass;
    
    if(firstOctet >= 1 && firstOctet <= 126) {
      networkClass = "Classe A";
      defaultMask = 8;
    } else if(firstOctet >= 128 && firstOctet <= 191) {
      networkClass = "Classe B";
      defaultMask = 16;
    } else if(firstOctet >= 192 && firstOctet <= 223) {
      networkClass = "Classe C";
      defaultMask = 24;
    } else {
      showNotification("Classe di indirizzo non supportata.", "error");
      return;
    }

    // Calcola il numero di bit necessari per le sottoreti e il nuovo prefisso
    const bitsNeeded = Math.ceil(Math.log2(subnetCount));
    const newPrefix = defaultMask + bitsNeeded;
    if(newPrefix > 30) {
      showNotification("Numero di sottoreti troppo elevato per la rete data.", "error");
      return;
    }

    // Aggiorna il riepilogo della rete
    networkClassElement.textContent = networkClass;
    defaultNetworkBitsElement.textContent = defaultMask;
    subnetBitsElement.textContent = bitsNeeded;
    newPrefixElement.textContent = newPrefix;
    hostsPerSubnetElement.textContent = (2 ** (32 - newPrefix) - 2);
    networkSummaryElement.classList.remove("hidden");
    networkSummaryElement.classList.add("visible");

    // Calcola le sottoreti
    const blockSize = Math.pow(2, 32 - newPrefix);
    const baseAddressInt = ipToInt(networkAddress);

    for(let i = 0; i < subnetCount; i++) {
      const subnetAddressInt = baseAddressInt + (i * blockSize);
      const broadcastInt = subnetAddressInt + blockSize - 1;
      const firstHostInt = subnetAddressInt + 1;
      const lastHostInt = broadcastInt - 1;
      const gatewayInt = (blockSize >= 4) ? subnetAddressInt + 2 : firstHostInt;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>Subnet ${i + 1}</td>
        <td>${intToIp(subnetAddressInt)}/${newPrefix}</td>
        <td>${intToIp(firstHostInt)}</td>
        <td>${intToIp(lastHostInt)}</td>
        <td>${intToIp(gatewayInt)}</td>
        <td>${intToIp(broadcastInt)}</td>
      `;
      tbody.appendChild(row);
    }

    // Mostra risultati ed esportazione
    resultContainer.classList.remove("hidden");
    resultContainer.classList.add("visible");
    
    if(exportButtons) {
      exportButtons.classList.remove("hidden");
      exportButtons.classList.add("visible");
    }

    showNotification("Subnet calcolate con successo!", "success");
  }

  // Funzioni di esportazione
  function exportToExcel() {
    const tableHTML = table.outerHTML;
    const blob = new Blob(
      [`<html><head><meta charset="UTF-8"></head><body>${tableHTML}</body></html>`],
      { type: 'application/vnd.ms-excel' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subnets.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification("Esportazione su Excel completata!", "success");
  }

  function exportToWord() {
    const tableHTML = table.outerHTML;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>${tableHTML}</body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subnets.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification("Esportazione su Word completata!", "success");
  }

  // Event listener per esportazione
  document.getElementById("exportExcel")?.addEventListener("click", exportToExcel);
  document.getElementById("exportWord")?.addEventListener("click", exportToWord);
});
