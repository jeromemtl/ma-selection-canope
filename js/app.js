// ============================================
// APPLICATION PRINCIPALE
// ============================================

// État global
let formationsData = [];
let formateursActifs = [];
let currentMonth = '';

// Liste des formateurs (avec prénoms complets)
const FORMATEURS_LIST = [
    { id: 'guillaume', nom: 'Guillaume' },
    { id: 'natacha', nom: 'Natacha' },
    { id: 'pascaline', nom: 'Pascaline' },
    { id: 'sara', nom: 'Sara' }
];

// ============================================
// FONCTIONS UTILITAIRES POUR L'URL
// ============================================

/**
 * Récupère le paramètre 'mois' dans l'URL
 * @returns {string|null} La valeur du paramètre mois (ex: "2025-05") ou null
 */
function getMoisFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mois');
}

/**
 * Met à jour l'URL avec le mois sélectionné (sans recharger la page)
 * @param {string} mois - Valeur du mois (ex: "2025-05")
 */
function updateURLWithMois(mois) {
    const newUrl = window.location.pathname + '?mois=' + mois;
    window.history.pushState({ mois: mois }, '', newUrl);
}

// ============================================
// CHARGEMENT DES FICHIERS JSON VIA INDEX.JSON
// ============================================

/**
 * Remplit le sélecteur de mois avec les fichiers listés dans index.json
 * Sélectionne automatiquement le mois en cours ou celui dans l'URL
 */
async function populateMonthSelector() {
    const select = document.getElementById('month-select');
    select.innerHTML = '<option value="">-- Chargement des fichiers --</option>';
    
    try {
        // Charger la liste des fichiers depuis index.json
        const response = await fetch('data/index.json');
        if (!response.ok) {
            throw new Error('Impossible de charger index.json');
        }
        const fichiers = await response.json();
        
        select.innerHTML = '<option value="">-- Sélectionner un mois --</option>';
        
        const aujourdHui = new Date();
        const anneeActuelle = aujourdHui.getFullYear();
        const moisActuel = aujourdHui.getMonth() + 1;
        const moisActuelStr = anneeActuelle + '-' + (moisActuel < 10 ? '0' + moisActuel : moisActuel);
        
        // Récupérer le mois demandé dans l'URL
        const moisFromURL = getMoisFromURL();
        
        let selectedIndex = -1;
        let selectedValue = null;
        
        // Trier les fichiers par date (du plus ancien au plus récent)
        fichiers.sort();
        
        for (let i = 0; i < fichiers.length; i++) {
            const fichier = fichiers[i];
            const moisAnnee = fichier.replace('.json', '');
            const parties = moisAnnee.split('-');
            const annee = parties[0];
            const mois = parties[1];
            const nomMois = new Date(parseInt(annee), parseInt(mois) - 1, 1).toLocaleString('fr-FR', { month: 'long' });
            const option = document.createElement('option');
            option.value = 'data/' + fichier;
            option.textContent = nomMois + ' ' + annee;
            option.setAttribute('data-mois', moisAnnee);
            
            // Priorité : 1. Mois dans l'URL, 2. Mois actuel, 3. Dernier fichier
            if (moisFromURL && moisAnnee === moisFromURL) {
                selectedIndex = i;
                selectedValue = option.value;
                option.selected = true;
            } else if (!moisFromURL && moisAnnee === moisActuelStr) {
                selectedIndex = i;
                selectedValue = option.value;
                option.selected = true;
            }
            
            select.appendChild(option);
        }
        
        // Si aucun mois n'a été sélectionné, prendre le dernier (le plus récent)
        if (selectedIndex === -1 && select.options.length > 1) {
            select.options[select.options.length - 1].selected = true;
            selectedValue = select.options[select.options.length - 1].value;
            const selectedMois = select.options[select.options.length - 1].getAttribute('data-mois');
            updateURLWithMois(selectedMois);
        } else if (selectedValue) {
            // Mettre à jour l'URL avec le mois sélectionné
            const selectedMois = select.options[selectedIndex].getAttribute('data-mois');
            updateURLWithMois(selectedMois);
        }
        
        if (select.value) {
            chargerMoisSelectionne(select.value);
        } else {
            document.getElementById('formations-grid').innerHTML = '<div class="no-results">📭 Aucun fichier JSON disponible dans le dossier data/</div>';
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement de index.json:', error);
        select.innerHTML = '<option value="">-- Erreur de chargement --</option>';
        document.getElementById('formations-grid').innerHTML = '<div class="no-results">❌ Le fichier data/index.json est introuvable. Créez-le avec la liste des fichiers disponibles.</div>';
    }
}

/**
 * Charge un fichier JSON
 * @param {string} url - Chemin du fichier
 */
async function chargerJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur de chargement:', error);
        return null;
    }
}

/**
 * Charge le mois sélectionné
 * @param {string} url - Chemin du fichier
 */
async function chargerMoisSelectionne(url) {
    const grid = document.getElementById('formations-grid');
    grid.innerHTML = '<div class="loading">📥 Chargement des formations...</div>';
    
    const data = await chargerJSON(url);
    if (data) {
        formationsData = data;
        const select = document.getElementById('month-select');
        const selectedOption = select.options[select.selectedIndex];
        currentMonth = selectedOption ? selectedOption.textContent : '';
        applyFilters();
    } else {
        formationsData = [];
        grid.innerHTML = '<div class="no-results">❌ Erreur de chargement du fichier</div>';
    }
}

// ============================================
// AFFICHAGE DES FORMATIONS
// ============================================

/**
 * Crée le HTML d'une carte de formation (avec pills pour les formateurs)
 * @param {object} formation - Données de la formation
 * @returns {string} HTML de la carte
 */
function createCardHTML(formation) {
    let formateursPills = '';
    if (formation.formateurs) {
        for (let i = 0; i < formation.formateurs.length; i++) {
            const info = getFormateurInfo(formation.formateurs[i]);
            formateursPills += '<span class="formateur-pill ' + info.className + '">' + info.nom + '</span>';
        }
    }
    if (formateursPills === '') formateursPills = '—';
    
    const safeTitre = (formation.titre || 'Sans titre').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    let imageHtml = '';
    if (formation.image) {
        imageHtml = '<img class="card-image" src="' + formation.image + '" alt="' + safeTitre + '" loading="lazy">';
    } else {
        imageHtml = '<div class="card-image" style="background:#e9ecef; display:flex; align-items:center; justify-content:center;">📚</div>';
    }
    
    let badgesHtml = '<span class="badge badge-type">' + (formation.type || 'Formation') + '</span>';
    if (formation.duree) badgesHtml += '<span class="badge">⏱️ ' + formation.duree + '</span>';
    if (formation.niveau) badgesHtml += '<span class="badge">🎓 ' + formation.niveau + '</span>';
    
    let detailsHtml = '';
    if (formation.date) detailsHtml += '<div class="detail-line"><strong>📅 Date :</strong> ' + formatDate(formation.date) + '</div>';
    if (formation.modalite) detailsHtml += '<div class="detail-line"><strong>💻 Modalité :</strong> ' + formation.modalite + '</div>';
    if (formation.difficulte) detailsHtml += '<div class="detail-line"><strong>⭐ Difficulté :</strong> ' + formation.difficulte + '</div>';
    
    // Générer le texte du lien en fonction du domaine
    let linkText = 'Voir la formation';
    let linkHtml = '';
    if (formation.lien) {
        linkText = getSiteNameFromUrl(formation.lien);
        linkHtml = '<a class="card-link" href="' + formation.lien + '" target="_blank" rel="noopener">🔗 ' + linkText + '</a>';
    }
    
    return `
        <div class="formation-card" data-formateurs="${(formation.formateurs || []).join(',')}">
            ${imageHtml}
            <div class="card-content">
                <h3 class="card-title">${safeTitre}</h3>
                <div class="card-badges">${badgesHtml}</div>
                <div class="card-details">${detailsHtml}</div>
                <div class="card-formateurs">
                    <strong>👥 Formateurs :</strong>
                    ${formateursPills}
                </div>
                ${linkHtml}
            </div>
        </div>
    `;
}

/**
 * Affiche les formations dans la grille
 * @param {Array} formations - Liste des formations à afficher
 */
function afficherFormations(formations) {
    const grid = document.getElementById('formations-grid');
    
    if (!formations || formations.length === 0) {
        grid.innerHTML = '<div class="no-results">📭 Aucune formation ne correspond aux critères</div>';
        updateStats(formations);
        return;
    }
    
    let cardsHTML = '';
    for (let i = 0; i < formations.length; i++) {
        cardsHTML += createCardHTML(formations[i]);
    }
    grid.innerHTML = cardsHTML;
    updateStats(formations);
}

/**
 * Met à jour les statistiques
 * @param {Array} formations - Liste des formations
 */
function updateStats(formations) {
    const formationCount = formations.length;
    const allFormateurs = new Set();
    let selectionCount = 0;
    
    for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (f.formateurs) {
            for (let j = 0; j < f.formateurs.length; j++) {
                allFormateurs.add(f.formateurs[j]);
                selectionCount++;
            }
        }
    }
    
    const formateurCount = allFormateurs.size;
    
    document.getElementById('formation-count').textContent = formationCount;
    document.getElementById('formateur-count').textContent = formateurCount;
    document.getElementById('selection-count').textContent = selectionCount;
}

// ============================================
// FILTRES
// ============================================

/**
 * Filtre les formations selon les critères
 * @returns {Array} Formations filtrées
 */
function filtrerFormations() {
    if (!formationsData || formationsData.length === 0) return [];
    
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const formateursFiltres = formateursActifs;
    const resultats = [];
    
    for (let i = 0; i < formationsData.length; i++) {
        const formation = formationsData[i];
        let ok = true;
        
        // Filtre par recherche (titre, type, nom du formateur)
        if (searchTerm) {
            const titreMatch = (formation.titre || '').toLowerCase().indexOf(searchTerm) !== -1;
            const typeMatch = (formation.type || '').toLowerCase().indexOf(searchTerm) !== -1;
            let formateursMatch = false;
            
            if (formation.formateurs) {
                for (let j = 0; j < formation.formateurs.length; j++) {
                    const info = getFormateurInfo(formation.formateurs[j]);
                    if (info.nom.toLowerCase().indexOf(searchTerm) !== -1) {
                        formateursMatch = true;
                        break;
                    }
                }
            }
            
            if (!titreMatch && !typeMatch && !formateursMatch) {
                ok = false;
            }
        }
        
        // Filtre par formateurs
        if (ok && formateursFiltres.length > 0) {
            let hasFormateur = false;
            if (formation.formateurs) {
                for (let j = 0; j < formateursFiltres.length; j++) {
                    if (formation.formateurs.indexOf(formateursFiltres[j]) !== -1) {
                        hasFormateur = true;
                        break;
                    }
                }
            }
            if (!hasFormateur) {
                ok = false;
            }
        }
        
        if (ok) {
            resultats.push(formation);
        }
    }
    
    return resultats;
}

/**
 * Applique tous les filtres et met à jour l'affichage
 */
function applyFilters() {
    const filtered = filtrerFormations();
    afficherFormations(filtered);
}

// ============================================
// GESTION DES FORMATEURS (filtres)
// ============================================

/**
 * Crée les boutons de filtre par formateur (style pill)
 */
function createFormateurFilters() {
    const container = document.getElementById('formateur-filters');
    container.innerHTML = '';
    
    for (let i = 0; i < FORMATEURS_LIST.length; i++) {
        const formateur = FORMATEURS_LIST[i];
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-formateur', formateur.id);
        btn.textContent = formateur.nom;
        btn.title = 'Filtrer par ' + formateur.nom;
        
        btn.addEventListener('click', (function(fId) {
            return function() {
                btn.classList.toggle('active');
                
                if (btn.classList.contains('active')) {
                    formateursActifs.push(fId);
                } else {
                    const newActifs = [];
                    for (let j = 0; j < formateursActifs.length; j++) {
                        if (formateursActifs[j] !== fId) {
                            newActifs.push(formateursActifs[j]);
                        }
                    }
                    formateursActifs = newActifs;
                }
                
                applyFilters();
            };
        })(formateur.id));
        
        container.appendChild(btn);
    }
}

// ============================================
// INITIALISATION
// ============================================

/**
 * Initialise l'application
 */
function init() {
    console.log('[App] Initialisation...');
    
    // Créer les boutons de filtre
    createFormateurFilters();
    
    // Remplir le sélecteur de mois via index.json
    populateMonthSelector();
    
    // Écouter les événements
    document.getElementById('month-select').addEventListener('change', function(e) {
        const url = e.target.value;
        if (!url) {
            formationsData = [];
            afficherFormations([]);
            return;
        }
        
        // Mettre à jour l'URL avec le mois sélectionné
        const selectedOption = e.target.options[e.target.selectedIndex];
        const moisAnnee = selectedOption.getAttribute('data-mois');
        if (moisAnnee) {
            updateURLWithMois(moisAnnee);
        }
        
        chargerMoisSelectionne(url);
    });
    
    document.getElementById('search-input').addEventListener('input', function() {
        applyFilters();
    });
    
    document.getElementById('reset-filters').addEventListener('click', function() {
        // Réinitialiser les filtres formateurs
        const btns = document.querySelectorAll('.filter-btn');
        for (let i = 0; i < btns.length; i++) {
            btns[i].classList.remove('active');
        }
        formateursActifs = [];
        
        // Réinitialiser la recherche
        document.getElementById('search-input').value = '';
        
        // Réappliquer les filtres
        applyFilters();
    });
    
    document.getElementById('export-csv').addEventListener('click', function() {
        const filtered = filtrerFormations();
        if (filtered.length === 0) {
            alert('Aucune donnée à exporter');
            return;
        }
        const monthName = currentMonth || new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'numeric' });
        exporterCSV(filtered, 'panier_' + monthName.replace(/ /g, '_') + '.csv');
    });
    
    document.getElementById('export-html').addEventListener('click', function() {
        const filtered = filtrerFormations();
        if (filtered.length === 0) {
            alert('Aucune donnée à exporter');
            return;
        }
        const monthName = currentMonth || new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'numeric' });
        exporterHTML(filtered, currentMonth, 'panier_' + monthName.replace(/ /g, '_') + '.html');
    });
    
    // Écouter le changement d'URL (bouton précédent/suivant du navigateur)
    window.addEventListener('popstate', function(event) {
        const moisFromURL = getMoisFromURL();
        if (moisFromURL) {
            // Chercher l'option correspondante dans le select
            const select = document.getElementById('month-select');
            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];
                const moisAnnee = option.getAttribute('data-mois');
                if (moisAnnee === moisFromURL) {
                    select.selectedIndex = i;
                    chargerMoisSelectionne(option.value);
                    break;
                }
            }
        }
    });
    
    console.log('[App] Prêt');
}

// Démarrer l'application au chargement de la page
document.addEventListener('DOMContentLoaded', init);