const fs = require('fs');
const archiver = require('archiver');
const glob = require('glob');
const ignore = require('ignore');
const { execSync } = require('child_process');

// Make sure 'package' directory exists
fs.mkdirSync('./package', { recursive: true });

// Get git commit hash
const gitHash = execSync('git rev-parse HEAD').toString().trim();

const output = fs.createWriteStream(__dirname + `/package/Extension-${gitHash}.zip`);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

// Parse .gitignore
let ig = ignore().add(fs.readFileSync('.gitignore').toString());

// List all files
let files = glob.sync('**', { nodir: true });

files = files.filter(file => {
  // Ignore files that match .gitignore
  return !ig.ignores(file);
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append files
files.forEach(file => {
  archive.file(file, { name: file });
});

// Finalize the archive (ie we are done appending files but streams have to finish yet)
archive.finalize();
