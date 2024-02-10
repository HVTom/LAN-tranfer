const http = require('http');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const SERVER_IP = '192.168.0.101';
const PORT = 8000;
const DOWNLOAD_DIR = '/home/tom/Desktop';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let isHttpRequestComplete = true;

function downloadFile(filename) {
  const file_path = `${DOWNLOAD_DIR}/${filename}`;
  const file = fs.createWriteStream(file_path);
  const request = http.get(`http://${SERVER_IP}:${PORT}/download/${filename}`, (response) => {
    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log(`File downloaded successfully: ${file_path}`);
        console.log('\n');
        rl.prompt();
        isHttpRequestComplete = true;
      });
    });
  });

  request.on('error', (err) => {
    console.error(`Error downloading file: ${err.message}`);
    console.log('\n');
    rl.prompt();
    isHttpRequestComplete = true;
  });
}

function uploadFile(filename) {
  const file_path = path.join(__dirname, filename);

  const readStream = fs.createReadStream(file_path);

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  const request = http.request(`http://${SERVER_IP}:${PORT}/upload?filename=${encodeURIComponent(filename)}`, requestOptions, (response) => {
    let responseData = '';

    response.on('data', (chunk) => {
      responseData += chunk;
    });

    response.on('end', () => {
      console.log(`Server response: ${responseData}`);
      console.log('\n');
      rl.prompt();
      isHttpRequestComplete = true;
    });
  });

  request.on('error', (err) => {
    console.error(`Error uploading file: ${err.message}`);
    console.log('\n');
    rl.prompt();
    isHttpRequestComplete = true;
  });

  readStream.pipe(request);

  readStream.on('end', () => {
    request.end();
  });

  readStream.on('error', (err) => {
    console.error(`Error reading file for upload: ${err.message}`);
    rl.prompt();
    isHttpRequestComplete = true;
  });
}


console.log(`Connected to the server. Type "help" to see available commands.`);


const commands = {
  help: () => {
    console.log('Available commands:');
    console.log('help                - Display this help message');
    console.log('list                - List all files on the server');
    console.log('list <.extension>   - List all files with specified extension');
    console.log('download <filename> - Download a file');
    console.log('upload <filename>   - Upload a file');
    console.log('exit                - Exit the client');
    console.log('\n');
    rl.prompt();
  },

  list: (fileType) => {
    if (isHttpRequestComplete) {
      isHttpRequestComplete = false;

      let endpoint = '/list';

      if (fileType) {
        endpoint += `?type=${encodeURIComponent(fileType)}`;
      }

      http.get(`http://${SERVER_IP}:${PORT}${endpoint}`, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const fileList = JSON.parse(data);
            console.log('Files on the server:');
            fileList.forEach((file) => {
              console.log(`${file.name} - Size: ${file.size} bytes`);
            });
          } catch (error) {
            console.error('Error parsing JSON response:', error.message);
          }

          console.log('\n');
          rl.prompt();
          isHttpRequestComplete = true;
        });
      });
    }
  },

  download: (filename) => {
    if (isHttpRequestComplete) {
      isHttpRequestComplete = false;
      downloadFile(filename);
    }
  },

  upload: (filename) => {
    if (isHttpRequestComplete) {
      isHttpRequestComplete = false;
      uploadFile(filename);
    }
  },

  exit: () => {
    console.log('Exiting the client.');
    process.exit();
  },
};


rl.setPrompt('> ');
rl.prompt();


rl.on('line', (input) => {
  const args = input.trim().split(' ');
  const command = args[0].toLowerCase();

  if (commands[command]) {
    commands[command](...args.slice(1));
  } else {
    console.log('Unknown command. Type help for a list of commands.');
    rl.prompt();
  }
});

