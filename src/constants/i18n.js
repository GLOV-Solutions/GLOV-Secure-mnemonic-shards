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
      duplicateWords: (words) =>
        `Duplicate words found: ${words.join(', ')}. Each word should be unique.`,
      invalidShareFormat: 'Invalid share format. Please check your input.',
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
        'Words in the mnemonic should be unique, please check and modify duplicate words.',
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
      'Divisez en toute sécurité votre phrase mnémonique en plusieurs fragments. N’importe quel nombre spécifié de fragments peut reconstituer la phrase originale.',

    configTitle: 'Options de configuration',
    wordCountLabel: 'Nombre de mots de la phrase mnémonique',
    words12: '12 mots',
    words24: '24 mots',
    totalSharesLabel: 'Nombre total de fragments',
    thresholdLabel: 'Fragments requis pour la récupération',
    sharesOption: (count) => `${count} fragments`,

    inputTitle: 'Saisir la phrase mnémonique',
    generateBtn: 'Générer les fragments',

    recoverTitle: 'Récupérer la phrase mnémonique',
    recoverInstructions: `
      <strong>Instructions :</strong><br />
      1. Collez chaque fragment dans la zone ci-dessous, un fragment par ligne<br />
      2. Le format du fragment doit être une chaîne Base64 complète<br />
      3. Le nombre minimal de fragments doit être atteint pour lancer la récupération<br />
      4. Les fragments supplémentaires seront ignorés automatiquement
    `,
    recoverBtn: 'Récupérer la phrase',
    recoverPlaceholder: `Collez ici le contenu des fragments, un par ligne...

Astuce : Collez plusieurs fragments d’un coup, le système gérera automatiquement les retours à la ligne

Exemple de format:
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjEsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjIsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjMsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9`,
    waitingForInput: 'En attente des fragments...',

    pasteInputTab: 'Coller le texte',
    fileUploadTab: 'Téléverser des fichiers',
    uploadInstructions: `
      <strong>Instructions :</strong><br />
      1. Glissez-déposez des fichiers de fragments ici ou cliquez pour sélectionner des fichiers<br />
      2. Formats pris en charge : .txt (fragments standard) et .gpg (fragments chiffrés)<br />
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
      `Fragments insuffisants après déchiffrement. Au moins ${required} fragments sont nécessaires, ${provided} fournis.`,
    sharesDecrypted: (valid, threshold) =>
      `Déchiffrement réussi de ${valid} fragments (besoin de ${threshold})`,
    encryptionPasswordTitle: 'Mot de passe de déchiffrement',
    encryptionPasswordDesc:
      'Saisissez le mot de passe pour déchiffrer vos fichiers chiffrés (.gpg). Tous les fichiers chiffrés utiliseront le même mot de passe.',
    applyDecryption: 'Appliquer le déchiffrement',
    skipDecryption: 'Ignorer le déchiffrement',

    sharesTitle: 'Fragments générés',
    securityTip:
      `<strong>Conseil de sécurité :</strong> Stockez ces fragments dans des lieux sûrs distincts. N’importe quels <span id="thresholdDisplay"></span> fragments peuvent reconstituer la phrase complète.`,

    securityNotice:
      "<strong>Mode sécurité :</strong> Utilisation de l’algorithme professionnel de partage de secret de Shamir, fonctionne entièrement hors ligne, vos données ne quittent jamais votre appareil. Il est recommandé d’utiliser cet outil sans connexion pour une sécurité maximale.",

    errors: {
      fillAllWords: 'Veuillez renseigner tous les mots de la phrase !',
      invalidWord: (index) =>
        `Le mot ${index} n’est pas un mot BIP39 valide, veuillez en choisir un dans la liste.`,
      invalidWordCleared: (index) =>
        `<strong>Phrase invalide :</strong> le mot ${index} n’est pas un mot BIP39 valide et a été effacé automatiquement. Veuillez choisir un mot valide dans la liste.`,
      duplicateWords: (words) => `Mots en double : ${words.join(', ')}. Chaque mot doit être unique.`,
      invalidShareFormat: 'Format de fragment invalide. Veuillez vérifier votre saisie.',
      insufficientShares: (required, provided) =>
        `Fragments insuffisants. Au moins ${required} fragments sont nécessaires, ${provided} fournis.`,
      duplicateShares: 'Fragments en double détectés. Chaque fragment doit être unique.',
      recoveryFailed: 'Échec de la récupération : ',
      noValidShares: 'Aucune donnée de fragment valide trouvée',
      checkShareFormat:
        'Vérifiez le format des fragments, chaque ligne doit contenir un fragment complet',
      copyFailed: 'Échec de la copie dans le presse-papiers',
      downloadFailed: 'Échec du téléchargement, veuillez réessayer',
      encryptionFieldsMissing: 'Champs de chiffrement manquants',
      fileTypeNotSupported: 'Type de fichier non pris en charge : {0}',
      fileTooLarge: 'Fichier trop volumineux : {0}',
      duplicateFile: 'Fichier en double : {0}',
    },

    success: {
      sharesGenerated: 'Fragments générés avec succès ! Conservez-les en lieu sûr.',
      mnemonicRecovered: 'Phrase mnémonique récupérée avec succès !',
      copySuccess: 'Copié dans le presse-papiers !',
      shareDownloaded: (index) => `Fragment ${index} téléchargé`,
      encryptedShareDownloaded: (index) => `Fragment chifré ${index} téléchargé`,
      recoverySuccess: 'Récupération réussie !',
    },

    warnings: {
      duplicateWordsDetected: 'Mots en double détectés :',
      uniqueWordsNote:
        'Les mots de la phrase doivent être uniques, veuillez corriger les doublons.',
      duplicateWords: (words) => `Mots en double détectés : ${words.join(', ')}`,
    },

    info: {
      recovering: 'Récupération en cours...',
      validShares: (valid, threshold) =>
        `${valid} fragments valides détectés (besoin de ${threshold}), la récupération peut commencer`,
    },

    fileStatus: {
      processing: 'Traitement...',
      valid: 'Fragment valide',
      invalid: 'Format invalide',
      encrypted: 'Chiffré - en attente de déchiffrement',
      unknown: 'Statut inconnu',
    },

    copy: 'Copier',
    download: 'Télécharger',
    share: (index) => `Fragment ${index}`,

    wordLabel: (index) => `${index}. Mot`,
    wordPlaceholder: (index) => `Mot ${index}`,
    position: 'Position',

    shareFilePrefix: 'Fragment',

    mnemonic: 'Phrase mnémonique',
    shares: 'fragments',
    sharesUsed: 'Fragments utilisés',
    need: 'besoin',
    recoveryTime: 'Temps de récupération',

    fileTemplate: {
      appName: 'GLOV Secure — Mnemonic Shards',
      shareContent: 'Contenu du fragment',
      generatedTime: 'Date de génération',
      securityTips: 'Conseils de sécurité',
      tip1: 'Conservez ce fichier dans un endroit sûr',
      tip2: 'Ne partagez pas ce fragment avec des personnes non fiables',
      tip3: 'N’importe quel nombre spécifié de fragments peut reconstituer la phrase originale',
    },

    encryption: {
      title: 'Options de chiffrement',
      enableEncryption: 'Activer le chiffrement',
      encryptionDescription:
        'Ajoutez une couche de sécurité en chiffrant chaque fragment avec un mot de passe',
      passwordLabel: 'Mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      passwordPlaceholder: 'Saisir le mot de passe de chiffrement',
      confirmPasswordPlaceholder: 'Confirmer le mot de passe de chiffrement',
      passwordTip:
        'Assurez-vous de mémoriser votre mot de passe, il sera nécessaire pour récupérer la phrase',
      weakPassword:
        'Mot de passe trop faible, utilisez au moins 8 caractères avec lettres, chiffres et symboles',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      encryptingShares: 'Chiffrement des fragments...',
      encryptingShare: (index) => `Chiffrement du fragment ${index}...`,
      encryptedSharesTitle: 'Fragments chiffrés générés',
      encryptionSuccess: 'Chiffrement réussi !',
      encryptionFailed: 'Échec du chiffrement : ',
      decryptionFailed: 'Échec du déchiffrement : ',
      invalidPassword: 'Mot de passe invalide, veuillez vérifier et réessayer',
      encryptionInfo:
        'Chaque fragment sera chiffré au format OpenPGP, compatible avec les outils GPG. Le même mot de passe sera requis lors de la récupération.',
      securityNotice:
        'Les fragments chiffrés offrent une sécurité supplémentaire s’ils sont stockés dans des lieux potentiellement compromis.',
      passwordRequired: 'Le mot de passe est requis pour le déchiffrement',
      decryptingShares: 'Déchiffrement des fragments...',
      encryptedShareNotice:
        'FRAGMENT CHIFFRÉ - Ce fragment est chiffré au format OpenPGP et nécessite un mot de passe pour la récupération',
      encryptedShareTip:
        'Ce fragment est chiffré au format OpenPGP (compatible GPG). Vous devrez utiliser le même mot de passe qu’à la génération pour récupérer la phrase.',
      gpgCompatibility:
        'Ce fragment chiffré peut être déchiffré avec la commande GPG : gpg --decrypt shard1.gpg',
      encryptedFileDetected: 'Fichiers chiffrés détectés. Mot de passe requis pour le déchiffrement.',
      noEncryptedFiles: 'Aucun fichier chiffré à déchiffrer',
    },

    passwordDialog: {
      title: 'Saisir le mot de passe de déchiffrement',
      retryTitle: 'Mot de passe incorrect',
      message: 'Veuillez saisir le mot de passe pour déchiffrer les fragments.',
      retryMessage: 'Le mot de passe saisi est incorrect. Veuillez réessayer.',
      confirm: 'Confirmer',
      cancel: 'Annuler',
    },

    language: 'Langue',
  },

  // Optional Chinese pack (kept for completeness)
  [LANGUAGES.ZH]: {
    appTitle: 'GLOV Secure — Mnemonic Shards',
    appDescription: '安全地将助记词分割成多个分片，任意指定数量的分片即可恢复原始助记词',
    configTitle: '配置选项',
    wordCountLabel: '助记词数量',
    words12: '12 个单词',
    words24: '24 个单词',
    totalSharesLabel: '分片总数',
    thresholdLabel: '恢复所需分片数',
    sharesOption: (count) => `${count} 个分片`,
    inputTitle: '输入助记词',
    generateBtn: '生成分片',
    recoverTitle: '恢复助记词',
    recoverInstructions: `
      <strong>使用说明：</strong><br />
      1. 将每个分片粘贴到下方文本框中，每行一个分片<br />
      2. 分片格式应为完整的 Base64 编码字符串<br />
      3. 至少需要达到设定的最小分片数量才能恢复<br />
      4. 多余的分片会被自动忽略
    `,
    recoverBtn: '恢复助记词',
    recoverPlaceholder: `请在此处粘贴分片内容，每行一个分片...

💡 提示：直接粘贴多个分片，系统会自动处理换行

示例格式：
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjEsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjIsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9
eyJ0aHJlc2hvbGQiOjMsInNoYXJlSW5kZXgiOjMsImRhdGEiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiJ9`,
    waitingForInput: '等待输入分片...',
    pasteInputTab: '粘贴输入',
    fileUploadTab: '文件上传',
    uploadInstructions: `
      <strong>使用说明：</strong><br />
      1. 拖拽分片文件到此处或点击选择文件<br />
      2. 支持格式：.txt（标准分片）和 .gpg（加密分片）<br />
      3. 可以一次选择多个文件<br />
      4. 文件上传后会立即处理
    `,
    dragDropHint: '拖拽文件到此处或点击选择',
    selectFiles: '选择文件',
    supportedFormats: '支持格式：.txt, .gpg',
    uploadedFiles: '已上传文件',
    clearAllFiles: '清空全部',
    waitingForUpload: '等待文件上传...',
    encryptionConfirmation: '启用解密？',
    uploadConfirmationMessage:
      '是否为上传的文件启用解密？如果您有加密文件(.gpg)，需要启用解密才能处理它们。',
    confirmEncryption: '是，启用解密',
    skipEncryption: '否，跳过解密',
    encryptionRequired: '加密文件需要解密',
    insufficientSharesAfterDecryption: (required, provided) =>
      `解密后分片数量不足。至少需要 ${required} 个分片，但只有 ${provided} 个。`,
    sharesDecrypted: (valid, threshold) => `成功解密 ${valid} 个分片（需要 ${threshold} 个）`,
    encryptionPasswordTitle: '解密密码',
    encryptionPasswordDesc: '请输入密码以解密您的加密文件(.gpg)。所有加密文件将使用相同的密码。',
    applyDecryption: '应用解密',
    skipDecryption: '跳过解密',
    sharesTitle: '生成的分片',
    securityTip:
      `<strong>安全提示：</strong> 请将这些分片分别保存在不同的安全位置。任意 <span id="thresholdDisplay"></span> 个分片即可恢复完整的助记词。`,
    securityNotice:
      '<strong>安全模式：</strong> 使用专业级 Shamir 秘密分享算法，完全离线运行，数据不会离开您的设备。建议在断网环境中使用以获得最高安全性。',
    errors: {
      fillAllWords: '请填写所有助记词！',
      invalidWord: (index) =>
        `第 ${index} 个单词不是有效的 BIP39 单词，请从建议列表中选择有效的单词。`,
      invalidWordCleared: (index) =>
        `<strong>无效助记词：</strong> 第 ${index} 个输入框中的单词不是有效的 BIP39 单词，已自动清空。请从建议列表中选择有效的单词。`,
      duplicateWords: (words) => `发现重复单词：${words.join(', ')}。每个单词应该是唯一的。`,
      invalidShareFormat: '无效的分片格式。请检查您的输入。',
      insufficientShares: (required, provided) =>
        `分片数量不足。至少需要 ${required} 个分片，但只提供了 ${provided} 个。`,
      duplicateShares: '检测到重复的分片。每个分片应该是唯一的。',
      recoveryFailed: '恢复失败：',
      noValidShares: '没有找到有效的分片数据',
      checkShareFormat: '请检查分片格式是否正确，确保每行一个完整的分片',
      copyFailed: '复制到剪贴板失败',
      downloadFailed: '下载失败，请重试',
      encryptionFieldsMissing: '加密字段缺失',
      fileTypeNotSupported: '不支持的文件类型：{0}',
      fileTooLarge: '文件过大：{0}',
      duplicateFile: '重复文件：{0}',
    },
    success: {
      sharesGenerated: '分片生成成功！请安全保存这些分片。',
      mnemonicRecovered: '助记词恢复成功！',
      copySuccess: '已复制到剪贴板！',
      shareDownloaded: (index) => `分片 ${index} 已下载`,
      encryptedShareDownloaded: (index) => `加密分片 ${index} 已下载`,
      recoverySuccess: '恢复成功！',
    },
    warnings: {
      duplicateWordsDetected: '检测到重复单词：',
      uniqueWordsNote: '助记词中的单词应该是唯一的，请检查并修改重复的单词。',
      duplicateWords: (words) => `检测到重复单词：${words.join(', ')}`,
    },
    info: {
      recovering: '正在恢复...',
      validShares: (valid, threshold) => `检测到 ${valid} 个有效分片（需要 ${threshold} 个），可以开始恢复`,
    },
    fileStatus: {
      processing: '处理中...',
      valid: '有效分片',
      invalid: '格式无效',
      encrypted: '加密文件 - 等待解密',
      unknown: '未知状态',
    },
    copy: '复制',
    download: '下载',
    share: (index) => `分片 ${index}`,
    wordLabel: (index) => `${index}. 单词`,
    wordPlaceholder: (index) => `第 ${index} 个单词`,
    position: '位置',
    shareFilePrefix: '分片',
    mnemonic: '助记词',
    shares: '个',
    sharesUsed: '使用分片数',
    need: '需要',
    recoveryTime: '恢复时间',
    fileTemplate: {
      appName: 'GLOV Secure — Mnemonic Shards',
      shareContent: '分片内容',
      generatedTime: '生成时间',
      securityTips: '安全提示',
      tip1: '请将此文件保存在安全的位置',
      tip2: '不要将分片分享给不信任的人',
      tip3: '任意指定数量的分片即可恢复原始助记词',
    },
    encryption: {
      title: '加密选项',
      enableEncryption: '启用加密',
      encryptionDescription: '通过密码对每个分片进行加密，增加额外的安全层',
      passwordLabel: '密码',
      confirmPasswordLabel: '确认密码',
      passwordPlaceholder: '请输入加密密码',
      confirmPasswordPlaceholder: '请确认加密密码',
      passwordTip: '请务必记住您的密码，恢复助记词时将需要此密码',
      weakPassword: '密码过于简单，请使用至少8个字符，包含字母、数字和符号的组合',
      passwordMismatch: '两次输入的密码不匹配',
      encryptingShares: '正在加密分片...',
      encryptingShare: (index) => `正在加密分片 ${index}...`,
      encryptedSharesTitle: '生成的加密分片',
      encryptionSuccess: '分片加密成功！',
      encryptionFailed: '加密失败：',
      decryptionFailed: '解密失败：',
      invalidPassword: '密码无效，请检查后重试',
      encryptionInfo:
        '每个分片将使用OpenPGP格式加密，兼容GPG工具。恢复时将需要相同的密码。',
      securityNotice:
        '加密分片在存储在可能存在风险的位置时提供额外的安全性。',
      passwordRequired: '解密需要密码',
      decryptingShares: '正在解密分片...',
      encryptedShareNotice:
        '加密分片 - 此分片使用OpenPGP格式加密，恢复时需要密码',
      encryptedShareTip:
        '此分片使用OpenPGP格式加密（兼容GPG）。恢复助记词时需要使用生成时相同的密码。',
      gpgCompatibility: '此加密分片可使用GPG命令解密：gpg --decrypt 分片1.gpg',
      encryptedFileDetected: '检测到加密文件，需要输入密码进行解密',
      noEncryptedFiles: '没有需要解密的文件',
    },
    passwordDialog: {
      title: '输入解密密码',
      retryTitle: '密码错误',
      message: '请输入密码以解密分片。',
      retryMessage: '您输入的密码不正确，请重试。',
      confirm: '确认',
      cancel: '取消',
    },
    language: '语言',
  },
};

// Default language is English
export const DEFAULT_LANGUAGE = LANGUAGES.EN;
