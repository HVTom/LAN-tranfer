const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const SERVER_IP = '192.168.0.101';
const PORT = 8000;
const BASE_DIR = __dirname;
const UPLOAD_DIR = BASE_DIR; 

const restrictedFiles = [
  'node_modules',
  'package-lock.json',
  'package.json',
  'server.js',
];

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;

  if (!restrictedFiles.includes(filename)) {
    const file = path.join(BASE_DIR, filename);

    if (fs.existsSync(file)) {
      const stat = fs.statSync(file);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Length': stat.size,
      });

      const readStream = fs.createReadStream(file);
      readStream.pipe(res);
    } else {
      res.status(404).send('File not found');
    }
  } else {
    res.status(403).send('Access forbidden');
  }
});

app.get('/list', (req, res) => {
  const fileType = req.query.type;

  const fullFileList = fs.readdirSync(BASE_DIR);

  const allowedFiles = fullFileList
    .filter(file => !restrictedFiles.includes(file))
    .filter(file => !fileType || path.extname(file) === fileType);

  const filesWithSize = allowedFiles.map(file => {
    const filePath = path.join(BASE_DIR, file);
    const stat = fs.statSync(filePath);
    return {
      name: file,
      size: stat.size,
    };
  });

  res.json(filesWithSize);
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file provided');
  }

  const filename = req.body.filename;
  const filePath = path.join(UPLOAD_DIR, filename);

  const writeStream = fs.createWriteStream(filePath);
  writeStream.write(req.file.buffer);
  writeStream.end();

  writeStream.on('finish', () => {
    res.status(200).send('File uploaded successfully');
  });

  writeStream.on('error', (err) => {
    console.error('Error writing file:', err.message);
    res.status(500).send('Error uploading file');
  });
});

app.listen(PORT, SERVER_IP, () => {
  console.log(`Server listening at http://${SERVER_IP}:${PORT}`);
});

