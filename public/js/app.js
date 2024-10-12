let fileSystem = { '/': {} };  // Simulated file system (root directory)
let currentPath = ['/'];  // Start at root directory
let userInput = '';  // To store the user input
let cursorPosition = 0;  // Track cursor position

// Permissions for files and directories
let permissions = {
    '/': 'rwx',  // root directory permissions
};

function handleCommand(input) {
    const [command, ...args] = input.trim().split(' ');

    switch (command) {
        case 'mkdir':
            mkdir(args[0]);
            break;
        case 'ls':
            ls();
            break;
        case 'cp':
            cp(args[0], args[1]);
            break;
        case 'mv':
            mv(args[0], args[1]);
            break;
        case 'cat':
            cat(args.join(' '));  // Allow for paths with spaces
            break;
        case 'touch':
            touch(args.join(' '));  // Allow for paths with spaces
            break;
        case 'rm':
            rm(args[0]);
            break;
        case 'echo':
            echo(args);
            break;
        case 'grep':
            grep(args[0], args[1]);
            break;
        case 'cd':
            cd(args[0]);
            break;
        case 'find':
            find(args[0]);
            break;
        case 'chmod':
            chmod(args[0], args[1]);
            break;
        case 'help':
            help();
            break;
        case 'clear':
            clearConsole(); // Call the clear function
            break;
        case 'pwd':
            pwd(); // Call the pwd function
            break;
        default:
            term.write(`\r\nCommand not found: ${command}`);
    }
}

// Helper to get the current directory object
function getCurrentDir() {
    return currentPath.reduce((dir, subdir) => dir[subdir], fileSystem);
}

// Helper to get the current path as a string
function getCurrentPathString() {
    // Join the currentPath and normalize slashes
    return currentPath.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function clearConsole() {
    // Clear the terminal
    term.clear();
}

// Function to print the current working directory
function pwd() {
    term.write(`\r\nCurrent directory: ${getCurrentPathString()}`);
}


function autocomplete(input) {
    const currentDir = getCurrentDir();
    const parts = input.trim().split(' ');
    
    // Keep all but the last part for context
    const baseInput = parts.slice(0, -1).join(' '); 
    const lastPart = parts[parts.length - 1]; // Get the last part for completion
    const suggestions = [];

    // If the last part is empty, return all entries in the current directory
    if (lastPart === '') {
        return Object.keys(currentDir).map(entry => baseInput + ' ' + entry);
    }

    // Get all entries in the current directory
    const entries = Object.keys(currentDir);

    // Filter entries based on the last part of the input
    for (const entry of entries) {
        if (entry.startsWith(lastPart)) {
            suggestions.push(baseInput + ' ' + entry); // Include base input with suggestion
        }
    }

    return suggestions;
}


// Create a new directory
function mkdir(dirPath) {
    if (!dirPath) {
        term.write('\r\nError: No directory name provided');
        return;
    }

    // Split the path to navigate through the directories
    const parts = dirPath.split('/');
    const currentDir = getCurrentDir();

    // Initialize a variable to keep track of the current directory
    let currentLevel = currentDir;

    for (const part of parts) {
        if (part === '' || part === '.') {
            // Skip empty parts (due to leading slashes) and current directory
            continue;
        } else if (currentLevel[part]) {
            // Directory already exists
            term.write(`\r\nError: Directory "${part}" already exists`);
            return;
        } else {
            // Create the directory
            currentLevel[part] = {};  // Create a new directory object
            term.write(`\r\nDirectory "${part}" created`);

            // Move down into the newly created directory for further nesting
            currentLevel = currentLevel[part];
        }
    }
}


function ls() {
    const currentDir = getCurrentDir();
    const entries = Object.keys(currentDir);
    if (entries.length === 0) {
        term.write('\r\nNo files or directories found');
    } else {
        term.write('\r\n' + entries.join('  '));
    }
}

// Change directories with 'cd'
function cd(path) {
    if (!path) {
        term.write('\r\nError: No path provided');
        return;
    }

    const parts = path.split('/');
    let newPath = [...currentPath];

    // Handle root path case
    if (path === '/') {
        currentPath = ['/'];
        term.write('\r\nNow in /');
        return;
    }

    for (const part of parts) {
        if (part === '' || part === '.') {
            // Skip empty parts (due to leading slashes) and current directory
            continue;
        } else if (part === '..') {
            // Move up one directory level
            if (newPath.length > 1) {
                newPath.pop();
            }
        } else {
            // Traverse into the subdirectory
            const currentDir = newPath.reduce((dir, subdir) => dir[subdir], fileSystem);
            if (!currentDir[part] || typeof currentDir[part] !== 'object') {
                term.write(`\r\nError: Directory "${part}" not found`);
                return;
            }
            newPath.push(part);  // Add the valid directory to the path
        }
    }

    currentPath = newPath;  // Update currentPath to the new valid path
    term.write(`\r\nNow in ${getCurrentPathString()}`);
}


function cp(sourcePath, destinationPath) {
    const currentDir = getCurrentDir();

    if (!sourcePath || !destinationPath) {
        term.write('\r\nError: Missing source or destination');
        return;
    }

    // Normalize the source path to get the absolute path
    let sourceDir = currentDir;
    const sourceParts = sourcePath.split('/');

    // Traverse to find the source file
    for (let i = 0; i < sourceParts.length - 1; i++) {
        const part = sourceParts[i];

        // Check if the current part is a directory
        if (!sourceDir[part] || typeof sourceDir[part] !== 'object') {
            term.write(`\r\nError: Directory "${part}" not found in source path`);
            return;
        }

        sourceDir = sourceDir[part];  // Move deeper into the directory
    }

    const sourceFileName = sourceParts[sourceParts.length - 1];  // Get the actual file name

    // Check if the file exists in the source directory
    if (!sourceDir[sourceFileName]) {
        term.write(`\r\nError: Source file "${sourceFileName}" not found in "${sourcePath}"`);
        return;
    }

    // Normalize the destination path
    let destinationDir = getCurrentDir();
    const destinationParts = destinationPath.split('/');
    const destFileName = destinationParts.pop();  // Get the destination file name

    // Traverse to the destination directory
    for (const part of destinationParts) {
        if (part === '') continue; // Skip empty parts from leading slash
        if (!destinationDir[part] || typeof destinationDir[part] !== 'object') {
            term.write(`\r\nError: Destination directory "${part}" not found`);
            return;
        }
        destinationDir = destinationDir[part];  // Move deeper into the directory
    }

    // Check if the destination file already exists
    if (destinationDir[destFileName]) {
        term.write(`\r\nError: Destination file "${destFileName}" already exists`);
        return;
    }

    // Copy the file content from source to destination
    destinationDir[destFileName] = sourceDir[sourceFileName];  // Perform the copy
    term.write(`\r\n"${sourceFileName}" copied to "${destinationPath}"`);
}


function mv(source, destination) {
    const currentDir = getCurrentDir();
    if (!source || !destination) {
        term.write('\r\nError: Missing source or destination');
        return;
    }

    if (!currentDir[source]) {
        term.write(`\r\nError: Source "${source}" not found`);
        return;
    }

    if (currentDir[destination]) {
        term.write(`\r\nError: Destination "${destination}" already exists`);
        return;
    }

    currentDir[destination] = currentDir[source];
    delete currentDir[source];
    term.write(`\r\n"${source}" moved to "${destination}"`);
}

function cat(filePath) {
    const currentDir = getCurrentDir();

    if (!filePath) {
        term.write('\r\nError: No file name provided');
        return;
    }

    // Normalize the path to get the absolute path
    let targetDir = currentDir;
    const parts = filePath.split('/');  // Split the filePath into parts

    // Traverse through the directory structure
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        // Check if the current part is a directory
        if (!targetDir[part] || typeof targetDir[part] !== 'object') {
            term.write(`\r\nError: Directory "${part}" not found`);
            return;
        }

        targetDir = targetDir[part];  // Move deeper into the directory
    }

    const fileName = parts[parts.length - 1];  // Get the actual file name

    // Check if the file exists in the target directory
    if (typeof targetDir[fileName] === 'undefined') {
        term.write(`\r\nError: File "${fileName}" not found in "${filePath}"`);
        return;
    }

    // Check if it's a file or a directory
    if (typeof targetDir[fileName] === 'object') {
        term.write(`\r\nError: "${fileName}" is a directory, not a file`);
        return;
    }

    // Display the file contents
    term.write(`\r\n${targetDir[fileName]}`);
}



// Create a new file
function touch(filePath) {
    const currentDir = getCurrentDir(); // Get the current directory

    if (!filePath) {
        term.write('\r\nError: No file name provided');
        return;
    }

    // Split the path into directory parts and the file name
    const parts = filePath.split('/');
    const fileName = parts.pop();  // Get the last part as the file name

    // Initialize targetDir as the current directory
    let targetDir = currentDir;

    // Check if the user has provided a directory path
    if (parts.length > 0) {
        // Traverse to the directory where the file will be created
        for (const part of parts) {
            // If the directory does not exist, create it
            if (!targetDir[part]) {
                targetDir[part] = {};  // Create a new directory
                term.write(`\r\nDirectory "${part}" created`);
            }
            targetDir = targetDir[part];  // Move to the next directory
        }
    }

    // Now create the file in the target directory
    if (targetDir[fileName]) {
        term.write(`\r\nError: File "${fileName}" already exists in "${filePath}".`);
        return;
    }

    // Create an empty file with default content
    targetDir[fileName] = 'This is a new file'; // Create the file
    term.write(`\r\nFile "${fileName}" created in "${filePath}".`);
}


function rm(filePath) {
    if (!filePath) {
        term.write('\r\nError: No file or directory name provided');
        return;
    }

    // Normalize the path to get the absolute path
    let targetPath = filePath.startsWith('/') ? filePath : `${getCurrentPathString()}/${filePath}`;
    targetPath = targetPath.replace(/\/\//g, '/');  // Remove any double slashes

    // Split path into parts for directory traversal
    const parts = targetPath.split('/').filter(Boolean);  // Split and remove empty elements
    
    // Traverse through the file system to find the target
    let current = fileSystem['/'];
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
            term.write(`\r\nError: Path "${filePath}" not found`);
            return;
        }
        current = current[parts[i]];  // Traverse into subdirectories
    }

    // Now current should point to the parent directory of the file or directory to be removed
    const targetName = parts[parts.length - 1];  // The actual file or directory name

    // Check if the target exists
    if (!current[targetName]) {
        term.write(`\r\nError: "${filePath}" not found`);
        return;
    }

    // Remove the target
    delete current[targetName];
    term.write(`\r\n"${filePath}" has been deleted`);
}



function echo(args) {
    const currentDir = getCurrentDir();
    
    if (args.length < 1) {
        term.write('\r\nError: No input provided');
        return;
    }

    const output = args.join(' ').replace(/\"/g, '');

    // Check for redirection operator
    if (args.includes('>')) {
        const fileNameIndex = args.indexOf('>') + 1;
        const fileName = args[fileNameIndex];
        if (!fileName) {
            term.write('\r\nError: No file name provided');
            return;
        }

        // Normalize the file path to get the absolute path
        let targetPath = fileName.startsWith('/') ? fileName : `${getCurrentPathString()}/${fileName}`;
        targetPath = targetPath.replace('//', '/');  // Remove any double slashes

        // Split path into parts for directory traversal
        const parts = targetPath.split('/').filter(Boolean);  // Split and remove empty elements
        
        // Traverse through the file system to find the target directory
        let current = fileSystem['/'];
        for (let i = 1; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                term.write(`\r\nError: Directory "${parts[i]}" not found`);
                return;
            }
            current = current[parts[i]];  // Traverse into subdirectories
        }

        // Now current should point to the parent directory of the file
        const fileNameOnly = parts[parts.length - 1];  // The actual file name

        // Create or overwrite the file
        current[fileNameOnly] = output; // Store the content of the file
        term.write(`\r\n"${output}" written to ${fileName}`);
    } else {
        term.write(`\r\n${output}`); // Just echo the output if no redirection
    }
}


function grep(pattern, filePath) {
    const currentDir = getCurrentDir();

    if (!pattern || !filePath) {
        term.write('\r\nError: Missing pattern or file name');
        return;
    }

    // Normalize the file path to get the absolute path
    let targetPath = filePath.startsWith('/') ? filePath : `${getCurrentPathString()}/${filePath}`;
    targetPath = targetPath.replace('//', '/');  // Remove any double slashes

    // Split the path into parts for directory traversal
    const parts = targetPath.split('/').filter(Boolean);  // Split and remove empty elements

    // Traverse through the file system to find the target file
    let current = fileSystem['/'];
    for (let i = 1; i < parts.length; i++) {
        if (!current[parts[i]]) {
            term.write(`\r\nError: File "${filePath}" not found`);
            return;
        }
        current = current[parts[i]];  // Traverse into subdirectories
    }

    // Check if the path points to a valid file
    if (typeof current !== 'string') {
        term.write(`\r\nError: "${filePath}" is a directory, not a file`);
        return;
    }

    // Search for the pattern in the file content
    const lines = current.split('\n');
    const matchedLines = lines.filter(line => line.includes(pattern));

    if (matchedLines.length > 0) {
        matchedLines.forEach(line => term.write(`\r\n${line}`));
    } else {
        term.write(`\r\nNo match found for "${pattern}"`);
    }
}


// Implement 'find' command (recursive search)
function find(name) {
    const results = [];
    const currentDir = getCurrentDir();

    function search(dir, path) {
        for (const key in dir) {
            const fullPath = path + '/' + key;
            if (key.includes(name)) {
                results.push(fullPath);
            }
            if (typeof dir[key] === 'object') {
                search(dir[key], fullPath);  // Recurse into subdirectories
            }
        }
    }

    search(currentDir, getCurrentPathString());

    if (results.length === 0) {
        term.write(`\r\nNo files or directories found matching "${name}"`);
    } else {
        results.forEach(result => term.write(`\r\n${result}`));
    }
}

// Change permissions for a file or directory
function chmod(permission, path) {
    if (!permission || !path) {
        term.write('\r\nError: Missing permission or path');
        return;
    }

    // Normalize the path to get the absolute path
    let targetPath = path.startsWith('/') ? path : `${getCurrentPathString()}/${path}`;
    targetPath = targetPath.replace(/\/+/g, '/');  // Remove any double slashes

    // Check if the path exists in permissions
    if (!permissions[targetPath]) {
        term.write(`\r\nError: No permission record for path "${targetPath}"`);
        return;
    }

    console.log("Current permissions:", permissions);

    // Apply new permissions
    permissions[targetPath] = permission;
    term.write(`\r\nPermissions for "${targetPath}" changed to "${permission}"`);
}

// Implement 'cp', 'mv', 'cat', 'touch', 'rm', 'echo', 'grep' (same as before)
// ...

// Provide help/documentation for all commands
function help() {
    const helpText = `
Available commands:
  mkdir [directory]        - Create a new directory
  ls                       - List files and directories
  cp [source] [destination] - Copy files or directories
  mv [source] [destination] - Move or rename files or directories
  cat [file]               - View file contents
  touch [file]             - Create a new file
  rm [file or directory]   - Remove files or directories
  echo [text] > [file]     - Write text to a file
  grep [pattern] [file]    - Search for text in a file
  cd [directory]           - Change directory
  find [name]              - Search for files or directories
  chmod [permissions] [path] - Change file or directory permissions
  help                     - Show this help message
    `;
    term.write(helpText);
}

// Initialize terminal
const term = new Terminal();
term.open(document.getElementById('terminal'));
term.write('Welcome to the Linux Terminal Tutorial by R4GNAR\r\n');
term.prompt = () => {
    term.write(`\r\n${getCurrentPathString()} $ `);
};
term.prompt();

// Handle input
// Handle input
term.onData(e => {
    switch (e) {
        case '\r':  // Enter key
            handleCommand(userInput);
            userInput = '';  // Clear the input buffer after executing the command
            cursorPosition = 0; // Reset cursor position
            term.prompt();
            break;
        case '\u007F':  // Backspace key
            if (cursorPosition > 0) {
                // Remove character to the left of the cursor position
                userInput = userInput.slice(0, cursorPosition - 1) + userInput.slice(cursorPosition);
                cursorPosition--;  // Update the cursor position
                updateInputDisplay();
            }
            break;
        case '\t':  // Tab key for autocompletion
            if (userInput.length > 0) {
                const suggestions = autocomplete(userInput);
                if (suggestions.length === 1) {
                    userInput = suggestions[0];  // Replace input with suggestion
                    cursorPosition = userInput.length; // Move cursor to end
                    updateInputDisplay();
                } else if (suggestions.length > 1) {
                    term.write('\r\n' + suggestions.join('\r\n') + '\r\n');  // Show multiple suggestions
                    updateInputDisplay();
                }
            }
            break;
        case '\u001B[D':  // Left arrow key
            if (cursorPosition > 0) {
                cursorPosition--;  // Move cursor left
                term.write('\u001B[D');  // Move the cursor left in the terminal
            }
            break;
        case '\u001B[C':  // Right arrow key
            if (cursorPosition < userInput.length) {
                cursorPosition++;  // Move cursor right
                term.write('\u001B[C');  // Move the cursor right in the terminal
            }
            break;
        default:  // Other key presses
            if (e.length === 1) {  // Only handle printable characters
                userInput = userInput.slice(0, cursorPosition) + e + userInput.slice(cursorPosition);
                cursorPosition++;  // Update cursor position
                updateInputDisplay();
            }
    }
});

// Function to update the input display and clear remaining characters if needed
function updateInputDisplay() {
    const currentPath = getCurrentPathString();  // Get the current path string
    const prompt = currentPath + ' $ ';
    const fullInput = prompt + userInput;

    // Get the length of the previous input (including prompt)
    const prevLength = term.buffer.active.cursorX;

    // Clear the entire line, reprint the input, and clear extra characters
    term.write('\r' + ' '.repeat(prevLength));  // Clear the entire line with spaces
    term.write('\r' + fullInput);  // Reprint the prompt and user input

    // If the new input is shorter than the previous one, clear the leftover characters
    if (userInput.length < prevLength - prompt.length) {
        term.write(' '.repeat(prevLength - (prompt.length + userInput.length)));  // Clear leftover characters
        term.write('\r' + fullInput);  // Move back and rewrite the input
    }

    // Move the cursor back to its correct position
    const cursorOffset = userInput.length - cursorPosition;
    if (cursorOffset > 0) {
        term.write('\u001B[' + cursorOffset + 'D');  // Move cursor left to reflect its correct position
    }
}
