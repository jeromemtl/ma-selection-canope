// ============================================
// UTILITAIRES
// ============================================

/**
 * Formate une date pour l'affichage
 * @param {string} dateStr - Date originale
 * @returns {string} Date formatée
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Date non spécifiée';
    return dateStr;
}

/**
 * Formate une durée pour l'affichage
 * @param {string} duree - Durée originale
 * @returns {string} Durée formatée
 */
function formatDuree(duree) {
    if (!duree) return 'Durée non spécifiée';
    return duree;
}

/**
 * Récupère les informations d'un formateur (nom + classe CSS)
 * @param {string} formateurId - ID du formateur
 * @returns {object} { nom, className }
 */
function getFormateurInfo(formateurId) {
    const map = {
        'guillaume': { nom: 'Guillaume', className: 'formateur-g' },
        'natacha': { nom: 'Natacha', className: 'formateur-n' },
        'pascaline': { nom: 'Pascaline', className: 'formateur-p' },
        'sara': { nom: 'Sara', className: 'formateur-s' }
    };
    return map[formateurId] || { nom: '?', className: '' };
}

/**
 * Extrait le nom du site à partir de l'URL
 * @param {string} url - URL complète
 * @returns {string} Nom du site (ex: "CanoTech", "Réseau Canopé", "Magistère", etc.)
 */
function getSiteNameFromUrl(url) {
    if (!url) return 'Voir la formation';
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        if (hostname.includes('canotech.fr')) {
            return 'Voir sur CanoTech';
        } else if (hostname.includes('reseau-canope.fr')) {
            return 'Voir sur Réseau Canopé';
        } else if (hostname.includes('magistere')) {
            return 'Voir sur Magistère';
        } else if (hostname.includes('educsol')) {
            return 'Voir sur Éduscol';
        } else {
            return 'Voir la formation';
        }
    } catch (e) {
        return 'Voir la formation';
    }
}

/**
 * Exporte les données en CSV
 * @param {Array} formations - Liste des formations
 * @param {string} filename - Nom du fichier
 */
function exporterCSV(formations, filename = 'formations.csv') {
    if (!formations || formations.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }

    const entetes = 'Titre;Type;Durée;Date(s);Modalité;Niveau;Difficulté;Lien;Image;Formateurs';
    
    const lignes = formations.map(f => {
        const formateursStr = (f.formateurs || [])
            .map(fId => getFormateurInfo(fId).nom)
            .join(', ');
        
        return [
            f.titre || '',
            f.type || '',
            f.duree || '',
            f.date || '',
            f.modalite || '',
            f.niveau || '',
            f.difficulte || '',
            f.lien || '',
            f.image || '',
            formateursStr
        ].map(v => {
            let s = String(v);
            if (s.includes(';') || s.includes('"') || s.includes('\n')) {
                s = s.replace(/"/g, '""');
                return `"${s}"`;
            }
            return s;
        }).join(';');
    }).join('\n');

    const contenuCSV = `${entetes}\n${lignes}`;
    const blob = new Blob(["\uFEFF" + contenuCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Exporte les données en HTML
 * @param {Array} formations - Liste des formations
 * @param {string} month - Mois de la sélection
 * @param {string} filename - Nom du fichier
 */
function exporterHTML(formations, month = '', filename = 'formations.html') {
    if (!formations || formations.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }

    const date = new Date().toLocaleDateString('fr-FR');
    const monthDisplay = month ? ` - ${month}` : '';
    
    const formateursList = [];
    const formateursSet = new Set();
    for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (f.formateurs) {
            for (let j = 0; j < f.formateurs.length; j++) {
                formateursSet.add(f.formateurs[j]);
            }
        }
    }
    formateursSet.forEach(function(fId) {
        formateursList.push(fId);
    });
    
    const formateursDisplay = [];
    for (let i = 0; i < formateursList.length; i++) {
        formateursDisplay.push(getFormateurInfo(formateursList[i]).nom);
    }
    
    let formationsHTML = '';
    for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        const safeTitre = (f.titre || 'Sans titre').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        let formateursPills = '';
        if (f.formateurs) {
            for (let j = 0; j < f.formateurs.length; j++) {
                const info = getFormateurInfo(f.formateurs[j]);
                formateursPills += '<span class="formateur-pill ' + info.className + '">' + info.nom + '</span>';
            }
        }
        if (formateursPills === '') formateursPills = '—';
        
        let imageHtml = '';
        if (f.image) {
            imageHtml = '<img class="card-image" src="' + f.image + '" alt="' + safeTitre + '" loading="lazy">';
        } else {
            imageHtml = '<div class="card-image" style="background:#e9ecef; display:flex; align-items:center; justify-content:center;">📚</div>';
        }
        
        let badgesHtml = '<span class="badge badge-type">' + (f.type || 'Formation') + '</span>';
        if (f.duree) badgesHtml += '<span class="badge">⏱️ ' + f.duree + '</span>';
        if (f.niveau) badgesHtml += '<span class="badge">🎓 ' + f.niveau + '</span>';
        
        let detailsHtml = '';
        if (f.date) detailsHtml += '<div class="detail-line"><strong>📅 Date :</strong> ' + formatDate(f.date) + '</div>';
        if (f.modalite) detailsHtml += '<div class="detail-line"><strong>💻 Modalité :</strong> ' + f.modalite + '</div>';
        if (f.difficulte) detailsHtml += '<div class="detail-line"><strong>⭐ Difficulté :</strong> ' + f.difficulte + '</div>';
        
        let linkText = 'Voir la formation';
        let linkHtml = '';
        if (f.lien) {
            linkText = getSiteNameFromUrl(f.lien);
            linkHtml = '<a class="card-link" href="' + f.lien + '" target="_blank" rel="noopener">🔗 ' + linkText + '</a>';
        }
        
        formationsHTML += `
            <div class="formation-card">
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
    
    let totalSelections = 0;
    for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (f.formateurs) totalSelections += f.formateurs.length;
    }
    
    const htmlContent = '<!DOCTYPE html>\n' +
    '<html lang="fr">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>Sélection formations' + monthDisplay + '</title>\n' +
    '    <style>\n' +
    '        * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    '        body { font-family: "Marianne", Arial, sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.5; }\n' +
    '        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }\n' +
    '        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #006979; }\n' +
    '        .header h1 { color: #006979; font-size: 2rem; margin-bottom: 8px; }\n' +
    '        .stats { display: flex; gap: 30px; padding: 15px 20px; background: linear-gradient(135deg, #006979 0%, #008b9e 100%); border-radius: 12px; margin-bottom: 30px; color: white; font-weight: 500; flex-wrap: wrap; }\n' +
    '        .formations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }\n' +
    '        .formation-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.2s ease; display: flex; flex-direction: column; height: 100%; }\n' +
    '        .formation-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }\n' +
    '        .card-image { width: 100%; height: 180px; object-fit: cover; background-color: #f0f0f0; }\n' +
    '        .card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; }\n' +
    '        .card-content > :last-child { margin-top: auto; }\n' +
    '        .card-title { font-size: 1rem; font-weight: 700; color: #006979; margin-bottom: 10px; }\n' +
    '        .card-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }\n' +
    '        .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; background-color: #e9ecef; color: #495057; }\n' +
    '        .badge-type { background-color: #006979; color: white; }\n' +
    '        .detail-line { font-size: 0.8rem; color: #555; margin-bottom: 6px; display: flex; flex-wrap: wrap; gap: 8px; }\n' +
    '        .detail-line strong { color: #006979; min-width: 70px; }\n' +
    '        .card-formateurs { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 12px 0; padding-top: 10px; border-top: 1px solid #eee; }\n' +
    '        .formateur-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; color: white; }\n' +
    '        .formateur-g { background-color: #006979; }\n' +
    '        .formateur-n { background-color: #17a2b8; }\n' +
    '        .formateur-p { background-color: #28a745; }\n' +
    '        .formateur-s { background-color: #fd7e14; }\n' +
    '        .card-link { display: block; width: 100%; margin-top: 16px; padding: 10px 16px; background-color: #006979; color: white; text-decoration: none; border-radius: 8px; font-size: 0.8rem; font-weight: 500; text-align: center; box-sizing: border-box; }\n' +
    '        .card-link:hover { background-color: #004d59; }\n' +
    '        .footer { margin-top: 40px; padding-top: 20px; text-align: center; border-top: 1px solid #ddd; color: #888; font-size: 0.8rem; }\n' +
    '        .footer a { color: #006979; text-decoration: none; }\n' +
    '        .footer a:hover { text-decoration: underline; }\n' +
    '        @media (max-width: 768px) { .formations-grid { grid-template-columns: 1fr; } .detail-line { flex-direction: column; align-items: flex-start; gap: 2px; } }\n' +
    '    </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '    <div class="container">\n' +
    '        <div class="header">\n' +
    '            <h1>Actu du Réseau' + monthDisplay + '</h1>\n' +
    '            <p>Sélections des formations à distance</p>\n' +
    '        </div>\n' +
    '        <div class="stats">\n' +
    '            <span>📊 ' + formations.length + ' formation(s)</span>\n' +
    '            <span>👥 ' + formateursList.length + ' formateur(s)</span>\n' +
    '            <span>🎯 ' + totalSelections + ' sélection(s)</span>\n' +
    '        </div>\n' +
    '        <div class="formations-grid">\n' +
    '            ' + formationsHTML + '\n' +
    '        </div>\n' +
    '        <div class="footer">\n' +
    '            <p>Voir plus dans le <a href="https://ada-val.lab.reseau-canope.fr/" target="_blank">catalogue de formation</a></p>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</body>\n' +
    '</html>';

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : filename + '.html';
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Génère le contenu du fichier index.json à partir des fichiers existants
 * Cette fonction est à utiliser DANS LE SCRIPT TAMPERMONKEY lors de l'export
 * @param {Array} fichiers - Liste des noms de fichiers JSON
 */
function genererIndexJson(fichiers) {
    const indexContent = JSON.stringify(fichiers, null, 2);
    const blob = new Blob([indexContent], { type: "application/json" });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'index.json';
    link.click();
    URL.revokeObjectURL(url);
}