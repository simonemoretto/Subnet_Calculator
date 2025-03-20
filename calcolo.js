document.addEventListener('DOMContentLoaded', function() {
  // Seleziona gli elementi del DOM
  const calculateBtn = document.getElementById("calculate");
  const networkAddressInput = document.getElementById("networkAddress");
  const subnetCountInput = document.getElementById("subnetCount");
  const resultContainer = document.getElementById("resultContainer");
  const table = document.getElementById("resultTable");
  const tbody = table.querySelector("tbody");
  const notificationElement = document.getElementById("notification");
  const networkSummary = document.getElementById("networkSummary");
  const exportButtons = document.getElementById("exportButtons");
  const networkInfoBtn = document.getElementById("networkInfoBtn");
  const subnetInfoBtn = document.getElementById("subnetInfoBtn");
  const networkInfoPopup = document.getElementById("networkInfoPopup");
  const subnetInfoPopup = document.getElementById("subnetInfoPopup");
  const overlay = document.getElementById("overlay");

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

  // Configurazione dei popup informativi
  networkInfoBtn.addEventListener("click", function() {
    showPopup(networkInfoPopup);
  });

  subnetInfoBtn.addEventListener("click", function() {
    showPopup(subnetInfoPopup);
  });

  document.querySelectorAll('.info-popup-close, .info-popup-footer .btn').forEach(btn => {
    btn.addEventListener("click", function() {
      closePopup(this.closest('.info-popup'));
    });
  });

  overlay.addEventListener("click", function() {
    document.querySelectorAll('.info-popup.visible').forEach(popup => {
      closePopup(popup);
    });
  });

  function showPopup(popup) {
    popup.classList.add('visible');
    overlay.classList.add('visible');
  }

  function closePopup(popup) {
    popup.classList.remove('visible');
    overlay.classList.remove('visible');
  }

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
    let defaultMask;
    let networkClass;
    
    if(firstOctet >= 1 && firstOctet <= 126) {
      defaultMask = 8;
      networkClass = "A";
    } else if(firstOctet >= 128 && firstOctet <= 191) {
      defaultMask = 16;
      networkClass = "B";
    } else if(firstOctet >= 192 && firstOctet <= 223) {
      defaultMask = 24;
      networkClass = "C";
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

    // Calcola il blockSize in base al nuovo prefisso
    const blockSize = Math.pow(2, 32 - newPrefix);
    
    // Calcola la network mask che corrisponde al nuovo prefisso
    const networkMask = (0xFFFFFFFF << (32 - newPrefix)) >>> 0;
    
    // Converti l'indirizzo di rete in intero e applica la maschera di rete
    const baseAddressInt = ipToInt(networkAddress) & networkMask;
    
    // Aggiorna il riepilogo della rete
    document.getElementById("networkClass").textContent = `Classe ${networkClass}`;
    document.getElementById("defaultNetworkBits").textContent = `/${defaultMask}`;
    document.getElementById("subnetBits").textContent = `${bitsNeeded} bit`;
    document.getElementById("newPrefix").textContent = `/${newPrefix}`;
    document.getElementById("hostsPerSubnet").textContent = `${blockSize - 2} host`;
    
    // Mostra il riepilogo della rete
    networkSummary.classList.remove("hidden");
    networkSummary.classList.add("visible");

    // Calcola le sottoreti richieste
    for(let i = 0; i < subnetCount; i++) {
      const subnetAddressInt = baseAddressInt + (i * blockSize);
      const broadcastInt = subnetAddressInt + blockSize - 1;
	  const gatewayInt = subnetAddressInt + 1; 
      const firstHostInt = gatewayInt + 1;
      const lastHostInt = broadcastInt - 1;
      
      
      const subnetAddress = intToIp(subnetAddressInt);
      const broadcast = intToIp(broadcastInt);
      const firstHost = intToIp(firstHostInt);
      const lastHost = intToIp(lastHostInt);
      const gateway = intToIp(gatewayInt);
      
      // Crea una nuova riga nella tabella
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${subnetAddress}</td>
        <td>${firstHost}</td>
        <td>${lastHost}</td>
        <td>${gateway}</td>
        <td>${broadcast}</td>
      `;
      
      tbody.appendChild(row);
    }
    
    // Mostra la tabella dei risultati
    resultContainer.classList.remove("hidden");
    resultContainer.classList.add("visible");
    
    // Mostra i bottoni di esportazione
    exportButtons.classList.remove("hidden");
    exportButtons.classList.add("visible");

    showNotification("Subnetting completato con successo!", "success");
  }

  // Gestisci l'esportazione su Excel
document.getElementById("exportExcel").addEventListener("click", function() {
  let table = document.getElementById("resultTable");
  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Subnets");
  XLSX.writeFile(wb, "subnet_results.xlsx");
  showNotification("Esportazione Excel completata!", "success");
});

// Gestisci l'esportazione su Word
document.getElementById("exportWord").addEventListener("click", function() {
  let table = document.getElementById("resultTable");
  let html = table.outerHTML;
  let blob = new Blob([html], { type: "application/msword" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "subnet_results.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification("Esportazione Word completata!", "success");
});
});
