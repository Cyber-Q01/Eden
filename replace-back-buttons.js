const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/Harbidec/Desktop/EdenHome/EdenHome/app';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;

walkDir(directory, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    if (content.includes('name="arrow-back"')) {
      // Regex to match TouchableOpacity containing an Ionicons arrow-back
      // This tries to avoid matching too much by making the inner parts lazy [\s\S]*?
      // but we should ensure it only captures the back button.
      // Usually the back button doesn't have other tags inside.
      const regex = /<TouchableOpacity[^>]*onPress=\{[^}]*\}[^>]*>\s*<Ionicons[^>]*name="arrow-back"[^>]*>\s*<\/TouchableOpacity>/g;
      
      content = content.replace(regex, (match) => {
        hasChanges = true;
        return '<BackButton />';
      });
      
      // Some might have a wrapper view or empty spaces, let's also try a more relaxed one if nothing matched
      if (!hasChanges) {
          const regex2 = /<TouchableOpacity[^>]*>[\s\S]*?<Ionicons[^>]*name="arrow-back"[^>]*>[\s\S]*?<\/TouchableOpacity>/g;
          content = content.replace(regex2, (match) => {
              // Ensure we aren't matching across a huge chunk of JSX
              if (match.length < 300) {
                  hasChanges = true;
                  return '<BackButton />';
              }
              return match;
          });
      }
      
      if (hasChanges) {
        // Figure out relative path to components/BackButton
        // We are already inside 'app' folder, but some files might be in nested folders.
        // Wait, EdenHome/app is the base.
        // components is at EdenHome/components
        
        const baseDir = path.resolve('c:/Users/Harbidec/Desktop/EdenHome/EdenHome');
        const fileDir = path.dirname(filePath);
        
        let relativePath = path.relative(fileDir, path.join(baseDir, 'components', 'BackButton'));
        // convert \ to /
        relativePath = relativePath.replace(/\\/g, '/');
        
        // Remove .tsx if present
        if (relativePath.endsWith('.tsx')) {
            relativePath = relativePath.slice(0, -4);
        }
        
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }

        if (!content.includes('BackButton')) {
          // Add import at the top, after the last import
          const imports = content.match(/^import.*$/gm);
          if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            content = content.replace(lastImport, `${lastImport}\nimport BackButton from '${relativePath}';`);
          } else {
            content = `import BackButton from '${relativePath}';\n` + content;
          }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        count++;
      }
    }
  }
});

console.log(`Total files updated: ${count}`);
