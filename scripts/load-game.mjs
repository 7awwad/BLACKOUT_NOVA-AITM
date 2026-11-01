// Compile the pure TypeScript game modules in memory for Node's test runner.
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const compile=name=>ts.transpileModule(readFileSync(new URL('../app/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
export const seaURL=url(compile('sea-battle'));
export const sea=await import(seaURL);
export const sceneURL=url(compile('chameleon-scene'));
export const scene=await import(sceneURL);
export const camURL=url(compile('chameleon').replace("'./chameleon-scene'",JSON.stringify(sceneURL)));
export const cam=await import(camURL);
export const gameURL=url(compile('game').replace("'./sea-battle'",JSON.stringify(seaURL)).replace("'./chameleon'",JSON.stringify(camURL)));
export const game=await import(gameURL);
