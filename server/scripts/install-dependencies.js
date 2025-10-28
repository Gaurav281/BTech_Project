import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const dependencyMap = {
  'python-telegram-bot': {
    description: 'Python Telegram Bot library',
    command: 'pip install python-telegram-bot',
    platforms: ['all']
  },
  'requests': {
    description: 'HTTP library for Python',
    command: 'pip install requests',
    platforms: ['all']
  },
  'express': {
    description: 'Web framework for Node.js',
    command: 'npm install express',
    platforms: ['all']
  },
  'axios': {
    description: 'HTTP client for Node.js',
    command: 'npm install axios',
    platforms: ['all']
  }
};

async function installDependency(packageName) {
  const pkg = dependencyMap[packageName];
  if (!pkg) {
    console.log(`❌ Unknown package: ${packageName}`);
    return false;
  }

  console.log(`📦 Installing ${packageName} - ${pkg.description}`);
  
  try {
    const { stdout, stderr } = await execAsync(pkg.command);
    console.log(`✅ Successfully installed ${packageName}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to install ${packageName}: ${error.message}`);
    return false;
  }
}

async function promptForDependencies(missingDeps) {
  console.log('\n🔍 Missing dependencies detected:');
  missingDeps.forEach(dep => {
    const pkg = dependencyMap[dep];
    if (pkg) {
      console.log(`   - ${dep}: ${pkg.description}`);
    } else {
      console.log(`   - ${dep}: Unknown package`);
    }
  });

  const answer = await question('\n❓ Do you want to install these dependencies? (y/n): ');
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n🚀 Installing dependencies...');
    
    for (const dep of missingDeps) {
      await installDependency(dep);
    }
    
    console.log('\n✅ Dependency installation completed!');
  } else {
    console.log('\n⚠️ Skipping dependency installation');
  }
}

// Export for use in other modules
export { installDependency, promptForDependencies };

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node install-dependencies.js <package1> <package2> ...');
    console.log('Available packages:', Object.keys(dependencyMap).join(', '));
    process.exit(1);
  }

  (async () => {
    await promptForDependencies(args);
    rl.close();
  })();
}