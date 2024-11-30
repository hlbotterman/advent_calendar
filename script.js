const HASHED_PASSWORD = "9adfb0a6d03beb7141d8ec2708d6d9fef9259d12cd230d50f70fb221ae6cabd5";
const DEV_MODE = false;
const TEST_DATE = new Date("2024-12-03");

let dayTexts = {}; 
let youtubeEmbeddedLinks = {}; 


function loadTexts() {
  const url = "data/texts.json";
  const password = document.getElementById("password").value;

  return fetch(`${url}?t=${Date.now()}`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des textes : " + response.statusText);
      }
      return response.json();
    })
    .then(data => {

      const salt = CryptoJS.enc.Hex.parse(data.salt);
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000,
        hasher: CryptoJS.algo.SHA256,
      });

      const decryptedTexts = {};
      Object.keys(data.data).forEach(day => {
        const { iv, ciphertext } = data.data[day];

        try {
          const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
            iv: CryptoJS.enc.Hex.parse(iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
          });
          const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

          if (!decryptedText) {
            console.error(`Le déchiffrement a échoué pour le jour ${day}`);
          } else {
            decryptedTexts[day] = decryptedText;
          }
        } catch (error) {
          console.error(`Erreur lors du déchiffrement pour ${day} :`, error.message);
        }
      });

      return decryptedTexts;
    })
    .then(decryptedTexts => {
      dayTexts = decryptedTexts;
    })
    .catch(error => {
      console.error("Erreur de chargement ou de déchiffrement des textes :", error.message);
    });
}

function loadEmbeddedLinks() {
    return fetch(`${"data/links.json"}?t=${Date.now()}`)
      .then(response => {
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des liens YouTube");
        }
        return response.json();
      })
      .then(data => {
        youtubeEmbeddedLinks = {}
        for (const [key, url] of Object.entries(data)) {
            youtubeEmbeddedLinks[key] = url.replace("watch?v=", "embed/");
          }
      });
  }

function checkPassword() {
  const input = document.getElementById("password").value;

  const hashedInput = CryptoJS.SHA256(input).toString();
  if (hashedInput === HASHED_PASSWORD) {
    const title = document.getElementById("calendar-title");
    title.style.display = "none";
    document.getElementById("password-section").style.display = "none";
    document.getElementById("calendar-section").style.display = "flex";

    loadTexts()
      .then(() => {
        generateDays();
        updateDayStyles();
      })
      .catch(error => {
        alert("Erreur lors du chargement des textes. Vérifiez le mot de passe.");
      });
  } else {
    alert("Mot de passe incorrect !");
  }
}


const fixedOrder = [12, 5, 8, 1, 24, 19, 10, 15, 3, 6, 17, 2, 7, 23, 20, 9, 14, 22, 13, 18, 21, 4, 11, 16];

function generateDays() {
    const calendarGrid = document.getElementById("calendar-grid");
  
    if (calendarGrid.children.length > 0) return;
  
    fixedOrder.forEach(day => {
      const dayElement = document.createElement("div");
      dayElement.classList.add("day", "locked");
      dayElement.setAttribute("data-day", day);
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    });
  }
 
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; 
    }
  }

function updateDayImage(dayElement, dayNumber) {
  let img = dayElement.querySelector("img");
  if (!img) {
      img = document.createElement("img");
      img.style.width = "100%";
      img.style.height = "auto";
      dayElement.innerHTML = "";
      dayElement.appendChild(img);
  }

  const uniqueHash = Math.random().toString(36).substr(2, 9);
  img.src = "";
  img.src = `data/qr_pieces/qr_${dayNumber}.png?h=${uniqueHash}`;
  img.alt = `QR Code pour le jour ${dayNumber}`;
  img.onload = () => {
    console.log(`Image chargée : ${img.src}`);
  };

  img.onerror = () => {
      img.remove();
      dayElement.innerHTML = "<div style='width: 100%; height: auto; background: #f0f0f0; text-align: center;'>Image introuvable</div>";
  };
}

function updateDayStyles() {
    const today = TEST_DATE || new Date();
    const currentDay = today.getDate();
  
    const unlockedDays = JSON.parse(localStorage.getItem("unlockedDays")) || [];
  
    document.querySelectorAll(".day").forEach(dayElement => {
      const dayNumber = parseInt(dayElement.getAttribute("data-day"), 10);
  
      // Réinitialiser les classes
      dayElement.classList.remove("locked", "unlockable", "unlocked");
      dayElement.removeEventListener("click", () => {});

      if (DEV_MODE || (dayNumber <= currentDay)) {
        if (unlockedDays.includes(dayNumber)) {
          const timestamp = new Date().getTime();
          dayElement.innerHTML = `<img src="data/qr_pieces/qr_${dayNumber}.png?t=${timestamp}" alt="QR Code pour le jour ${dayNumber}" style="width: 100%; height: auto;">`;
          dayElement.classList.add("unlocked");
          dayElement.addEventListener("click", () => {
            showPanel(dayNumber, dayElement);
          });
        } else {
          dayElement.classList.add("unlockable");
          dayElement.addEventListener("click", () => {
            showPanel(dayNumber, dayElement);
          });
        }
      } else {
        dayElement.classList.add("locked");
      }
    });
  }

function showPanel(day, dayElement) {
  const popup = document.getElementById("popup");
  const overlay = document.getElementById("popup-overlay");
  const dayText = document.getElementById("day-text");
  const youtubeVideo = document.getElementById("youtube-video");

  dayText.textContent = dayTexts[day] || "Texte indisponible pour ce jour.";
  youtubeVideo.src = youtubeEmbeddedLinks[day] || "";

  popup.style.display = "block";
  overlay.style.display = "block";

  dayElement.innerHTML = `<img src="data/qr_pieces/qr_${day}.png" alt="QR Code pour le jour ${day}">`;

  const unlockedDays = JSON.parse(localStorage.getItem("unlockedDays")) || [];
  if (!unlockedDays.includes(day)) {
    unlockedDays.push(day);
    localStorage.setItem("unlockedDays", JSON.stringify(unlockedDays));
  }

  updateDayStyles();
}

document.querySelector("#info-button").addEventListener("click", () => {
  document.getElementById("info-popup").style.display = "block";
});

document.getElementById("info-popup-close").addEventListener("click", () => {
  document.getElementById("info-popup").style.display = "none";
});

function closePopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("popup-overlay");
    const youtubeVideo = document.getElementById("youtube-video");
  
    popup.style.display = "none";
    overlay.style.display = "none";
  
    youtubeVideo.src = "";
  }

document.getElementById("popup-close").addEventListener("click", closePopup);

document.getElementById("popup-overlay").addEventListener("click", closePopup);

document.addEventListener("DOMContentLoaded", () => {
    Promise.all([loadEmbeddedLinks()])
    .then(() => {
    generateDays();
    updateDayStyles();
    })
    .catch(error => {
    console.error("Erreur :", error);
    });
});

function resetCalendar() {
    localStorage.removeItem("unlockedDays");
    localStorage.removeItem("hasAccess");
  
    document.querySelectorAll(".day").forEach(dayElement => {
      const dayNumber = parseInt(dayElement.getAttribute("data-day"), 10);
  
      dayElement.innerHTML = dayNumber; // Remet le numéro du jour
      dayElement.classList.remove("locked", "unlockable", "unlocked");
    });
  
    loadTexts();
    loadEmbeddedLinks();

    updateDayStyles();
    alert("Le calendrier a été réinitialisé !");
  }


function showInfo() {
  const infoPopup = document.getElementById("info-popup");
  infoPopup.style.display = "block";
}

function closeInfoPopup() {
  const infoPopup = document.getElementById("info-popup");
  infoPopup.style.display = "none";
}