# MnemonicShards

English | [简体中文](./README_ZH.md)

A secure, professional mnemonic phrase splitting tool that uses Shamir's Secret Sharing algorithm to split your mnemonic phrase into multiple shards, with optional OpenPGP encryption for enhanced security. Any specified number of shards can recover the original mnemonic.

## 🚀 Quick Start

### Docker (Recommended)
```bash
# Clone and run with Docker
git clone <repository-url>
cd MnemonicShards
docker-compose up -d --build
# Visit http://localhost:8848
```

### Local Development
```bash
# Clone and run locally
git clone <repository-url>
cd MnemonicShards
bun install && bun run dev
# Visit http://localhost:5173
```

### Static File
```bash
# Open directly in browser
open dist/index.html
# or serve with any static server
npx http-server dist -p 8080
```

## 🔒 Security Features

- **Completely Offline Operation** - Data never leaves your device
- **Professional-grade Encryption** - Uses standard Shamir's Secret Sharing algorithm
- **Client-side Processing** - All computations completed in the browser
- **Open Source & Transparent** - Code is fully open source and can be audited

## 🚀 Core Features

### Mnemonic Processing
- ✅ Support for 12/24 word mnemonic phrases
- ✅ BIP39 standard word validation
- ✅ Smart auto-complete suggestions
- ✅ Duplicate word detection
- ✅ Real-time word count and validation feedback

### Shamir Secret Sharing
- ✅ Flexible shard configuration (3-7 shards)
- ✅ Custom recovery threshold (2-5 shards)
- ✅ Professional-grade cryptographic algorithm
- ✅ Configurable security levels (Conservative to Convenient)

### Security & Encryption
- ✅ OpenPGP symmetric encryption for shards
- ✅ AES-256 encryption standard
- ✅ Secure password generation with strength validation
- ✅ Encrypted shard storage support
- ✅ Memory-safe password handling (auto-clear)

### User Interface
- ✅ One-click copy/download shards
- ✅ Perfect mobile adaptation and touch support
- ✅ Tab-based recovery interface (paste/upload tabs)
- ✅ Enhanced mnemonic recovery display
- ✅ Modern, responsive design system
- ✅ Accessibility-focused interface

### File Management
- ✅ File upload recovery (support .txt and .gpg files)
- ✅ Skip decryption option for mixed file types
- ✅ Batch file processing
- ✅ Drag-and-drop file support
- ✅ File size validation (max 5MB)

### Deployment Options
- ✅ Single file deployment (dist/index.html)
- ✅ Docker containerization with security hardening
- ✅ Static site hosting compatible
- ✅ Completely offline operation

## 🛠️ Technology Stack

### Core Dependencies

- **[shamir-secret-sharing](https://www.npmjs.com/package/shamir-secret-sharing)** - Professional-grade Shamir's Secret Sharing algorithm implementation
  - Standard cryptographic algorithm, secure and reliable
  - Peer-reviewed cryptographic library
  - Supports flexible threshold configuration
- **[openpgp](https://www.npmjs.com/package/openpgp)** - OpenPGP implementation for JavaScript
  - Industry-standard OpenPGP cryptography
  - AES-256 symmetric encryption
  - GPG-compatible encrypted output
  - Secure password-based encryption

### Development Tools

- **Vite** - Modern frontend build tool
- **Native JavaScript** - No framework dependencies, lightweight and efficient
- **CSS3** - Modern styling and animations

## 📁 Project Structure

```
src/
├── components/              # Core components
│   ├── MnemonicInput.js     # Mnemonic input component (supports auto-complete, validation, duplicate detection)
│   ├── ShareManager.js      # Shard management component (handles shard generation and recovery)
│   ├── RecoveryTabManager.js # Recovery tab manager (handles paste/upload tabs and file processing)
│   └── PasswordDialog.js    # Password dialog component (handles password input for encryption/decryption)
├── utils/                   # Utility functions
│   ├── dom.js              # DOM manipulation utilities (safe element retrieval and creation)
│   ├── validation.js       # Validation utilities (BIP39 word validation)
│   ├── encryption.js       # Encryption utilities (OpenPGP encryption/decryption, password validation)
│   └── helpers.js          # General utilities (copy, download, encoding, etc.)
├── styles/
│   └── styles.css          # Main stylesheet (modern design system, mobile support)
├── constants/              # Constants configuration
│   ├── index.js            # Application constants and configuration
│   └── bip39-words.js      # BIP39 word list
└── main.js                 # Application entry point (modular architecture)

Root directory/
├── index.html              # Main page
├── package.json            # Project configuration
├── vite.config.js          # Build configuration
├── Dockerfile              # Docker container configuration
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Docker ignore file
├── DOCKER.md               # Docker deployment guide
└── dist/                   # Build output
    └── index.html          # Production version (single file deployment)
```

### 🏗️ Architecture Features

- **Modular Design** - Clear component separation, easy to maintain and extend
- **Type Safety** - Complete parameter validation and error handling
- **Performance Optimization** - Debounced input, smart caching, efficient rendering
- **Mobile-first** - Perfect mobile adaptation and touch optimization
- **Framework-free** - Native JavaScript, lightweight and fast

## 🔐 Encryption Features

The tool provides optional OpenPGP encryption to enhance the security of your mnemonic shards:

### Encryption Options

- **Symmetric Encryption**: Uses AES-256 algorithm with password-based encryption
- **GPG Compatibility**: Encrypted output is compatible with standard GPG tools
- **Password Strength Validation**: Built-in password strength assessment
- **Secure Password Generation**: Option to generate cryptographically secure passwords

### Encryption Process

1. **Password Creation**: Create a strong password or use the built-in generator
2. **Shard Encryption**: Each shard is encrypted individually using OpenPGP
3. **Secure Storage**: Encrypted shards can be safely stored even on less secure media
4. **Decryption**: Original shards are recovered by decrypting with the same password

### Password Security

- **Minimum Requirements**: At least 8 characters with mixed case, numbers, and special characters
- **Strength Levels**: Weak, Medium, and Strong indicators with improvement suggestions
- **Secure Generation**: Cryptographically secure random password generation
- **Memory Safety**: Passwords are not stored or cached after use

## 🎯 How to Use

### Basic Usage (Without Encryption)

1. Open the [application page](./index.html)
2. Select mnemonic word count (12 or 24 words)
3. Configure total shards and recovery threshold
4. Enter your mnemonic phrase, the system will automatically validate each word
5. Click "Generate Shares" to create multiple shards
6. Save the shards in different secure locations
7. When recovery is needed, input any specified number of shards

### Encrypted Usage (Recommended)

1. Open the [application page](./index.html)
2. Select mnemonic word count (12 or 24 words)
3. Configure total shards and recovery threshold
4. Enter your mnemonic phrase, the system will automatically validate each word
5. Enable encryption option and create a strong password
6. Click "Generate & Encrypt Shares" to create encrypted shards
7. Save the encrypted shards and password separately in different secure locations
8. When recovery is needed, input the encrypted shards and password to decrypt and recover

### File Upload Recovery

1. Open the [application page](./index.html)
2. Navigate to the "Recovery Mnemonic" section
3. Choose the "Upload" tab
4. Upload your shard files (.txt or .gpg format)
5. If you have encrypted files (.gpg), enter the decryption password when prompted
6. Click "Recover Mnemonic" to restore your original mnemonic phrase
7. The recovered mnemonic will be displayed with clear word separation

### Mixed Recovery Methods

- **Paste Method**: Directly paste shard content into the input fields
- **Upload Method**: Upload shard files for batch processing
- **Skip Decryption**: When mixed files are uploaded, you can skip decryption for unencrypted files

### Local Development

```bash
# Clone the project
git clone <repository-url>
cd MnemonicShards

# Install dependencies
bun install

# Start development server
bun run dev
# Visit http://localhost:5173

# Build production version
bun run build
# View dist/index.html

# Preview production build
bun run start
# Visit http://localhost:8080
```

### Docker Deployment (Recommended)

The application includes an optimized Docker configuration for secure, containerized deployment:

#### Quick Start

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Access the application
# Visit http://localhost:8848

# Stop the container
docker-compose down
```

#### Advanced Docker Usage

```bash
# Build the Docker image manually
docker build -t mnemonic-shards .

# Run the container
docker run -d \
  --name mnemonic-shards-app \
  -p 8848:8848 \
  --read-only \
  --security-opt no-new-privileges:true \
  mnemonic-shards

# Check container status
docker ps

# View logs
docker logs mnemonic-shards-app

# Health check
curl http://localhost:8848/
```

#### Docker Security Features

- **Multi-stage build** - Minimal final image size
- **Non-root user** - Runs as unprivileged user (UID 1001)
- **Read-only filesystem** - Prevents unauthorized modifications
- **Health checks** - Automatic monitoring of application status
- **No networking dependencies** - Completely offline operation
- **Alpine Linux base** - Minimal attack surface

#### Container Benefits

- ✅ **Isolated Environment** - No impact on host system
- ✅ **Consistent Deployment** - Same environment everywhere
- ✅ **Easy Scaling** - Simple to deploy multiple instances
- ✅ **Security Hardened** - Built-in security best practices
- ✅ **Offline Ready** - No internet connectivity required

## 📱 Security Recommendations

1. **Use in Offline Environment** - Recommended to use this tool in a disconnected environment
2. **Distributed Storage** - Store shards in different physical locations
3. **Secure Media** - Use encrypted USB drives or paper backups
4. **Regular Verification** - Regularly test the recovery functionality of shards
5. **Shard Protection** - Do not share shards with untrusted parties
6. **Password Management** - Store encryption passwords separately from encrypted shards
7. **Strong Passwords** - Use the built-in password generator or create passwords with high entropy
8. **Password Separation** - Store passwords in a different location than the encrypted shards
9. **Memorize Critical Passwords** - Consider memorizing encryption passwords for ultimate security
10. **Password Backup** - Create secure backups of encryption passwords using different methods

## 🔧 Shard Configuration Examples

| Configuration | Total Shards | Recovery Threshold | Security   | Convenience |
| ------------- | ------------ | ------------------ | ---------- | ----------- |
| Conservative  | 7            | 5                  | ⭐⭐⭐⭐⭐ | ⭐⭐        |
| Balanced      | 5            | 3                  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐    |
| Convenient    | 3            | 2                  | ⭐⭐⭐     | ⭐⭐⭐⭐⭐  |

## 🌟 Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+
- Mobile browsers

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Users should:

- Assume all usage risks
- Ensure understanding of how Shamir's Secret Sharing works
- Conduct thorough testing before use
- Properly safeguard generated shards

## 📄 License

ISC License

---

**⚡ MnemonicShards**: Single file deployment, no server requirements, completely client-side operation
