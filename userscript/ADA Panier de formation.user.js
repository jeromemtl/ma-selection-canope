// ==UserScript==
// @name         ADA - Panier de formations (version formateurs)
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description   Panier collaboratif avec sélection par formateur, export JSON par mois
// @author       Vous
// @match        https://ada-dev.lab.reseau-canope.fr/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     snackbarCSS https://cdn.jsdelivr.net/npm/node-snackbar@latest/dist/snackbar.min.css
// @require      https://cdn.jsdelivr.net/npm/node-snackbar@latest/dist/snackbar.min.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    if (window.__ADA_PANIER_LOADED__) return;
    window.__ADA_PANIER_LOADED__ = true;

    console.log('[ADA Panier] v3.2 démarré - Mode formateurs');

    // === CONSTANTES ===
    const STORAGE_KEY = 'ada_formations_panier';
    const FORMATEURS = [
        { id: 'guillaume', initial: 'Ⓖ', nom: 'Guillaume', color: '#006979' },
        { id: 'natacha', initial: 'Ⓝ', nom: 'Natacha', color: '#17a2b8' },
        { id: 'pascaline', initial: 'Ⓟ', nom: 'Pascaline', color: '#28a745' },
        { id: 'sara', initial: 'Ⓢ', nom: 'Sara', color: '#fd7e14' }
    ];

    // === STYLES ===
    GM_addStyle(`
        .card-copied {
            background-color: #e8f5e9 !important;
            border: 3px solid #4caf50 !important;
            border-radius: 10px !important;
            transition: all 0.3s ease;
        }

        .formateurs-container {
            display: inline-flex;
            gap: 4px;
            margin-right: 8px;
        }

        .btn-formateur {
            width: 32px;
            height: 32px;
            border-radius: 100%;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: bold;
            transition: all 0.2s ease;
            background-color: #f0f0f0;
            color: #666;
            margin: 0;
            padding: 0;
        }

        .btn-formateur.selected {
            color: white;
        }

        .btn-formateur.selected[data-formateur="guillaume"] {
            background-color: #006979;
        }
        .btn-formateur.selected[data-formateur="natacha"] {
            background-color: #17a2b8;
        }
        .btn-formateur.selected[data-formateur="pascaline"] {
            background-color: #28a745;
        }
        .btn-formateur.selected[data-formateur="sara"] {
            background-color: #fd7e14;
        }

        .btn-formateur:hover {
            transform: scale(1.05);
            filter: brightness(0.9);
        }

        .btn-formateur:active {
            transform: scale(0.95);
        }

        .month-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .month-popup {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            min-width: 300px;
            text-align: center;
        }

        .month-popup h3 {
            margin-top: 0;
            color: #006979;
        }

        .month-popup select {
            width: 100%;
            padding: 10px;
            margin: 15px 0;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
        }

        .month-popup button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        .month-popup .btn-confirm {
            background-color: #28a745;
            color: white;
        }

        .month-popup .btn-confirm:hover {
            background-color: #218838;
        }

        .month-popup .btn-cancel {
            background-color: #6c757d;
            color: white;
        }

        .month-popup .btn-cancel:hover {
            background-color: #5a6268;
        }

        #panier-actions-container button {
            transition: transform 0.2s, opacity 0.3s;
        }

        #panier-actions-container button:hover {
            transform: scale(1.05);
        }
    `);

    // === GESTION DU PANIER ===
    function getPanier() {
        const panier = localStorage.getItem(STORAGE_KEY);
        return panier ? JSON.parse(panier) : [];
    }

    function savePanier(panier) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(panier));
        updateBadge();
        rechargerMarquage();
    }

    // Ajouter ou retirer un formateur d'une formation
    function toggleFormateur(carte, formateurId) {
        const formationId = genererIdCarte(carte);
        let panier = getPanier();
        const index = panier.findIndex(item => item.id === formationId);

        if (index !== -1) {
            const formateursActuels = panier[index].formateurs || [];

            if (formateursActuels.includes(formateurId)) {
                // Retirer le formateur
                const nouveauxFormateurs = formateursActuels.filter(f => f !== formateurId);
                if (nouveauxFormateurs.length === 0) {
                    // Supprimer complètement la formation si plus aucun formateur
                    panier.splice(index, 1);
                } else {
                    panier[index].formateurs = nouveauxFormateurs;
                }
            } else {
                // Ajouter le formateur
                panier[index].formateurs = [...formateursActuels, formateurId];
            }
            savePanier(panier);
        } else {
            // Nouvelle formation - on la crée avec ce formateur
            const formation = extraireDonneesDepuisCarte(carte);
            formation.formateurs = [formateurId];
            panier.push(formation);
            savePanier(panier);
        }
    }

    // Vérifier si un formateur est sélectionné pour une formation
    function isFormateurSelected(carte, formateurId) {
        const formationId = genererIdCarte(carte);
        const panier = getPanier();
        const formation = panier.find(item => item.id === formationId);
        return formation ? (formation.formateurs || []).includes(formateurId) : false;
    }

    function viderPanier() {
        if (confirm('🗑️ Vider tout le panier ?')) {
            localStorage.removeItem(STORAGE_KEY);
            updateBadge();
            rechargerMarquage();
            showNotification('🗑️ Panier vidé !', '');
        }
    }

    // Popup pour choisir le mois
    // Popup pour choisir le mois (version mois+1 par défaut)
function choisirMoisEtExporter() {
    const panier = getPanier();
    if (panier.length === 0) {
        showNotification('📭 Panier vide', 'Rien à exporter', true);
        return;
    }

    const maintenant = new Date();
    let annee = maintenant.getFullYear();
    let moisActuel = maintenant.getMonth() + 1; // 1-12

    // Mois suivant (pour la sélection par défaut)
    let moisParDefaut = moisActuel + 1;
    let anneeParDefaut = annee;
    if (moisParDefaut > 12) {
        moisParDefaut = 1;
        anneeParDefaut = annee + 1;
    }

    const overlay = document.createElement('div');
    overlay.className = 'month-popup-overlay';

    // Générer les 12 prochains mois
    let optionsMois = [];
    let tempAnnee = annee;
    let tempMois = moisActuel;

    for (let i = 0; i < 12; i++) {
        // Passer au mois suivant
        tempMois++;
        if (tempMois > 12) {
            tempMois = 1;
            tempAnnee++;
        }

        const moisStr = tempMois.toString().padStart(2, '0');
        const nomMois = new Date(tempAnnee, tempMois - 1, 1).toLocaleString('fr-FR', { month: 'long' });
        const selected = (tempMois === moisParDefaut && tempAnnee === anneeParDefaut) ? 'selected' : '';

        optionsMois.push(`<option value="${tempAnnee}-${moisStr}" ${selected}>${nomMois} ${tempAnnee}</option>`);
    }

    overlay.innerHTML = `
        <div class="month-popup">
            <h3>📅 Exporter le panier</h3>
            <p>Le panier sera sauvegardé pour le mois de :</p>
            <select id="month-select">
                ${optionsMois.join('')}
            </select>
            <div style="margin-top: 15px; font-size: 12px; color: #666;">
                ⚡ Mois suivant sélectionné par défaut
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-confirm" id="confirm-export">✅ Exporter en JSON</button>
                <button class="btn-cancel" id="cancel-export">❌ Annuler</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-export').addEventListener('click', () => {
        const selectedValue = document.getElementById('month-select').value;
        overlay.remove();
        exporterJSON(selectedValue);
    });

    document.getElementById('cancel-export').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

    // Exporter en JSON
    function exporterJSON(monthValue) {
        const panier = getPanier();
        if (panier.length === 0) {
            showNotification('📭 Panier vide', 'Rien à exporter', true);
            return;
        }

        const exportData = panier.map(item => ({
            titre: item.titre,
            type: item.type,
            duree: item.duree,
            date: item.date,
            modalite: item.modalite,
            niveau: item.niveau,
            difficulte: item.difficulte,
            lien: item.lien,
            image: item.image,
            formateurs: item.formateurs || []
        }));

        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${monthValue}.json`;
        link.click();
        URL.revokeObjectURL(url);

        showNotification(`📥 ${exportData.length} formation(s) exportée(s) pour ${monthValue} !`, '');
    }

    // Badge = nombre de formations
    function updateBadge() {
        const badge = document.getElementById('panier-badge');
        if (badge) {
            const panier = getPanier();
            const count = panier.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    function showNotification(message, titre, isError = false) {
        const text = titre ? `${message} ${titre.substring(0, 50)}` : message;
        if (typeof Snackbar !== 'undefined') {
            Snackbar.show({
                text: text,
                duration: 2000,
                actionText: '✕',
                backgroundColor: isError ? '#dc3545' : '#28a745',
                pos: 'bottom-right'
            });
        }
    }

    // === MARQUAGE DES CARTES ===
    function marquerCarte(carte, hasFormateurs) {
        if (hasFormateurs) carte.classList.add('card-copied');
        else carte.classList.remove('card-copied');
    }

    function rechargerMarquage() {
        const panier = getPanier();
        const idsAvecFormateurs = new Set(panier.map(item => item.id));

        document.querySelectorAll('ada-training-card').forEach(carte => {
            const formationId = genererIdCarte(carte);
            if (formationId) {
                const aDesFormateurs = idsAvecFormateurs.has(formationId);
                marquerCarte(carte, aDesFormateurs);

                // Mettre à jour l'apparence des boutons formateurs
                const btns = carte.querySelectorAll('.btn-formateur');
                btns.forEach(btn => {
                    const formateurId = btn.getAttribute('data-formateur');
                    const estSelectionne = isFormateurSelected(carte, formateurId);
                    if (estSelectionne) {
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                    }
                });
            }
        });
    }

    // === EXTRACTION DONNÉES ===
    function genererIdCarte(carte) {
        const lien = carte.querySelector('.card__button')?.href || '';
        return lien || carte.querySelector('.card__title')?.textContent.trim() || '';
    }

    function extraireDonneesDepuisCarte(carte) {
        const lien = carte.querySelector('.card__button')?.href || '';

        let imageUrl = '';
        const imgElement = carte.querySelector('.card__img img');
        if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
        }

        return {
            id: genererIdCarte(carte),
            titre: carte.querySelector('.card__title')?.textContent.trim() || '',
            type: carte.querySelector('.badge--blanc-bold')?.textContent.trim() || '',
            duree: (() => {
                const d = carte.querySelector('.badge--blanc.abs-bottom-right-10')?.textContent.trim();
                return d ? d.replace(/\s+/g, ' ').trim() : '';
            })(),
            date: carte.querySelector('.card__informations li:first-child div:first-child')?.textContent.trim() || '',
            modalite: (() => {
                for (const li of carte.querySelectorAll('.card__informations li')) {
                    const span = li.querySelector('span');
                    if (span?.textContent.includes('Modalité')) {
                        const match = span.textContent.match(/Modalité :\s*(.+)/);
                        if (match) return match[1].trim();
                    }
                }
                return '';
            })(),
            niveau: (() => {
                for (const li of carte.querySelectorAll('.card__informations li')) {
                    const span = li.querySelector('span');
                    if (span?.textContent.includes('Niveau')) {
                        const match = span.textContent.match(/Niveau :\s*(.+)/);
                        if (match) return match[1].trim();
                    }
                }
                return '';
            })(),
            difficulte: (() => {
                for (const li of carte.querySelectorAll('.card__informations li')) {
                    const span = li.querySelector('span');
                    if (span?.textContent.includes('Difficulté')) {
                        const match = span.textContent.match(/Difficulté :\s*(.+)/);
                        if (match) return match[1].trim();
                    }
                }
                return '';
            })(),
            lien: lien,
            image: imageUrl,
            formateurs: []
        };
    }

    // === AJOUT DES BOUTONS PAR FORMATEUR ===
    function ajouterBoutonsFormateurs(carte) {
        if (carte.querySelector('.formateurs-container')) return;

        const cardBottom = carte.querySelector('.card__bottom');
        if (!cardBottom) return;

        let btnShare = cardBottom.querySelector('.btn');
        if (!btnShare) {
            btnShare = cardBottom.querySelector('.card__button');
        }
        if (!btnShare) return;

        const container = document.createElement('div');
        container.className = 'formateurs-container';

        FORMATEURS.forEach(formateur => {
            const btn = document.createElement('button');
            btn.className = 'btn-formateur';
            btn.setAttribute('data-formateur', formateur.id);
            btn.setAttribute('title', formateur.nom);
            btn.textContent = formateur.initial;

            // État initial
            if (isFormateurSelected(carte, formateur.id)) {
                btn.classList.add('selected');
            }

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const etaitSelectionne = btn.classList.contains('selected');

                // Toggle le formateur
                toggleFormateur(carte, formateur.id);

                // Mettre à jour l'apparence du bouton
                if (etaitSelectionne) {
                    btn.classList.remove('selected');
                    showNotification(`➖ ${formateur.nom} a retiré`, getTitreFromCarte(carte));
                } else {
                    btn.classList.add('selected');
                    showNotification(`➕ ${formateur.nom} a ajouté`, getTitreFromCarte(carte));
                }

                // Mettre à jour le marquage de la carte
                const panierApres = getPanier();
                const formationId = genererIdCarte(carte);
                const formationApres = panierApres.find(item => item.id === formationId);
                const aDesFormateurs = formationApres && (formationApres.formateurs?.length || 0) > 0;
                marquerCarte(carte, aDesFormateurs);

                // Mettre à jour le badge
                updateBadge();

                // Animation
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 150);
            });

            container.appendChild(btn);
        });

        cardBottom.insertBefore(container, btnShare);

        // Marquage initial de la carte
        const formationId = genererIdCarte(carte);
        const panier = getPanier();
        const formation = panier.find(item => item.id === formationId);
        if (formation && formation.formateurs && formation.formateurs.length > 0) {
            marquerCarte(carte, true);
        }
    }

    function getTitreFromCarte(carte) {
        return carte.querySelector('.card__title')?.textContent.trim() || '';
    }

    // === BOUTONS FLOTTANTS ===
    function ajouterBoutonsFlottants() {
        if (document.getElementById('panier-actions-container')) return;

        const oldContainer = document.querySelector('.catalogue-layout__main-actions.fixed-bottom-right');
        if (oldContainer) oldContainer.style.display = 'none';

        const container = document.createElement('div');
        container.id = 'panier-actions-container';
        container.style.cssText = `
            position: fixed;
            bottom: 6rem;
            right: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 9999;
        `;

        const btnStyle = `
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        `;

        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 17L4 19C4 20.1046 4.89543 21 6 21L18 21C19.1046 21 20 20.1046 20 19L20 17M12 3L12 15M12 15L16 11M12 15L8 11" stroke="white" stroke-width="2"/></svg>`;
        exportBtn.title = 'Exporter le panier en JSON (choisir le mois)';
        exportBtn.style.cssText = btnStyle + 'background-color: #28a745; color: white;';
        exportBtn.onclick = choisirMoisEtExporter;

        const badgeContainer = document.createElement('div');
        badgeContainer.style.position = 'relative';
        const badge = document.createElement('span');
        badge.id = 'panier-badge';
        badge.style.cssText = `position: absolute; top: -6px; right: -6px; background: #ff5722; color: white; border-radius: 20px; min-width: 22px; height: 22px; font-size: 12px; font-weight: bold; display: none; align-items: center; justify-content: center; padding: 0 5px;`;
        badgeContainer.appendChild(exportBtn);
        badgeContainer.appendChild(badge);

        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20M10 11V16M14 11V16M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="white" stroke-width="2"/></svg>`;
        clearBtn.title = 'Vider le panier';
        clearBtn.style.cssText = btnStyle + 'background-color: #dc3545; color: white;';
        clearBtn.onclick = viderPanier;

        const scrollBtn = document.createElement('button');
        scrollBtn.id = 'scroll-top-btn';
        scrollBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L12 20M12 4L18 10M12 4L6 10" stroke="white" stroke-width="2"/></svg>`;
        scrollBtn.title = 'Remonter en haut';
        scrollBtn.style.cssText = btnStyle + 'background-color: #006979; color: white; display: none; opacity: 0;';
        scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

        container.appendChild(badgeContainer);
        container.appendChild(clearBtn);
        container.appendChild(scrollBtn);
        document.body.appendChild(container);

        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const isScrolled = (window.pageYOffset || document.documentElement.scrollTop) > 200;
                if (isScrolled && scrollBtn.style.display !== 'flex') {
                    scrollBtn.style.display = 'flex';
                    setTimeout(() => scrollBtn.style.opacity = '1', 10);
                } else if (!isScrolled && scrollBtn.style.display === 'flex') {
                    scrollBtn.style.opacity = '0';
                    setTimeout(() => { if (scrollBtn.style.opacity === '0') scrollBtn.style.display = 'none'; }, 300);
                }
            }, 50);
        });
        scrollBtn.style.display = 'none';

        updateBadge();
        console.log('[ADA Panier] v3.2 - Boutons formateurs ajoutés');
    }

    // === OBSERVATION DES CARTES ===
    function observerCartes() {
        document.querySelectorAll('ada-training-card').forEach(ajouterBoutonsFormateurs);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.matches?.('ada-training-card')) {
                            ajouterBoutonsFormateurs(node);
                        }
                        if (node.querySelectorAll) {
                            node.querySelectorAll('ada-training-card').forEach(ajouterBoutonsFormateurs);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // === INITIALISATION ===
    function waitForCards() {
        return new Promise((resolve) => {
            if (document.querySelector('ada-training-card')) resolve();
            else {
                const obs = new MutationObserver(() => {
                    if (document.querySelector('ada-training-card')) {
                        obs.disconnect();
                        resolve();
                    }
                });
                obs.observe(document.body, { childList: true, subtree: true });
                setTimeout(resolve, 10000);
            }
        });
    }

    (async () => {
        ajouterBoutonsFlottants();
        await waitForCards();
        observerCartes();
        rechargerMarquage();
    })();
})();