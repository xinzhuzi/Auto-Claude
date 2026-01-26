#!/usr/bin/env node
/**
 * Update French translations for workflowStudio
 *
 * Strategy: Translate key UI elements while keeping technical terms in English
 * This provides a better user experience for French users while maintaining
 * consistency with technical documentation.
 */

const fs = require('fs');
const path = require('path');

const FR_FILE = path.join(__dirname, '../apps/frontend/src/shared/i18n/locales/fr/workflowStudio.json');

// Key translations for French UI
const frenchTranslations = {
  // Common UI elements
  "loading": "Chargement du schéma de l'outil...",
  "description": "L'IA configurera les paramètres selon ma description en langage naturel. Idéal pour une configuration rapide.",
  "optional": "Optionnel",
  "cancel": "Annuler",
  "close": "Fermer",
  "save": "Enregistrer",
  "saving": "Enregistrement...",
  "export": "Exporter",
  "exporting": "Exportation...",
  "load": "Charger",
  "run": "Exécuter",
  "running": "Exécution...",
  "create": "Nouveau",
  "delete": "Supprimer",
  "edit": "Modifier",
  "remove": "Retirer",
  "help": "Aide",

  // Workflow operations
  "importWorkflow": "Importation du workflow...",
  "openWorkflow": "Ouverture du workflow...",
  "selectWorkflow": "Sélectionner un workflow...",
  "refreshList": "Actualiser la liste des workflows",
  "workflowNamePlaceholder": "Nom du workflow",

  // PropertyPanel translations (new)
  "properties": {
    "title": "Propriétés",
    "noWorkflow": "Aucun workflow sélectionné",
    "noNodeSelected": "Sélectionnez un nœud pour voir ses propriétés",
    "nodeName": "Nom du nœud",
    "nodeNamePlaceholder": "Entrez le nom du nœud",
    "description": "Description",
    "descriptionPlaceholder": "Brève description",
    "prompt": "Prompt",
    "promptPlaceholder": "Entrez le prompt",
    "label": "Libellé",
    "labelPlaceholder": "Entrez le libellé",
    "model": "Modèle",
    "modelInherit": "Hériter",
    "tools": "Outils",
    "toolsPlaceholder": "Noms d'outils séparés par des virgules",
    "question": "Question",
    "questionPlaceholder": "Entrez la question",
    "options": "Options",
    "addOption": "Ajouter",
    "optionLabel": "Libellé",
    "optionDescription": "Description",
    "multiSelect": "Sélection multiple",
    "evaluationTarget": "Cible d'évaluation",
    "evaluationTargetPlaceholder": "Variable à évaluer",
    "branches": "Branches",
    "ifBranch": "Si",
    "elseBranch": "Sinon",
    "conditionPlaceholder": "Condition",
    "cases": "Cas",
    "addCase": "Ajouter",
    "defaultCase": "Par défaut",
    "caseLabel": "Libellé",
    "skillName": "Nom du Skill",
    "skillNamePlaceholder": "Entrez le nom du skill",
    "skillPath": "Chemin du Skill",
    "skillPathPlaceholder": "Chemin vers le fichier skill",
    "scope": "Portée",
    "scopeUser": "Utilisateur",
    "scopeProject": "Projet",
    "scopeLocal": "Local",
    "serverId": "ID du serveur",
    "serverIdPlaceholder": "ID du serveur MCP",
    "toolName": "Nom de l'outil",
    "toolNamePlaceholder": "Nom de l'outil",
    "toolDescription": "Description de l'outil",
    "toolDescriptionPlaceholder": "Description de l'outil",
    "subAgentFlowId": "ID du flux Sub-Agent",
    "subAgentFlowIdPlaceholder": "ID du flux",
    "noPropertiesAvailable": "Aucune propriété disponible pour ce type de nœud"
  },

  // Node palette
  "palette": {
    "basicNodes": "Nœuds de base",
    "controlFlow": "Flux de contrôle",
    "quickStart": "💡 Démarrage rapide"
  },

  // Toolbar
  "toolbar": {
    "save": "Enregistrer",
    "export": "Exporter",
    "run": "Exécuter"
  },

  // Common actions
  "common": {
    "loading": "Chargement...",
    "cancel": "Annuler",
    "close": "Fermer",
    "save": "Enregistrer",
    "delete": "Supprimer"
  }
};

function updateFrenchTranslations() {
  console.log('📝 Updating French translations for workflowStudio...\n');

  // Read current French file
  const currentContent = JSON.parse(fs.readFileSync(FR_FILE, 'utf-8'));

  // Deep merge function
  function deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // Merge translations
  const updatedContent = deepMerge(currentContent, frenchTranslations);

  // Write back
  fs.writeFileSync(FR_FILE, JSON.stringify(updatedContent, null, 2) + '\n', 'utf-8');

  console.log('✅ French translations updated successfully!');
  console.log(`📊 Updated ${Object.keys(frenchTranslations).length} top-level keys`);
  console.log(`📍 File: ${FR_FILE}\n`);

  // Count translated keys
  let translatedCount = 0;
  function countKeys(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        countKeys(obj[key]);
      } else {
        translatedCount++;
      }
    }
  }
  countKeys(frenchTranslations);

  console.log(`📈 Total translated strings: ${translatedCount}`);
  console.log('💡 Technical terms remain in English for consistency\n');
}

// Run the update
try {
  updateFrenchTranslations();
  process.exit(0);
} catch (error) {
  console.error('❌ Error updating French translations:', error);
  process.exit(1);
}
