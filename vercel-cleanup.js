#!/usr/bin/env node

/**
 * Script para resolver conflitos que impedem o deploy na Vercel
 * Este script identifica e remove arquivos conflitantes
 * Sempre prefere manter .js sobre .mjs e .ts sobre .mts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==================================================');
console.log('LIMPEZA DE ARQUIVOS PARA DEPLOY NA VERCEL');
console.log('==================================================');

// Lista de pares de extensões que causam conflitos
const conflictingExtensions = [
  ['.js', '.mjs'],
  ['.ts', '.mts'],
  // Outros pares conforme necessário
];

// Preferências para manter (o primeiro tem precedência)
const extensionPreference = {
  '.js': 1,   // Maior preferência
  '.ts': 2,   
  '.mjs': 3,
  '.mts': 4,  // Menor preferência
};

let conflictingFiles = [];
let removedFiles = [];

function findConflicts(directory) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    
    if (file.isDirectory() && 
        file.name !== 'node_modules' && 
        file.name !== '.git') {
      findConflicts(fullPath);
    }
    
    if (file.isFile()) {
      const baseName = path.basename(file.name, path.extname(file.name));
      const extension = path.extname(file.name);
      
      for (const [ext1, ext2] of conflictingExtensions) {
        const alternativeExt = extension === ext1 ? ext2 : ext1;
        const alternativeFile = path.join(directory, `${baseName}${alternativeExt}`);
        
        if (fs.existsSync(alternativeFile)) {
          conflictingFiles.push({
            file1: {
              path: fullPath,
              extension: extension,
              preference: extensionPreference[extension] || 999
            },
            file2: {
              path: alternativeFile,
              extension: alternativeExt,
              preference: extensionPreference[alternativeExt] || 999
            }
          });
        }
      }
    }
  }
}

function resolveConflicts() {
  // Processa cada par de arquivos conflitantes
  for (const { file1, file2 } of conflictingFiles) {
    try {
      // Decidir qual arquivo manter baseado na preferência
      const toRemove = file1.preference <= file2.preference ? file2.path : file1.path;
      const toKeep = file1.preference <= file2.preference ? file1.path : file2.path;
      
      console.log(`Conflito encontrado:`);
      console.log(`  - Mantendo: ${toKeep}`);
      console.log(`  - Removendo: ${toRemove}`);
      
      // Remover o arquivo com menor preferência
      fs.unlinkSync(toRemove);
      removedFiles.push(toRemove);
      
    } catch (error) {
      console.error(`❌ Erro ao resolver conflito: ${error.message}`);
    }
  }
}

// Procurar conflitos
try {
  console.log('1. Procurando arquivos conflitantes...');
  findConflicts('.');
  
  if (conflictingFiles.length === 0) {
    console.log('✅ Nenhum arquivo conflitante encontrado.');
  } else {
    console.log(`\n2. Encontrados ${conflictingFiles.length} pares de arquivos conflitantes.`);
    console.log('Resolvendo conflitos...');
    resolveConflicts();
    
    if (removedFiles.length > 0) {
      console.log(`\n✅ ${removedFiles.length} arquivos removidos com sucesso.`);
    }
  }
} catch (error) {
  console.error('❌ Erro ao processar arquivos:', error.message);
}

// Resumo
console.log('\n==================================================');
console.log('RESUMO:');

if (removedFiles.length === 0 && conflictingFiles.length === 0) {
  console.log('✅ Nenhum arquivo conflitante encontrado. Seu projeto está limpo.');
} else if (removedFiles.length > 0) {
  console.log(`✅ ${removedFiles.length} arquivos conflitantes foram removidos.`);
  console.log('Seu projeto agora deve estar pronto para deploy na Vercel.');
} else {
  console.log('⚠️ Foram encontrados conflitos, mas nenhum arquivo foi removido.');
  console.log('Verifique os erros acima e tente novamente.');
}

console.log('==================================================');