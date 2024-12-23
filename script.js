// === CONSTANTES ET CONFIGURATION ===
const HASHED_PASSWORD = "9adfb0a6d03beb7141d8ec2708d6d9fef9259d12cd230d50f70fb221ae6cabd5";
const DEV_MODE = false;

const fixedOrder = [12, 5, 8, 1, 24, 19, 10, 15, 3, 6, 17, 2, 7, 23, 20, 9, 14, 22, 13, 18, 21, 4, 11, 16];

let dayTexts = {};
let youtubeEmbeddedLinks = {};

// === FONCTIONS DE CHARGEMENT DES DONNÉES ===

/**
 * Charge et déchiffre les textes depuis le fichier JSON.
 */
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

/**
 * Charge les liens YouTube intégrés depuis le fichier JSON.
 */
function loadEmbeddedLinks() {
  return fetch(`${"data/links.json"}?t=${Date.now()}`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des liens YouTube");
      }
      return response.json();
    })
    .then(data => {
      youtubeEmbeddedLinks = {};
      for (const [key, url] of Object.entries(data)) {
        youtubeEmbeddedLinks[key] = url.replace("watch?v=", "embed/");
      }
    });
}

// === FONCTIONS D'AUTHENTIFICATION ===

/**
 * Vérifie le mot de passe saisi par l'utilisateur.
 */
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

// === FONCTIONS DE GÉNÉRATION DU CALENDRIER ===

/**
 * Génère les cases du calendrier en fonction de l'ordre fixé.
 */
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

/**
 * Met à jour les styles des jours en fonction de la date actuelle et des jours débloqués.
 */
function updateDayStyles() {
  const today = new Date();
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
      checkAllDaysUnlocked();
    } else {
      dayElement.classList.add("locked");
    }
  });
}

// === FONCTIONS D'INTERACTION UTILISATEUR ===

/**
 * Affiche le panneau d'information pour un jour donné.
 * @param {number} day - Le numéro du jour.
 * @param {HTMLElement} dayElement - L'élément du jour cliqué.
 */
function showPanel(day, dayElement) {
  const popup = document.getElementById("popup");
  const overlay = document.getElementById("popup-overlay");
  const dayText = document.getElementById("day-text");
  const youtubeVideo = document.getElementById("youtube-video");

  if (day=="24"){
    dayTexts[day] = "24. En cette veille de Noël, c'est LA chanson ultime pour clore ce calendrier en beauté ! Ca rappelle tellement les messes de l'école avant les vacances, l'horreur ce Jésus ! Bon, j'espère que t'es plus aussi fan de catéchisme et de Jésus qu'avant quand même sinon... bah peu importe puisque 'Quand il reviendraaa il nous pardonnera comme il l'avait fait pour Judaaaaaaaa' (sa tête est tellement Gucci, rien que pour ça, j'étais obligée de mettre cette chanson).";
  }
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

/**
 * Ferme le popup d'information.
 */
function closePopup() {
  const popup = document.getElementById("popup");
  const overlay = document.getElementById("popup-overlay");
  const youtubeVideo = document.getElementById("youtube-video");

  popup.style.display = "none";
  overlay.style.display = "none";
  youtubeVideo.src = "";
}

/**
 * Réinitialise le calendrier en effaçant les données du localStorage.
 */
function resetCalendar() {
  localStorage.removeItem("unlockedDays");
  localStorage.removeItem("hasAccess");

  document.querySelectorAll(".day").forEach(dayElement => {
    const dayNumber = parseInt(dayElement.getAttribute("data-day"), 10);
    dayElement.innerHTML = dayNumber; // Remet le numéro du jour
    dayElement.classList.remove("locked", "unlockable", "unlocked");
  });

  document.getElementById("final-message-button").style.display = "none";

  loadTexts();
  loadEmbeddedLinks();
  updateDayStyles();
  alert("Le calendrier a été réinitialisé !");
}

/**
 * Affiche le popup d'information générale.
 */
function showInfo() {
  const infoPopup = document.getElementById("info-popup");
  infoPopup.style.display = "block";
}

/**
 * Ferme le popup d'information générale.
 */
function closeInfoPopup() {
  const infoPopup = document.getElementById("info-popup");
  infoPopup.style.display = "none";
}

/**
 * Vérifie si tous les jours sont débloqués.
 */
function checkAllDaysUnlocked() {
  const totalDays = 24;
  const today = new Date();
  const currentDay = DEV_MODE ? 24 : today.getDate();

  const daysToUnlock = Math.min(currentDay, totalDays);

  // Générer une liste des jours débloqués
  const unlockedDays = [];
  for (let day = 1; day <= daysToUnlock; day++) {
      unlockedDays.push(day);
  }

  let viewedDays = JSON.parse(localStorage.getItem("viewedDays")) || [];

  if (DEV_MODE) {
      viewedDays = unlockedDays;
      localStorage.setItem("viewedDays", JSON.stringify(viewedDays));
  }

  const allUnlocked = unlockedDays.every(day => viewedDays.includes(day));

  if (allUnlocked && daysToUnlock === totalDays) {
      document.getElementById("final-message-button").style.display = "block";
  } else {
      document.getElementById("final-message-button").style.display = "none";
  }
}


/**
 * Affiche la popup du message final.
 */
function showFinalMessage() {
  document.getElementById("final-message-popup").style.display = "block";
  document.getElementById("final-message-overlay").style.display = "block";
}

/**
* Ferme la popup du message final.
*/
function closeFinalMessage() {
  document.getElementById("final-message-popup").style.display = "none";
  document.getElementById("final-message-overlay").style.display = "none";
}

// === GESTIONNAIRES D'ÉVÉNEMENTS ===

// Gestion du clic sur le bouton d'information
document.querySelector("#info-button").addEventListener("click", showInfo);
document.getElementById("info-popup-close").addEventListener("click", closeInfoPopup);

// Gestion du clic pour fermer le popup d'un jour
document.getElementById("popup-close").addEventListener("click", closePopup);
document.getElementById("popup-overlay").addEventListener("click", closePopup);

// Gestion du clic pour le message final
document.getElementById("final-message-close").addEventListener("click", closeFinalMessage);
document.getElementById("final-message-overlay").addEventListener("click", closeFinalMessage);

// Chargement initial du contenu après le chargement du DOM
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
