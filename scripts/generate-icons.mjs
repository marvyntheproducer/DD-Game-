import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../desktop/assets');
const svg=await fs.readFile(path.join(root,'icon.svg'));
await sharp(svg).resize(1024).png().toFile(path.join(root,'icon.png'));
const sizes=[16,24,32,48,64,128,256];
const pngs=await Promise.all(sizes.map(size=>sharp(svg).resize(size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
pngs.forEach((png,i)=>{const p=6+16*i;header[p]=sizes[i]===256?0:sizes[i];header[p+1]=header[p];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(png.length,p+8);header.writeUInt32LE(offset,p+12);offset+=png.length;});
await fs.writeFile(path.join(root,'icon.ico'),Buffer.concat([header,...pngs]));
const chunks=[];
for(const [kind,size] of [['icp4',16],['icp5',32],['icp6',64],['ic07',128],['ic08',256],['ic09',512],['ic10',1024]]){
 const data=await sharp(svg).resize(size).png().toBuffer(),h=Buffer.alloc(8);h.write(kind);h.writeUInt32BE(data.length+8,4);chunks.push(h,data);
}
const icns=Buffer.alloc(8);icns.write('icns');icns.writeUInt32BE(8+chunks.reduce((n,b)=>n+b.length,0),4);
await fs.writeFile(path.join(root,'icon.icns'),Buffer.concat([icns,...chunks]));
console.log('Generated PNG, Windows ICO and Mac ICNS icons.');
