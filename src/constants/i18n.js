/**
 * Internationalization (i18n) bundles
 * Supported languages: English (EN), French (FR), Chinese (ZH - optional)
 */

export const LANGUAGES = {
  EN: 'en',
  ZH: 'zh',
  FR: 'fr',
};

export const LANGUAGE_NAMES = {
  [LANGUAGES.EN]: 'English',
  [LANGUAGES.FR]: 'Français',
  [LANGUAGES.ZH]: '中文',
};

export const TRANSLATIONS = {
  [LANGUAGES.EN]: {
    // Page title and description
    appTitle: 'GLOV Secure — Mnemonic Shards',
    appDescription:
      'Securely split your mnemonic phrase into multiple shards. Any specified number of shards can recover the original mnemonic.',

    // Configuration section
    configTitle: 'Configuration Options',
    wordCountLabel: 'Mnemonic Word Count',
    words12: '12 words',
    words24: '24 words',
    totalSharesLabel: 'Total Shares',
    thresholdLabel: 'Shares Required for Recovery',
    sharesOption: (count) => `${count} shares`,

    // Input section
    inputTitle: 'Enter Mnemonic Phrase',
    generateBtn: 'Generate Shares',

    // Recovery section
    recoverTitle: 'Recover Mnemonic Phrase',
    recoverInstructions: `
      <strong>Instructions:</strong><br />
      1. Paste each shard into the text box below, one shard per line<br />
      2. Shard format should be complete Base64 encoded string<br />
      3. Minimum number of shards must be reached for recovery<br />
      4. Extra shards will be automatically ignored
    `,
    recoverBtn: 'Recover Mnemonic',
    recoverPlaceholder: `Paste shard contents here, one shard per line...

💡 Tip: Paste multiple shards at once, system will handle line breaks automatically

Example format:
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjEsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjIsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjMsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9`,
    waitingForInput: 'Waiting for shard input...',

    // Tabs
    pasteInputTab: 'Paste Input',
    fileUploadTab: 'File Upload',
    uploadInstructions: `
      <strong>Instructions:</strong><br />
      1. Drag and drop shard files here or click to select files<br />
      2. Supported formats: .txt (standard shares) and .gpg (encrypted shares)<br />
      3. You can select multiple files at once<br />
      4. Files will be processed immediately after upload
    `,
    dragDropHint: 'Drag and drop files here or click to select',
    selectFiles: 'Select Files',
    supportedFormats: 'Supported formats: .txt, .gpg',
    uploadedFiles: 'Uploaded Files',
    clearAllFiles: 'Clear All',
    waitingForUpload: 'Waiting for file upload...',
    encryptionConfirmation: 'Enable Decryption?',
    uploadConfirmationMessage:
      'Do you want to enable decryption for uploaded files? If you have encrypted files (.gpg), you need to enable decryption to process them.',
    confirmEncryption: 'Yes, enable decryption',
    skipEncryption: 'No, skip decryption',
    encryptionRequired: 'Decryption is required for encrypted files',
    insufficientSharesAfterDecryption: (required, provided) =>
      `Insufficient shares after decryption. Need at least ${required} shares, but got ${provided}.`,
    sharesDecrypted: (valid, threshold) =>
      `Successfully decrypted ${valid} shares (need ${threshold})`,
    encryptionPasswordTitle: 'Decryption Password',
    encryptionPasswordDesc:
      'Enter password to decrypt your encrypted files (.gpg). All encrypted files will use the same password.',
    applyDecryption: 'Apply Decryption',
    skipDecryption: 'Skip Decryption',

    // Results
    sharesTitle: 'Generated Shares',
    securityTip:
      `<strong>Security Tip:</strong> Store these shards in different secure locations. Any <span id="thresholdDisplay"></span> shares can recover the complete mnemonic.`,

    // Security notice
    securityNotice:
      '<strong>Security Mode:</strong> Using professional-grade Shamir Secret Sharing algorithm, runs completely offline, data never leaves your device. Recommended to use in disconnected environment for maximum security.',

    // Errors and messages
    errors: {
      fillAllWords: 'Please fill in all mnemonic words!',
      invalidWord: (index) =>
        `Word ${index} is not a valid BIP39 word, please select a valid word from the suggestions.`,
      invalidWordCleared: (index) =>
        `<strong>Invalid mnemonic:</strong> Word ${index} is not a valid BIP39 word and has been automatically cleared. Please select a valid word from the suggestions.`,
      invalidMnemonicChecksum:
        'Invalid BIP-39 mnemonic checksum. Please verify the word order and word count.',
      duplicateWords: (words) =>
        `Repeated words found: ${words.join(', ')}. This can be valid in BIP-39, but please double-check the positions.`,
      invalidShareFormat: 'Invalid share format. Please check your input.',
      mixedPastedShareFormats:
        'Do not mix plain shares and GPG shares in pasted input. Paste one format only.',
      mixedUploadedShareFormats:
        'Do not mix plain share files and GPG share files in the same upload set.',
      inconsistentShareSet:
        'These shares do not belong to the same generated set, or some are missing the set identifier.',
      insufficientShares: (required, provided) =>
        `Insufficient shares. Need at least ${required} shares, but got ${provided}.`,
      duplicateShares: 'Duplicate shares detected. Each share should be unique.',
      recoveryFailed: 'Recovery failed: ',
      noValidShares: 'No valid shard data found',
      checkShareFormat:
        'Please check if the shard format is correct, ensure each line contains a complete shard',
      copyFailed: 'Failed to copy to clipboard',
      downloadFailed: 'Download failed, please try again',
      encryptionFieldsMissing: 'Encryption fields are missing',
      fileTypeNotSupported: 'File type not supported: {0}',
      fileTooLarge: 'File too large: {0}',
      duplicateFile: 'Duplicate file: {0}',
    },

    success: {
      sharesGenerated: 'Shares generated successfully! Please save these shards securely.',
      mnemonicRecovered: 'Mnemonic recovered successfully!',
      copySuccess: 'Copied to clipboard!',
      shareDownloaded: (index) => `Share ${index} downloaded`,
      encryptedShareDownloaded: (index) => `Encrypted share ${index} downloaded`,
      recoverySuccess: 'Recovery successful!',
    },

    warnings: {
      duplicateWordsDetected: 'Duplicate words detected:',
      uniqueWordsNote:
        'Repeated words can be valid in BIP-39, but double-check that each repeated word is intentional.',
      duplicateWords: (words) => `Duplicate words detected: ${words.join(', ')}`,
    },

    info: {
      recovering: 'Recovering...',
      validShares: (valid, threshold) =>
        `Detected ${valid} valid shares (need ${threshold}), recovery can start`,
    },

    // File status
    fileStatus: {
      processing: 'Processing...',
      valid: 'Valid share',
      invalid: 'Invalid format',
      encrypted: 'Encrypted - awaiting decryption',
      unknown: 'Unknown status',
    },

    // Buttons and labels
    copy: 'Copy',
    download: 'Download',
    share: (index) => `Share ${index}`,
    wordLabel: (index) => `${index}. Word`,
    wordPlaceholder: (index) => `Word ${index}`,
    position: 'Position',

    // File related
    shareFilePrefix: 'Share',

    // Status text
    mnemonic: 'Mnemonic',
    shares: 'shares',
    sharesUsed: 'Shares used',
    need: 'need',
    recoveryTime: 'Recovery time',

    // File template section
    fileTemplate: {
      appName: 'GLOV Secure — Mnemonic Shards',
      shareContent: 'Share content',
      generatedTime: 'Generated time',
      securityTips: 'Security tips',
      tip1: 'Please keep this file in a secure location',
      tip2: 'Do not share the shard with untrusted people',
      tip3: 'Any specified number of shards can recover the original mnemonic',
    },

    // Encryption section
    encryption: {
      title: 'Encryption Options',
      enableEncryption: 'Enable Encryption',
      encryptionDescription:
        'Add an extra layer of security by encrypting each shard with a password',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm Password',
      passwordPlaceholder: 'Enter encryption password',
      confirmPasswordPlaceholder: 'Confirm encryption password',
      passwordTip:
        'Make sure to remember your password, as it will be required to recover the mnemonic',
      weakPassword:
        'Password is too weak, please use at least 8 characters with a mix of letters, numbers, and symbols',
      passwordMismatch: 'Passwords do not match',
      encryptingShares: 'Encrypting shares...',
      encryptingShare: (index) => `Encrypting share ${index}...`,
      encryptedSharesTitle: 'Generated Encrypted Shares',
      encryptionSuccess: 'Shares encrypted successfully!',
      encryptionFailed: 'Encryption failed: ',
      decryptionFailed: 'Decryption failed: ',
      invalidPassword: 'Invalid password, please check and try again',
      encryptionInfo:
        'Each shard will be encrypted with OpenPGP format, compatible with GPG tools. The same password will be required during recovery.',
      securityNotice:
        'Encrypted shards provide additional security if stored in potentially compromised locations.',
      passwordRequired: 'Password is required for decryption',
      decryptingShares: 'Decrypting shares...',
      encryptedShareNotice:
        'ENCRYPTED SHARE - This shard is encrypted with OpenPGP format and requires a password for recovery',
      encryptedShareTip:
        'This shard is encrypted with OpenPGP format (compatible with GPG). You will need the same password used during generation to recover the mnemonic.',
      gpgCompatibility:
        'This encrypted shard can be decrypted using GPG command: gpg --decrypt shard1.gpg',
      encryptedFileDetected: 'Encrypted files detected. Password is required for decryption.',
      noEncryptedFiles: 'No encrypted files to decrypt',
      requiresHttps: 'Encrypted (.gpg) files are disabled on HTTP. Use HTTPS (secure context) to enable decryption.',
    },

    // Password dialog
    passwordDialog: {
      title: 'Enter Decryption Password',
      retryTitle: 'Incorrect Password',
      message: 'Please enter the password to decrypt the shares.',
      retryMessage: 'The password you entered is incorrect. Please try again.',
      confirm: 'Confirm',
      cancel: 'Cancel',
    },

    // Language label
    language: 'Language',
  },

  [LANGUAGES.FR]: {
    appTitle: 'GLOV Secure — Mnemonic Shards',
    appDescription:
      'Divisez en toute sécurité votre phrase mnémonique en plusieurs shares. N’importe quel nombre spécifié de shares peut reconstituer la phrase originale.',

    configTitle: 'Options de configuration',
    wordCountLabel: 'Nombre de mots de la phrase mnémonique',
    words12: '12 mots',
    words24: '24 mots',
    totalSharesLabel: 'Nombre total de shares',
    thresholdLabel: 'Shares requises pour la récupération',
    sharesOption: (count) => `${count} shares`,

    inputTitle: 'Saisir la phrase mnémonique',
    generateBtn: 'Générer les shares',

    recoverTitle: 'Récupérer la phrase mnémonique',
    recoverInstructions: `
      <strong>Instructions :</strong><br />
      1. Collez chaque share dans la zone ci-dessous, une share par ligne<br />
      2. Le format de la share doit être une chaîne Base64 complète<br />
      3. Le nombre minimal de shares doit être atteint pour lancer la récupération<br />
      4. Les shares supplémentaires seront ignorées automatiquement
    `,
    recoverBtn: 'Récupérer la phrase',
    recoverPlaceholder: `Collez ici le contenu des shares, un par ligne...

Astuce : Collez plusieurs shares d’un coup, le système gérera automatiquement les retours à la ligne

Exemple de format:
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjEsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjIsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjMsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9`,
    waitingForInput: 'En attente des shares...',

    pasteInputTab: 'Coller le texte',
    fileUploadTab: 'Téléverser des fichiers',
    uploadInstructions: `
      <strong>Instructions :</strong><br />
      1. Glissez-déposez des fichiers de shares ici ou cliquez pour sélectionner des fichiers<br />
      2. Formats pris en charge : .txt (shares standard) et .gpg (shares chiffrés)<br />
      3. Vous pouvez sélectionner plusieurs fichiers à la fois<br />
      4. Les fichiers seront traités immédiatement après le téléversement
    `,
    dragDropHint: 'Glissez-déposez des fichiers ici ou cliquez pour sélectionner',
    selectFiles: 'Sélectionner des fichiers',
    supportedFormats: 'Formats pris en charge : .txt, .gpg',
    uploadedFiles: 'Fichiers téléversés',
    clearAllFiles: 'Tout effacer',
    waitingForUpload: 'En attente de téléversement...',
    encryptionConfirmation: 'Activer le déchiffrement ?',
    uploadConfirmationMessage:
      'Souhaitez-vous activer le déchiffrement pour les fichiers téléversés ? Si vous avez des fichiers chiffrés (.gpg), vous devez activer le déchiffrement pour les traiter.',
    confirmEncryption: 'Oui, activer le déchiffrement',
    skipEncryption: 'Non, ignorer',
    encryptionRequired: 'Le déchiffrement est requis pour les fichiers chiffrés',
    insufficientSharesAfterDecryption: (required, provided) =>
      `Shares insuffisantes après déchiffrement. Au moins ${required} shares sont nécessaires, ${provided} fournies.`,
    sharesDecrypted: (valid, threshold) =>
      `Déchiffrement réussi de ${valid} shares (besoin de ${threshold})`,
    encryptionPasswordTitle: 'Mot de passe de déchiffrement',
    encryptionPasswordDesc:
      'Saisissez le mot de passe pour déchiffrer vos fichiers chiffrés (.gpg). Tous les fichiers chiffrés utiliseront le même mot de passe.',
    applyDecryption: 'Appliquer le déchiffrement',
    skipDecryption: 'Ignorer le déchiffrement',

    sharesTitle: 'Shares générées',
    securityTip:
      `<strong>Conseil de sécurité :</strong> Stockez ces shares dans des lieux sûrs distincts. N’importe quelles <span id="thresholdDisplay"></span> shares peuvent reconstituer la phrase complète.`,

    securityNotice:
      "<strong>Mode sécurité :</strong> Utilisation de l’algorithme professionnel de partage de secret de Shamir, fonctionne entièrement hors ligne, vos données ne quittent jamais votre appareil. Il est recommandé d’utiliser cet outil sans connexion pour une sécurité maximale.",

    errors: {
      fillAllWords: 'Veuillez renseigner tous les mots de la phrase !',
      invalidWord: (index) =>
        `Le mot ${index} n’est pas un mot BIP39 valide, veuillez en choisir un dans la liste.`,
      invalidWordCleared: (index) =>
        `<strong>Phrase invalide :</strong> le mot ${index} n’est pas un mot BIP39 valide et a été effacé automatiquement. Veuillez choisir un mot valide dans la liste.`,
      invalidMnemonicChecksum:
        'Checksum BIP-39 invalide. Verifiez l’ordre des mots et le nombre total de mots.',
      duplicateWords: (words) =>
        `Mots repetes : ${words.join(', ')}. Cela peut etre valide en BIP-39, mais verifiez bien les positions.`,
      invalidShareFormat: 'Format de share invalide. Veuillez vérifier votre saisie.',
      mixedPastedShareFormats:
        'Ne melange pas des shares en clair et des shares GPG dans la zone de collage. Colle un seul format a la fois.',
      mixedUploadedShareFormats:
        'Ne melange pas des fichiers de shares en clair et des fichiers de shares GPG dans le meme lot.',
      inconsistentShareSet:
        'Ces shares ne proviennent pas du meme lot genere, ou certaines n’ont pas d’identifiant de lot.',
      insufficientShares: (required, provided) =>
        `Shares insuffisantes. Au moins ${required} shares sont nécessaires, ${provided} fournies.`,
      duplicateShares: 'Shares en double détectées. Chaque share doit être unique.',
      recoveryFailed: 'Échec de la récupération : ',
      noValidShares: 'Aucune donnée de share valide trouvée',
      checkShareFormat:
        'Vérifiez le format des shares, chaque ligne doit contenir une share complète',
      copyFailed: 'Échec de la copie dans le presse-papiers',
      downloadFailed: 'Échec du téléchargement, veuillez réessayer',
      encryptionFieldsMissing: 'Champs de chiffrement manquants',
      fileTypeNotSupported: 'Type de fichier non pris en charge : {0}',
      fileTooLarge: 'Fichier trop volumineux : {0}',
      duplicateFile: 'Fichier en double : {0}',
    },

    success: {
      sharesGenerated: 'Shares générées avec succès ! Conservez-les en lieu sûr.',
      mnemonicRecovered: 'Phrase mnémonique récupérée avec succès !',
      copySuccess: 'Copié dans le presse-papiers !',
      shareDownloaded: (index) => `Share ${index} téléchargée`,
      encryptedShareDownloaded: (index) => `Share chiffrée ${index} téléchargée`,
      recoverySuccess: 'Récupération réussie !',
    },

    warnings: {
      duplicateWordsDetected: 'Mots en double détectés :',
      uniqueWordsNote:
        'Des mots repetes peuvent etre valides en BIP-39, mais verifiez qu’ils sont intentionnels.',
      duplicateWords: (words) => `Mots en double détectés : ${words.join(', ')}`,
    },

    info: {
      recovering: 'Récupération en cours...',
      validShares: (valid, threshold) =>
        `${valid} shares valides détectées (besoin de ${threshold}), la récupération peut commencer`,
    },

    fileStatus: {
      processing: 'Traitement...',
      valid: 'Share valide',
      invalid: 'Format invalide',
      encrypted: 'Chiffré - en attente de déchiffrement',
      unknown: 'Statut inconnu',
    },

    copy: 'Copier',
    download: 'Télécharger',
    share: (index) => `Share ${index}`,

    wordLabel: (index) => `${index}. Mot`,
    wordPlaceholder: (index) => `Mot ${index}`,
    position: 'Position',

    shareFilePrefix: 'Share',

    mnemonic: 'Phrase mnémonique',
    shares: 'shares',
    sharesUsed: 'Shares utilisées',
    need: 'besoin',
    recoveryTime: 'Temps de récupération',

    fileTemplate: {
      appName: 'GLOV Secure — Mnemonic Shards',
      shareContent: 'Contenu de la share',
      generatedTime: 'Date de génération',
      securityTips: 'Conseils de sécurité',
      tip1: 'Conservez ce fichier dans un endroit sûr',
      tip2: 'Ne partagez pas cette share avec des personnes non fiables',
      tip3: 'N’importe quel nombre spécifié de shares peut reconstituer la phrase originale',
    },

    encryption: {
      title: 'Options de chiffrement',
      enableEncryption: 'Activer le chiffrement',
      encryptionDescription:
        'Ajoutez une couche de sécurité en chiffrant chaque share avec un mot de passe',
      passwordLabel: 'Mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      passwordPlaceholder: 'Saisir le mot de passe de chiffrement',
      confirmPasswordPlaceholder: 'Confirmer le mot de passe de chiffrement',
      passwordTip:
        'Assurez-vous de mémoriser votre mot de passe, il sera nécessaire pour récupérer la phrase',
      weakPassword:
        'Mot de passe trop faible, utilisez au moins 8 caractères avec lettres, chiffres et symboles',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      encryptingShares: 'Chiffrement des shares...',
      encryptingShare: (index) => `Chiffrement de la share ${index}...`,
      encryptedSharesTitle: 'Shares chiffrées générées',
      encryptionSuccess: 'Chiffrement réussi !',
      encryptionFailed: 'Échec du chiffrement : ',
      decryptionFailed: 'Échec du déchiffrement : ',
      invalidPassword: 'Mot de passe invalide, veuillez vérifier et réessayer',
      encryptionInfo:
        'Chaque share sera chiffrée au format OpenPGP, compatible avec les outils GPG. Le même mot de passe sera requis lors de la récupération.',
      securityNotice:
        'Les shares chiffrées offrent une sécurité supplémentaire si elles sont stockées dans des lieux potentiellement compromis.',
      passwordRequired: 'Le mot de passe est requis pour le déchiffrement',
      decryptingShares: 'Déchiffrement des shares...',
      encryptedShareNotice:
        'SHARE CHIFFRÉE - Cette share est chiffrée au format OpenPGP et nécessite un mot de passe pour la récupération',
      encryptedShareTip:
        'Cette share est chiffrée au format OpenPGP (compatible GPG). Vous devrez utiliser le même mot de passe qu’à la génération pour récupérer la phrase.',
      gpgCompatibility:
        'Cette share chiffrée peut être déchiffrée avec la commande GPG : gpg --decrypt shard1.gpg',
      encryptedFileDetected: 'Fichiers chiffrés détectés. Mot de passe requis pour le déchiffrement.',
      noEncryptedFiles: 'Aucun fichier chiffré à déchiffrer',
      requiresHttps: 'Les fichiers chiffrés (.gpg) sont désactivés en HTTP. Utilise HTTPS (contexte sécurisé) pour activer le déchiffrement.',
    },

    passwordDialog: {
      title: 'Saisir le mot de passe de déchiffrement',
      retryTitle: 'Mot de passe incorrect',
      message: 'Veuillez saisir le mot de passe pour déchiffrer les shares.',
      retryMessage: 'Le mot de passe saisi est incorrect. Veuillez réessayer.',
      confirm: 'Confirmer',
      cancel: 'Annuler',
    },

    language: 'Langue',
  },

  // Optional Chinese pack (partial; missing keys fall back to English via i18n.t)
  [LANGUAGES.ZH]: {
    appTitle: 'GLOV Secure — Mnemonic Shards',
    appDescription: '安全地将助记词拆分为多个分片。达到指定数量的分片即可恢复原始助记词。',
    configTitle: '配置选项',
    inputTitle: '输入助记词',
    generateBtn: '生成分片',
    recoverTitle: '恢复助记词',
    recoverBtn: '恢复助记词',
    sharesTitle: '已生成分片',
    language: '语言',
  },
};

// Default language is English
export const DEFAULT_LANGUAGE = LANGUAGES.EN;
