import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if (pkg.version!==manifest.version) throw new Error('Manifest/package versions differ.');
const runtime=['manifest.json','background.js','auth.js','core.js','trakt-features.js','updates.js','content.js','content-features.js','content.css','trakt-content.js','trakt-content.css','trakt-tools.js','notes.html','notes.css','notes.js','inject.js','popup.html','popup.js','popup.css','privacy.html','privacy.css','PRIVACY.md','THIRD_PARTY_NOTICES.md','LICENSE','README.md','SECURITY.md'];
async function files(dir) {
  const result=[];
  for (const entry of await readdir(resolve(root,dir),{withFileTypes:true})) {
    const name=`${dir}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${name}`);
    if (entry.isDirectory()) result.push(...await files(name));else result.push(name);
  }
  return result;
}
runtime.push(...await files('assets'),...await files('docs'));
const source=[...runtime,'package.json','package-lock.json','.gitignore','CHANGELOG.md','RELEASE_NOTES.md','prd.md',...await files('tests'),...await files('scripts'),...await files('.github')];
// Small deterministic ZIP writer; runtime needs no npm packages or build step.
function crc32(data) {
  let crc=0xffffffff;
  for (const byte of data) {crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
async function zip(names) {
  const chunks=[],directory=[];let offset=0;
  for(const path of [...new Set(names)].sort()) {
    const name=Buffer.from(path),data=await readFile(resolve(root,path)),compressed=deflateRawSync(data),crc=crc32(data);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    chunks.push(local,name,compressed);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
    directory.push(central,name);offset+=local.length+name.length+compressed.length;
  }
  const central=Buffer.concat(directory),end=Buffer.alloc(22),count=directory.length/2;
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...chunks,central,end]);
}
await mkdir(resolve(root,'dist'),{recursive:true});
const sums=[];
for (const [suffix,names] of [['',runtime],['-source',source]]) {
  const name=`justtrakt-${manifest.version}${suffix}.zip`,data=await zip(names);
  await writeFile(resolve(root,'dist',name),data);
  sums.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`);
  console.log(`${name}: ${names.length} files, ${data.length} bytes`);
}
await writeFile(resolve(root,'dist/SHA256SUMS.txt'),sums.join('\n')+'\n');
